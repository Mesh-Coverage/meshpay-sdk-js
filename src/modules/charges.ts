/**
 * Charges — merchant-created payment links.
 *
 * A charge is a one-off request for a fixed amount. The payer settles it by
 * transferring into a dedicated, expiring virtual account; they need no
 * MeshPay account or credentials, reaching the payment page by knowing the
 * charge's unguessable `reference` alone.
 *
 * Two surfaces live here:
 * - Merchant routes (`/api/client/charges`), signed with your API key.
 * - Public routes (`/api/pay/:reference`), which take no credentials at all
 *   and back the payment page. See {@link PublicCharges}.
 */

import { MeshpayClient } from '../client';
import {
  Charge,
  CreateChargeRequest,
  PublicChargeView,
  ChargeAccountDetails,
  ChargeStatusResponse,
  Paginated,
  PaginationParams
} from '../types';

export class Charges {
  constructor(
    private readonly client: MeshpayClient,
    /** The payer-facing endpoints for this same charge. */
    readonly public_: PublicCharges
  ) {}

  /**
   * POST /api/client/charges
   *
   * `trx_reference` is your idempotency key. It must be unique per business
   * among charges that are still pending or expired — once a charge is paid,
   * its reference becomes reusable.
   *
   * The returned charge has no bank details yet: the virtual account is
   * issued lazily, the first time the payer opens the payment page (or when
   * you call {@link PublicCharges.issueAccount}).
   */
  create(request: CreateChargeRequest): Promise<Charge> {
    return this.client.post<Charge>('/api/client/charges', request);
  }

  /** GET /api/client/charges */
  list(params: PaginationParams = {}): Promise<Paginated<Charge>> {
    return this.client.get<Paginated<Charge>>('/api/client/charges', {
      limit: params.limit,
      offset: params.offset
    });
  }

  /** GET /api/client/charges/:reference */
  get(reference: string): Promise<Charge> {
    return this.client.get<Charge>(
      `/api/client/charges/${encodeURIComponent(reference)}`
    );
  }
}

/**
 * The public, unauthenticated payment-link surface (`/api/pay`).
 *
 * These endpoints are safe to call from a browser: they carry no credentials
 * and return only payer-facing fields. They exist in the SDK so you can build
 * your own payment page instead of using MeshPay's.
 */
export class PublicCharges {
  constructor(private readonly client: MeshpayClient) {}

  /**
   * GET /api/pay/:reference — everything the payment page needs to render:
   * amount, status, business branding, and bank details once issued.
   */
  get(reference: string): Promise<PublicChargeView> {
    return this.client.request<PublicChargeView>({
      method: 'GET',
      path: `/api/pay/${encodeURIComponent(reference)}`,
      unsigned: true
    });
  }

  /**
   * POST /api/pay/:reference/account — issue (or regenerate) the one-off
   * virtual account the payer transfers into.
   *
   * The account is single-use and expiring: regenerating replaces the
   * previous details, and a paid charge will not issue another.
   */
  issueAccount(reference: string): Promise<ChargeAccountDetails> {
    return this.client.request<ChargeAccountDetails>({
      method: 'POST',
      path: `/api/pay/${encodeURIComponent(reference)}/account`,
      unsigned: true
    });
  }

  /**
   * GET /api/pay/:reference/status — poll while waiting for settlement.
   *
   * Expiry is evaluated lazily on read, so a charge past its window reports
   * `expired` here even though no scheduled job has touched it.
   */
  getStatus(reference: string): Promise<ChargeStatusResponse> {
    return this.client.request<ChargeStatusResponse>({
      method: 'GET',
      path: `/api/pay/${encodeURIComponent(reference)}/status`,
      unsigned: true
    });
  }
}
