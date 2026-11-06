// Phase 2 screens of the Partner Hub: MICHAEL risk map, alerts inbox, reports, sync.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, BellRing, CheckCircle2, Download, X, PauseCircle, PlayCircle, AlertTriangle, Activity } from 'lucide-react';
import { FieldsOverviewMap } from './FieldMapEditor';
import * as api from './partnersApi';

const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
const Spinner = () => <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
const LevelChip = ({ level }) => {
  const s = api.LEVEL_STYLE[level];
  return s ? <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${s.chip}`}>{s.label}</span> : <span className="text-xs text-slate-400">No data yet</span>;
};
function ErrorNote({ children }) {
  return <div className="border border-red-200 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-sm flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{children}</div>;
}

// ───────────────────────────── Sync button (owners/admins)
export function SyncButton({ partner, onDone }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = (await api.syncNow(partner.id))?.results?.[0] ?? {};
      const errs = r.errors?.length ? ` ${r.errors.length} problem(s): ${r.errors[0]}` : '';
      setMsg({ ok: !r.errors?.length, text: `${r.registered ?? 0} registered, ${r.rejected ?? 0} rejected, ${r.removed ?? 0} removed, risk updated for ${r.risk_updated ?? 0} fields.${errs}` });
      onDone?.();
    } catch (e) {
      setMsg({ ok: false, text: /not configured/i.test(e.message) ? 'MICHAEL is not connected yet (server keys missing).' : e.message });
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <button type="button" onClick={run} disabled={busy} className="ui-btn ui-btn-secondary sm:!w-auto">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Sync with MICHAEL now
      </button>
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{msg.text}</p>}
    </div>
  );
}

// ───────────────────────────── Overview additions
export function MonitoringSummary({ partner, refreshKey, onOpenAlerts }) {
  const [s, setS] = useState(null);
  useEffect(() => {
    const to = new Date(); const from = new Date(to.getTime() - 7 * 86400000);
    api.riskSummary(partner.id, from.toISOString(), to.toISOString()).then(setS).catch(() => setS(false));
  }, [partner.id, refreshKey]);
  if (s === false) return null;          // migration not applied yet: hide quietly
  if (!s) return null;
  const lv = s.risk_levels || {};
  const atRisk = (lv.high || 0) + (lv.critical || 0);
  return (
    <button type="button" onClick={onOpenAlerts} className="ui-card p-4 w-full text-left grid grid-cols-2 md:grid-cols-4 gap-3 hover:bg-slate-50">
      <div><p className="text-sm text-slate-500 flex items-center gap-1.5"><BellRing size={15} className="text-red-600" /> Open alerts</p><p className="ui-amount text-2xl text-slate-900">{s.alerts_open}</p></div>
      <div><p className="text-sm text-slate-500">Fields at high/critical risk</p><p className="ui-amount text-2xl text-slate-900">{atRisk}</p></div>
      <div><p className="text-sm text-slate-500">Alerts, last 7 days</p><p className="ui-amount text-2xl text-slate-900">{s.alerts_total}</p></div>
      <div><p className="text-sm text-slate-500">Delivered within 2 h</p><p className="ui-amount text-2xl text-slate-900">{s.alerts_within_2h_pct == null ? '–' : `${s.alerts_within_2h_pct}%`}</p></div>
    </button>
  );
}

// ───────────────────────────── Fields coloured by risk + detail sheet
function FieldSheet({ field, risk, alerts, canManage, onClose, onChanged }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const toggle = async () => {
    setBusy(true); setErr('');
    try { await api.setMonitoring(field.id, field.monitoring_status !== 'paused'); onChanged(); onClose(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">{field.name}{field.crop ? ` · ${field.crop}` : ''}</p>
            <p className="text-sm text-slate-500">{field.farmers?.full_name} · {Number(field.area_ha).toFixed(2)} ha</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        {field.monitoring_status === 'rejected' && <ErrorNote>MICHAEL rejected this field: {field.monitoring_note || 'no reason given'}. Redraw the outline and save it again.</ErrorNote>}
        {field.monitoring_status === 'pending' && <p className="text-sm text-blue-700 bg-blue-50 rounded-xl px-4 py-3">Waiting to be registered with MICHAEL (next sync).</p>}
        {field.monitoring_status === 'paused' && <p className="text-sm text-slate-700 bg-slate-100 rounded-xl px-4 py-3">Monitoring is paused for this field.</p>}
        <div className="ui-card p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Activity size={16} className="text-blue-600" /> Current risk</p><LevelChip level={risk?.level} /></div>
          {risk ? (
            <>
              <p className="text-sm text-slate-500 mt-1">Score {risk.score ?? '–'}/100 · observed {fmtDate(risk.observed_at)}</p>
              <div className="mt-3 divide-y divide-slate-100">
                {(risk.indicators || []).map((i, n) => (
                  <div key={n} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">{api.HAZARD_LABEL[i.hazard] || i.hazard}</span>
                    <span className="flex items-center gap-2 text-slate-500">{i.value != null ? `${i.value}${i.unit ? ` ${i.unit}` : ''}` : ''}<LevelChip level={i.level} /></span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-slate-500 mt-1">No risk data yet. It appears after the field is monitored.</p>}
        </div>
        {alerts.length > 0 && (
          <div className="ui-card divide-y divide-slate-100">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-800">{api.HAZARD_LABEL[a.hazard] || a.hazard} <span className="text-slate-500">· {fmtDate(a.detected_at)}</span></span>
                <LevelChip level={a.severity} />
              </div>
            ))}
          </div>
        )}
        {err && <ErrorNote>{err}</ErrorNote>}
        {canManage && ['active', 'paused'].includes(field.monitoring_status) && (
          <button type="button" onClick={toggle} disabled={busy} className="ui-btn ui-btn-secondary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : field.monitoring_status === 'paused' ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
            {field.monitoring_status === 'paused' ? 'Resume monitoring' : 'Pause monitoring'}
          </button>
        )}
      </div>
    </div>
  );
}

export function RiskFieldsTab({ partner, refreshKey, canManage, onChanged }) {
  const [fields, setFields] = useState(null); const [risk, setRisk] = useState({}); const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState(''); const [open, setOpen] = useState(null); const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    try {
      const [f, r, a] = await Promise.all([
        api.listFields(partner.id),
        api.listRisk(partner.id).catch(() => []),
        api.listAlerts(partner.id, { status: 'all', limit: 500 }).catch(() => []),
      ]);
      setFields(f); setRisk(Object.fromEntries(r.map((x) => [x.field_id, x]))); setAlerts(a);
    } catch (e) { setErr(e.message); }
  }, [partner.id]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const colorFor = useCallback((f) => {
    if (f.monitoring_status !== 'active') return { pending: '#2563eb', paused: '#94a3b8', rejected: '#7f1d1d' }[f.monitoring_status] || '#2563eb';
    return api.LEVEL_STYLE[risk[f.id]?.level]?.color || '#2563eb';
  }, [risk]);
  const shown = useMemo(() => (fields || []).filter((f) => filter === 'all'
    || (filter === 'at_risk' ? ['high', 'critical'].includes(risk[f.id]?.level) : f.monitoring_status === filter)), [fields, risk, filter]);

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!fields) return <Spinner />;
  const atRisk = fields.filter((f) => ['high', 'critical'].includes(risk[f.id]?.level)).length;
  const FILTERS = [['all', `All (${fields.length})`], ['at_risk', `At risk (${atRisk})`], ['active', 'Monitored'], ['pending', 'Awaiting'], ['rejected', 'Rejected'], ['paused', 'Paused']];
  return (
    <div className="space-y-3">
      <FieldsOverviewMap fields={shown} height={380} colorFor={colorFor} onSelect={setOpen} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        {Object.entries(api.LEVEL_STYLE).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: v.color }} />{v.label}</span>)}
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600" />Awaiting / no data</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`shrink-0 h-9 px-3 rounded-lg text-sm font-medium ${filter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{label}</button>
        ))}
      </div>
      <div className="ui-card divide-y divide-slate-100 overflow-hidden">
        {shown.length === 0 && <p className="px-4 py-8 text-sm text-slate-500 text-center">No fields here.</p>}
        {shown.slice(0, 300).map((f) => (
          <button key={f.id} type="button" onClick={() => setOpen(f)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
            <span className="w-2.5 h-10 rounded-full shrink-0" style={{ background: colorFor(f) }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-slate-900 truncate">{f.name}{f.crop ? ` · ${f.crop}` : ''}</span>
              <span className="block text-sm text-slate-500 truncate">{f.farmers?.full_name} · {Number(f.area_ha).toFixed(2)} ha</span>
            </span>
            {f.monitoring_status === 'active' ? <LevelChip level={risk[f.id]?.level} /> : <span className="text-xs text-slate-500 capitalize">{f.monitoring_status === 'pending' ? 'Awaiting' : f.monitoring_status}</span>}
          </button>
        ))}
      </div>
      {open && (
        <FieldSheet field={open} risk={risk[open.id]} alerts={alerts.filter((a) => a.field_id === open.id)} canManage={canManage}
          onClose={() => setOpen(null)} onChanged={() => { load(); onChanged?.(); }} />
      )}
    </div>
  );
}

