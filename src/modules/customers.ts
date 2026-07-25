/**
 * Customers Module
 * Create, read, update, and delete customers
 */

import { MeshpayClient } from '../client';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  KYCUpgradeRequest,
  PaginatedResponse,
  RequestConfig
} from '../types';

export class CustomersModule extends MeshpayClient {
  constructor(config: RequestConfig) {
    super(config);
  }

  /**
   * Create a new customer
   */
  create(request: CreateCustomerRequest): Promise<Customer> {
    return this.post<Customer>('/api/client/customers', request);
  }

  /**
   * List all customers
   */
  list(limit: number = 20, offset: number = 0): Promise<PaginatedResponse<Customer>> {
    const query = this.encodeQuery({ limit, offset });
    return this.get<PaginatedResponse<Customer>>(`/api/client/customers${query}`);
  }

  /**
   * Get a specific customer by ID
   */
  getCustomer(customerId: string): Promise<Customer> {
    return this.get<Customer>(`/api/client/customers/${customerId}`);
  }

  /**
   * Update a customer
   */
  update(customerId: string, request: UpdateCustomerRequest): Promise<Customer> {
    return this.patch<Customer>(`/api/client/customers/${customerId}`, request);
  }

  /**
   * Delete a customer
   */
  deleteCustomer(customerId: string): Promise<void> {
    return this.doDelete(`/api/client/customers/${customerId}`).then(() => undefined);
  }

  /**
   * Upgrade customer KYC level
   */
  upgradeKYC(customerId: string, request: KYCUpgradeRequest): Promise<Customer> {
    return this.post<Customer>(
      `/api/client/customers/${customerId}/kyc-upgrade`,
      request
    );
  }
}
