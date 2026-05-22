import { useState } from 'react';
import { useAFRNode } from '../../hooks/useAFRNode';
import {
  Cpu, Radio, Globe, Zap, Shield, TrendingUp, Award,
  Activity, Wifi, WifiOff, ChevronRight, Download, Lock,
  BarChart3, Network, Layers, CheckCircle, Clock, Coins
} from 'lucide-react';

const TIER = {
  light_node: {
    label: 'Light Node',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    reward: '0.10 AFR/hr',
    desc: 'Cache transactions, validate locally, earn passive AFR.',
    icon: <Wifi size={18} />,
  },
  validator: {
    label: 'Validator',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    reward: '0.50 AFR/hr + tx bonus',
    desc: 'Validate blocks and earn enhanced rewards.',
    icon: <Shield size={18} />,
    stake: '1,000 AFR',
  },
  gateway: {
    label: 'Gateway Node',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    reward: '1.00 AFR/hr + routing bonus',
    desc: 'Route cross-region transactions as a network gateway.',
    icon: <Network size={18} />,
    stake: '10,000 AFR',
  },
};

function PulsingDot({ color = 'bg-green-400' }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

function StatCard({ icon, label, value, sub, accent = 'blue' }) {
  const colors = { blue: 'text-blue-400 bg-blue-500/10', purple: 'text-purple-400 bg-purple-500/10', green: 'text-emerald-400 bg-emerald-500/10', yellow: 'text-amber-400 bg-amber-500/10' };
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-xl ${colors[accent]}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{label}</p>
        <p className="text-xl font-black text-white mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function NetworkGlobe({ stats }) {
  const total = stats?.total_nodes || 0;
  const online = stats?.online_last_5min || 0;
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 border border-slate-700/40 rounded-2xl p-6 relative overflow-hidden">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1,2,3].map((i) => (
          <div key={i} className="absolute rounded-full border border-blue-500/10 animate-ping"
            style={{ width: `${i * 120}px`, height: `${i * 120}px`, animationDuration: `${i * 1.4}s`, animationDelay: `${i * 0.3}s` }} />
        ))}
        <div className="absolute rounded-full border border-blue-500/20" style={{ width: '120px', height: '120px' }} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AFR Network — Global</span>
          <div className="ml-auto flex items-center gap-1.5">
            <PulsingDot color="bg-green-400" />
            <span className="text-[10px] text-green-400 font-black">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-white">{(total || 0).toLocaleString()}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Total Nodes</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-400">{(online || 0).toLocaleString()}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Online Now</p>
          </div>
          <div>
            <p className="text-2xl font-black text-blue-400">{pct}%</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Health</p>
          </div>
        </div>

        <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[9px]">
          <div className="bg-slate-800/60 rounded-xl p-2">
            <p className="text-blue-400 font-black">{(stats?.light_nodes || 0).toLocaleString()}</p>
            <p className="text-slate-500">Light</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2">
            <p className="text-purple-400 font-black">{(stats?.validators || 0).toLocaleString()}</p>
            <p className="text-slate-500">Validators</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2">
            <p className="text-emerald-400 font-black">{(stats?.gateways || 0).toLocaleString()}</p>
            <p className="text-slate-500">Gateways</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeStatusCard({ nodeType, nodeId, isRegistered, uptimeFormatted, pendingRewards, txRelayed, isClaiming, claimResult, claimRewards }) {
  const tier = TIER[nodeType] || TIER.light_node;

  return (
    <div className={`border rounded-2xl p-5 ${tier.border} ${tier.bg}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={tier.color}>{tier.icon}</span>
          <div>
            <p className={`text-sm font-black ${tier.color}`}>{tier.label}</p>
            <p className="text-[9px] text-slate-500 font-mono">{nodeId?.slice(0, 22)}…</p>
          </div>
        </div>
        {isRegistered
          ? <div className="flex items-center gap-1.5"><PulsingDot color="bg-green-400" /><span className="text-[9px] text-green-400 font-black">ACTIVE</span></div>
          : <div className="flex items-center gap-1.5"><PulsingDot color="bg-amber-400" /><span className="text-[9px] text-amber-400 font-black">SYNCING</span></div>
        }
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-black/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-white">{uptimeFormatted}</p>
          <p className="text-[8px] text-slate-500 uppercase">Uptime</p>
        </div>
        <div className="bg-black/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-amber-400">{parseFloat(pendingRewards || 0).toFixed(3)}</p>
          <p className="text-[8px] text-slate-500 uppercase">Pending AFR</p>
        </div>
        <div className="bg-black/20 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-white">{(txRelayed || 0).toLocaleString()}</p>
          <p className="text-[8px] text-slate-500 uppercase">TX Relayed</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-4">
        <Coins size={12} className="text-amber-400" />
        <span>Earning: <strong className={tier.color}>{tier.reward}</strong></span>
      </div>

      {claimResult && (
        <div className={`text-[10px] rounded-xl px-3 py-2 mb-3 ${claimResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {claimResult.ok ? `Claimed ${parseFloat(claimResult.amount).toFixed(3)} AFR` : claimResult.reason}
        </div>
      )}

      <button
        onClick={claimRewards}
        disabled={isClaiming || pendingRewards < 1}
        className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isClaiming ? 'Claiming…' : `Claim ${parseFloat(pendingRewards || 0).toFixed(3)} AFR`}
      </button>
    </div>
  );
}

