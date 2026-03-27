import React, { useEffect, useState } from 'react';
import { Wallet, Landmark, Briefcase, Activity, ArrowUpRight, Loader } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

import GlassCard from '@/components/ui/GlassCard';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatCurrency } from '@/utils/currencyFormat';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export default function WholeWealthDashboard() {
  const { liveNetWorth, balances, isSyncing, dailyChange, dailyChangePercent } = usePortfolio();
  const [chartData, setChartData] = useState(null);

  // In production, chart data is fetched from your backend historical data API
  useEffect(() => {
    // Placeholder empty chart until backend is connected
    setChartData({
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        fill: true,
        label: 'Net Worth',
        data: [0, 0, 0, 0, 0, 0, liveNetWorth], // Flatline to current worth
        borderColor: '#2563eb', // ifb-blue
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
      }],
    });
  }, [liveNetWorth]);

  const assetAllocation = [
    { id: 'liquidity', name: 'Treasury & Cash', balance: balances.liquidCash || 0, icon: Wallet, color: 'text-blue-600' },
    { id: 'alpha', name: 'Private Equity', balance: balances.alphaEquity || 0, icon: Briefcase, color: 'text-red-600' },
    { id: 'mysafe', name: 'MySafe Digital', balance: balances.mySafeDigital || 0, icon: Landmark, color: 'text-green-600' },
    { id: 'external', name: 'External Linked', balance: balances.externalLinked || 0, icon: Activity, color: 'text-slate-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="col-span-1 lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total Whole-Wealth</p>
              
              <div className="flex items-center gap-4">
                <h1 className="text-5xl sm:text-6xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(liveNetWorth)}
                </h1>
                {isSyncing && <Loader size={24} className="animate-spin text-blue-500" />}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <span className={`flex items-center px-2 py-1 rounded-md text-sm font-black uppercase tracking-widest ${dailyChange >= 0 ? 'text-green-600 bg-green-100/50' : 'text-red-600 bg-red-100/50'}`}>
                  {dailyChange >= 0 ? '+' : ''}{formatCurrency(dailyChange)} ({dailyChangePercent}%)
                </span>
                <span className="text-slate-400 text-sm font-bold">24H Live</span>
              </div>
            </div>
          </div>

          <div className="h-40 w-full mt-6 relative">
             {chartData ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } }} /> : <div className="w-full h-full flex items-center justify-center"><Loader className="animate-spin text-slate-300"/></div>}
          </div>
        </GlassCard>

        {/* Dynamic DEUS Insight - Currently awaiting real AI analysis */}
        <GlassCard className="col-span-1 flex flex-col justify-between border-blue-400/30 bg-blue-50/40">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-blue-600" />
              <h3 className="text-lg font-black text-slate-800">DEUS Live Insight</h3>
            </div>
            {liveNetWorth === 0 ? (
              <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
                Awaiting initial capital deployment. Please link an external institution or initiate a MySafe hardware deposit to begin yield generation.
              </p>
            ) : (
              <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
                Portfolio synchronized. DEUS is actively monitoring market volatility for tax-loss harvesting opportunities.
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-800 mb-4 tracking-tighter drop-shadow-sm">Live Asset Allocation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {assetAllocation.map((asset) => (
            <GlassCard key={asset.id} padding="p-6" hover={true} className="cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl bg-white/60 border border-white/50 shadow-sm ${asset.color}`}>
                  <asset.icon size={20} />
                </div>
                <ArrowUpRight size={18} className="text-slate-400 group-hover:text-slate-800 transition-colors" />
              </div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{asset.name}</p>
              <p className="text-2xl font-black text-slate-800 drop-shadow-sm">
                {formatCurrency(asset.balance)}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}