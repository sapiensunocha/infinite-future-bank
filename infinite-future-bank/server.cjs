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

  const headers = {
    'Content-Type':   getMime(filePath),
    'Content-Length': stat.size,
    'Vary':           'Accept-Encoding',
    'Cache-Control':  isAsset(urlPath)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate',
  };
  if (encoding) headers['Content-Encoding'] = encoding;

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

    res.writeHead(404, { 'Content-Type': 'text/plain' });
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
