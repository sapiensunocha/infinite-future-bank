import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, Map as MapIcon, LayoutDashboard, UserPlus, Upload, Search, ChevronLeft, ChevronRight, Plus,
  Loader2, Sprout, Ruler, Activity, Trash2, ShieldCheck, Building2, CheckCircle2, AlertTriangle, X, BellRing, FileBarChart,
} from 'lucide-react';
import FieldMapEditor, { FieldsOverviewMap } from './FieldMapEditor';
import { AlertsTab, MonitoringSummary, ReportsTab, RiskFieldsTab, SyncButton } from './MonitoringPanels';
import * as api from './partnersApi';

const ADMIN_ROLES = ['admin', 'admin_l3', 'superadmin'];
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', field_agent: 'Field agent', viewer: 'Viewer' };
const STATUS_STYLE = {
  pending: 'bg-blue-50 text-blue-700', active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-slate-100 text-slate-600', rejected: 'bg-red-50 text-red-700',
};
const STATUS_LABEL = { pending: 'Awaiting monitoring', active: 'Monitored', paused: 'Paused', rejected: 'Rejected' };

// Year-1 targets from agreement GHV-IFB-2026-001 (KPI table). Shown as progress, not promises.
const AGREEMENT_TARGETS = {
  'GHV-IFB-2026-001': { farmers: 500, hectares: 500, label: 'Year 1 targets (agreement GHV-IFB-2026-001)' },
};

