import React, { useState } from 'react';
import { Ticket, QrCode, Users, Trash2, ShieldCheck } from 'lucide-react';

export default function TicketingSystem() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 mb-4">
        <button onClick={() => setActiveTab('create')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-tighter ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>Create Event</button>
        <button onClick={() => setActiveTab('manage')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-tighter ${activeTab === 'manage' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>Guest List</button>
      </div>

      {activeTab === 'create' ? (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-10 text-white shadow-2xl">
          <Ticket size={40} className="mb-4 opacity-50" />
          <h2 className="text-3xl font-black leading-tight mb-6">Forge a New Event</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Event Name" className="w-full bg-white/10 border border-white/20 p-5 rounded-2xl outline-none placeholder:text-white/50 font-bold" />
            <textarea placeholder="Custom message for ticket holders..." className="w-full bg-white/10 border border-white/20 p-5 rounded-2xl outline-none placeholder:text-white/50 font-bold h-32"></textarea>
            <button className="w-full bg-white text-indigo-600 p-5 rounded-2xl font-black uppercase tracking-widest shadow-lg">Generate Ticket Series</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl">
           <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-4">Guest</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold">
                <tr className="border-t border-slate-50">
                  <td className="py-4">John Doe</td>
                  <td className="py-4 text-emerald-500">Active</td>
                  <td className="py-4"><Trash2 size={16} className="text-red-400 cursor-pointer" /></td>
                </tr>
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}