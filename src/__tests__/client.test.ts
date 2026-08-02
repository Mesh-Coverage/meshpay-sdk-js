import { createHmac } from 'crypto';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';

import { Meshpay } from '../index';
import { MeshpayError, WebhookVerificationError } from '../types';
import {
  computeSignature,
  verifyWebhookSignature,
  constructWebhookEvent
} from '../client';

const APP_ID = 'test-app';
const SECRET = 'test-secret';

interface Captured {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let server: Server;
let baseURL: string;
let captured: Captured[] = [];
let handler: (req: IncomingMessage, res: ServerResponse, body: string) => void;

beforeAll((done) => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      captured.push({
        method: req.method!,
        url: req.url!,
        headers: req.headers,
        body
      });
      handler(req, res, body);
    });
  });
  server.listen(0, () => {
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    done();
  });
});

afterAll((done) => {
  server.close(() => done());
});

beforeEach(() => {
  captured = [];
  handler = (_req, res) => json(res, 200, {});
});

function json(res: ServerResponse, status: number, body?: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function client(overrides: Partial<{ retries: number }> = {}): Meshpay {
  return new Meshpay({ appId: APP_ID, secret: SECRET, baseURL, ...overrides });
}

const last = (): Captured => captured[captured.length - 1];

describe('signing', () => {
  it('matches the API scheme: hex(HMAC-SHA256(secret, "appId.ts.nonce"))', () => {
    expect(computeSignature('secret', 'app', '1700000000000', 'abc')).toBe(
      '193a27378694391dd38c1537320a92bd75d764204d9c3867891083cee3257e5d'
    );
  });

  it('sends the four auth headers with a valid signature', async () => {
    handler = (_req, res) =>
      json(res, 200, { available_kobo: 1, available: '0.01', currency: 'NGN' });

    await client().accounts.getBalance();

    const h = last().headers as Record<string, string>;
    expect(h['x-app-id']).toBe(APP_ID);
    expect(h['x-timestamp']).toMatch(/^\d{13}$/);
    expect(h['x-nonce']).toMatch(/^[0-9a-f]{32}$/);
    expect(h['x-signature']).toBe(
      createHmac('sha256', SECRET)
        .update(`${APP_ID}.${h['x-timestamp']}.${h['x-nonce']}`)
        .digest('hex')
    );
  });

  it('does not sign the public /api/pay surface', async () => {
    handler = (_req, res) =>
      json(res, 200, { reference: 'r', status: 'paid', amount_kobo: 1 });

    await client().charges.public_.getStatus('r');

    expect(last().headers['x-signature']).toBeUndefined();
    expect(last().headers['x-app-id']).toBeUndefined();
  });
});

describe('requests', () => {
  it('preserves the list envelope rather than unwrapping data', async () => {
    handler = (_req, res) =>
      json(res, 200, { data: [{ id: 'c1' }], total: 1, limit: 20, offset: 0 });

    const page = await client().customers.list({ limit: 20, offset: 0 });

    expect(page.total).toBe(1);
    expect(page.data).toHaveLength(1);
    expect(last().url).toBe('/api/client/customers?limit=20&offset=0');
  });

  it('omits undefined query params', async () => {
    handler = (_req, res) =>
      json(res, 200, { data: [], total: 0, limit: 20, offset: 0 });

    await client().customers.list();

    expect(last().url).toBe('/api/client/customers');
  });

  it('unwraps the data array for bill catalogues', async () => {
    handler = (_req, res) => json(res, 200, { data: [{ id: 'p1' }, { id: 'p2' }] });

    await expect(client().bills.listDataPlans('MTN')).resolves.toHaveLength(2);
    expect(last().url).toBe('/api/client/bills/data-plans/MTN');
  });

  it('sends snake_case bodies and handles 201', async () => {
    handler = (_req, res) =>
      json(res, 201, { id: 'c1', reference: 'ref_abc', status: 'pending' });

    const charge = await client().charges.create({
      payer_email: 'p@example.com',
      amount_kobo: 250_000,
      trx_reference: 'inv-1'
    });

    expect(charge.reference).toBe('ref_abc');
    expect(JSON.parse(last().body)).toEqual({
      payer_email: 'p@example.com',
      amount_kobo: 250_000,
      trx_reference: 'inv-1'
    });
  });

  it('surfaces payment_url on a created charge', async () => {
    handler = (_req, res) =>
      json(res, 201, {
        id: 'c1',
        reference: 'chg_abc123',
        status: 'pending',
        amount_kobo: 250_000,
        payment_url: 'https://app.meshpay.ng/pay/chg_abc123'
      });

    const charge = await client().charges.create({
      payer_email: 'p@example.com',
      amount_kobo: 250_000,
      trx_reference: 'inv-2'
    });

    expect(charge.payment_url).toBe('https://app.meshpay.ng/pay/chg_abc123');
  });

  it('surfaces settlement details on a single charge read', async () => {
    handler = (_req, res) =>
      json(res, 200, {
        reference: 'chg_abc123',
        status: 'paid',
        payment_url: 'https://app.meshpay.ng/pay/chg_abc123',
        transaction_reference: 'in_9f2c',
        session_id: '000017240412'
      });

    const charge = await client().charges.get('chg_abc123');

    expect(charge.transaction_reference).toBe('in_9f2c');
    expect(charge.session_id).toBe('000017240412');
  });

  it('passes the category filter through to the transactions query', async () => {
    handler = (_req, res) =>
      json(res, 200, { data: [], total: 0, limit: 20, offset: 0 });

    await client().payments.listTransactions({
      limit: 10,
      category: 'TRANSFER'
    });

    expect(last().url).toBe('/api/client/transactions?limit=10&category=TRANSFER');
  });

  it('resolves 204 responses to undefined', async () => {
    handler = (_req, res) => res.writeHead(204).end();

    await expect(client().customers.remove('c1')).resolves.toBeUndefined();
    expect(last().method).toBe('DELETE');
  });
});

describe('errors', () => {
  it('maps the API error envelope onto MeshpayError', async () => {
    handler = (_req, res) =>
      json(res, 409, {
        status_code: 409,
        message: 'Duplicate transaction reference',
        error: 'Conflict'
      });

    expect.assertions(4);
    try {
      await client().payments.createTransfer({
        account_number: '0123456789',
        bank_code: '011',
        amount_kobo: 1000,
        trx_reference: 'dup',
        sender_name: 'Test Sender',
        account_name: 'Test Recipient'
      });
    } catch (err) {
      const e = err as MeshpayError;
      expect(e).toBeInstanceOf(MeshpayError);
      expect(e.message).toBe('Duplicate transaction reference');
      expect(e.isDuplicate).toBe(true);
      expect(e.isClientError).toBe(true);
    }
  });

  it('retries 5xx with a fresh nonce each attempt', async () => {
    handler = (_req, res) =>
      json(res, 500, { status_code: 500, message: 'boom', error: 'Internal' });

    await expect(client({ retries: 3 }).accounts.getBalance()).rejects.toThrow(
      MeshpayError
    );

    expect(captured).toHaveLength(3);
    const nonces = new Set(captured.map((c) => c.headers['x-nonce'] as string));
    expect(nonces.size).toBe(3);
  }, 15_000);

  it('never retries 4xx', async () => {
    handler = (_req, res) =>
      json(res, 404, { status_code: 404, message: 'nope', error: 'Not Found' });

    await expect(client().accounts.getBalance()).rejects.toThrow(MeshpayError);
    expect(captured).toHaveLength(1);
  });

  it('rejects a config missing credentials', () => {
    expect(() => new Meshpay({ appId: '', secret: '' })).toThrow(MeshpayError);
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'whsec';
  const body = '{"event":"inflow.success"}';
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('accepts a Buffer body', () => {
    expect(verifyWebhookSignature(Buffer.from(body), signature, secret)).toBe(
      true
    );
  });

  it('rejects a tampered body, wrong secret, and malformed input', () => {
    expect(verifyWebhookSignature(body + ' ', signature, secret)).toBe(false);
    expect(verifyWebhookSignature(body, signature, 'wrong')).toBe(false);
    expect(verifyWebhookSignature(body, 'deadbeef', secret)).toBe(false);
    expect(verifyWebhookSignature(body, '', secret)).toBe(false);
  });
});

describe('constructWebhookEvent', () => {
  const secret = 'whsec';
  const sign = (b: string): string =>
    createHmac('sha256', secret).update(b).digest('hex');

  it('verifies and narrows an inflow.success event', () => {
    const raw = JSON.stringify({
      event: 'inflow.success',
      timestamp: 1_700_000_000,
      data: {
        reference: 'in_9f2c',
        trx_reference: 'nomba_tx_1',
        category: 'INFLOW',
        status: 'SUCCESS',
        amount_kobo: 500_000,
        fee_kobo: 5_000,
        currency: 'NGN',
        settled_at: '2026-07-25T08:00:00Z',
        session_id: '000017240412',
        account_ref: 'customer-4821-va',
        counterparty: { provider: 'nomba', sender_name: 'Jane Doe' }
      }
    });

    const event = constructWebhookEvent(raw, sign(raw), secret);

    expect(event.event).toBe('inflow.success');
    if (event.event === 'inflow.success') {
      // Narrowed to TransactionWebhookData.
      expect(event.data.account_ref).toBe('customer-4821-va');
      expect(event.data.counterparty?.sender_name).toBe('Jane Doe');
      expect(event.data.session_id).toBe('000017240412');
    }
    expect(event.timestamp).toBe(1_700_000_000);
  });

  it('narrows charge.success to its own payload shape', () => {
    const raw = JSON.stringify({
      event: 'charge.success',
      timestamp: 1_700_000_000,
      data: {
        reference: 'chg_abc123',
        trx_reference: 'invoice-2291',
        amount_kobo: 250_000,
        transaction: 'in_9f2c',
        callback_url: 'https://example.com/done'
      }
    });

    const event = constructWebhookEvent(raw, sign(raw), secret);

    if (event.event === 'charge.success') {
      expect(event.data.transaction).toBe('in_9f2c');
      expect(event.data.callback_url).toBe('https://example.com/done');
    } else {
      throw new Error('expected charge.success');
    }
  });

  it('exposes failure_reason on bill.failed', () => {
    const raw = JSON.stringify({
      event: 'bill.failed',
      timestamp: 1_700_000_000,
      data: {
        reference: 'bill_1',
        trx_reference: 'airtime-8891',
        category: 'BILL',
        status: 'FAILED',
        amount_kobo: 10_000,
        fee_kobo: 0,
        currency: 'NGN',
        settled_at: null,
        metadata: { failure_reason: 'provider rejected' }
      }
    });

    const event = constructWebhookEvent(raw, sign(raw), secret);

    if (event.event === 'bill.failed') {
      expect(event.data.metadata?.failure_reason).toBe('provider rejected');
      expect(event.data.settled_at).toBeNull();
    } else {
      throw new Error('expected bill.failed');
    }
  });

  it('accepts a Buffer body', () => {
    const raw = JSON.stringify({
      event: 'transfer.success',
      timestamp: 1,
      data: {}
    });

    expect(
      constructWebhookEvent(Buffer.from(raw), sign(raw), secret).event
    ).toBe('transfer.success');
  });

  it('throws on a bad signature before parsing', () => {
    const raw = JSON.stringify({ event: 'transfer.success', data: {} });

    expect(() => constructWebhookEvent(raw, 'deadbeef', secret)).toThrow(
      WebhookVerificationError
    );
  });

  it('throws on a correctly signed but malformed body', () => {
    const notJson = 'not json';
    expect(() =>
      constructWebhookEvent(notJson, sign(notJson), secret)
    ).toThrow(/not valid JSON/);

    const wrongShape = JSON.stringify({ hello: 'world' });
    expect(() =>
      constructWebhookEvent(wrongShape, sign(wrongShape), secret)
    ).toThrow(/not a MeshPay event envelope/);
  });
});
