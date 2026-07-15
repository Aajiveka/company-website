/**
 * A stand-in for BillDesk PG (ve1_2), implementing its documented contract.
 *
 * We have no BillDesk sandbox credentials — the ones in the legacy Web.config are
 * compromised — so the real service cannot be called. This stub lets the whole payment flow
 * be driven end to end: it verifies our JWS the way BillDesk would, and signs its responses
 * the same way, using the same shared secret.
 *
 * That proves OUR side: signing, verification, the order lifecycle, idempotency, amount
 * checking. It does NOT prove that BillDesk agrees with our reading of its spec — a sandbox
 * run is still required before go-live.
 *
 *   BILLDESK_SECRET_KEY=... node tests/billdesk-stub.mjs
 */
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const SECRET = process.env.BILLDESK_SECRET_KEY ?? 'stub-secret-key-for-local-testing-only';
const PORT = Number(process.env.STUB_PORT ?? 4999);
const API = process.env.API_URL ?? 'http://localhost:4000';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', clientid: 'stub' }));
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac('sha256', SECRET).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(mac)}`;
}

function verify(jws) {
  const [header, body, sig] = jws.trim().split('.');
  const expected = b64url(createHmac('sha256', SECRET).update(`${header}.${body}`).digest());
  if (sig !== expected) throw new Error('bad signature from merchant');
  return JSON.parse(fromB64url(body).toString('utf8'));
}

/** orderRef -> the amount we were asked to collect. */
const orders = new Map();

const server = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', async () => {
    // --- create order ---
    if (req.method === 'POST' && req.url === '/payments/ve1_2/orders/create') {
      let order;
      try {
        order = verify(raw);
      } catch (e) {
        res.writeHead(401).end(String(e.message));
        return;
      }
      if (!req.headers['bd-traceid'] || !req.headers['bd-timestamp']) {
        res.writeHead(400).end('missing BD-Traceid / BD-Timestamp');
        return;
      }
      if (req.headers['content-type'] !== 'application/jose') {
        res.writeHead(415).end('expected application/jose');
        return;
      }

      const bdorderid = `BD${Date.now()}`;
      orders.set(order.orderid, { amount: order.amount, ru: order.ru, bdorderid });

      const body = sign({
        orderid: order.orderid,
        bdorderid,
        links: [
          {
            rel: 'redirect',
            href: `http://localhost:${PORT}/pay/${order.orderid}`,
            parameters: { bdOrderID: bdorderid },
          },
        ],
      });
      res.writeHead(200, { 'Content-Type': 'application/jose' }).end(body);
      return;
    }

    // --- the hosted payment page: /pay/:orderid?outcome=success|failure ---
    const pay = req.url?.match(/^\/pay\/([^?]+)(\?.*)?$/);
    if (req.method === 'GET' && pay) {
      const orderid = pay[1];
      const known = orders.get(orderid);
      if (!known) {
        res.writeHead(404).end('unknown order');
        return;
      }
      const params = new URLSearchParams(pay[2] ?? '');
      const outcome = params.get('outcome') ?? 'success';
      // A tampered amount, to prove the API refuses to settle on it.
      const amount = params.get('amount') ?? known.amount;

      const txn = sign({
        orderid,
        transactionid: `TXN${Date.now()}`,
        auth_status: outcome === 'success' ? '0300' : '0399',
        amount,
        payment_method_type: 'netbanking',
        transaction_error_desc: outcome === 'success' ? '' : 'Declined by bank',
      });

      // Server-to-server callback — this is what actually settles the order.
      await fetch(`${API}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/jose' },
        body: txn,
      }).catch((e) => ({ status: 0, text: async () => String(e) }));

      // Real BillDesk returns the browser to the merchant's return URL (`ru`)
      // after settling. Mirror that so the whole flow is clickable end to end.
      const sep = known.ru.includes('?') ? '&' : '?';
      const location = `${known.ru}${sep}ref=${encodeURIComponent(orderid)}&outcome=${outcome}`;
      res.writeHead(302, { Location: location }).end();
      return;
    }

    res.writeHead(404).end('not found');
  });
});

server.listen(PORT, () => console.log(`billdesk stub on http://localhost:${PORT}`));
