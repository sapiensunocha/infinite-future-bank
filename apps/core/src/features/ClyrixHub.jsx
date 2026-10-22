import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, ShieldAlert, Users, FileSignature, MapPin, 
  Activity, ArrowRightLeft, Target, QrCode, X, CheckCircle2, 
  Camera, AlertTriangle, Loader2, Stethoscope, ChevronRight 
} from 'lucide-react';
import QRCode from "react-qr-code";

export default function ClyrixHub({ session, profile, balances, triggerNotification }) {
  const [activeView, setActiveView] = useState('OVERVIEW'); // OVERVIEW, CODE_RED, VALIDATE, SYNDICATE, LABOR
  
  // Simulated Back-End States for UI Demonstration
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrData, setQrData] = useState(null);
  
  // Dynamic Calculation: Liquid Cash + Simulated Asset Value + Trust Multiplier
  const trustScore = profile?.kyc_status === 'verified' ? 94 : 62;
  const assetAppraisal = 1500; // Simulated value of physical assets (crops, land)
  const medicalLiquidity = (balances?.liquid_usd || 0) + (balances?.mysafe_digital_usd || 0) + assetAppraisal;

  const handleAction = async (actionName, delay = 1500) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    triggerNotification('success', `${actionName} executed successfully on the Sovereign Ledger.`);
    setIsProcessing(false);
    setActiveView('OVERVIEW');
  };

  const handleCodeRed = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setQrData(`CLYRIX_AUTH_${session.user.id}_${Date.now()}`);
    setIsProcessing(false);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <HeartPulse size={32} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Clyrix Health Node</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Sovereign Medical Ledger</p>
          </div>
        </div>
        {activeView !== 'OVERVIEW' && (
          <button onClick={() => setActiveView('OVERVIEW')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
            Back to Hub
          </button>
        )}
      </div>

      {/* DYNAMIC VIEWS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* ========================================== */}
        {/* VIEW: OVERVIEW (THE 5 BLOCS) */}
        {/* ========================================== */}
        {activeView === 'OVERVIEW' && (
          <div className="space-y-8">
            {/* Purchasing Power & Telemetry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-emerald-500"><HeartPulse size={120}/></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Available Medical Liquidity</p>
                <h3 className="text-5xl font-black text-white mb-2">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(medicalLiquidity)}
                  <span className="text-xl text-slate-500 ml-2">AFR</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium max-w-sm leading-relaxed">
                  Calculated dynamically from liquid USD, digital vault assets, and peer-verified physical collateral.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Pascaline Trust Score</p>
                  <Activity className="text-blue-500" size={20} />
                </div>
                <div>
                  <h2 className="text-5xl font-black text-slate-800">{trustScore}<span className="text-xl text-slate-400">/100</span></h2>
                  <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-widest bg-emerald-50 inline-block px-2 py-1 rounded-md">Auto-Clearance Eligible</p>
                </div>
              </div>
            </div>

            {/* The Interaction Matrix (Blocs 1-4) */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Adaptive Health Matrix</h4>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveView('CODE_RED')} className="bg-red-50 hover:bg-red-100 border border-red-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-red-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><AlertTriangle size={24}/></div>
                  <div>
                    <h5 className="font-black text-red-900">Code Red Triage</h5>
                    <p className="text-xs text-red-700/80 font-medium mt-1">Generate Instant Hospital Settlement QR</p>
                  </div>
                </button>
                
                <button onClick={() => setActiveView('VALIDATE')} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><MapPin size={24}/></div>
                  <div>
                    <h5 className="font-black text-blue-900">Peer Asset Verification</h5>
                    <p className="text-xs text-blue-700/80 font-medium mt-1">Earn AFR verifying physical collateral</p>
                  </div>
                </button>

                <button onClick={() => setActiveView('SYNDICATE')} className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><Users size={24}/></div>
                  <div>
                    <h5 className="font-black text-indigo-900">Syndicate Co-Sign</h5>
                    <p className="text-xs text-indigo-700/80 font-medium mt-1">Pledge or request community underwriting</p>
                  </div>
                </button>

                <button onClick={() => setActiveView('LABOR')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><FileSignature size={24}/></div>
                  <div>
                    <h5 className="font-black text-emerald-900">Labor Pledge Contracts</h5>
                    <p className="text-xs text-emerald-700/80 font-medium mt-1">Exchange future labor for instant credit</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: BLOC 1 - CODE RED */}
        {/* ========================================== */}
        {activeView === 'CODE_RED' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="text-center max-w-md">
              <ShieldAlert size={64} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800">Emergency Hospital Settlement</h3>
              <p className="text-sm text-slate-500 mt-2">Generate a cryptographic token for the hospital intake desk. This will instantly draw from your {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(medicalLiquidity)} limit.</p>
            </div>

            {qrData ? (
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95">
                <QRCode value={qrData} size={220} fgColor="#0f172a" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-6 flex items-center gap-2"><CheckCircle2 size={14}/> Settlement Route Active</p>
                <button onClick={() => setQrData(null)} className="mt-6 text-xs font-bold text-slate-500 hover:text-slate-800">Cancel Token</button>
              </div>
            ) : (
              <button 
                onClick={handleCodeRed} 
                disabled={isProcessing}
                className="w-full max-w-sm bg-red-600 text-white rounded-3xl p-6 font-black text-lg shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:bg-red-500 hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : 'GENERATE ATOMIC TOKEN'}
              </button>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: BLOC 2 - VALIDATOR */}
        {/* ========================================== */}
        {activeView === 'VALIDATE' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 mb-2">Local Asset Bounties</h3>
            <p className="text-sm text-slate-500 mb-6">Visit these GPS coordinates, verify the physical asset via camera, and earn AFR instantly.</p>
            
            {[
              { id: 1, type: 'Maize Crop Yield', dist: '1.2 km', user: 'Farmer #892', reward: '5.00 AFR' },
              { id: 2, type: 'Industrial Generator', dist: '3.4 km', user: 'Mechanic #114', reward: '12.50 AFR' }
            ].map(bounty => (
              <div key={bounty.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-4 rounded-2xl text-slate-500"><Camera size={24}/></div>
                  <div>
                    <p className="font-bold text-slate-800">{bounty.type}</p>
                    <p className="text-xs text-slate-500">{bounty.user} • {bounty.dist} away</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-black text-blue-600">{bounty.reward}</p>
                  <button 
                    onClick={() => handleAction('Asset Verification Upload')}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: BLOC 3 - SYNDICATE */}
        {/* ========================================== */}
        {activeView === 'SYNDICATE' && (
          <div className="space-y-6">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden mb-8">
              <Users size={100} className="absolute right-0 top-0 opacity-10 -translate-y-4" />
              <h3 className="text-2xl font-black mb-2 relative z-10">Syndicate Co-Signing</h3>
              <p className="text-indigo-200 text-sm max-w-md relative z-10">Mathematically guarantee the health of your community by pledging fractional percentages of your future network yields.</p>
            </div>

            <h4 className="text-sm font-black text-slate-800">Pending Network Requests</h4>
            {[
              { name: 'Sarah M.', reason: 'Emergency Surgery (Nairobi Gen)', amount: '$850.00', pledged: '60%' },
              { name: 'Community Pool #4', reason: 'Preventative Malaria Medicine', amount: '$2,000.00', pledged: '85%' }
            ].map((req, i) => (
              <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{req.name}</p>
                    <p className="text-xs text-slate-500">{req.reason}</p>
                  </div>
                  <p className="font-black text-indigo-600">{req.amount}</p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                    <span>Underwritten</span><span>{req.pledged}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: req.pledged }}></div>
                  </div>
                </div>
                <button 
                  onClick={() => handleAction('Syndicate Pledge')}
                  disabled={isProcessing}
                  className="w-full py-3 bg-slate-50 border border-slate-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                >
                  Pledge 1.5% Future Yield
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: BLOC 4 - LABOR PLEDGE */}
        {/* ========================================== */}
        {activeView === 'LABOR' && (
          <div className="space-y-6">
            <div className="text-center max-w-md mx-auto py-6">
              <FileSignature size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800">Labor Equity Contracts</h3>
              <p className="text-sm text-slate-500 mt-2">Zero assets? Pledge future physical labor to local IFB merchants to instantly clear medical debt today.</p>
            </div>

            {[
              { company: 'IFB Infrastructure Dev', role: 'General Labor', hours: 40, credit: '500.00 AFR' },
              { company: 'AgriCorp Co-op', role: 'Harvesting', hours: 80, credit: '850.00 AFR' }
            ].map((job, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-black text-emerald-900">{job.company}</p>
                  <p className="text-xs text-emerald-700/80 font-bold">{job.role} • {job.hours} Hours Required</p>
                </div>
                <div className="flex flex-col md:items-end w-full md:w-auto">
                  <p className="font-black text-lg text-emerald-600 mb-2">{job.credit} Medical Credit</p>
                  <button 
                    onClick={() => handleAction('Labor Smart Contract Signed', 2500)}
                    disabled={isProcessing}
                    className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex justify-center items-center gap-2"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Sign Smart Contract'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}