function Notice({ kind = 'error', children, onClose }) {
  const s = kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800';
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${s}`}>
      {kind === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{children}</span>
      {onClose && <button type="button" onClick={onClose} aria-label="Dismiss"><X size={16} /></button>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="ui-card p-4">
      <p className="text-sm text-slate-500 flex items-center gap-1.5"><Icon size={16} className="text-blue-600" /> {label}</p>
      <p className="ui-amount text-2xl text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Progress({ label, value, target, unit }) {
  const pct = Math.min(100, target ? (value / target) * 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-slate-700">{label}</span><span className="font-semibold text-slate-900">{Math.round(value).toLocaleString()} / {target.toLocaleString()} {unit}</span></div>
      <div className="h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Overview
function OverviewTab({ partner, refreshKey, canManage, onSynced, onOpenAlerts }) {
  const [ov, setOv] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.overview(partner.id).then(setOv).catch((e) => setErr(e.message)); }, [partner.id, refreshKey]);
  if (err) return <Notice>{err}</Notice>;
  if (!ov) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  const targets = AGREEMENT_TARGETS[partner.agreement_ref];
  const ha = Number(ov.hectares || 0); const mha = Number(ov.monitored_hectares || 0);
  return (
    <div className="space-y-4">
      <MonitoringSummary partner={partner} refreshKey={refreshKey} onOpenAlerts={onOpenAlerts} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Farmers" value={ov.farmers.toLocaleString()} sub={`${ov.farmers_last_30d} in the last 30 days`} />
        <Stat icon={Sprout} label="Fields" value={ov.fields.toLocaleString()} />
        <Stat icon={Ruler} label="Hectares mapped" value={ha.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
        <Stat icon={Activity} label="Monitored by MICHAEL" value={`${mha.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha`} sub={`${ov.monitored_fields} fields`} />
      </div>
      {targets && (
        <div className="ui-card p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">{targets.label}</p>
          <Progress label="Enrolled farmers" value={ov.farmers} target={targets.farmers} unit="" />
          <Progress label="MICHAEL-monitored farms" value={mha} target={targets.hectares} unit="ha" />
          <p className="text-sm text-slate-500">
            Women farmers: {ov.farmers ? Math.round((ov.farmers_female / ov.farmers) * 100) : 0}%.
            New fields are monitored once they are registered with MICHAEL.
          </p>
        </div>
      )}
      {canManage && <SyncButton partner={partner} onDone={onSynced} />}
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Farmers
function ConsentBox({ language, method, setMethod, confirmed, setConfirmed, bulk }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><ShieldCheck size={16} className="text-blue-600" /> Farmer consent</p>
      <p className="text-sm text-slate-700 italic">“{api.CONSENT_TEXT[language] || api.CONSENT_TEXT.fr}”</p>
      <div>
        <label className="ui-label">How was consent given?</label>
        <select className="ui-input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="signed_form">Signed consent form</option>
          <option value="recorded_verbal">Read aloud and agreed (recorded)</option>
        </select>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-slate-800">
        <input type="checkbox" className="w-5 h-5 mt-0.5 accent-blue-600" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        {bulk ? 'I confirm every farmer in this file was read this statement and agreed.' : 'I confirm the farmer was read this statement and agreed.'}
      </label>
    </div>
  );
}

function AddFarmerForm({ partner, onDone, onCancel }) {
  const [f, setF] = useState({ full_name: '', phone: '', gender: '', birth_year: '', region: '', locality: '', language: 'fr', external_ref: '' });
  const [method, setMethod] = useState('signed_form'); const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!confirmed) { setErr('Please confirm the farmer gave consent.'); return; }
    setBusy(true);
    try { const r = await api.addFarmer(partner.id, f, method); onDone(r.id); }
    catch (x) { setErr(/duplicate|unique/i.test(x.message) ? 'A farmer with this phone number or reference already exists.' : x.message); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="ui-label">Full name *</label><input className="ui-input" required minLength={2} value={f.full_name} onChange={set('full_name')} /></div>
        <div><label className="ui-label">Phone</label><input className="ui-input" inputMode="tel" placeholder="+237 6 77 12 34 56" value={f.phone} onChange={set('phone')} /></div>
        <div><label className="ui-label">Partner reference</label><input className="ui-input" placeholder="e.g. GHV-0001" value={f.external_ref} onChange={set('external_ref')} /></div>
        <div><label className="ui-label">Gender</label>
          <select className="ui-input" value={f.gender} onChange={set('gender')}><option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="undisclosed">Prefer not to say</option></select></div>
        <div><label className="ui-label">Year of birth</label><input className="ui-input" inputMode="numeric" maxLength={4} value={f.birth_year} onChange={set('birth_year')} /></div>
        <div><label className="ui-label">Region</label><input className="ui-input" placeholder="e.g. Centre" value={f.region} onChange={set('region')} /></div>
        <div><label className="ui-label">Village / locality</label><input className="ui-input" value={f.locality} onChange={set('locality')} /></div>
        <div><label className="ui-label">Language</label>
          <select className="ui-input" value={f.language} onChange={set('language')}><option value="fr">Français</option><option value="en">English</option></select></div>
      </div>
      <ConsentBox language={f.language} method={method} setMethod={setMethod} confirmed={confirmed} setConfirmed={setConfirmed} />
      {err && <Notice>{err}</Notice>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary">Cancel</button>
        <button disabled={busy} className="ui-btn ui-btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Enrol farmer</button>
      </div>
    </form>
  );
}

function ImportFarmers({ partner, onDone, onCancel }) {
  const [rows, setRows] = useState(null); const [fileName, setFileName] = useState('');
  const [method, setMethod] = useState('signed_form'); const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [result, setResult] = useState(null);
  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(''); setResult(null); setFileName(file.name);
    try {
      const parsed = api.parseCsv(await file.text()).filter((r) => r.full_name);
      if (!parsed.length) throw new Error('No rows with a "full_name" (or "nom") column were found.');
      if (parsed.length > 1000) throw new Error('Please import at most 1,000 farmers per file.');
      setRows(parsed);
    } catch (x) { setRows(null); setErr(x.message); }
  };
  const run = async () => {
    if (!confirmed) { setErr('Please confirm every farmer gave consent.'); return; }
    setBusy(true); setErr('');
    try { setResult(await api.importFarmers(partner.id, rows, method)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  if (result) {
    const problems = result.results.filter((r) => r.status !== 'created');
    return (
      <div className="space-y-4">
        <Notice kind="ok">{result.created} of {result.total} farmers enrolled.</Notice>
        {problems.length > 0 && (
          <div className="ui-card divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {problems.map((p) => (
              <p key={p.row} className="px-4 py-2.5 text-sm"><span className="font-medium text-slate-900">Row {p.row + 1}</span> <span className="text-slate-500">({rows[p.row - 1]?.full_name})</span>: <span className="text-red-700">{p.error}</span></p>
            ))}
          </div>
        )}
        <button type="button" onClick={onDone} className="ui-btn ui-btn-primary">Done</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="ui-card p-4 text-sm text-slate-600 space-y-1">
        <p className="font-semibold text-slate-900">CSV columns</p>
        <p><code>full_name</code> (required), <code>phone</code>, <code>gender</code>, <code>birth_year</code>, <code>region</code>, <code>locality</code>, <code>language</code> (fr/en), <code>external_ref</code>. French headers (nom, téléphone, sexe, village, langue) also work.</p>
      </div>
      <label className="ui-btn ui-btn-secondary cursor-pointer">
        <Upload size={16} /> {fileName || 'Choose a CSV file'}
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      </label>
      {rows && <p className="text-sm text-slate-700">{rows.length} farmers found in the file. Duplicates and invalid rows are skipped and listed after import.</p>}
      {rows && <ConsentBox language="fr" method={method} setMethod={setMethod} confirmed={confirmed} setConfirmed={setConfirmed} bulk />}
      {err && <Notice>{err}</Notice>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary">Cancel</button>
        <button type="button" disabled={!rows || busy} onClick={run} className="ui-btn ui-btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import {rows ? rows.length : ''}</button>
      </div>
    </div>
  );
}

function AddFieldForm({ partner, farmer, onDone, onCancel }) {
  const [points, setPoints] = useState([]);
  const [f, setF] = useState({ name: '', crop: '', planting_date: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (points.length < 3) { setErr('Mark at least 3 corners of the field on the map.'); return; }
    setBusy(true);
    try {
      const farmId = await api.ensureFarm(partner.id, farmer.id);
      await api.addField(partner.id, farmId, { ...f, name: f.name || `Field ${new Date().toLocaleDateString()}`, boundary: api.toGeoJsonPolygon(points) });
      onDone();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <FieldMapEditor value={points} onChange={setPoints} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="ui-label">Field name</label><input className="ui-input" placeholder="e.g. North plot" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="ui-label">Crop</label><input className="ui-input" list="ifb-crops" placeholder="e.g. Cocoa" value={f.crop} onChange={(e) => setF({ ...f, crop: e.target.value })} />
          <datalist id="ifb-crops">{['Cocoa', 'Coffee', 'Maize', 'Cassava', 'Plantain', 'Rice', 'Groundnut', 'Beans', 'Sorghum', 'Millet', 'Tomato', 'Oil palm', 'Cotton'].map((c) => <option key={c} value={c} />)}</datalist></div>
        <div><label className="ui-label">Planting date</label><input type="date" className="ui-input" value={f.planting_date} onChange={(e) => setF({ ...f, planting_date: e.target.value })} /></div>
      </div>
      {err && <Notice>{err}</Notice>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary">Cancel</button>
        <button disabled={busy} className="ui-btn ui-btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save field</button>
      </div>
    </form>
  );
}

function FarmerDetail({ partner, farmerId, canEdit, canManage, onBack, onChanged }) {
  const [farmer, setFarmer] = useState(null); const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const list = await api.listFarmers(partner.id); // RLS-scoped; small partner lists in Phase 1
      setFarmer(list.find((x) => x.id === farmerId) || null);
      setData(await api.farmerFarmsAndFields(farmerId));
    } catch (x) { setErr(x.message); }
  }, [partner.id, farmerId]);
  useEffect(() => { load(); }, [load]);
  if (err) return <Notice>{err}</Notice>;
  if (!farmer || !data) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  const totalHa = data.fields.reduce((s, x) => s + Number(x.area_ha || 0), 0);
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="h-10 -ml-1 pr-3 inline-flex items-center gap-1 text-[15px] font-medium text-blue-600"><ChevronLeft size={20} /> Farmers</button>
      <div className="ui-card p-4">
        <p className="text-xl font-semibold text-slate-900">{farmer.full_name}</p>
        <p className="text-sm text-slate-500 mt-0.5">{[farmer.phone, farmer.locality, farmer.region, farmer.external_ref].filter(Boolean).join(' · ') || 'No contact details'}</p>
        <p className="text-sm text-slate-700 mt-2">{data.fields.length} field{data.fields.length === 1 ? '' : 's'} · {totalHa.toFixed(2)} ha</p>
      </div>
      {adding ? (
        <div className="ui-card p-4"><p className="text-base font-semibold text-slate-900 mb-3">New field</p>
          <AddFieldForm partner={partner} farmer={farmer} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); onChanged(); }} /></div>
      ) : (
        <>
          {data.fields.length > 0 && <FieldsOverviewMap fields={data.fields} height={260} />}
          <div className="ui-card divide-y divide-slate-100 overflow-hidden">
            {data.fields.length === 0 && <p className="px-4 py-6 text-sm text-slate-500 text-center">No fields mapped yet.</p>}
            {data.fields.map((x) => (
              <div key={x.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Sprout size={18} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-slate-900 truncate">{x.name}{x.crop ? ` · ${x.crop}` : ''}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">{Number(x.area_ha).toFixed(2)} ha
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLE[x.monitoring_status]}`}>{STATUS_LABEL[x.monitoring_status]}</span></p>
                </div>
                {canManage && (
                  <button type="button" aria-label="Delete field" className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                    onClick={async () => { if (window.confirm(`Delete field "${x.name}"?`)) { await api.deleteField(x.id); load(); onChanged(); } }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {canEdit && <button type="button" onClick={() => setAdding(true)} className="ui-btn ui-btn-primary"><MapIcon size={16} /> Map a field</button>}
        </>
      )}
    </div>
  );
}

