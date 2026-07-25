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

// Accepts MeshPay's reference or your own trx_reference
const txn = await meshpay.payments.getTransaction('payout-1042');
```

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

// Send the payer to your page, or MeshPay's:
// https://app.meshpay.ng/pay/{charge.reference}

const { data } = await meshpay.charges.list({ limit: 20 });
const one = await meshpay.charges.get(charge.reference);
```

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

Verify against the **raw** body — parsing and re-serialising changes the bytes and breaks the signature.

```ts
import express from 'express';
import { verifyWebhookSignature } from '@mesh-coverage/meshpayjs';

const app = express();

app.post(
  '/webhooks/meshpay',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.header('X-MeshPay-Signature') ?? '';

    if (!verifyWebhookSignature(req.body, signature, process.env.MESHPAY_WEBHOOK_SECRET!)) {
      return res.sendStatus(401);
    }

    const event = req.header('X-MeshPay-Event');
    const payload = JSON.parse(req.body.toString());

    // Acknowledge fast; do the work asynchronously.
    res.sendStatus(200);
    handle(event, payload);
  }
);
```

The comparison is constant-time. Failed deliveries are retried by MeshPay, so handlers should be idempotent.

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
