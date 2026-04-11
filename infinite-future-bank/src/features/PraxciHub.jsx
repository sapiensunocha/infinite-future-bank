import React, { useState } from 'react';
import { 
  GraduationCap, BrainCircuit, Users, FileSignature, MapPin, 
  Activity, ArrowRightLeft, Target, QrCode, X, CheckCircle2, 
  BookOpen, Zap, Loader2, Award, Library 
} from 'lucide-react';
import QRCode from "react-qr-code";

export default function PraxciHub({ session, profile, balances, triggerNotification }) {
  const [activeView, setActiveView] = useState('OVERVIEW'); // OVERVIEW, ATOMIC_SKILL, TUTOR_AUDIT, ALUMNI_SYNDICATE, LABOR_PLEDGE
  
  // Simulated Back-End States
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrData, setQrData] = useState(null);
  
  // Dynamic Calculation: Liquid Cash + Knowledge Assets
  const proofOfLearningScore = profile?.kyc_status === 'verified' ? 98 : 72;
  const intellectualAppraisal = 2450; // Simulated value of verified skills & micro-credentials
  const knowledgeLiquidity = (balances?.liquid_usd || 0) + intellectualAppraisal;

  const handleAction = async (actionName, delay = 1500) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    triggerNotification('success', `${actionName} executed on the Learning Ledger.`);
    setIsProcessing(false);
    setActiveView('OVERVIEW');
  };

  const handleAtomicSettlement = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setQrData(`PRAXCI_TUITION_${session.user.id}_${Date.now()}`);
    setIsProcessing(false);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-900 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Praxci Education Node</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Sovereign Knowledge Ledger</p>
          </div>
        </div>
        {activeView !== 'OVERVIEW' && (
          <button onClick={() => setActiveView('OVERVIEW')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
            Back to Academy
          </button>
        )}
      </div>

      {/* DYNAMIC VIEWS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* ========================================== */}
        {/* VIEW: OVERVIEW */}
        {/* ========================================== */}
        {activeView === 'OVERVIEW' && (
          <div className="space-y-8">
            {/* Intellectual Power & Proof of Learning */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-emerald-400"><BookOpen size={140}/></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Knowledge Capital Liquidity</p>
                <h3 className="text-5xl font-black text-white mb-2">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(knowledgeLiquidity)}
                  <span className="text-xl text-slate-500 ml-2">AFR</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium max-w-sm leading-relaxed">
                  Your tuition purchasing power, dynamically backed by liquid assets and mathematically verified skills.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Proof of Learning</p>
                  <BrainCircuit className="text-blue-500" size={20} />
                </div>
                <div>
                  <h2 className="text-5xl font-black text-slate-800">{proofOfLearningScore}<span className="text-xl text-slate-400">/100</span></h2>
                  <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-widest bg-emerald-50 inline-block px-2 py-1 rounded-md">24 Validators Approving</p>
                </div>
              </div>
            </div>

            {/* The Interaction Matrix */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Adaptive Education Matrix</h4>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveView('ATOMIC_SKILL')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><Zap size={24}/></div>
                  <div>
                    <h5 className="font-black text-emerald-900">Atomic Settlement</h5>
                    <p className="text-xs text-emerald-700/80 font-medium mt-1">Instant tuition/course clearance</p>
                  </div>
                </button>
                
                <button onClick={() => setActiveView('TUTOR_AUDIT')} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><MapPin size={24}/></div>
                  <div>
                    <h5 className="font-black text-blue-900">Local Tutor Audit</h5>
                    <p className="text-xs text-blue-700/80 font-medium mt-1">Verify peer learning, earn AFR</p>
                  </div>
                </button>

                <button onClick={() => setActiveView('ALUMNI_SYNDICATE')} className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><Users size={24}/></div>
                  <div>
                    <h5 className="font-black text-indigo-900">Alumni Syndicate</h5>
                    <p className="text-xs text-indigo-700/80 font-medium mt-1">Co-sign student micro-loans</p>
                  </div>
                </button>

                <button onClick={() => setActiveView('LABOR_PLEDGE')} className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 p-6 rounded-3xl flex flex-col items-start gap-4 transition-all group text-left">
                  <div className="p-3 bg-yellow-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform"><FileSignature size={24}/></div>
                  <div>
                    <h5 className="font-black text-yellow-900">Future Labor Pledge</h5>
                    <p className="text-xs text-yellow-700/80 font-medium mt-1">Finance education via future work</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: ATOMIC SETTLEMENT */}
        {/* ========================================== */}
        {activeView === 'ATOMIC_SKILL' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="text-center max-w-md">
              <Award size={64} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800">Academic Settlement Token</h3>
              <p className="text-sm text-slate-500 mt-2">Generate a cryptographic proof-of-funds for your institution or certification board. Draws instantly from your {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(knowledgeLiquidity)} reserve.</p>
            </div>

            {qrData ? (
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95">
                <QRCode value={qrData} size={220} fgColor="#0f172a" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-6 flex items-center gap-2"><CheckCircle2 size={14}/> Academic Route Active</p>
                <button onClick={() => setQrData(null)} className="mt-6 text-xs font-bold text-slate-500 hover:text-slate-800">Void Token</button>
              </div>
            ) : (
              <button 
                onClick={handleAtomicSettlement} 
                disabled={isProcessing}
                className="w-full max-w-sm bg-emerald-600 text-white rounded-3xl p-6 font-black text-lg shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:bg-emerald-500 hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : 'GENERATE TUITION TOKEN'}
              </button>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: TUTOR AUDIT */}
        {/* ========================================== */}
        {activeView === 'TUTOR_AUDIT' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 mb-2">Local Learning Bounties</h3>
            <p className="text-sm text-slate-500 mb-6">Verify peer assessments and local learning pods. Confirm skill acquisition to earn AFR rewards.</p>
            
            {[
              { id: 1, type: 'Calculus I Competency', dist: '0.8 km', user: 'Scholar #441', reward: '3.50 AFR' },
              { id: 2, type: 'Basic Coding Assessment', dist: '2.1 km', user: 'Scholar #902', reward: '8.00 AFR' }
            ].map(bounty => (
              <div key={bounty.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-4 rounded-2xl text-slate-500"><BrainCircuit size={24}/></div>
                  <div>
                    <p className="font-bold text-slate-800">{bounty.type}</p>
                    <p className="text-xs text-slate-500">{bounty.user} • {bounty.dist} away</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-black text-blue-600">{bounty.reward}</p>
                  <button 
                    onClick={() => handleAction('Audit Validation Upload')}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500"
                  >
                    Verify Skill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: ALUMNI SYNDICATE */}
        {/* ========================================== */}
        {activeView === 'ALUMNI_SYNDICATE' && (
          <div className="space-y-6">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden mb-8">
              <Library size={100} className="absolute right-0 top-0 opacity-10 -translate-y-4" />
              <h3 className="text-2xl font-black mb-2 relative z-10">Alumni Syndicate Co-Signing</h3>
              <p className="text-indigo-200 text-sm max-w-md relative z-10">Crowdfund the next generation of minds by underwriting micro-tuition limits using your current AFR yield.</p>
            </div>

            <h4 className="text-sm font-black text-slate-800">Pending Scholar Requests</h4>
            {[
              { name: 'David K.', reason: 'Engineering Bootcamp Term 2', amount: '$450.00', pledged: '45%' },
              { name: 'Village Tech Pod', reason: 'Communal Hardware Grant', amount: '$1,200.00', pledged: '90%' }
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
                  Pledge 2.0% Reserve Yield
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: LABOR PLEDGE */}
        {/* ========================================== */}
        {activeView === 'LABOR_PLEDGE' && (
          <div className="space-y-6">
            <div className="text-center max-w-md mx-auto py-6">
              <FileSignature size={48} className="text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800">Apprenticeship & Labor Pledge</h3>
              <p className="text-sm text-slate-500 mt-2">Pledge your future educated labor to local commercial nodes in exchange for them covering your tuition today.</p>
            </div>

            {[
              { company: 'Global Logistics Hub', role: 'Data Analyst Intern', hours: 120, credit: '1,500.00 AFR' },
              { company: 'NeoTech Solutions', role: 'Junior Developer', hours: 200, credit: '3,200.00 AFR' }
            ].map((job, i) => (
              <div key={i} className="bg-yellow-50 border border-yellow-200 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-black text-yellow-900">{job.company}</p>
                  <p className="text-xs text-yellow-700/80 font-bold">{job.role} • {job.hours} Hours Required</p>
                </div>
                <div className="flex flex-col md:items-end w-full md:w-auto">
                  <p className="font-black text-lg text-yellow-600 mb-2">{job.credit} Tuition Cover</p>
                  <button 
                    onClick={() => handleAction('Apprenticeship Contract Signed', 2500)}
                    disabled={isProcessing}
                    className="w-full md:w-auto px-6 py-3 bg-yellow-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 transition-all flex justify-center items-center gap-2"
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