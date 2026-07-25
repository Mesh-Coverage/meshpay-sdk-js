/** Customer endpoints — /api/client/customers */

import { MeshpayClient } from '../client';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  KYCUpgradeRequest,
  Paginated,
  PaginationParams
} from '../types';

export class Customers {
  constructor(private readonly client: MeshpayClient) {}

  /** POST /api/client/customers */
  create(request: CreateCustomerRequest): Promise<Customer> {
    return this.client.post<Customer>('/api/client/customers', request);
  }

  /** GET /api/client/customers */
  list(params: PaginationParams = {}): Promise<Paginated<Customer>> {
    return this.client.get<Paginated<Customer>>('/api/client/customers', {
      limit: params.limit,
      offset: params.offset
    });
  }

  /** GET /api/client/customers/:id */
  get(customerId: string): Promise<Customer> {
    return this.client.get<Customer>(
      `/api/client/customers/${encodeURIComponent(customerId)}`
    );
  }

  /** PATCH /api/client/customers/:id */
  update(
    customerId: string,
    request: UpdateCustomerRequest
  ): Promise<Customer> {
    return this.client.patch<Customer>(
      `/api/client/customers/${encodeURIComponent(customerId)}`,
      request
    );
  }

  /** DELETE /api/client/customers/:id */
  async remove(customerId: string): Promise<void> {
    await this.client.delete<void>(
      `/api/client/customers/${encodeURIComponent(customerId)}`
    );
  }

  /**
   * POST /api/client/customers/:id/kyc-upgrade
   *
   * Supplying `bvn` also requires `date_of_birth`; MeshPay verifies the BVN
   * with the identity provider and checks the date of birth matches. Your
   * business is charged the per-validation fee either way.
   */
  upgradeKYC(
    customerId: string,
    request: KYCUpgradeRequest
  ): Promise<Customer> {
    return this.client.post<Customer>(
      `/api/client/customers/${encodeURIComponent(customerId)}/kyc-upgrade`,
      request
    );
  }
}
