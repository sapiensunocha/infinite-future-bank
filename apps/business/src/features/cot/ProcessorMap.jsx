import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from '../../i18n/useTranslation';
import { Star } from 'lucide-react';

// Fix Leaflet default marker icons broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const processorIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 2px 8px rgba(5,150,105,0.5);display:flex;align-items:center;justify-content:center">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function ProcessorMap({ userLocation, processors, selectedProcessor, onSelect }) {
  const { t } = useTranslation();
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [0, 20]; // fallback: center of Africa

  const zoom = userLocation ? 13 : 3;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 320 }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* User location pulse */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={300}
              pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.08, weight: 1.5 }}
            />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <span className="text-xs font-bold">Your location</span>
              </Popup>
            </Marker>
          </>
        )}

        {/* COT Processors */}
        {processors
          .filter(p => p.latitude && p.longitude)
          .map(proc => (
            <Marker
              key={proc.id}
              position={[proc.latitude, proc.longitude]}
              icon={processorIcon}
              eventHandlers={{ click: () => onSelect(proc) }}
            >
              <Popup>
                <div className="space-y-1 text-xs min-w-[140px]">
                  <p className="font-black text-slate-800">{proc.full_name}</p>
                  <p className="text-emerald-600 font-bold">⭐ {proc.cot_rating}% · {proc.cot_completed_tx} {t('deposit.trades')}</p>
                  {proc.distanceKm !== undefined && (
                    <p className="text-slate-500">{proc.distanceKm < 1 ? `${Math.round(proc.distanceKm * 1000)}m` : `${proc.distanceKm.toFixed(1)} km`}</p>
                  )}
                  <button
                    onClick={() => onSelect(proc)}
                    className="w-full mt-1 bg-emerald-600 text-white text-[10px] font-black uppercase py-1.5 rounded-lg"
                  >
                    {t('common.select')}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
