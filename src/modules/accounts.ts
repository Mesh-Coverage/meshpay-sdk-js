/** Virtual account, bank and balance endpoints — /api/client */

import { MeshpayClient } from '../client';
import {
  VirtualAccount,
  IssueVirtualAccountRequest,
  SetAccountStatusRequest,
  LinkAccountRequest,
  LinkAccountResponse,
  Bank,
  ResolveBankRequest,
  ResolvedBankAccount,
  Balance,
  AccountStatus,
  Paginated,
  PaginationParams
} from '../types';

export class Accounts {
  constructor(private readonly client: MeshpayClient) {}

  /** POST /api/client/virtual-accounts */
  issue(request: IssueVirtualAccountRequest): Promise<VirtualAccount> {
    return this.client.post<VirtualAccount>(
      '/api/client/virtual-accounts',
      request
    );
  }

  /** GET /api/client/virtual-accounts */
  list(params: PaginationParams = {}): Promise<Paginated<VirtualAccount>> {
    return this.client.get<Paginated<VirtualAccount>>(
      '/api/client/virtual-accounts',
      { limit: params.limit, offset: params.offset }
    );
  }

  /** GET /api/client/virtual-accounts/:id */
  get(accountId: string): Promise<VirtualAccount> {
    return this.client.get<VirtualAccount>(
      `/api/client/virtual-accounts/${encodeURIComponent(accountId)}`
    );
  }

  /** PATCH /api/client/virtual-accounts/:id/status */
  setStatus(accountId: string, status: AccountStatus): Promise<VirtualAccount> {
    const body: SetAccountStatusRequest = { status };
    return this.client.patch<VirtualAccount>(
      `/api/client/virtual-accounts/${encodeURIComponent(accountId)}/status`,
      body
    );
  }

  /** POST /api/client/virtual-accounts/:id/link — link the account to a customer. */
  link(accountId: string, customerId: string): Promise<LinkAccountResponse> {
    const body: LinkAccountRequest = { customer_id: customerId };
    return this.client.post<LinkAccountResponse>(
      `/api/client/virtual-accounts/${encodeURIComponent(accountId)}/link`,
      body
    );
  }

  /** POST /api/client/virtual-accounts/:id/unlink */
  unlink(accountId: string): Promise<LinkAccountResponse> {
    return this.client.post<LinkAccountResponse>(
      `/api/client/virtual-accounts/${encodeURIComponent(accountId)}/unlink`
    );
  }

  /** GET /api/client/banks */
  listBanks(): Promise<Bank[]> {
    return this.client.get<Bank[]>('/api/client/banks');
  }

  /** POST /api/client/banks/resolve — NUBAN name enquiry. */
  resolveBank(request: ResolveBankRequest): Promise<ResolvedBankAccount> {
    return this.client.post<ResolvedBankAccount>(
      '/api/client/banks/resolve',
      request
    );
  }

  /**
   * GET /api/client/balance
   *
   * Returns the business's spendable wallet balance, e.g.
   * `{ available_kobo: 14979500, available: "149795.00", currency: "NGN" }`.
   */
  getBalance(): Promise<Balance> {
    return this.client.get<Balance>('/api/client/balance');
  }

  /** Convenience: the available balance in kobo. */
  async getAvailableKobo(): Promise<number> {
    return (await this.getBalance()).available_kobo;
  }

  /** Convenience: true when the wallet holds at least `amountKobo`. */
  async hasSufficientBalance(amountKobo: number): Promise<boolean> {
    return (await this.getAvailableKobo()) >= amountKobo;
  }
}
