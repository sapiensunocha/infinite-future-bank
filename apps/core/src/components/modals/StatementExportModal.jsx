import React from 'react';
import { X } from 'lucide-react';

export default function StatementExportModal({ 
  showStatementModal, setShowStatementModal, triggerGlobalActionNotification 
}) {
  const [statementConfig, setStatementConfig] = React.useState({ startDate: '', endDate: '', format: 'pdf', isOfficial: false });

  if (!showStatementModal) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center mb-8">
           <h3 className="font-semibold text-xl text-slate-800 tracking-tighter">Export Statements</h3>
           <X onClick={() => setShowStatementModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-800"/>
        </div>
        <div className="space-y-6">
          <div>
            <label className="ui-label">Document Format</label>
            <select
              className="ui-select"
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
               <p className="text-sm font-semibold text-blue-900 tracking-tight">Signed Official Statement</p>
               <p className="text-xs text-blue-700 leading-relaxed font-medium">Includes Logo, EIN 33-1869013, Official New York Address, and Verified Digital Signature block.</p>
             </div>
          </div>
          <button
            onClick={() => {
               const type = statementConfig.isOfficial ? "Signed Official Statement" : "Standard Statement";
               triggerGlobalActionNotification('success', `${type} (${statementConfig.format.toUpperCase()}) generated and archived.`);
               setShowStatementModal(false);
            }}
            className="ui-btn ui-btn-primary"
          >
            Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
}