/**
 * MeshPay API types.
 *
 * These mirror the Go DTOs and models in the meshpay-v2 API exactly —
 * field names are snake_case, and all monetary amounts are integer kobo
 * (1 NGN = 100 kobo) unless the field name says otherwise.
 */

// ============================================================================
// Client configuration
// ============================================================================

/** Production API base URL. */
export const PRODUCTION_BASE_URL = 'https://api.meshpay.ng';

/** Sandbox API base URL. */
export const SANDBOX_BASE_URL = 'https://sandbox-api.meshpay.ng';

export interface MeshpayConfig {
  /** The `app_id` of your API key — sent as the `x-app-id` header. */
  appId: string;
  /** The API key secret. Used to sign requests; never transmitted. */
  secret: string;
  /** Defaults to {@link PRODUCTION_BASE_URL}. */
  baseURL?: string;
  /** Request timeout in milliseconds. Default 30000. */
  timeout?: number;
  /** Total attempts for retryable (5xx / network) failures. Default 3. */
  retries?: number;
}

// ============================================================================
// Common envelopes
// ============================================================================

/**
 * List endpoints return this shape:
 * `{ data, total, limit, offset }`.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  /** Default 20, capped server-side at 100. */
  limit?: number;
  /** Default 0. */
  offset?: number;
}

/** The API's uniform error body (see internal/httpx.Fail). */
export interface ErrorBody {
  status_code: number;
  message: string;
  error: string;
}

// ============================================================================
// Customers
// ============================================================================

export type CustomerStatus = 'active' | 'inactive';
export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/** PII-masked customer representation (see customer.Response). */
export interface Customer {
  id: string;
  external_ref: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  kyc_tier: number;
  kyc_status: KYCStatus;
  status: CustomerStatus;
  date_of_birth?: string;
  /** Masked BVN — never the clear value. */
  bvn?: string;
  /** Masked NIN — never the clear value. */
  nin?: string;
  created_at: string;
}

export interface CreateCustomerRequest {
  /** Your own identifier for this customer. Required. */
  external_ref: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

export interface UpdateCustomerRequest {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  status?: CustomerStatus;
}

export interface KYCUpgradeRequest {
  /** Target tier, 1–5. */
  tier: number;
  /** When supplied, `date_of_birth` is required and is verified against it. */
  bvn?: string;
  /** ISO date, e.g. "1990-01-15". Required when `bvn` is set. */
  date_of_birth?: string;
  nin?: string;
}

// ============================================================================
// Virtual accounts, banks & balance
// ============================================================================

export type AccountStatus = 'active' | 'disabled';

export interface VirtualAccount {
  id: string;
  business_id: string;
  account_ref: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  currency: string;
  provider: string;
  provider_ref: string;
  status: AccountStatus;
  expiry_date?: string;
  expected_amount_kobo?: number;
  terminal_id?: string;
  created_at: string;
  updated_at: string;
}

export interface IssueVirtualAccountRequest {
  /** Your own reference for the account. Required, unique per business. */
  account_ref: string;
  account_name: string;
  bvn?: string;
  /** ISO date string. */
  expiry_date?: string;
  /** Decimal naira string or number, e.g. "5000.00". */
  expected_amount?: string | number;
  /** Optionally link the new account to a customer immediately. */
  customer_id?: string;
}

export interface SetAccountStatusRequest {
  status: AccountStatus;
}

export interface LinkAccountRequest {
  customer_id: string;
}

export interface LinkAccountResponse {
  account_id: string;
  customer_id?: string;
  linked: boolean;
}

export interface Bank {
  code: string;
  name: string;
}

export interface ResolveBankRequest {
  account_number: string;
  bank_code: string;
}

export interface ResolvedBankAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
}

/** Business wallet balance (see account.BalanceView). */
export interface Balance {
  /** Spendable balance in kobo. */
  available_kobo: number;
  /** The same balance formatted as naira, e.g. "149795.00". */
  available: string;
  currency: string;
}

// ============================================================================
// Transactions & transfers
// ============================================================================

export type TransactionType = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'QUEUED' | 'PENDING' | 'SUCCESS' | 'FAILED';
export type TransactionCategory =
  | 'TRANSFER'
  | 'INFLOW'
  | 'FEE'
  | 'BILL'
  | 'POS_CARD'
  | 'POS_TRANSFER'
  | 'CHARGE';

