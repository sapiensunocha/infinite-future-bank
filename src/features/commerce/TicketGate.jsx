import React, { useState } from 'react';
import { QrCode, Camera, Users, Ticket, Check } from 'lucide-react';
// Note: You would normally import a QR scanner library like 'react-qr-reader' here

export default function TicketGate() {
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState({ total: 150, checkedIn: 42 });

  return (
    <div className="p-4 space-y-6">
      {/* Event Overview */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2">Founder's Gala 2026</h2>
          <div className="flex gap-6 mt-4">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase">Capacity</p>
               <p className="text-xl font-black">{stats.total}</p>
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase">At Door</p>
               <p className="text-xl font-black text-emerald-400">{stats.checkedIn}</p>
             </div>
          </div>
        </div>
        <Ticket className="absolute right-[-20px] bottom-[-20px] text-white/10" size={150} />
      </div>

      {/* Action: Scanner */}
      <button 
        onClick={() => setScanning(!scanning)}
        className="w-full bg-white border-2 border-dashed border-slate-200 p-10 rounded-[2.5rem] flex flex-col items-center gap-3 hover:border-blue-400 transition-colors"
      >
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
          <Camera size={32} />
        </div>
        <p className="font-black uppercase text-[12px] tracking-widest text-slate-500">
          {scanning ? "Scanner Active..." : "Open Gate Scanner"}
        </p>
      </button>

      {/* Guest List Management */}
      <div className="space-y-3">
        <h4 className="font-black text-[10px] uppercase text-slate-400 px-2 tracking-widest">Recent Check-ins</h4>
        {['Sapiens N.', 'M. Dorsey', 'Z. Buchari'].map(name => (
          <div key={name} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><Check size={16}/></div>
              <span className="font-bold text-sm">{name}</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase">2m ago</span>
          </div>
        ))}
      </div>
    </div>
  );
}