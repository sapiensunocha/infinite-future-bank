import { useState, useEffect } from 'react';
import { Smartphone, Plus, Trash2, Star, CheckCircle2, Loader2, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const FLW_NETWORKS = {
  "MTN":     ["GH","UG","RW","ZM","CM","CI","BJ","SN"],
  "Airtel":  ["UG","KE","TZ","MW","ZM"],
  "M-Pesa":  ["KE","TZ","MZ"],
  "Orange":  ["CM","SN","CI","ML","GN","BF","MG"],
  "Wave":    ["SN","CI","ML","BF","GN","GM"],
  "Vodacom": ["TZ","CD"],
  "Moov":    ["TG","BJ","CI","ML","SN"],
  "TNM":     ["MW"],
};

const COUNTRY_LABELS = {
  GH:"Ghana", NG:"Nigeria", KE:"Kenya", TZ:"Tanzania", UG:"Uganda", RW:"Rwanda",
  SN:"Senegal", CI:"Côte d'Ivoire", CM:"Cameroon", ZM:"Zambia", MW:"Malawi",
  MZ:"Mozambique", ML:"Mali", BF:"Burkina Faso", GN:"Guinea", TG:"Togo",
  BJ:"Benin", CD:"DR Congo", MG:"Madagascar", GM:"Gambia",
};

const NETWORK_COLORS = {
  "MTN": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Airtel": "bg-red-500/20 text-red-400 border-red-500/30",
  "M-Pesa": "bg-green-500/20 text-green-400 border-green-500/30",
  "Orange": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Wave": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Vodacom": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Moov": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "TNM": "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

export default function MobileMoneyAccounts({ userId, onSelectAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [network, setNetwork] = useState('MTN');
  const [country, setCountry] = useState('GH');
  const [phone, setPhone] = useState('');
  const [alias, setAlias] = useState('');

  const availableCountries = FLW_NETWORKS[network] || [];

  useEffect(() => {
    if (userId) loadAccounts();
  }, [userId]);

  const loadAccounts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('user_mobile_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    setAccounts(data || []);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!phone.trim()) return;
    setIsSaving(true);
    await supabase.from('user_mobile_accounts').insert([{
      user_id: userId,
      network,
      country,
      phone: phone.trim(),
      alias: alias.trim() || null,
      is_default: accounts.length === 0,
    }]);
    setPhone('');
    setAlias('');
    setShowForm(false);
    setIsSaving(false);
    loadAccounts();
  };

  const handleDelete = async (id) => {
    await supabase.from('user_mobile_accounts').delete().eq('id', id);
    loadAccounts();
  };

  const handleSetDefault = async (id) => {
    await supabase.from('user_mobile_accounts').update({ is_default: false }).eq('user_id', userId);
    await supabase.from('user_mobile_accounts').update({ is_default: true }).eq('id', id);
    loadAccounts();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-slate-400">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">Loading saved accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Smartphone size={12} /> Saved Accounts
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
        >
          {showForm ? <><X size={12}/> Cancel</> : <><Plus size={12}/> Add</>}
        </button>
      </div>

      {/* Saved account chips */}
      {accounts.length > 0 && (
        <div className="space-y-1.5">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-xl group">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${NETWORK_COLORS[acc.network] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                {acc.network}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{acc.phone}</p>
                {(acc.alias || acc.country) && (
                  <p className="text-[9px] font-bold text-slate-500 truncate">
                    {acc.alias ? `${acc.alias} · ` : ''}{COUNTRY_LABELS[acc.country] || acc.country}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {acc.is_default && <Star size={11} className="text-amber-400 fill-amber-400" />}
                <button
                  onClick={() => onSelectAccount({ network: acc.network, country: acc.country, phone: acc.phone, alias: acc.alias })}
                  className="text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                >
                  Use
                </button>
                {!acc.is_default && (
                  <button onClick={() => handleSetDefault(acc.id)} title="Set as default" className="p-1 text-slate-500 hover:text-amber-400 transition-colors rounded">
                    <Star size={11} />
                  </button>
                )}
                <button onClick={() => handleDelete(acc.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new form */}
      {showForm && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Network</label>
              <select
                value={network}
                onChange={e => { setNetwork(e.target.value); setCountry(FLW_NETWORKS[e.target.value]?.[0] || 'GH'); }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors"
              >
                {Object.keys(FLW_NETWORKS).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Country</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors"
              >
                {availableCountries.map(c => <option key={c} value={c}>{COUNTRY_LABELS[c] || c}</option>)}
              </select>
            </div>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+233XXXXXXXXX"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
          />
          <input
            type="text"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="Label (optional, e.g. My MTN)"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
          />
          <button
            onClick={handleSave}
            disabled={isSaving || !phone.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Save Account
          </button>
        </div>
      )}

      {accounts.length === 0 && !showForm && (
        <p className="text-[9px] font-bold text-slate-600 text-center py-1">No saved accounts yet. Add one above.</p>
      )}
    </div>
  );
}
