// Local preview of the Cuisigo landing page: serves /public.
// Run with `npm start` (or `node server.js`), then open http://localhost:3000.
//
// The live site is static (GitHub Pages publishes /public). Sign-ups don't go
// through this server: the form posts to the Google Apps Script in
// google-apps-script/, which keeps them in a private Google Sheet.

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// The sign-up form talks to Apps Script, which answers from script.google.com
// and then redirects to script.googleusercontent.com.
const SIGNUP_HOSTS = 'https://script.google.com https://script.googleusercontent.com';

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    `default-src 'self'; img-src 'self' data:; connect-src 'self' ${SIGNUP_HOSTS}; form-action 'self' ${SIGNUP_HOSTS}; ` +
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, 'Not found');

  let info;
  try {
    info = await stat(file);
  } catch {
    return send(res, 404, 'Not found');
  }
  if (!info.isFile()) return send(res, 404, 'Not found');

  const ext = path.extname(file).toLowerCase();
  const longCache = ['.woff2', '.webp', '.png', '.jpg', '.svg', '.ico'].includes(ext);
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : longCache ? 'public, max-age=604800' : 'public, max-age=3600',
    'Last-Modified': info.mtime.toUTCString(),
  };

  const since = Date.parse(req.headers['if-modified-since'] || '');
  if (!Number.isNaN(since) && Math.floor(info.mtimeMs / 1000) * 1000 <= since) {
    res.writeHead(304, headers);
    return res.end();
  }

  res.writeHead(200, { ...headers, 'Content-Length': info.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    const { pathname } = new URL(req.url, 'http://localhost');
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, 'Server error');
    else res.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Cuisigo preview is running at http://localhost:${PORT}`);
});
