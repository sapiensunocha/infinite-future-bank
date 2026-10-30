'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

// Never let an uncaught error crash the process — Railway would restart-loop
process.on('uncaughtException', (err) => { console.error('[server] uncaughtException:', err.message); });
process.on('unhandledRejection', (r)   => { console.error('[server] unhandledRejection:', r);          });

const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

// Warn early if dist is missing so logs make it obvious
if (!fs.existsSync(DIST)) {
  console.error('[server] WARNING: dist/ directory not found at', DIST, '— build may have failed');
}

// Security headers (keep in sync with public/_headers and vercel.json).
// CSP is Report-Only; to enforce, change the key to 'Content-Security-Policy'.
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self), payment=(self \"https://js.stripe.com\")",
  "Content-Security-Policy-Report-Only": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://js.stripe.com https://checkout.flutterwave.com https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://nfztdpyygfrpbjbhidxe.supabase.co https://*.stripe.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://*.tile.openstreetmap.org https://unpkg.com https://www.transparenttextures.com; media-src 'self' data: blob: https://nfztdpyygfrpbjbhidxe.supabase.co; connect-src 'self' https://nfztdpyygfrpbjbhidxe.supabase.co wss://nfztdpyygfrpbjbhidxe.supabase.co https://api.stripe.com https://ifb-intelligence-core-382117221028.us-central1.run.app https://afr-blockchain-node-382117221028.us-central1.run.app https://ipapi.co https://api.open-meteo.com https://api.frankfurter.app; frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://checkout.flutterwave.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com https://buy.stripe.com https://checkout.flutterwave.com; frame-ancestors 'none'",
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp4':  'video/mp4',
  '.txt':  'text/plain',
  '.xml':  'application/xml',
  '.apk':  'application/vnd.android.package-archive',
  '.dmg':  'application/x-apple-diskimage',
  '.exe':  'application/vnd.microsoft.portable-executable',
};

function getMime(fp) {
  return MIME[path.extname(fp.replace(/\.(gz|br)$/, ''))] || 'application/octet-stream';
}

function isAsset(u) {
  return u.startsWith('/assets/') || u.startsWith('/icons/') || u.startsWith('/models/');
}

function safeStat(fp) {
  try { const s = fs.statSync(fp); return s.isFile() ? s : null; }
  catch { return null; }
}

function sendFile(res, filePath, encoding, urlPath) {
  const stat = safeStat(filePath);
  if (!stat) return false;

  const ext = path.extname(filePath.replace(/\.(gz|br)$/, ''));
  const isBinaryDownload = ['.apk', '.dmg', '.exe'].includes(ext);
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type':   getMime(filePath),
    'Content-Length': stat.size,
    'Vary':           'Accept-Encoding',
    'Cache-Control':  isAsset(urlPath)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate',
  };
  if (encoding) headers['Content-Encoding'] = encoding;
  if (isBinaryDownload) headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;


  res.writeHead(200, headers);

  const stream = fs.createReadStream(filePath);
  // Attach error handler BEFORE piping — prevents uncaughtException on EISDIR or race
  stream.on('error', (err) => {
    console.error('[server] stream error for', filePath, err.message);
    if (!res.writableEnded) res.end();
  });
  stream.pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = req.url.split('?')[0];
    try { urlPath = decodeURIComponent(urlPath); } catch {}

    const accept       = req.headers['accept-encoding'] || '';
    const supportsBr   = accept.includes('br');
    const supportsGzip = accept.includes('gzip');
    const diskPath     = path.join(DIST, urlPath);
    // Block path traversal (e.g. /%2e%2e/server.cjs) — only serve files inside dist/.
    if (diskPath !== DIST && !diskPath.startsWith(DIST + path.sep)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request');
      return;
    }

    const tries = [];
    if (supportsBr)   tries.push([diskPath + '.br',   'br']);
    if (supportsGzip) tries.push([diskPath + '.gz',   'gzip']);
    tries.push([diskPath, null]);

    for (const [fp, enc] of tries) {
      if (sendFile(res, fp, enc, urlPath)) return;
    }

    // Try index.html inside the path (directory index)
    if (sendFile(res, path.join(diskPath, 'index.html'), null, urlPath)) return;

    // SPA fallback for non-asset routes
    if (!isAsset(urlPath)) {
      if (sendFile(res, path.join(DIST, 'index.html'), null, '/')) return;
    }

    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error('[server] request error:', err.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    if (!res.writableEnded) res.end('Internal error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`IFB DEUS running on http://0.0.0.0:${PORT} (brotli+gzip enabled)`);
});
