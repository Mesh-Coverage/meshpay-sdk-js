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

For transfers, `net_amount_kobo` includes the amount, MeshPay fee, and stamp duty. `session_id` is the provider's bank-tracing reference.

### Charges (payment links)

Create a payment link for a fixed amount. The payer pays by bank transfer.

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

Use the returned `payment_url` as the payer link. A single-charge read returns settlement details after payment:

```ts
const paid = await meshpay.charges.get(reference);
paid.transaction_reference; // pass to payments.getTransaction()
paid.session_id;            // NIBSS reference, for tracing with the banks
```

Use `transaction_reference` with `payments.getTransaction` to retrieve the transaction. `charges.list` does not include settlement details.

#### Building your own payment page

`meshpay.charges.public_` provides unauthenticated methods for the payer-facing page.

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

A matching inflow changes the charge status to `paid` and triggers a webhook.

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
const result = await meshpay.bills.pay({
  type: 'electricity',
  amount: '1500.00',
  disco: 'abuja',
  customer_id: '95300029980',
  meter_type: 'prepaid',
  trx_reference: 'meter-1042'
});

if (result.token) console.log(result.token);
if (result.status === 'PENDING') {
  // After bill.success, read the transaction for its final status and token.
  const latest = await meshpay.payments.getTransaction(result.reference);
  console.log(latest.status, latest.token);
}
```

`pay()` returns a `Transaction`. Electricity responses include `token` when Nomba returns it synchronously. If the transaction is `PENDING`, the token may arrive later; retrieve the transaction by its `reference` to get the updated status and token.

Required fields:

| Type | Fields |
| --- | --- |
| `airtime`, `data` | `phone_number`, `network` |
| `electricity` | `disco`, `customer_id`; `meter_type` is optional |
| `cabletv` | `cable_tv_type`, `customer_id` |

```ts
const plans = await meshpay.bills.listDataPlans('MTN');
const discos = await meshpay.bills.listElectricityProviders();
const customer = await meshpay.bills.lookupCustomer({
  type: 'electricity',
  provider_id: 'abuja',
  customer_id: '95300029980'
});
```

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

Verify webhook signatures with `constructWebhookEvent` before handling the event:

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

Pass the raw request body to verify its signature. With Express, use `express.raw()` on this route.

### Envelope

Webhook envelope:

```json
{
  "event": "inflow.success",
  "data": { "...": "per-event, see below" },
  "timestamp": 1753430400
}
```


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

To type a handler for a single event, use `WebhookDataFor`:

```ts
import type { WebhookDataFor } from '@mesh-coverage/meshpayjs';

function onInflow(data: WebhookDataFor<'inflow.success'>) { /* ... */ }
```

### Delivery

Webhooks are retried up to five times. Make handlers idempotent and return 2xx after verifying and recording the event.

## Authentication details

The SDK signs requests with these headers:

| Header | Value |
| --- | --- |
| `x-app-id` | your API key's app id |
| `x-timestamp` | Unix milliseconds |
| `x-nonce` | unique random value per request |
| `x-signature` | `hex(HMAC-SHA256(secret, "{appId}.{timestamp}.{nonce}"))` |

`computeSignature` is exported if you need to sign requests made outside this SDK:

```ts
import { computeSignature } from '@mesh-coverage/meshpayjs';

const signature = computeSignature(secret, appId, Date.now().toString(), nonce);
```

## Escape hatch

Use the client directly for endpoints without a dedicated method:

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
