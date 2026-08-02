/** Transfer and transaction endpoints — /api/client */

import { MeshpayClient } from '../client';
import {
  Transaction,
  CreateTransferRequest,
  ListTransactionsParams,
  Paginated
} from '../types';

export class Payments {
  constructor(private readonly client: MeshpayClient) {}

  /**
   * POST /api/client/bank/transfers — outbound bank transfer.
   *
   * `trx_reference` is your idempotency key and is required: a retry with a
   * reference already used by this business fails with 409 instead of
   * sending the money twice.
   */
  createTransfer(request: CreateTransferRequest): Promise<Transaction> {
    return this.client.post<Transaction>(
      '/api/client/bank/transfers',
      request
    );
  }

  /** GET /api/client/transactions — optionally filtered by category. */
  listTransactions(
    params: ListTransactionsParams = {}
  ): Promise<Paginated<Transaction>> {
    return this.client.get<Paginated<Transaction>>(
      '/api/client/transactions',
      {
        limit: params.limit,
        offset: params.offset,
        category: params.category
      }
    );
  }

  /**
   * GET /api/client/transactions/:reference
   *
   * Accepts either MeshPay's own `reference` or your `trx_reference`.
   */
  getTransaction(reference: string): Promise<Transaction> {
    return this.client.get<Transaction>(
      `/api/client/transactions/${encodeURIComponent(reference)}`
    );
  }
}
