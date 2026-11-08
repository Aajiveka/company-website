// Minimal API client for the QA suite. Talks to a REAL API — never point it at production.
//
// Each synthetic actor gets its own X-Forwarded-For address. The API runs with
// `trust proxy = 1`, so when it is reached directly (no nginx) the throttler keys on that
// header — which lets 1,000 synthetic sign-ups run without tripping the per-IP auth limits
// (5/min register, 5/min login) while still exercising them per actor. Behind nginx in a real
// deployment the header is overwritten by $proxy_add_x_forwarded_for, so this is a test-only
// lever, not a bypass.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BASE = process.env.QA_API_URL ?? 'http://localhost:4100/api';
export const API_LOG = process.env.QA_API_LOG ?? '';
export const STATE_DIR = process.env.QA_STATE_DIR ?? fileURLToPath(new URL('../.state/', import.meta.url));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Refuses to run against anything that is not an explicitly local, non-production API. */
export async function assertSafeTarget() {
  const u = new URL(BASE);
  if (!['localhost', '127.0.0.1'].includes(u.hostname) && process.env.QA_ALLOW_REMOTE !== '1') {
    throw new Error(`Refusing to run against ${u.host}: set QA_ALLOW_REMOTE=1 only for a staging host`);
  }
  const h = await fetch(`${BASE}/health`).then((r) => r.json());
  if (h.env === 'production') throw new Error('Target API reports env=production — refusing');
  return h;
}

export const ipFor = (n) => `10.${100 + ((n >> 16) & 0x7f)}.${(n >> 8) & 0xff}.${n & 0xff}`;

export class Api {
  constructor({ ip = '10.0.0.1', token = null } = {}) {
    this.ip = ip;
    this.token = token;
    this.calls = [];
  }

  async req(method, path, { body, form, query, expect, raw = false, retries = 6 } = {}) {
    const url = new URL(BASE + path);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    const headers = { 'X-Forwarded-For': this.ip };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    for (let attempt = 0; ; attempt++) {
      const t0 = performance.now();
      let res;
      try {
        res = await fetch(url, { method, headers, body: payload });
      } catch (e) {
        if (attempt < retries) { await sleep(500 * (attempt + 1)); continue; }
        throw e;
      }
      const ms = performance.now() - t0;
      this.calls.push({ method, path, status: res.status, ms });
      if (res.status === 429 && attempt < retries) {
        const j = await res.json().catch(() => ({}));
        await sleep(((j.retryAfterSeconds ?? 2) * 1000) + 250);
        continue;
      }
      const data = raw ? Buffer.from(await res.arrayBuffer()) : await res.text().then((t) => { try { return JSON.parse(t); } catch { return t; } });
      if (expect !== undefined) {
        const ok = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
        if (!ok) {
          const err = new Error(`${method} ${path} → ${res.status} (expected ${expect}): ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
          err.status = res.status;
          err.data = data;
          throw err;
        }
      }
      return { status: res.status, data, ms, headers: res.headers };
    }
  }

  get(p, o) { return this.req('GET', p, o); }
  post(p, body, o = {}) { return this.req('POST', p, { ...o, body }); }
  put(p, body, o = {}) { return this.req('PUT', p, { ...o, body }); }
  patch(p, body, o = {}) { return this.req('PATCH', p, { ...o, body }); }
  del(p, o) { return this.req('DELETE', p, o); }

  async login(userName, password) {
    const r = await this.post('/auth/login', { userName, password }, { expect: 200 });
    this.token = r.data.accessToken;
    this.refreshToken = r.data.refreshToken;
    this.user = r.data.user;
    return r.data;
  }

  upload(path, field, buf, filename, mime) {
    const fd = new FormData();
    fd.append(field, new Blob([buf], { type: mime }), filename);
    return this.req('POST', path, { form: fd });
  }
}

/** Run `fn` over `items` with at most `n` in flight. Collects per-item errors instead of stopping. */
export async function pool(items, n, fn, onProgress) {
  const results = new Array(items.length);
  let next = 0, done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try { results[i] = { ok: true, value: await fn(items[i], i) }; }
      catch (e) { results[i] = { ok: false, error: e.message, status: e.status }; }
      done++;
      if (onProgress && done % 50 === 0) onProgress(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

/** The log email driver writes the approval mail (temporary password) to the API log. */
export async function tempPasswordFromLog(email, { tries = 40 } = {}) {
  if (!API_LOG) throw new Error('QA_API_LOG must point at the QA API log to read employer temporary passwords');
  const esc = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`to=${esc} subject="Your Aajiveka Employer Account is Approved"[\\s\\S]*?Temporary Password:\\s*(\\S+)`, 'g');
  for (let i = 0; i < tries; i++) {
    const log = readFileSync(API_LOG, 'utf8');
    let m, last = null;
    while ((m = re.exec(log))) last = m[1];
    if (last) return last.replace(/\x1b\[[0-9;]*m/g, '');
    await sleep(250);
  }
  throw new Error(`No approval mail for ${email} in ${API_LOG}`);
}
