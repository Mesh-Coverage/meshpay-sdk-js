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
  fee_kobo: number;
  net_amount_kobo: number;
  currency: string;
  account_id?: string;
  customer_id?: string;
  terminal_id?: string;
  metadata?: Record<string, unknown>;
  /** Sender/recipient bank details, when known. */
  counterparty?: Record<string, unknown>;
  settled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferRequest {
  account_number: string;
  bank_code: string;
  account_name?: string;
  amount_kobo: number;
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

export interface PayBillRequest {
  type: BillType;
  /** Decimal naira amount, e.g. "1000.00" or 1000. */
  amount: string | number;
  /** airtime, data */
  phone_number?: string;
  /** airtime, data — e.g. "MTN". */
  network?: string;
  /** electricity — the disco code. */
  disco?: string;
  /** electricity — "prepaid" | "postpaid". */
  meter_type?: string;
  /** cabletv — the provider/package type. */
  cable_tv_type?: string;
  /** electricity, cabletv — meter or smartcard number. */
  customer_id?: string;
  payer_name?: string;
  /** Your idempotency key. Required, unique per business. */
  trx_reference: string;
}

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
  /** The one-off virtual account, once issued (issuance is lazy). */
  account_id?: string;
  /** Set once a matching inflow settles the charge. */
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

export interface WebhookEvent<T = unknown> {
  event: string;
  data: T;
  [key: string]: unknown;
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
