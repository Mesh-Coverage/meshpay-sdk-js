# MeshPay SDK for Node.js

Official Node.js/TypeScript SDK for the MeshPay client API.

- Handles the signed-request scheme (HMAC-SHA256) for you
- Full TypeScript types mirroring the API's own DTOs
- Automatic retries with exponential backoff on 5xx and network errors
- Zero runtime dependencies

Requires **Node.js 18+** (uses the built-in `fetch`).

## Installation

```bash
npm install @mesh-coverage/meshpayjs
```

## Quick start

```ts
import { Meshpay } from '@mesh-coverage/meshpayjs';

const meshpay = new Meshpay({
  appId: process.env.MESHPAY_APP_ID!,
  secret: process.env.MESHPAY_SECRET!
});

const balance = await meshpay.accounts.getBalance();
console.log(balance);
// { available_kobo: 14979500, available: '149795.00', currency: 'NGN' }
```

## Configuration

```ts
import { Meshpay, SANDBOX_BASE_URL } from '@mesh-coverage/meshpayjs';

const meshpay = new Meshpay({
  appId: 'your-app-id',      // sent as x-app-id
  secret: 'your-secret',     // signs requests; never transmitted
  baseURL: SANDBOX_BASE_URL, // default: https://api.meshpay.ng
  timeout: 30_000,           // ms, default 30000
  retries: 3                 // total attempts, default 3
});
```

| Option | Required | Default |
| --- | --- | --- |
| `appId` | yes | — |
| `secret` | yes | — |
| `baseURL` | no | `https://api.meshpay.ng` |
| `timeout` | no | `30000` |
| `retries` | no | `3` |

Sandbox is at `https://sandbox-api.meshpay.ng`, exported as `SANDBOX_BASE_URL`.

## Amounts are in kobo

Every `*_kobo` field is an integer in the smallest currency unit: **₦1 = 100 kobo**. To send ₦500, pass `amount_kobo: 50000`.

The two exceptions are bill payments and `expected_amount` on a virtual account, which the API takes as decimal naira (`amount: "1000.00"`), matching the biller's own units.

## Idempotency

Any endpoint that moves money requires a `trx_reference` — your own unique key for the operation. It carries a per-business uniqueness constraint, so a retried request with the same reference fails with **409** instead of transferring twice.

```ts
import { MeshpayError } from '@mesh-coverage/meshpayjs';

try {
  await meshpay.payments.createTransfer({ /* ... */, trx_reference: 'order-1042' });
} catch (err) {
  if (err instanceof MeshpayError && err.isDuplicate) {
    // Already submitted — look it up rather than retrying.
    const existing = await meshpay.payments.getTransaction('order-1042');
  }
}
```

## Modules

### Accounts

```ts
// Issue a virtual account
const account = await meshpay.accounts.issue({
  account_ref: 'customer-4821-va',
  account_name: 'John Doe',
  customer_id: customer.id // optional
});

// List / fetch
const { data, total } = await meshpay.accounts.list({ limit: 20, offset: 0 });
const one = await meshpay.accounts.get(account.id);

// Status, linking
await meshpay.accounts.setStatus(account.id, 'disabled');
await meshpay.accounts.link(account.id, customer.id);
await meshpay.accounts.unlink(account.id);

// Banks
const banks = await meshpay.accounts.listBanks();
const resolved = await meshpay.accounts.resolveBank({
  account_number: '0123456789',
  bank_code: '011'
});

// Balance
const balance = await meshpay.accounts.getBalance();
const kobo = await meshpay.accounts.getAvailableKobo();
const ok = await meshpay.accounts.hasSufficientBalance(50_000);
```

### Payments

```ts
const transfer = await meshpay.payments.createTransfer({
  account_number: '0123456789',
  bank_code: '011',
  account_name: 'Jane Doe',
  amount_kobo: 50_000,
  narration: 'Payout for order 1042',
  trx_reference: 'payout-1042'
});

const { data } = await meshpay.payments.listTransactions({ limit: 50 });

// Filter by category
const bills = await meshpay.payments.listTransactions({ category: 'BILL' });

// Accepts MeshPay's reference or your own trx_reference
const txn = await meshpay.payments.getTransaction('payout-1042');
```

On an outbound transfer the wallet movement is `amount_kobo + fee_kobo + stamp_duty_kobo`. Stamp duty is statutory, levied by the provider and passed through at cost, so it's tracked separately from `fee_kobo` (MeshPay's own charge) rather than folded into it. `net_amount_kobo` is the total of all three.

`session_id` is the provider's NIBSS reference — what the payer's or recipient's own bank shows them, and what you quote when tracing a payment with the banks.

### Charges (payment links)

A charge is a one-off request for a fixed amount. The payer settles it by transferring into a dedicated, expiring virtual account — no MeshPay account needed on their side.