function UpgradePath({ nodeType }) {
  const tiers = ['light_node', 'validator', 'gateway'];
  const currentIdx = tiers.indexOf(nodeType);

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Node Upgrade Path</p>
      <div className="space-y-3">
        {tiers.map((t, i) => {
          const tier = TIER[t];
          const isActive = t === nodeType;
          const isUnlocked = i <= currentIdx;
          return (
            <div key={t} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? `${tier.bg} ${tier.border}` : 'border-slate-700/20 bg-slate-800/20'}`}>
              <span className={isUnlocked ? tier.color : 'text-slate-600'}>{tier.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black ${isActive ? tier.color : isUnlocked ? 'text-white' : 'text-slate-500'}`}>{tier.label}</p>
                <p className="text-[9px] text-slate-500 truncate">{tier.reward}</p>
              </div>
              {tier.stake && !isUnlocked && (
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Lock size={10} />
                  <span>{tier.stake} stake</span>
                </div>
              )}
              {isActive && <CheckCircle size={14} className={tier.color} />}
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
        Upgrade your node by staking AFR. Validators confirm blocks; Gateways route cross-region traffic. Both earn enhanced rewards.
      </p>
    </div>
  );
}

function BlockchainStats({ stats }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">AFR Chain — Live Stats</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Block Height', value: (stats?.total_blocks || 0).toLocaleString(), icon: <Layers size={13} className="text-blue-400" /> },
          { label: 'Total TX', value: (stats?.total_tx || 0).toLocaleString(), icon: <Activity size={13} className="text-purple-400" /> },
          { label: 'AFR Minted', value: parseFloat(stats?.total_afr_minted || 0).toLocaleString(), icon: <Coins size={13} className="text-amber-400" /> },
          { label: 'Regions', value: (stats?.regions?.length || 0), icon: <Globe size={13} className="text-emerald-400" /> },
        ].map((item) => (
          <div key={item.label} className="bg-slate-900/40 rounded-xl p-3 flex items-center gap-2">
            {item.icon}
            <div>
              <p className="text-sm font-black text-white">{item.value}</p>
              <p className="text-[8px] text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AFRNetworkPanel({ session, profile }) {
  const node = useAFRNode(session);
  const [tab, setTab] = useState('node');

  const TABS = [
    { id: 'node', label: 'My Node' },
    { id: 'network', label: 'Network' },
    { id: 'upgrade', label: 'Upgrade' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-purple-900/30 border border-slate-700/30 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">AFR Network Node</span>
            </div>
            <h2 className="text-2xl font-black text-white">Your Device = The Bank</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-lg">
              Every DEUS installation is a sovereign node on the AFR blockchain. No data centers, no pollution — the network lives on your phone.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-1.5">
              <PulsingDot color="bg-green-400" />
              <span className="text-[10px] font-black text-green-400">NODE ONLINE</span>
            </div>
            <p className="text-[9px] text-slate-600">{node.nodeId?.slice(0, 18)}…</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Node */}
      {tab === 'node' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NodeStatusCard {...node} />
          <div className="space-y-4">
            <StatCard icon={<Clock size={16} />} label="Session Uptime" value={node.uptimeFormatted} sub="This session" accent="blue" />
            <StatCard icon={<Zap size={16} />} label="TX Relayed" value={(node.txRelayed || 0).toLocaleString()} sub="Total validated" accent="purple" />
            <StatCard icon={<TrendingUp size={16} />} label="Total Nodes Online" value={(node.networkStats?.online_last_5min || 0).toLocaleString()} sub="Last 5 minutes" accent="green" />
            <StatCard icon={<Award size={16} />} label="Your Node Tier" value={TIER[node.nodeType]?.label || 'Light Node'} sub={TIER[node.nodeType]?.reward} accent="yellow" />
          </div>
        </div>
      )}

      {/* Network */}
      {tab === 'network' && (
        <div className="space-y-4">
          <NetworkGlobe stats={node.networkStats} />
          <BlockchainStats stats={node.networkStats} />
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Why Decentralized?</p>
            <div className="space-y-2">
              {[
                ['No data centers', 'Your device stores and validates transactions locally.', 'text-green-400'],
                ['Zero mining waste', 'Proof of Participation — uptime earns rewards, not energy waste.', 'text-blue-400'],
                ['Self-healing network', 'If any node goes offline, others continue seamlessly.', 'text-purple-400'],
                ['Moon-ready', 'Architecture designed to run on satellites, edge devices, anywhere.', 'text-amber-400'],
              ].map(([title, desc, color]) => (
                <div key={title} className="flex gap-3 p-3 bg-slate-900/30 rounded-xl">
                  <CheckCircle size={14} className={`${color} shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-[10px] font-black ${color}`}>{title}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade */}
      {tab === 'upgrade' && (
        <div className="space-y-4">
          <UpgradePath nodeType={node.nodeType} />
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Install on More Devices</p>
            <p className="text-sm text-slate-300 mb-4">
              Install DEUS on your phone, tablet, or another computer — each device joins as an additional node and earns rewards independently.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <Download size={13} /> Install on Device
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <Radio size={13} /> Share Node Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
