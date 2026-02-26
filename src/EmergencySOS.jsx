import { useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  AlertCircle, 
  HelpCircle, 
  Info, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  X, 
  Loader2,
  Clock,
  Banknote
} from 'lucide-react';

export default function EmergencySOS({ session, balances }) {
  const [activeTab, setActiveTab] = useState('REQUEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestStatus, setRequestStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS
  const [notification, setNotification] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(val || 0);

  // Simple, transparent calculation based on user data
  const baseEquity = balances?.alpha_equity_usd || 0;
  const maxAdvance = baseEquity > 0 ? baseEquity * 0.5 : 1000.00;

  const handleRequestAdvance = async () => {
    setIsProcessing(true);
    setRequestStatus('PROCESSING');
    
    try {
      // Direct call to the processing engine
      const { error } = await supabase.rpc('process_sos_advance', {
        p_user_id: session.user.id,
        p_amount: maxAdvance
      });

      if (error) throw error;

      setRequestStatus('SUCCESS');
      setTimeout(() => {
        setIsProcessing(false);
        setRequestStatus('IDLE');
      }, 5000);

    } catch (err) {
      console.error("Request Failed:", err);
      setNotification({ type: 'error', text: "Request could not be processed. Please contact support." });
      setIsProcessing(false);
      setRequestStatus('IDLE');
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-slate-800">
      
      {/* 🏛️ Professional Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Emergency Liquidity</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Access immediate capital during financial hardship</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {['REQUEST', 'TERMS'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'REQUEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
          
          {/* Main Balance Info */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-10 md:p-12 rounded-[2.5rem] shadow-sm flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                <Banknote size={18} className="text-blue-600"/> Available Emergency Advance
              </h3>
              <h2 className="text-6xl font-black text-slate-800 tracking-tighter mb-4">{formatCurrency(maxAdvance)}</h2>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-10">
                You are eligible for a 0% interest advance. These funds are drawn from the global liquidity pool and are designed to provide immediate stability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><CheckCircle2 size={20}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">No Interest</p>
                  <p className="text-xs text-slate-500 mt-1">Institutional 0.0% APR for all eligible users.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><CheckCircle2 size={20}/></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Soft Recovery</p>
                  <p className="text-xs text-slate-500 mt-1">Automatic repayment only when your income stabilizes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-xl text-white h-full flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-red-400 mb-8 border border-white/10"><AlertCircle size={32}/></div>
                <h3 className="text-2xl font-black mb-4">Request Capital</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-10">
                  By clicking below, you confirm you are in an emergency situation and require immediate capital. Funds will be deposited into your main USD account instantly.
                </p>
              </div>

              <button 
                onClick={handleRequestAdvance}
                disabled={isProcessing}
                className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-2 relative z-10 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'Request Advance Now'}
              </button>

              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><AlertCircle size={200}/></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TERMS' && (
        <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm animate-in slide-in-from-left-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-8">Program Terms & Disclosure</h3>
          <div className="space-y-6 max-w-3xl">
            <div className="flex gap-4">
              <Lock className="text-blue-600 flex-shrink-0" size={20}/>
              <div>
                <p className="font-bold text-slate-800">Collateral Requirement</p>
                <p className="text-sm text-slate-500 mt-1">Emergency advances are partially collateralized by your existing Alpha Equity or future inbound transfers. No credit score check is required.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock className="text-blue-600 flex-shrink-0" size={20}/>
              <div>
                <p className="font-bold text-slate-800">Repayment Period</p>
                <p className="text-sm text-slate-500 mt-1">There is no fixed repayment schedule. Repayment is triggered automatically when your total account balance exceeds a pre-set stability threshold.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Info className="text-blue-600 flex-shrink-0" size={20}/>
              <div>
                <p className="font-bold text-slate-800">Abuse Policy</p>
                <p className="text-sm text-slate-500 mt-1">The Emergency Liquidity program is a safety net for users in distress. Fraudulent use or deliberate system abuse may result in account termination.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {requestStatus === 'SUCCESS' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-white/60 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[3rem] max-w-sm w-full p-12 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40}/></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Transfer Successful</h3>
            <p className="text-sm text-slate-500 mb-8">Capital has been dispatched to your main account. Your balance will update momentarily.</p>
            <button onClick={() => setRequestStatus('IDLE')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATION */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-xl border backdrop-blur-xl flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}></div>
            <p className="font-black text-sm uppercase tracking-widest">{notification.text}</p>
          </div>
        </div>
      )}

    </div>
  );
}