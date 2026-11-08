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
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    reward: '0.10 AFR/hr',
    desc: 'Cache transactions, validate locally, earn passive AFR.',
    icon: <Wifi size={18} />,
  },
  validator: {
    label: 'Validator',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    reward: '0.50 AFR/hr + tx bonus',
    desc: 'Validate blocks and earn enhanced rewards.',
    icon: <Shield size={18} />,
    stake: '1,000 AFR',
  },
  gateway: {
    label: 'Gateway Node',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
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
  const colors = { blue: 'text-blue-600 bg-blue-50', purple: 'text-purple-600 bg-purple-50', green: 'text-emerald-600 bg-emerald-50', yellow: 'text-amber-600 bg-amber-50' };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-xl ${colors[accent]}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-semibold">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function NetworkGlobe({ stats }) {
  const total = stats?.total_nodes || 0;
  const online = stats?.online_last_5min || 0;
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-white via-blue-50 to-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1,2,3].map((i) => (
          <div key={i} className="absolute rounded-full border border-blue-200 animate-ping"
            style={{ width: `${i * 120}px`, height: `${i * 120}px`, animationDuration: `${i * 1.4}s`, animationDelay: `${i * 0.3}s` }} />
        ))}
        <div className="absolute rounded-full border border-blue-200" style={{ width: '120px', height: '120px' }} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-blue-600" />
          <span className="text-xs font-semibold text-slate-500">AFR Network — Global</span>
          <div className="ml-auto flex items-center gap-1.5">
            <PulsingDot color="bg-green-400" />
            <span className="text-xs text-green-600 font-bold">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900">{(total || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total Nodes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{(online || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500">Online Now</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{pct}%</p>
            <p className="text-xs text-slate-500">Health</p>
          </div>
        </div>

        <div className="mt-4 h-1.5 bg-slate-50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-blue-600 font-bold">{(stats?.light_nodes || 0).toLocaleString()}</p>
            <p className="text-slate-500">Light</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-purple-600 font-bold">{(stats?.validators || 0).toLocaleString()}</p>
            <p className="text-slate-500">Validators</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-emerald-600 font-bold">{(stats?.gateways || 0).toLocaleString()}</p>
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
            <p className={`text-sm font-bold ${tier.color}`}>{tier.label}</p>
            <p className="text-xs text-slate-500 font-mono">{nodeId?.slice(0, 22)}…</p>
          </div>
        </div>
        {isRegistered
          ? <div className="flex items-center gap-1.5"><PulsingDot color="bg-green-400" /><span className="text-xs text-green-600 font-bold">ACTIVE</span></div>
          : <div className="flex items-center gap-1.5"><PulsingDot color="bg-amber-400" /><span className="text-xs text-amber-600 font-bold">SYNCING</span></div>
        }
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{uptimeFormatted}</p>
          <p className="text-xs text-slate-500">Uptime</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{parseFloat(pendingRewards || 0).toFixed(3)}</p>
          <p className="text-xs text-slate-500">Pending AFR</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{(txRelayed || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500">TX Relayed</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Coins size={12} className="text-amber-600" />
        <span>Earning: <strong className={tier.color}>{tier.reward}</strong></span>
      </div>

      {claimResult && (
        <div className={`text-xs rounded-xl px-3 py-2 mb-3 ${claimResult.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {claimResult.ok ? `Claimed ${parseFloat(claimResult.amount).toFixed(3)} AFR` : claimResult.reason}
        </div>
      )}

      <button
        onClick={claimRewards}
        disabled={isClaiming || pendingRewards < 1}
        className="w-full py-3 rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 mb-4">Node Upgrade Path</p>
      <div className="space-y-3">
        {tiers.map((t, i) => {
          const tier = TIER[t];
          const isActive = t === nodeType;
          const isUnlocked = i <= currentIdx;
          return (
            <div key={t} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? `${tier.bg} ${tier.border}` : 'border-slate-200 bg-slate-50'}`}>
              <span className={isUnlocked ? tier.color : 'text-slate-600'}>{tier.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${isActive ? tier.color : isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>{tier.label}</p>
                <p className="text-xs text-slate-500 truncate">{tier.reward}</p>
              </div>
              {tier.stake && !isUnlocked && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Lock size={10} />
                  <span>{tier.stake} stake</span>
                </div>
              )}
              {isActive && <CheckCircle size={14} className={tier.color} />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
        Upgrade your node by staking AFR. Validators confirm blocks; Gateways route cross-region traffic. Both earn enhanced rewards.
      </p>
    </div>
  );
}

function BlockchainStats({ stats }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 mb-4">AFR Chain — Live Stats</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Block Height', value: (stats?.total_blocks || 0).toLocaleString(), icon: <Layers size={13} className="text-blue-600" /> },
          { label: 'Total TX', value: (stats?.total_tx || 0).toLocaleString(), icon: <Activity size={13} className="text-purple-600" /> },
          { label: 'AFR Minted', value: parseFloat(stats?.total_afr_minted || 0).toLocaleString(), icon: <Coins size={13} className="text-amber-600" /> },
          { label: 'Regions', value: (stats?.regions?.length || 0), icon: <Globe size={13} className="text-emerald-600" /> },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-3 flex items-center gap-2">
            {item.icon}
            <div>
              <p className="text-sm font-bold text-slate-900">{item.value}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
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
      <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className="text-blue-600" />
              <span className="text-xs font-semibold text-blue-600">AFR Network Node</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Your Device = The Bank</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-lg">
              Every DEUS installation is a sovereign node on the AFR blockchain. No data centers, no pollution — the network lives on your phone.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5">
              <PulsingDot color="bg-green-400" />
              <span className="text-xs font-bold text-green-600">NODE ONLINE</span>
            </div>
            <p className="text-xs text-slate-600">{node.nodeId?.slice(0, 18)}…</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
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
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 mb-3">Why Decentralized?</p>
            <div className="space-y-2">
              {[
                ['No data centers', 'Your device stores and validates transactions locally.', 'text-green-600'],
                ['Zero mining waste', 'Proof of Participation — uptime earns rewards, not energy waste.', 'text-blue-600'],
                ['Self-healing network', 'If any node goes offline, others continue seamlessly.', 'text-purple-600'],
                ['Moon-ready', 'Architecture designed to run on satellites, edge devices, anywhere.', 'text-amber-600'],
              ].map(([title, desc, color]) => (
                <div key={title} className="flex gap-3 p-3 bg-white rounded-xl">
                  <CheckCircle size={14} className={`${color} shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-xs font-bold ${color}`}>{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
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
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 mb-3">Install on More Devices</p>
            <p className="text-sm text-slate-600 mb-4">
              Install DEUS on your phone, tablet, or another computer — each device joins as an additional node and earns rewards independently.
            </p>
            <div className="flex gap-2">
              <button className="ui-btn ui-btn-primary flex-1">
                <Download size={13} /> Install on Device
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-sm font-semibold transition-all">
                <Radio size={13} /> Share Node Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
