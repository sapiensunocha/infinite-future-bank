import React from 'react';
import { X } from 'lucide-react';

export default function StatementExportModal({ 
  showStatementModal, setShowStatementModal, triggerGlobalActionNotification 
}) {
  const [statementConfig, setStatementConfig] = React.useState({ startDate: '', endDate: '', format: 'pdf', isOfficial: false });

  if (!showStatementModal) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-8">
           <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Export Statements</h3>
           <X onClick={() => setShowStatementModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Document Format</label>
            <select
              className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 transition-all"
              value={statementConfig.format}
              onChange={e => setStatementConfig({...statementConfig, format: e.target.value})}
            >
              <option value="pdf">Normal Statement (PDF)</option>
              <option value="csv">Institutional Data (CSV)</option>
            </select>
          </div>
          <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200 flex items-start gap-4 shadow-sm">
             <input
              type="checkbox"
              className="mt-1 w-6 h-6 rounded accent-blue-600"
              checked={statementConfig.isOfficial}
              onChange={e => setStatementConfig({...statementConfig, isOfficial: e.target.checked})}
             />
             <div className="space-y-1">
               <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Signed Official Statement</p>
               <p className="text-[10px] text-blue-700 leading-relaxed font-medium">Includes Logo, EIN 33-1869013, Official New York Address, and Verified Digital Signature block.</p>
             </div>
          </div>
          <button
            onClick={() => {
               const type = statementConfig.isOfficial ? "Signed Official Statement" : "Standard Statement";
               triggerGlobalActionNotification('success', `${type} (${statementConfig.format.toUpperCase()}) generated and archived.`);
               setShowStatementModal(false);
            }}
            className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all"
          >
            Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
}