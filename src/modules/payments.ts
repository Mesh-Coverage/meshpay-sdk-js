/**
 * Payments Module
 * Create transfers and manage transactions
 */

import { MeshpayClient } from '../client';
import {
  Transaction,
  CreateTransferRequest,
  PaginatedResponse,
  RequestConfig
} from '../types';

export class PaymentsModule extends MeshpayClient {
  constructor(config: RequestConfig) {
    super(config);
  }

  /**
   * Create a new transfer
   */
  createTransfer(request: CreateTransferRequest): Promise<Transaction> {
    return this.post<Transaction>('/api/client/bank/transfers', request);
  }

  /**
   * List all transactions
   */
  listTransactions(
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<Transaction>> {
    const query = this.encodeQuery({ limit, offset });
    return this.get<PaginatedResponse<Transaction>>(
      `/api/client/transactions${query}`
    );
  }

  /**
   * Get a specific transaction by reference
   */
  getTransaction(reference: string): Promise<Transaction> {
    return this.get<Transaction>(`/api/client/transactions/${reference}`);
  }
}