```ts
const charge = await meshpay.charges.create({
  payer_email: 'payer@example.com',
  amount_kobo: 250_000,
  trx_reference: 'invoice-2291',
  callback_url: 'https://yourapp.com/payment/complete',
  metadata: { invoice_id: '2291' }
});

// Hand this to the payer — don't build the URL yourself.
console.log(charge.payment_url);
// https://app.meshpay.ng/pay/chg_abc123

const { data } = await meshpay.charges.list({ limit: 20 });
const one = await meshpay.charges.get(charge.reference);
```

`payment_url` is returned on every merchant-facing charge response. It's absent only if no payment base URL is configured server-side, which means charges can't be paid at all — worth alerting on rather than falling back to a hand-built URL.

A single-charge read (`charges.get`) additionally returns settlement details once paid:

```ts
const paid = await meshpay.charges.get(reference);
paid.transaction_reference; // pass to payments.getTransaction()
paid.session_id;            // NIBSS reference, for tracing with the banks
```

Both are omitted while the charge is unpaid, and `charges.list` omits them entirely — it doesn't pay for the extra lookup. Note `transaction_id` is an internal uuid and is *not* accepted by `getTransaction`; use `transaction_reference`.

The virtual account is issued **lazily** — `charge.account_id` is empty until the payer first opens the payment page (or you call `issueAccount`).

#### Building your own payment page

`meshpay.charges.public_` calls the `/api/pay` surface, which takes no credentials — the payer authenticates by knowing the reference alone. These are safe to call from a browser.

```ts
// Render the page
const view = await meshpay.charges.public_.get(reference);
// { amount_kobo, status, business_name, business_logo_url, bank_name, ... }

// Issue (or regenerate) the account to pay into
const details = await meshpay.charges.public_.issueAccount(reference);
// { bank_name, account_number, account_name, expires_at }

// Poll until settled
const status = await meshpay.charges.public_.getStatus(reference);
// status.status is 'pending' | 'paid' | 'expired'
```

A charge's status moves to `paid` automatically when a matching inflow lands, and you receive a webhook. Polling is for the payer's browser; don't rely on it server-side.

### Customers

```ts
const customer = await meshpay.customers.create({
  external_ref: 'user-4821',   // your own id, required
  email: 'john@example.com',
  phone: '+2348012345678',
  first_name: 'John',
  last_name: 'Doe'
});

const { data } = await meshpay.customers.list({ limit: 20 });
await meshpay.customers.get(customer.id);
await meshpay.customers.update(customer.id, { phone: '+2349876543210' });
await meshpay.customers.remove(customer.id);

// Verifying a BVN also requires the date of birth, and is billed per lookup
await meshpay.customers.upgradeKYC(customer.id, {
  tier: 2,
  bvn: '12345678901',
  date_of_birth: '1990-01-15'
});
```

Returned customers are PII-masked: `bvn` and `nin` come back masked, never in the clear.

### Bills

```ts
await meshpay.bills.pay({
  type: 'airtime',
  amount: '500.00',
  phone_number: '+2348012345678',
  network: 'MTN',
  trx_reference: 'airtime-8891'
});

const plans = await meshpay.bills.listDataPlans('MTN');
const discos = await meshpay.bills.listElectricityProviders();

// Confirm who you're paying before charging the customer
const biller = await meshpay.bills.lookupCustomer({
  type: 'electricity',
  provider_id: 'ikeja-electric',
  customer_id: '01234567890'   // meter number
});
```

Required fields vary by `type`:

| Type | Additional required fields |
| --- | --- |
| `airtime`, `data` | `phone_number`, `network` |
| `electricity` | `disco`, `meter_type`, `customer_id` |
| `cabletv` | `cable_tv_type`, `customer_id` |

### Identity

```ts
const bvn = await meshpay.identity.verifyBVN({ bvn: '12345678901' });
const company = await meshpay.identity.verifyBusiness({
  rc_number: 'RC123456',
  company_name: 'Acme Ltd'
});
```

## Errors

Every non-2xx response throws a `MeshpayError`.

```ts
import { MeshpayError } from '@mesh-coverage/meshpayjs';

try {
  await meshpay.payments.createTransfer({ /* ... */ });
} catch (err) {
  if (err instanceof MeshpayError) {
    err.statusCode;     // 409
    err.message;        // "Duplicate transaction reference"
    err.isClientError;  // true for 4xx
    err.isServerError;  // true for 5xx
    err.isDuplicate;    // true for 409
    err.body;           // full parsed response body
  }
}
```

Network failures and timeouts also throw `MeshpayError`, with `statusCode` of `0`.

**Retries.** 5xx and network errors are retried with exponential backoff (1s, 2s, 4s…). 4xx responses are never retried — they won't succeed on a second attempt, and retrying a write would risk double-spending. Each attempt is re-signed with a fresh timestamp and nonce.

## Webhooks

MeshPay signs the raw request body with your business's webhook secret and sends it hex-encoded in `X-MeshPay-Signature`, with the event name in `X-MeshPay-Event`.

Use `constructWebhookEvent` — it verifies the signature and returns a fully typed, discriminated event, so the verify-then-parse order can't be got wrong:

