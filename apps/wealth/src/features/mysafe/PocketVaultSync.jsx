import React, { useState, useEffect } from 'react';
import { Cpu, Flame, Lock, AlertTriangle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function PocketVaultSync() {
  const [cashInserted, setCashInserted] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState('OFFLINE'); // Real status from API

  // Poll actual hardware API for connectivity
  useEffect(() => {
    const checkHardware = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hardware/status`);
        if (res.ok) setHardwareStatus('SECURE');
      } catch (e) {
        setHardwareStatus('OFFLINE');
      }
    };
    const interval = setInterval(checkHardware, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDestructionProtocol = async () => {
    if (!cashInserted || cashInserted <= 0) return;
    setIsMinting(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/mysafe/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(cashInserted), hardwareId: 'my-safe-001' })
      });
      if (response.ok) alert('Hardware incineration confirmed. Digital assets minted.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Cpu className="text-slate-800" size={28} /> Hardware Sync
          </h1>
          <p className="text-slate-500 font-bold mt-2 text-sm">Convert physical fiat into verifiable blockchain capital.</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${hardwareStatus === 'SECURE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
          Vault Status: {hardwareStatus}
        </div>
      </div>

      <GlassCard className="max-w-2xl" padding="p-10">
        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-center mb-8 shadow-inner">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-4">Input Physical Amount Detected</p>
          <div className="flex justify-center items-center gap-2">
            <span className="text-4xl font-black text-slate-300">$</span>
            <input
              type="number"
              value={cashInserted}
              onChange={(e) => setCashInserted(e.target.value)}
              placeholder="0.00"
              disabled={hardwareStatus === 'OFFLINE'}
              className="bg-transparent text-5xl font-black text-slate-800 w-48 text-center focus:outline-none focus:border-b-2 border-slate-300 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        <div className="bg-red-50/80 border border-red-200 p-6 rounded-3xl mb-8 flex gap-3 shadow-sm">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <p className="text-xs font-bold text-red-800 leading-relaxed">
            <strong className="block mb-1 text-sm font-black text-red-600">Irreversible Action</strong>
            Initiating this sequence commands the hardware module to incinerate the physical payload. The mathematical equivalent will be minted to the ledger.
          </p>
        </div>

        <button 
          onClick={handleDestructionProtocol}
          disabled={isMinting || hardwareStatus === 'OFFLINE' || !cashInserted}
          className="w-full py-5 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
        >
          {isMinting ? 'Processing Incineration...' : 'Authorize Destruction & Mint'} <Flame size={18} />
        </button>
      </GlassCard>
    </div>
  );
}