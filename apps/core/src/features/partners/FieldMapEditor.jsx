import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, Undo2, Trash2, Layers, LocateFixed, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { polygonAreaHa } from './partnersApi';

const CAMEROON = [5.7, 12.4];
const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  },
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
};

function ClickToAdd({ onAdd }) {
  useMapEvents({ click: (e) => onAdd([e.latlng.lat, e.latlng.lng]) });
  return null;
}
function FlyTo({ target, zoom }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo(target, zoom ?? Math.max(map.getZoom(), 17), { duration: 0.6 }); }, [target, zoom, map]);
  return null;
}
// Leaflet measures its container once; inside an animating pop-up that size is wrong,
// which leaves grey tiles. Re-measure after mount and whenever the box resizes.
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const t = [100, 350, 800].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    ro?.observe(el);
    return () => { t.forEach(clearTimeout); ro?.disconnect(); };
  }, [map]);
  return null;
}
function FitTo({ points }) {
  const map = useMap();
  useEffect(() => { if (points?.length >= 2) map.fitBounds(points, { padding: [24, 24], maxZoom: 18 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Draw a field boundary. Two ways:
 *  - tap the corners on the map (satellite view by default), or
 *  - walk the field and press "Add my location" at each corner (GPS).
 * `value` / `onChange` are arrays of [lat, lng].
 */
export default function FieldMapEditor({ value, onChange, height = 360 }) {
  const [layer, setLayer] = useState('satellite');
  const [flyTarget, setFlyTarget] = useState(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const points = value || [];
  const ha = useMemo(() => polygonAreaHa(points), [points]);

  const locate = (addPoint) => {
    setGpsError('');
    if (!navigator.geolocation) { setGpsError('Location is not available on this device.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = [pos.coords.latitude, pos.coords.longitude];
        if (addPoint) {
          if (pos.coords.accuracy > 30) setGpsError(`GPS accuracy is low (±${Math.round(pos.coords.accuracy)} m). Wait a moment outdoors and try again for a precise corner.`);
          onChange([...points, p]);
        }
        setFlyTarget(p);
      },
      (err) => { setLocating(false); setGpsError(err.code === 1 ? 'Allow location access to use GPS.' : 'Could not get your location. Try again outdoors.'); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="relative rounded-2xl overflow-hidden border border-slate-200" style={{ height }}>
        <MapContainer center={points[0] || CAMEROON} zoom={points.length ? 17 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer key={layer} url={TILES[layer].url} attribution={TILES[layer].attribution} maxZoom={19} />
          <KeepSized />
          <ClickToAdd onAdd={(p) => onChange([...points, p])} />
          <FlyTo target={flyTarget} />
          {points.length >= 2 && <FitTo points={points} />}
          {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: '#22c55e', weight: 3, fillOpacity: 0.25 }} />}
          {points.map((p, i) => (
            <CircleMarker key={i} center={p} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: i === 0 ? '#2563eb' : '#22c55e', fillOpacity: 1 }} />
          ))}
        </MapContainer>
        <button type="button" onClick={() => setLayer(layer === 'satellite' ? 'map' : 'satellite')}
          className="absolute top-3 right-3 z-[400] h-9 px-3 rounded-xl bg-white/95 border border-slate-200 text-sm font-medium text-slate-700 flex items-center gap-1.5 shadow-sm">
          <Layers size={15} /> {layer === 'satellite' ? 'Map' : 'Satellite'}
        </button>
        <button type="button" onClick={() => locate(false)}
          className="absolute top-14 right-3 z-[400] w-9 h-9 rounded-xl bg-white/95 border border-slate-200 text-slate-700 flex items-center justify-center shadow-sm" aria-label="Go to my location">
          <LocateFixed size={16} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => locate(true)} disabled={locating} className="ui-btn ui-btn-primary !w-auto !h-11 px-4 text-sm">
          {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />} Add my location as a corner
        </button>
        <button type="button" onClick={() => onChange(points.slice(0, -1))} disabled={!points.length} className="ui-btn ui-btn-secondary !w-auto !h-11 px-3 text-sm">
          <Undo2 size={16} /> Undo
        </button>
        <button type="button" onClick={() => onChange([])} disabled={!points.length} className="ui-btn ui-btn-secondary !w-auto !h-11 px-3 text-sm">
          <Trash2 size={16} /> Clear
        </button>
        <span className="ml-auto text-sm text-slate-600">
          {points.length} corner{points.length === 1 ? '' : 's'}
          {points.length >= 3 && <> · <strong className="text-slate-900">{ha < 1 ? ha.toFixed(2) : ha.toFixed(1)} ha</strong></>}
        </span>
      </div>
      {points.length >= 3 && (ha < 0.01 || ha > 500) && (
        <p className="text-sm text-amber-700">Fields must be between 0.01 and 500 hectares. {ha > 500 ? 'Zoom in and mark the corners of a single field.' : 'Check the corners: this outline is very small.'}</p>
      )}
      {gpsError && <p className="text-sm text-amber-700">{gpsError}</p>}
      <p className="text-sm text-slate-500">
        Tap each corner of the field in order, or stand at each corner and use your location. At least 3 corners; the area is measured precisely when you save.
      </p>
    </div>
  );
}

// Read-only map of many fields, coloured by monitoring status.
export function FieldsOverviewMap({ fields, height = 320, onSelect, colorFor }) {
  const shapes = (fields || []).map((f) => ({ f, pts: (f.boundary_geojson?.coordinates?.[0] || []).map(([lng, lat]) => [lat, lng]) })).filter((s) => s.pts.length >= 4);
  const all = shapes.flatMap((s) => s.pts);
  const color = (s) => ({ active: '#16a34a', paused: '#94a3b8', rejected: '#dc2626' }[s] || '#2563eb');
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer center={all[0] || CAMEROON} zoom={all.length ? 12 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer url={TILES.satellite.url} attribution={TILES.satellite.attribution} maxZoom={19} />
        <KeepSized />
        {all.length >= 2 && <FitTo points={all} />}
        {shapes.map(({ f, pts }) => (
          <Polygon key={f.id} positions={pts} eventHandlers={{ click: () => onSelect?.(f) }}
            pathOptions={{ color: colorFor ? colorFor(f) : color(f.monitoring_status), weight: 2, fillOpacity: 0.35 }} />
        ))}
      </MapContainer>
    </div>
  );
}