// ───────────────────────────── Alerts inbox
export function AlertsTab({ partner, canEdit, refreshKey }) {
  const [status, setStatus] = useState('open'); const [rows, setRows] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setRows(null); api.listAlerts(partner.id, { status }).then(setRows).catch((e) => setErr(e.message)); }, [partner.id, status]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const ack = async (id) => { try { await api.ackAlert(id); load(); } catch (e) { setErr(e.message); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[['open', 'Open'], ['acknowledged', 'Acknowledged'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setStatus(k)} className={`h-9 px-3 rounded-lg text-sm font-medium ${status === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{l}</button>
        ))}
      </div>
      {err && <ErrorNote>{err}</ErrorNote>}
      <div className="ui-card divide-y divide-slate-100 overflow-hidden">
        {!rows && <Spinner />}
        {rows?.length === 0 && <p className="px-4 py-8 text-sm text-slate-500 text-center">{status === 'open' ? 'No open alerts. MICHAEL alerts appear here within 2 hours of detection.' : 'Nothing here.'}</p>}
        {rows?.map((a) => {
          const farmerMsg = a.notify_result?.farmer_sms;
          return (
            <div key={a.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-semibold text-slate-900">{api.HAZARD_LABEL[a.hazard] || a.hazard} · {a.fields?.name}</p>
                <LevelChip level={a.severity} />
              </div>
              <p className="text-sm text-slate-600">{a.fields?.farmers?.full_name}{a.fields?.crop ? ` · ${a.fields.crop}` : ''} · detected {fmtDate(a.detected_at)}</p>
              {(a.message_en || a.metric) && <p className="text-sm text-slate-700">{a.message_en || `${a.metric}: ${a.value} (threshold ${a.threshold})`}</p>}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="text-xs text-slate-500">Farmer message: {farmerMsg === 'sent' ? 'sent' : (farmerMsg || '–').replace(/^skipped:/, 'not sent (').replace(/_/g, ' ') + (farmerMsg?.startsWith('skipped:') ? ')' : '')}</p>
                {a.status === 'open' && canEdit && (
                  <button type="button" onClick={() => ack(a.id)} className="h-9 px-3 rounded-lg text-sm font-semibold bg-blue-600 text-white flex items-center gap-1.5"><CheckCircle2 size={15} /> Acknowledge</button>
                )}
                {a.status !== 'open' && <span className="text-xs text-slate-500 capitalize">{a.status}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── Reports (weekly / quarterly)
function periodRange(kind) {
  const now = new Date();
  if (kind === 'week') return { from: new Date(now.getTime() - 7 * 86400000), to: now, label: 'Last 7 days' };
  const q = Math.floor(now.getMonth() / 3);
  const thisQ = new Date(now.getFullYear(), q * 3, 1);
  if (kind === 'quarter') return { from: thisQ, to: now, label: `This quarter (Q${q + 1})` };
  const lastQ = new Date(thisQ.getFullYear(), thisQ.getMonth() - 3, 1);
  return { from: lastQ, to: thisQ, label: `Last quarter (Q${((q + 3) % 4) + 1} ${lastQ.getFullYear()})` };
}

export function ReportsTab({ partner }) {
  const [kind, setKind] = useState('week'); const [s, setS] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const range = useMemo(() => periodRange(kind), [kind]);
  useEffect(() => { setS(null); setErr(''); api.riskSummary(partner.id, range.from.toISOString(), range.to.toISOString()).then(setS).catch((e) => setErr(e.message)); }, [partner.id, range]);
  const exportCsv = async () => {
    setBusy(true);
    try {
      const rows = await api.alertsBetween(partner.id, range.from.toISOString(), range.to.toISOString());
      const flat = rows.map((a) => ({
        detected_at: a.detected_at, received_at: a.received_at,
        within_2h: a.received_at && (new Date(a.received_at) - new Date(a.detected_at)) <= 7200000 ? 'yes' : 'no',
        field: a.fields?.name, crop: a.fields?.crop, hectares: a.fields?.area_ha, farmer: a.fields?.farmers?.full_name,
        hazard: api.HAZARD_LABEL[a.hazard] || a.hazard, severity: a.severity, value: a.value, threshold: a.threshold,
        status: a.status, farmer_message: a.notify_result?.farmer_sms ?? '',
      }));
      api.downloadText(`${partner.code}-alerts-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv`,
        flat.length ? api.toCsv(flat) : 'no alerts in this period\n');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const lv = s?.risk_levels || {};
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {[['week', 'Last 7 days'], ['quarter', 'This quarter'], ['last_quarter', 'Last quarter']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`h-9 px-3 rounded-lg text-sm font-medium ${kind === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{l}</button>
        ))}
      </div>
      {err && <ErrorNote>{err}</ErrorNote>}
      {!s && !err && <Spinner />}
      {s && (
        <>
          <div className="ui-card p-4 space-y-1">
            <p className="text-base font-semibold text-slate-900">{range.label}</p>
            <p className="text-sm text-slate-500">{range.from.toLocaleDateString()} – {range.to.toLocaleDateString()} · MICHAEL agricultural risk monitoring</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Monitored fields', s.monitored_fields], ['Monitored hectares', Number(s.monitored_hectares).toFixed(1)], ['Alerts', s.alerts_total],
              ['Within 2 hours', s.alerts_within_2h_pct == null ? '–' : `${s.alerts_within_2h_pct}%`]].map(([k, v]) => (
              <div key={k} className="ui-card p-4"><p className="text-sm text-slate-500">{k}</p><p className="ui-amount text-2xl text-slate-900 mt-1">{v}</p></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="ui-card p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Fields by current risk</p>
              {Object.entries(api.LEVEL_STYLE).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-700"><span className="w-3 h-3 rounded-sm" style={{ background: v.color }} />{v.label}</span><span className="font-semibold">{lv[k] || 0}</span></div>
              ))}
            </div>
            <div className="ui-card p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Alerts by hazard</p>
              {Object.keys(s.alerts_by_hazard || {}).length === 0 && <p className="text-sm text-slate-500">No alerts in this period.</p>}
              {Object.entries(s.alerts_by_hazard || {}).map(([k, n]) => (
                <div key={k} className="flex items-center justify-between text-sm"><span className="text-slate-700">{api.HAZARD_LABEL[k] || k}</span><span className="font-semibold">{n}</span></div>
              ))}
              <p className="text-sm text-slate-500 pt-1">Farmers notified: {s.farmers_notified}</p>
            </div>
          </div>
          {s.top_fields?.length > 0 && (
            <div className="ui-card divide-y divide-slate-100">
              <p className="px-4 py-3 text-sm font-semibold text-slate-900">Fields needing attention</p>
              {s.top_fields.map((t) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-slate-800 truncate">{t.name} · {t.farmer}</span><LevelChip level={t.level} />
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={exportCsv} disabled={busy} className="ui-btn ui-btn-secondary sm:!w-auto">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download alerts (CSV)
          </button>
          <p className="text-sm text-slate-500">Owners and admins also receive this report by email every Monday, and a quarterly summary.</p>
        </>
      )}
    </div>
  );
}
