// DEUS AFR Network Node — Service Worker
// Turns every installed device into a sovereign light node on the AFR chain.

const CACHE_NAME = 'deus-afr-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];
const IDB_NAME = 'deus-afr-node';
const IDB_VERSION = 1;
const STORE_PENDING_TXS = 'pending_txs';
const STORE_LOCAL_LEDGER = 'local_ledger';
const STORE_NODE_META = 'node_meta';

// ── IndexedDB helpers ──────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PENDING_TXS))
        db.createObjectStore(STORE_PENDING_TXS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_LOCAL_LEDGER))
        db.createObjectStore(STORE_LOCAL_LEDGER, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_NODE_META))
        db.createObjectStore(STORE_NODE_META, { keyPath: 'key' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ── Install: cache static shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http/https — skip chrome-extension://, data:, blob: etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Supabase / API calls — network first, no caching of auth tokens
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/functions/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' }, status: 503 })));
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {}));
        }
        return response;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});

// ── Background Sync: flush pending AFR transactions ───────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'afr-tx-sync') {
    event.waitUntil(flushPendingTransactions());
  }
  if (event.tag === 'afr-heartbeat') {
    event.waitUntil(sendNodeHeartbeat());
  }
});

async function flushPendingTransactions() {
  const pending = await dbGetAll(STORE_PENDING_TXS);
  for (const tx of pending) {
    try {
      const res = await fetch(tx.endpoint, {
        method: 'POST',
        headers: tx.headers,
        body: JSON.stringify(tx.body),
      });
      if (res.ok) {
        await dbDelete(STORE_PENDING_TXS, tx.id);
        await dbPut(STORE_LOCAL_LEDGER, { id: tx.id, ...tx.body, status: 'confirmed', synced_at: Date.now() });
      }
    } catch {
      // Keep in queue — will retry on next sync
    }
  }
}

async function sendNodeHeartbeat() {
  const meta = await dbGetAll(STORE_NODE_META);
  const nodeMeta = meta.find((m) => m.key === 'identity');
  if (!nodeMeta?.supabaseUrl || !nodeMeta?.anonKey || !nodeMeta?.nodeId) return;

  try {
    const uptimeRecord = meta.find((m) => m.key === 'uptime');
    const uptimeSecs = (uptimeRecord?.seconds || 0) + 60;
    await dbPut(STORE_NODE_META, { key: 'uptime', seconds: uptimeSecs });

    await fetch(`${nodeMeta.supabaseUrl}/rest/v1/afr_network_nodes?device_id=eq.${nodeMeta.nodeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': nodeMeta.anonKey,
        'Authorization': `Bearer ${nodeMeta.authToken}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ last_heartbeat: new Date().toISOString(), uptime_seconds: uptimeSecs }),
    });
  } catch {
    // Silent — heartbeat failures are non-critical
  }
}

// ── Message handler: queue transactions, store node identity ──────────────────
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'QUEUE_AFR_TX') {
    await dbPut(STORE_PENDING_TXS, {
      id: payload.id || crypto.randomUUID(),
      endpoint: payload.endpoint,
      headers: payload.headers,
      body: payload.body,
      queued_at: Date.now(),
    });
    event.ports?.[0]?.postMessage({ ok: true });
  }

  if (type === 'STORE_NODE_IDENTITY') {
    await dbPut(STORE_NODE_META, { key: 'identity', ...payload });
    event.ports?.[0]?.postMessage({ ok: true });
  }

  if (type === 'GET_PENDING_COUNT') {
    const pending = await dbGetAll(STORE_PENDING_TXS);
    const uptime = await dbGetAll(STORE_NODE_META);
    const uptimeSecs = uptime.find((m) => m.key === 'uptime')?.seconds || 0;
    event.ports?.[0]?.postMessage({ count: pending.length, uptimeSeconds: uptimeSecs });
  }

  if (type === 'GET_LOCAL_LEDGER') {
    const ledger = await dbGetAll(STORE_LOCAL_LEDGER);
    event.ports?.[0]?.postMessage({ ledger: ledger.slice(-100) });
  }
});

// ── Push: incoming transfer notifications ─────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'IFB Transfer', {
      body: data.body || 'You have a new AFR transaction.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'afr-tx',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