/**
 * Sender/recipient bank details. Which fields are populated depends on the
 * direction: inflows carry the payer's details, outbound transfers carry the
 * recipient's.
 */
export interface Counterparty {
  /** Inflows — the rail that reported the payment, e.g. "nomba". */
  provider?: string;
  /** Inflows — the provider's retrieval reference number. */
  rrn?: string;
  /** Inflows — the payer's own bank details, when the provider supplied them. */
  sender_name?: string;
  sender_bank_name?: string;
  sender_bank_code?: string;
  sender_account_number?: string;
  /** Outbound transfers — where the money was sent. */
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  narration?: string;
  [key: string]: unknown;
}

export interface Transaction {
  id: string;
  business_id: string;
  /** MeshPay's own reference. */
  reference: string;
  /** Your idempotency key, as supplied on create. */
  trx_reference: string;
  type: TransactionType;
  category: TransactionCategory;
  status: TransactionStatus;
  amount_kobo: number;
  /** MeshPay's own charge. */
  fee_kobo: number;
  /**
   * Statutory stamp duty on an outbound transfer, levied by the provider and
   * passed through at cost. This is *not* part of `fee_kobo` — the two add
   * rather than overlap. Always 0 for anything that isn't an outbound
   * transfer.
   */
  stamp_duty_kobo: number;
  /**
   * Total movement against the wallet. For an outbound transfer that is
   * `amount_kobo + fee_kobo + stamp_duty_kobo`.
   */
  net_amount_kobo: number;
  currency: string;
  account_id?: string;
  customer_id?: string;
  terminal_id?: string;
  metadata?: Record<string, unknown>;
  /** Electricity vend token, when supplied by the provider. */
  token?: string;
  counterparty?: Counterparty;
  /**
   * The provider's NIBSS session identifier — the reference the payer's or
   * recipient's own bank shows them, quoted when tracing or disputing a
   * payment with the banks.
   */
  session_id?: string;
  settled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ListTransactionsParams extends PaginationParams {
  /** Restrict to a single category, e.g. `'TRANSFER'`. */
  category?: TransactionCategory;
}

export interface CreateTransferRequest {
  account_number: string;
  bank_code: string;
  account_name: string;
  amount_kobo: number;
  sender_name: string;
  narration?: string;
  /**
   * Your idempotency key. Required — unique per business. A retry with the
   * same value is rejected with 409 rather than sending a second transfer.
   */
  trx_reference: string;
}

// ============================================================================
// Bill payments
// ============================================================================

export type BillType = 'airtime' | 'data' | 'electricity' | 'cabletv';

interface PayBillBase {
  /** Amount in naira, e.g. "1000.00". */
  amount: string | number;
  /** Your unique idempotency key. */
  trx_reference: string;
  payer_name?: string;
}

export type PayBillRequest =
  | (PayBillBase & {
      type: 'airtime' | 'data';
      phone_number: string;
      network: string;
    })
  | (PayBillBase & {
      type: 'electricity';
      /** Electricity distributor code. */
      disco: string;
      /** Meter number. */
      customer_id: string;
      meter_type?: 'prepaid' | 'postpaid';
    })
  | (PayBillBase & {
      type: 'cabletv';
      cable_tv_type: string;
      /** Smartcard or decoder number. */
      customer_id: string;
    });

export interface DataPlan {
  [key: string]: unknown;
}

export interface ElectricityProvider {
  [key: string]: unknown;
}

export interface BillLookupParams {
  type: 'electricity' | 'cabletv';
  provider_id: string;
  /** Meter or smartcard number. */
  customer_id: string;
}

export interface BillCustomer {
  [key: string]: unknown;
}

// ============================================================================
// Charges (payment links)
// ============================================================================

export type ChargeStatus = 'pending' | 'paid' | 'expired';

/**
 * A merchant-created payment link. The payer settles it by transferring
 * into a dedicated, expiring virtual account — they need no MeshPay account.
 */
export interface Charge {
  id: string;
  business_id: string;
  /** Public, unguessable id used in the payment page URL. */
  reference: string;
  /** Your idempotency key. */
  trx_reference: string;
  payer_email: string;
  amount_kobo: number;
  status: ChargeStatus;
  /**
   * The link to hand the payer — the charge's `reference` appended to the
   * payment base URL MeshPay has configured for your environment.
   *
   * Present on every merchant-facing charge response. Absent only if no base
   * URL is configured server-side at all, which means charges cannot be paid
   * — treat its absence as a misconfiguration worth alerting on rather than
   * building the URL yourself.
   */
  payment_url?: string;
  /**
   * MeshPay's reference for the settling transaction — the value
   * {@link Payments.getTransaction} accepts. Populated only on a
   * single-charge read (`charges.get`), and only once paid; `charges.list`
   * omits it.
   */
  transaction_reference?: string;
  /**
   * The provider's NIBSS session id for the payment, quoted when tracing it
   * with the banks. Same single-read caveat as `transaction_reference`.
   */
  session_id?: string;
  /** The one-off virtual account, once issued (issuance is lazy). */
  account_id?: string;
  /**
   * Set once a matching inflow settles the charge. This is an internal uuid
   * and is *not* accepted by `GET /transactions/{reference}` — use
   * `transaction_reference` for that.
   */
  transaction_id?: string;
  expires_at?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateChargeRequest {
  payer_email: string;
  amount_kobo: number;
  /**
   * Your idempotency key — unique per business among charges that are still
   * pending or expired. A paid charge frees its reference for reuse.
   */
  trx_reference: string;
  /** Where the payment page redirects the payer once paid. */
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * What the public payment page reads. Deliberately excludes anything
 * business-internal.
 */
export interface PublicChargeView {
  reference: string;
  status: ChargeStatus;
  amount_kobo: number;
  payer_email: string;
  business_name: string;
  business_logo_url?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  expires_at?: string;
  trx_reference?: string;
  callback_url?: string;
}

/** The one-time-use account issued for a charge. */
export interface ChargeAccountDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
  expires_at: string;
}

/** The shape the payment page polls while waiting for settlement. */
export interface ChargeStatusResponse {
  reference: string;
  status: ChargeStatus;
  amount_kobo: number;
  expires_at?: string;
  trx_reference?: string;
  callback_url?: string;
}

// ============================================================================
// Identity verification
// ============================================================================

export interface VerifyBVNRequest {
  bvn: string;
}

export interface VerifyBusinessRequest {
  rc_number: string;
  company_name?: string;
  company_type?: string;
  /** Request the provider's advanced (billed) lookup. */
  advance?: boolean;
}

/** Provider-shaped verification result; fields vary by provider. */
export interface VerificationResult {
  [key: string]: unknown;
}

// ============================================================================
// Webhooks
// ============================================================================

/** Header carrying the hex HMAC-SHA256 of the raw request body. */
export const WEBHOOK_SIGNATURE_HEADER = 'X-MeshPay-Signature';

/** Header carrying the event name. */
export const WEBHOOK_EVENT_HEADER = 'X-MeshPay-Event';

/** Every event MeshPay sends to a business's configured webhook URL. */
export type WebhookEventName =
  /** Funds landed in one of your virtual accounts. */
  | 'inflow.success'
  /** A previously successful inflow was reversed by the provider. */
  | 'inflow.reversed'
  /** An outbound transfer settled. */
  | 'transfer.success'
  /** An outbound transfer failed; funds are returned to your wallet. */
  | 'transfer.failed'
  /** A previously successful transfer was reversed. */
  | 'transfer.reversed'
  /** A card payment on a POS terminal succeeded. */
  | 'pos.charge.success'
  /** A card payment on a POS terminal failed. */
  | 'pos.charge.failed'
  /** An airtime/data/electricity/cable purchase completed. */
  | 'bill.success'
  /** A bill purchase failed; funds are returned to your wallet. */
  | 'bill.failed'
  /** A previously successful bill purchase was reversed. */
  | 'bill.reversed'
  /** A payment link was settled by the payer. */
  | 'charge.success';

/**
 * Payload for the transaction-shaped events: inflows, transfers and POS
 * card charges.
 */
export interface TransactionWebhookData {
  /** MeshPay's own reference. */
  reference: string;
  /** Your idempotency key, as supplied on create. */
  trx_reference: string;
  category: TransactionCategory;
  status: TransactionStatus;
  amount_kobo: number;
  /** MeshPay's own charge. */
  fee_kobo: number;
  /**
   * Statutory stamp duty, separate from `fee_kobo` so the two reconcile
   * independently — the wallet movement is
   * `amount_kobo + fee_kobo + stamp_duty_kobo`.
   *
   * Always present on outbound transfers, including as `0` below the
   * threshold, so its absence never has to be read as "zero" versus "not
   * applicable". Omitted entirely on categories that can't attract it.
   */
  stamp_duty_kobo?: number;
  currency: string;
  /** Null until the transaction settles. */
  settled_at: string | null;
  /**
   * The provider's NIBSS session id. Always at this position on every event
   * type; omitted when the provider gave us none.
   */
  session_id?: string;
  counterparty?: Counterparty;
  /**
   * The reference you supplied when creating the virtual account the funds
   * landed in. Present when the transaction is tied to one.
   */
  account_ref?: string;
  account_number?: string;
  bank_name?: string;
  /** The `external_ref` of the customer linked to that account, if any. */
  customer_ref?: string;
}

/** Payload for `bill.success`, `bill.failed` and `bill.reversed`. */
export interface BillWebhookData {
  reference: string;
  trx_reference: string;
  category: TransactionCategory;
  status: TransactionStatus;
  amount_kobo: number;
  fee_kobo: number;
  currency: string;
  settled_at: string | null;
  /** Carries `failure_reason` on `bill.failed`. */
  metadata?: Record<string, unknown> & { failure_reason?: string };
  /** Electricity vend token, when supplied by the provider. */
  token?: string;
  session_id?: string;
}

/** Payload for `charge.success`. */
export interface ChargeWebhookData {
  /** The charge's public reference. */
  reference: string;
  /** The `trx_reference` you supplied when creating the charge. */
  trx_reference: string;
  amount_kobo: number;
  /**
   * MeshPay's reference for the settling transaction — pass this to
   * {@link Payments.getTransaction}.
   */
  transaction: string;
  /** The redirect you configured on the charge, echoed back. */
  callback_url: string;
  session_id?: string;
}

/** The envelope every webhook body uses. */
export interface WebhookEnvelope<
  E extends WebhookEventName = WebhookEventName,
  D = unknown
> {
  event: E;
  data: D;
  /** Send time, Unix **seconds** (not milliseconds). */
  timestamp: number;
}

/**
 * A received webhook, discriminated on `event` — narrowing on it gives you
 * the right `data` shape.
 *
 * @example
 * ```ts
 * switch (event.event) {
 *   case 'inflow.success':
 *     event.data.account_ref; // typed
 *     break;
 *   case 'charge.success':
 *     event.data.transaction; // typed
 *     break;
 * }
 * ```
 */
export type MeshpayWebhookEvent =
  | WebhookEnvelope<'inflow.success', TransactionWebhookData>
  | WebhookEnvelope<'inflow.reversed', TransactionWebhookData>
  | WebhookEnvelope<'transfer.success', TransactionWebhookData>
  | WebhookEnvelope<'transfer.failed', TransactionWebhookData>
  | WebhookEnvelope<'transfer.reversed', TransactionWebhookData>
  | WebhookEnvelope<'pos.charge.success', TransactionWebhookData>
  | WebhookEnvelope<'pos.charge.failed', TransactionWebhookData>
  | WebhookEnvelope<'bill.success', BillWebhookData>
  | WebhookEnvelope<'bill.failed', BillWebhookData>
  | WebhookEnvelope<'bill.reversed', BillWebhookData>
  | WebhookEnvelope<'charge.success', ChargeWebhookData>;

/** Narrows {@link MeshpayWebhookEvent} to the payload for a given event. */
export type WebhookDataFor<E extends WebhookEventName> = Extract<
  MeshpayWebhookEvent,
  { event: E }
>['data'];

/** Thrown by `constructWebhookEvent` when a delivery can't be trusted. */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
    Object.setPrototypeOf(this, WebhookVerificationError.prototype);
  }
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Thrown for any non-2xx API response, and for network/timeout failures
 * that exhaust the retry budget.
 */
export class MeshpayError extends Error {
  /** HTTP status, or 0 for network/timeout failures. */
  readonly statusCode: number;
  /** The API's `error` field (e.g. "Bad Request"), when present. */
  readonly error?: string;
  /** The parsed response body, when the response had one. */
  readonly body?: unknown;

  constructor(
    message: string,
    statusCode: number,
    options: { error?: string; body?: unknown } = {}
  ) {
    super(message);
    this.name = 'MeshpayError';
    this.statusCode = statusCode;
    this.error = options.error;
    this.body = options.body;
    Object.setPrototypeOf(this, MeshpayError.prototype);
  }

  /** True for 4xx responses — retrying without changing the request won't help. */
  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /** True for 5xx responses. */
  get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /** True when a `trx_reference` collided with an existing record. */
  get isDuplicate(): boolean {
    return this.statusCode === 409;
  }
}