function FarmersTab({ partner, canEdit, canManage, onChanged }) {
  const [mode, setMode] = useState('list'); // list | add | import | detail
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState(''); const [rows, setRows] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { api.listFarmers(partner.id, q).then(setRows).catch((x) => setErr(x.message)); }, [partner.id, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  if (mode === 'add') return <div className="ui-card p-4 md:p-6"><p className="text-base font-semibold text-slate-900 mb-4">Enrol a farmer</p>
    <AddFarmerForm partner={partner} onCancel={() => setMode('list')} onDone={(id) => { onChanged(); setSelected(id); setMode('detail'); }} /></div>;
  if (mode === 'import') return <div className="ui-card p-4 md:p-6"><p className="text-base font-semibold text-slate-900 mb-4">Import farmers from CSV</p>
    <ImportFarmers partner={partner} onCancel={() => setMode('list')} onDone={() => { onChanged(); setMode('list'); load(); }} /></div>;
  if (mode === 'detail') return <FarmerDetail partner={partner} farmerId={selected} canEdit={canEdit} canManage={canManage} onBack={() => { setMode('list'); load(); }} onChanged={onChanged} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="ui-input pl-11" placeholder="Search name, phone or reference" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('add')} className="ui-btn ui-btn-primary sm:!w-auto"><UserPlus size={16} /> Enrol</button>
            <button type="button" onClick={() => setMode('import')} className="ui-btn ui-btn-secondary sm:!w-auto"><Upload size={16} /> Import CSV</button>
          </div>
        )}
      </div>
      {err && <Notice onClose={() => setErr('')}>{err}</Notice>}
      <div className="ui-card divide-y divide-slate-100 overflow-hidden">
        {!rows && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
        {rows?.length === 0 && <p className="px-4 py-8 text-sm text-slate-500 text-center">{q ? 'No farmers match your search.' : 'No farmers enrolled yet.'}</p>}
        {rows?.map((f) => (
          <button key={f.id} type="button" onClick={() => { setSelected(f.id); setMode('detail'); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
            <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center justify-center shrink-0">{f.full_name.charAt(0).toUpperCase()}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-slate-900 truncate">{f.full_name}</span>
              <span className="block text-sm text-slate-500 truncate">{[f.phone, f.locality || f.region].filter(Boolean).join(' · ') || '—'}</span>
            </span>
            {f.status !== 'active' && <span className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-600 capitalize">{f.status}</span>}
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Team
function TeamTab({ partner, canManage, myId }) {
  const [rows, setRows] = useState(null); const [email, setEmail] = useState(''); const [role, setRole] = useState('field_agent');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const load = useCallback(() => { api.listMembers(partner.id).then(setRows).catch((x) => setMsg({ kind: 'error', text: x.message })); }, [partner.id]);
  useEffect(() => { load(); }, [load]);
  const add = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api.setMember(partner.id, email, role); setEmail(''); setMsg({ kind: 'ok', text: 'Team member saved.' }); load(); }
    catch (x) { setMsg({ kind: 'error', text: x.message }); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      {canManage && (
        <form onSubmit={add} className="ui-card p-4 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div><label className="ui-label">Email of an IFB account</label><input type="email" required className="ui-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@greenhouse.cm" /></div>
          <div><label className="ui-label">Role</label>
            <select className="ui-input" value={role} onChange={(e) => setRole(e.target.value)}><option value="field_agent">Field agent</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></div>
          <button disabled={busy} className="ui-btn ui-btn-primary sm:!w-auto">{busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Add</button>
        </form>
      )}
      {msg && <Notice kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      <div className="ui-card divide-y divide-slate-100 overflow-hidden">
        {!rows && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
        {rows?.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-slate-900 truncate">{m.full_name || m.email}</p>
              <p className="text-sm text-slate-500 truncate">{m.email}</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-700">{ROLE_LABEL[m.role]}</span>
            {canManage && m.user_id !== myId && (
              <button type="button" aria-label="Remove member" className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                onClick={async () => { if (!window.confirm(`Remove ${m.email} from ${partner.name}?`)) return; try { await api.removeMember(partner.id, m.user_id); load(); } catch (x) { setMsg({ kind: 'error', text: x.message }); } }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">Field agents enrol farmers and map fields. Viewers can only look. Admins also manage the team.</p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Admin: create partner
function CreatePartner({ onCreated }) {
  const [p, setP] = useState({ code: 'GHV', name: 'Greenhouse Ventures', legal_name: 'Greenhouse Ventures Ltd', country: 'CM', agreement_ref: 'GHV-IFB-2026-001', owner_email: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.createPartner(p); onCreated(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="ui-card p-4 md:p-6 space-y-4">
      <p className="text-base font-semibold text-slate-900 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> Add an implementation partner (IFB admins)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="ui-label">Code</label><input className="ui-input uppercase" required pattern="[A-Za-z0-9]{2,12}" value={p.code} onChange={set('code')} /></div>
        <div><label className="ui-label">Country (ISO code)</label><input className="ui-input uppercase" required maxLength={2} value={p.country} onChange={set('country')} /></div>
        <div><label className="ui-label">Name</label><input className="ui-input" required value={p.name} onChange={set('name')} /></div>
        <div><label className="ui-label">Legal name</label><input className="ui-input" value={p.legal_name} onChange={set('legal_name')} /></div>
        <div><label className="ui-label">Agreement reference</label><input className="ui-input" value={p.agreement_ref} onChange={set('agreement_ref')} /></div>
        <div><label className="ui-label">Owner's IFB account email</label><input type="email" required className="ui-input" value={p.owner_email} onChange={set('owner_email')} /></div>
      </div>
      {err && <Notice>{err}</Notice>}
      <button disabled={busy} className="ui-btn ui-btn-primary sm:!w-auto">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create partner</button>
    </form>
  );
}

// ───────────────────────────────────────────────────────────── Hub
export default function PartnerHub({ session, profile }) {
  const myId = session?.user?.id;
  const isIfbAdmin = ADMIN_ROLES.includes(profile?.role);
  const [partners, setPartners] = useState(null); const [err, setErr] = useState('');
  const [partnerId, setPartnerId] = useState(null); const [role, setRole] = useState(null);
  const [tab, setTab] = useState('overview'); const [refreshKey, setRefreshKey] = useState(0);
  const [creating, setCreating] = useState(false);

  const loadPartners = useCallback(() => {
    api.myPartners().then((rows) => { setPartners(rows); setPartnerId((cur) => cur || rows[0]?.id || null); }).catch((x) => setErr(x.message));
  }, []);
  useEffect(() => { loadPartners(); }, [loadPartners]);
  useEffect(() => { if (partnerId && myId) api.myRole(partnerId, myId).then(setRole).catch(() => setRole(null)); }, [partnerId, myId]);

  const partner = useMemo(() => partners?.find((p) => p.id === partnerId), [partners, partnerId]);
  const effective = isIfbAdmin && !role ? 'admin' : role;
  const canEdit = ['owner', 'admin', 'field_agent'].includes(effective);
  const canManage = ['owner', 'admin'].includes(effective);
  const bump = () => setRefreshKey((k) => k + 1);

  if (err) return <div className="p-4"><Notice>{err.includes('does not exist') ? 'Partner features are not enabled on this server yet.' : err}</Notice></div>;
  if (!partners) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  if (!partners.length || creating) {
    return (
      <div className="ui-page space-y-4 p-1">
        {isIfbAdmin ? (
          <CreatePartner onCreated={() => { setCreating(false); loadPartners(); }} />
        ) : (
          <div className="ui-card p-6 text-center space-y-2">
            <Building2 size={28} className="mx-auto text-blue-600" />
            <p className="text-lg font-semibold text-slate-900">Partner Hub</p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">For IFB implementation partners and their field teams: enrol farmers, map their fields and follow MICHAEL monitoring. Ask your partner admin to add your IFB account to the team.</p>
          </div>
        )}
      </div>
    );
  }

  const TABS = [
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'farmers', label: 'Farmers', Icon: Users },
    { id: 'fields', label: 'Fields', Icon: MapIcon },
    { id: 'alerts', label: 'Alerts', Icon: BellRing },
    { id: 'reports', label: 'Reports', Icon: FileBarChart },
    { id: 'team', label: 'Team', Icon: ShieldCheck },
  ];

  return (
    <div className="ui-page space-y-4 p-1">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500">{partner?.country} · {partner?.agreement_ref || 'Implementation partner'}{effective ? ` · ${ROLE_LABEL[effective] || effective}` : ''}</p>
          {partners.length > 1 ? (
            <select className="ui-input !h-11 mt-1 font-semibold" value={partnerId || ''} onChange={(e) => { setPartnerId(e.target.value); setTab('overview'); }}>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : <p className="text-xl font-semibold text-slate-900 truncate">{partner?.name}</p>}
        </div>
        {isIfbAdmin && <button type="button" onClick={() => setCreating(true)} className="ui-btn ui-btn-secondary !w-auto !h-10 px-3 text-sm"><Plus size={15} /> Partner</button>}
      </div>
      {partner?.status !== 'active' && <Notice>This partner is {partner?.status}. Enrolment is disabled.</Notice>}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={(e) => { setTab(id); e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }}
            className={`flex-1 min-w-[76px] px-2 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <Icon size={15} className="hidden sm:block" /> {label}
          </button>
        ))}
      </div>

      {partner && tab === 'overview' && <OverviewTab partner={partner} refreshKey={refreshKey} canManage={canManage} onSynced={bump} onOpenAlerts={() => setTab('alerts')} />}
      {partner && tab === 'farmers' && <FarmersTab partner={partner} canEdit={canEdit && partner.status === 'active'} canManage={canManage} onChanged={bump} />}
      {partner && tab === 'fields' && <RiskFieldsTab partner={partner} refreshKey={refreshKey} canManage={canManage} onChanged={bump} />}
      {partner && tab === 'alerts' && <AlertsTab partner={partner} canEdit={canEdit} refreshKey={refreshKey} />}
      {partner && tab === 'reports' && <ReportsTab partner={partner} />}
      {partner && tab === 'team' && <TeamTab partner={partner} canManage={canManage} myId={myId} />}
    </div>
  );
}
