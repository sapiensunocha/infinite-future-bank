'use strict';
// IFB DEUS — Static file server with brotli/gzip pre-compressed file serving
// Replaces `serve dist` which does NOT serve pre-compressed files
// Uses only Node.js built-ins — no extra dependencies
const http = require('http');
const fs   = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html':        'text/html; charset=utf-8',
  '.js':          'application/javascript; charset=utf-8',
  '.mjs':         'application/javascript; charset=utf-8',
  '.css':         'text/css; charset=utf-8',
  '.json':        'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg':         'image/svg+xml',
  '.png':         'image/png',
  '.jpg':         'image/jpeg',
  '.jpeg':        'image/jpeg',
  '.webp':        'image/webp',
  '.ico':         'image/x-icon',
  '.woff':        'font/woff',
  '.woff2':       'font/woff2',
  '.ttf':         'font/ttf',
  '.mp4':         'video/mp4',
  '.txt':         'text/plain',
  '.xml':         'application/xml',
};

function getMime(filePath) {
  const clean = filePath.replace(/\.(gz|br)$/, '');
  return MIME[path.extname(clean)] || 'application/octet-stream';
}

function isAsset(urlPath) {
  return urlPath.startsWith('/assets/') || urlPath.startsWith('/icons/') || urlPath.startsWith('/models/');
}

function sendFile(res, filePath, encoding, urlPath) {
  const stat = (() => { try { return fs.statSync(filePath); } catch { return null; } })();
  if (!stat) return false;
  const headers = {
    'Content-Type': getMime(filePath),
    'Content-Length': stat.size,
    'Vary': 'Accept-Encoding',
  };
  if (encoding) headers['Content-Encoding'] = encoding;
  if (isAsset(urlPath)) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  // Decode URI
  try { urlPath = decodeURIComponent(urlPath); } catch {}

  const accept = req.headers['accept-encoding'] || '';
  const supportsBr   = accept.includes('br');
  const supportsGzip = accept.includes('gzip');

  const diskPath = path.join(DIST, urlPath);

  // Try pre-compressed then uncompressed
  const attempts = [];
  if (supportsBr)   attempts.push([diskPath + '.br', 'br']);
  if (supportsGzip) attempts.push([diskPath + '.gz', 'gzip']);
  attempts.push([diskPath, null]);

  for (const [fp, enc] of attempts) {
    if (sendFile(res, fp, enc, urlPath)) return;
  }

  // Directory → try index.html
  const indexPath = path.join(diskPath, 'index.html');
  if (sendFile(res, indexPath, null, urlPath)) return;

  // SPA fallback — serve root index.html for any non-asset 404
  if (!isAsset(urlPath)) {
    const spaPath = path.join(DIST, 'index.html');
    if (sendFile(res, spaPath, null, '/')) return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`IFB DEUS running on http://localhost:${PORT} (brotli+gzip enabled)`);
});
