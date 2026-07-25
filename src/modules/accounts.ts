/**
 * Accounts Module
 * Virtual account management, linking, and balance queries
 */

import { MeshpayClient } from '../client';
import {
  VirtualAccount,
  IssueVARequest,
  LinkAccountRequest,
  SetVAStatusRequest,
  Bank,
  BankResolutionRequest,
  BankResolutionResponse,
  BalanceResponse,
  PaginatedResponse,
  RequestConfig
} from '../types';

export class AccountsModule extends MeshpayClient {
  constructor(config: RequestConfig) {
    super(config);
  }

  /**
   * Issue a new virtual account
   */
  issueVirtualAccount(request: IssueVARequest): Promise<VirtualAccount> {
    return this.post<VirtualAccount>('/api/client/virtual-accounts', request);
  }

  /**
   * List virtual accounts
   */
  listVirtualAccounts(
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<VirtualAccount>> {
    const query = this.encodeQuery({ limit, offset });
    return this.get<PaginatedResponse<VirtualAccount>>(
      `/api/client/virtual-accounts${query}`
    );
  }

  /**
   * Get a specific virtual account by ID
   */
  getVirtualAccount(accountId: string): Promise<VirtualAccount> {
    return this.get<VirtualAccount>(`/api/client/virtual-accounts/${accountId}`);
  }

  /**
   * Set virtual account status (active/inactive)
   */
  setVirtualAccountStatus(
    accountId: string,
    request: SetVAStatusRequest
  ): Promise<VirtualAccount> {
    return this.patch<VirtualAccount>(
      `/api/client/virtual-accounts/${accountId}/status`,
      request
    );
  }

  /**
   * Link virtual account to settlement account
   */
  linkAccount(accountId: string, request: LinkAccountRequest): Promise<VirtualAccount> {
    return this.post<VirtualAccount>(
      `/api/client/virtual-accounts/${accountId}/link`,
      request
    );
  }

  /**
   * Unlink virtual account from settlement account
   */
  unlinkAccount(accountId: string): Promise<VirtualAccount> {
    return this.post<VirtualAccount>(
      `/api/client/virtual-accounts/${accountId}/unlink`,
      {}
    );
  }

  /**
   * Get list of supported banks
   */
  listBanks(): Promise<Bank[]> {
    return this.get<Bank[]>('/api/client/banks');
  }

  /**
   * Resolve bank account details
   */
  resolveBank(request: BankResolutionRequest): Promise<BankResolutionResponse> {
    return this.post<BankResolutionResponse>('/api/client/banks/resolve', request);
  }

  /**
   * Get account balance
   */
  getBalance(): Promise<BalanceResponse> {
    return this.get<BalanceResponse>('/api/client/balance');
  }
}