```ts
import express from 'express';
import { constructWebhookEvent, WebhookVerificationError } from '@mesh-coverage/meshpayjs';

const app = express();

app.post(
  '/webhooks/meshpay',
  express.raw({ type: 'application/json' }), // raw body, not express.json()
  (req, res) => {
    let event;
    try {
      event = constructWebhookEvent(
        req.body,
        req.header('X-MeshPay-Signature') ?? '',
        process.env.MESHPAY_WEBHOOK_SECRET!
      );
    } catch (err) {
      if (err instanceof WebhookVerificationError) return res.sendStatus(401);
      throw err;
    }

    // Acknowledge fast; do the work asynchronously.
    res.sendStatus(200);

    switch (event.event) {
      case 'inflow.success':
        // event.data is TransactionWebhookData
        credit(event.data.account_ref, event.data.amount_kobo);
        break;
      case 'charge.success':
        // event.data is ChargeWebhookData
        markInvoicePaid(event.data.trx_reference, event.data.transaction);
        break;
      case 'bill.failed':
        // event.data is BillWebhookData
        refund(event.data.trx_reference, event.data.metadata?.failure_reason);
        break;
    }
  }
);
```

Pass the **raw** body. Parsing and re-serialising changes the bytes and breaks the signature — with Express that means `express.raw()`, not `express.json()`.

`verifyWebhookSignature(rawBody, signature, secret)` is still exported if you only want the boolean. Both use a constant-time comparison.

### Envelope

Every delivery has the same shape:

```json
{
  "event": "inflow.success",
  "data": { "...": "per-event, see below" },
  "timestamp": 1753430400
}
```

`timestamp` is Unix **seconds**, not milliseconds.

### Events

| Event | `data` type |
| --- | --- |
| `inflow.success` | `TransactionWebhookData` |
| `inflow.reversed` | `TransactionWebhookData` |
| `transfer.success` | `TransactionWebhookData` |
| `transfer.failed` | `TransactionWebhookData` |
| `transfer.reversed` | `TransactionWebhookData` |
| `pos.charge.success` | `TransactionWebhookData` |
| `pos.charge.failed` | `TransactionWebhookData` |
| `bill.success` | `BillWebhookData` |
| `bill.failed` | `BillWebhookData` |
| `bill.reversed` | `BillWebhookData` |
| `charge.success` | `ChargeWebhookData` |

**`TransactionWebhookData`** — `reference`, `trx_reference`, `category`, `status`, `amount_kobo`, `fee_kobo`, `currency`, `settled_at` (null until settled), plus optionally `stamp_duty_kobo` (always on outbound transfers, including `0`), `session_id`, `counterparty`, and — when tied to one of your virtual accounts — `account_ref`, `account_number`, `bank_name`, `customer_ref`.

**`BillWebhookData`** — the same core fields plus `metadata`, which carries `failure_reason` on `bill.failed`.

**`ChargeWebhookData`** — `reference` (the charge), `trx_reference`, `amount_kobo`, `transaction` (MeshPay's reference for the settling transaction — pass it to `getTransaction`), `callback_url`, and optionally `session_id`.

`session_id` sits at `data.session_id` on every event type, never nested elsewhere, so one field position works regardless of which webhook you're handling.

To type a handler for a single event, use `WebhookDataFor`:

```ts
import type { WebhookDataFor } from '@mesh-coverage/meshpayjs';

function onInflow(data: WebhookDataFor<'inflow.success'>) { /* ... */ }
```

### Delivery

MeshPay makes one initial attempt plus up to 5 automatic retries (30s, 2m, 10m, 30m, 2h), and a failed delivery can be resent by hand from the dashboard's developer menu. Handlers must therefore be **idempotent** — the same event can arrive more than once. Acknowledge with a 2xx as soon as you've verified and persisted; do the real work afterwards.

## Authentication details

You rarely need this — the SDK signs for you — but for reference, each request carries:

| Header | Value |
| --- | --- |
| `x-app-id` | your API key's app id |
| `x-timestamp` | Unix milliseconds |
| `x-nonce` | unique random value per request |
| `x-signature` | `hex(HMAC-SHA256(secret, "{appId}.{timestamp}.{nonce}"))` |

The request body is **not** part of the signature. Timestamps outside the server's skew window are rejected, as are repeated nonces.

`computeSignature` is exported if you need to sign requests made outside this SDK:

```ts
import { computeSignature } from '@mesh-coverage/meshpayjs';

const signature = computeSignature(secret, appId, Date.now().toString(), nonce);
```

## Escape hatch

For endpoints the SDK doesn't wrap yet, use the transport directly — signing and error handling still apply:

```ts
const result = await meshpay.client.get<MyType>('/api/client/some-endpoint', {
  limit: 10
});
```

## Pagination

List endpoints return `{ data, total, limit, offset }`. `limit` defaults to 20 and is capped server-side at 100.

```ts
async function* allTransactions() {
  let offset = 0;
  for (;;) {
    const page = await meshpay.payments.listTransactions({ limit: 100, offset });
    yield* page.data;
    offset += page.limit;
    if (offset >= page.total) return;
  }
}
```

## License

MIT
