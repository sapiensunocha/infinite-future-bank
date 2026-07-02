import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

const HEARTBEAT_MS = 60_000; // 1 minute

// Deterministic device fingerprint — no PII
function getDeviceId() {
  try {
    const cached = localStorage.getItem('afr_device_id');
    if (cached) return cached;
  } catch {}
  const ua = navigator.userAgent || '';
  const lang = navigator.language || 'en';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cores = navigator.hardwareConcurrency || 4;
  const raw = `${ua}|${lang}|${tz}|${cores}|${Date.now()}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  const id = 'node_' + Math.abs(h).toString(16).padStart(8, '0') + '_' + Date.now().toString(36);
  try { localStorage.setItem('afr_device_id', id); } catch {}
  return id;
}

function getIpRegion() {
  // Best-effort from browser timezone
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[0]; } catch { return 'Unknown'; }
}

// Tell the service worker where Supabase is so it can do heartbeats in the background
async function syncIdentityToSW(deviceId, authToken) {
  if (!navigator.serviceWorker?.controller) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  navigator.serviceWorker.controller.postMessage({
    type: 'STORE_NODE_IDENTITY',
    payload: { nodeId: deviceId, supabaseUrl, anonKey, authToken },
  });
}

export function useAFRNode(session) {
  const [nodeId]                = useState(getDeviceId);
  const [isRegistered, setIsRegistered] = useState(false);
  const [nodeType, setNodeType] = useState('light_node');
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [txRelayed, setTxRelayed] = useState(0);
  const [networkStats, setNetworkStats] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const startTime = useRef(Date.now());
  const heartbeatTimer = useRef(null);

  const userId = session?.user?.id;

  // ── Register or upsert this device as a node ────────────────────────────────
  const registerNode = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('afr_network_nodes')
      .upsert({
        user_id: userId,
        device_id: nodeId,
        node_type: 'light_node',
        last_heartbeat: new Date().toISOString(),
        ip_region: getIpRegion(),
        user_agent: navigator.userAgent.slice(0, 200),
        is_active: true,
      }, { onConflict: 'user_id,device_id', ignoreDuplicates: false })
      .select('node_type, uptime_seconds, afr_rewards_earned, tx_relayed_count')
      .maybeSingle();

    if (data) {
      setNodeType(data.node_type);
      setUptimeSeconds(data.uptime_seconds || 0);
      setPendingRewards(parseFloat(data.afr_rewards_earned) || 0);
      setTxRelayed(data.tx_relayed_count || 0);
      setIsRegistered(true);
    }

    const authToken = (await supabase.auth.getSession()).data.session?.access_token;
    syncIdentityToSW(nodeId, authToken);
  }, [userId, nodeId]);

  // ── Heartbeat: update uptime + accrue rewards ────────────────────────────────
  const sendHeartbeat = useCallback(async () => {
    if (!userId || !isRegistered) return;

    const { data } = await supabase
      .rpc('credit_node_rewards', { p_user_id: userId, p_device_id: nodeId });

    const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
    setUptimeSeconds((s) => s + 60);
    if (data && data > 0) setPendingRewards((r) => parseFloat((r + data).toFixed(6)));
  }, [userId, nodeId, isRegistered]);

  // ── Fetch network-wide stats ─────────────────────────────────────────────────
  const fetchNetworkStats = useCallback(async () => {
    const { data } = await supabase.rpc('get_network_stats');
    if (data) setNetworkStats(data);
  }, []);

  // ── Claim accumulated rewards ────────────────────────────────────────────────
  const claimRewards = useCallback(async () => {
    if (!userId || pendingRewards < 1) return;
    setIsClaiming(true);
    setClaimResult(null);
    try {
      const { data, error } = await supabase.rpc('claim_node_rewards', { p_device_id: nodeId });
      if (error) throw error;
      if (data?.ok) {
        setPendingRewards(0);
        setClaimResult({ ok: true, amount: data.claimed_afr });
      } else {
        setClaimResult({ ok: false, reason: data?.reason });
      }
    } catch (err) {
      setClaimResult({ ok: false, reason: err.message });
    } finally {
      setIsClaiming(false);
    }
  }, [userId, nodeId, pendingRewards]);

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    registerNode();
    fetchNetworkStats();

    heartbeatTimer.current = setInterval(() => {
      sendHeartbeat();
      fetchNetworkStats();
    }, HEARTBEAT_MS);

    return () => clearInterval(heartbeatTimer.current);
  }, [userId, registerNode, sendHeartbeat, fetchNetworkStats]);

  const uptimeFormatted = (() => {
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  return {
    nodeId,
    nodeType,
    isRegistered,
    uptimeSeconds,
    uptimeFormatted,
    pendingRewards,
    txRelayed,
    networkStats,
    isClaiming,
    claimResult,
    claimRewards,
    refetch: () => { registerNode(); fetchNetworkStats(); },
  };
}
