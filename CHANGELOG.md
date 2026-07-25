# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
