// Cuisigo landing page: serves /public and records launch registrations.
// Zero dependencies. Run with `npm start` (or `node server.js`).
//
// Sign-ups are appended to data/subscribers.csv (one row per new email,
// plus a new row when an existing subscriber opts in to the newsletter).

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const CSV_FILE = path.join(DATA_DIR, 'subscribers.csv');
const PORT = Number(process.env.PORT) || 3000;

const CSV_HEADER = 'email,newsletter,language,registered_at,newsletter_consent_text\n';
const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 10 }; // per IP
const EMAIL_RE = /^[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

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

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ---------------------------------------------------------------------------
// Subscriber storage
// ---------------------------------------------------------------------------

const subscribers = new Map(); // email -> has opted in to the newsletter
let writeQueue = Promise.resolve();

async function loadSubscribers() {
  await mkdir(DATA_DIR, { recursive: true });
  let text = '';
  try {
    text = await readFile(CSV_FILE, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (!text) {
    await appendFile(CSV_FILE, CSV_HEADER);
    return;
  }
  for (const line of text.split('\n').slice(1)) {
    if (!line) continue;
    const [email, newsletter] = line.split(',', 2);
    subscribers.set(email, subscribers.get(email) === true || newsletter === 'yes');
  }
}

// Escapes a CSV field and neutralises spreadsheet formulas (=, +, -, @).
function csvField(value) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function record({ email, newsletter, language, consentText }) {
  const previous = subscribers.get(email); // undefined | false | true
  if (previous === true || (previous === false && !newsletter)) return 'existing';

  subscribers.set(email, newsletter);
  const row = [email, newsletter ? 'yes' : 'no', language, new Date().toISOString(), csvField(consentText)].join(',');
  const job = writeQueue.then(() => appendFile(CSV_FILE, `${row}\n`));
  writeQueue = job.catch(() => {});
  try {
    await job;
  } catch (err) {
    if (previous === undefined) subscribers.delete(email);
    else subscribers.set(email, previous);
    throw err;
  }
  return previous === undefined ? 'added' : 'updated';
}

// ---------------------------------------------------------------------------
// Sign-up endpoint
// ---------------------------------------------------------------------------

const hits = new Map(); // ip -> { count, reset }

function isRateLimited(ip) {
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || entry.reset <= now) {
    entry = { count: 0, reset: now + RATE_LIMIT.windowMs };
    hits.set(ip, entry);
  }
  entry.count += 1;
  if (hits.size > 10_000) {
    for (const [key, value] of hits) if (value.reset <= now) hits.delete(key);
  }
  return entry.count > RATE_LIMIT.max;
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseBody(type, raw) {
  if (type === 'application/json') return JSON.parse(raw);
  if (type === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(raw));
  throw new Error(`Unsupported content type: ${type}`);
}

function cleanText(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 300);
}

const NO_JS_PAGES = {
  ok: ['You’re on the list.', 'We’ll email you on launch day.'],
  invalid_email: ['Check your email address.', 'That doesn’t look like a valid email address. Please go back and try again.'],
  rate_limited: ['Too many attempts.', 'Please try again in a few minutes.'],
  bad_request: ['Something went wrong.', 'Please go back and try again.'],
};

async function handleSubscribe(req, res) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const fromPlainForm = type === 'application/x-www-form-urlencoded' && !(req.headers.accept || '').includes('application/json');

  const reply = (status, error) => {
    if (fromPlainForm) {
      const [title, text] = NO_JS_PAGES[error || 'ok'];
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Cuisigo</title><link rel="stylesheet" href="/styles.css"></head><body><main class="notice wrap"><h1 class="display-2">${title}</h1><p class="lede">${text}</p><p><a class="btn" href="/">Back to Cuisigo</a></p></main></body></html>`;
      return send(res, status, html, { 'Content-Type': TYPES['.html'] });
    }
    return send(res, status, JSON.stringify(error ? { ok: false, error } : { ok: true }), {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
  };

  if (isRateLimited(clientIp(req))) return reply(429, 'rate_limited');

  let body;
  try {
    body = parseBody(type, await readBody(req));
  } catch {
    return reply(400, 'bad_request');
  }
  if (!body || typeof body !== 'object') return reply(400, 'bad_request');

  // Honeypot: real people never see this field, bots tend to fill it in.
  if (cleanText(body.website)) return reply(200);

  const email = String(body.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return reply(422, 'invalid_email');

  const newsletter = [true, 'true', 'yes', 'on'].includes(body.newsletter);
  const language = body.language === 'fr' ? 'fr' : 'en';
  const consentText = newsletter ? cleanText(body.consent_text) : '';

  const result = await record({ email, newsletter, language, consentText });
  if (result === 'added') console.log(`[cuisigo] new registration (${subscribers.size} total)`);
  if (result === 'updated') console.log('[cuisigo] newsletter opt-in added for an existing registration');
  return reply(200);
}

// ---------------------------------------------------------------------------
// Static files
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/subscribe') {
      if (req.method !== 'POST') return send(res, 405, 'Method not allowed', { Allow: 'POST' });
      return await handleSubscribe(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, 'Server error');
    else res.destroy();
  }
});

await loadSubscribers();
server.listen(PORT, () => {
  console.log(`Cuisigo is running at http://localhost:${PORT}`);
  console.log(`Sign-ups are saved to ${path.relative(process.cwd(), CSV_FILE) || CSV_FILE}`);
});
