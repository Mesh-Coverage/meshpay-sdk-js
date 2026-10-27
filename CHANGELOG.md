# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-10-27
### Updated

- Bill payment responses and `bill.success` webhook data expose the electricity vend `token`.
- `PayBillRequest` now requires fields by bill type; electricity `meter_type` is optional.
- README bill-payment guidance covers pending responses and concise retrieval steps.

## [0.1.3] - 2026-08-02
### Added

- `Charge.payment_url` — the link to hand the payer, returned on every
  merchant-facing charge response. Build links from this rather than
  concatenating the reference yourself.
- `Charge.transaction_reference` and `Charge.session_id`, returned on a
  single-charge read once paid. `transaction_reference` is the value
  `payments.getTransaction` accepts; the pre-existing `transaction_id` is an
  internal uuid and is not.
- Typed webhook payloads: `MeshpayWebhookEvent` (a union discriminated on
  `event`), `WebhookEventName`, `TransactionWebhookData`, `BillWebhookData`,
  `ChargeWebhookData`, `WebhookEnvelope` and the `WebhookDataFor<E>` helper.
- `constructWebhookEvent(rawBody, signature, secret)` — verifies a delivery
  and returns it as a typed event, throwing `WebhookVerificationError` on a
  bad signature or malformed body. Preferred over calling
  `verifyWebhookSignature` and `JSON.parse` separately.
- `Transaction.stamp_duty_kobo` and `Transaction.session_id`, and a typed
  `Counterparty` replacing the untyped record.
- `payments.listTransactions({ category })` filter.
- `examples/webhooks.ts`.

## [0.1.0] - 2026-07-25

Initial release, verified against the meshpay-v2 API's client surface
(`/api/client`) and public payment-link surface (`/api/pay`).

### Added

- **Accounts** — issue/list/get virtual accounts, set status, link and unlink
  customers, list banks, NUBAN name enquiry, and wallet balance.
- **Payments** — outbound bank transfers, transaction list and lookup by
  either MeshPay's `reference` or your own `trx_reference`.
- **Charges** — merchant payment links, plus the unauthenticated `/api/pay`
  surface (view, issue account, poll status) for building your own payment
  page.
- **Customers** — create, list, get, update, delete, and KYC tier upgrade.
- **Bills** — airtime, data, electricity and cable TV payments; data plan and
  electricity provider catalogues; biller customer lookup.
- **Identity** — BVN and corporate/CAC verification.
- Request signing per the API's five-header scheme, re-signed on every retry
  attempt so timestamps stay inside the skew window and nonces never repeat.
- `verifyWebhookSignature` for constant-time verification of webhook
  deliveries, and `computeSignature` for signing requests made outside the SDK.
- `MeshpayError` with `isClientError`, `isServerError` and `isDuplicate`
  helpers, carrying the API's `{ status_code, message, error }` envelope.
- Automatic retries with exponential backoff on 5xx and network failures;
  4xx responses are never retried.
- Full TypeScript definitions mirroring the API's DTOs.

### Notes

- Requires Node.js 18+ — the SDK uses the built-in `fetch` and has no runtime
  dependencies.
- All `*_kobo` fields are integer kobo (₦1 = 100 kobo). Bill payments and a
  virtual account's `expected_amount` are the exceptions, taking decimal naira
  to match the biller's units.
