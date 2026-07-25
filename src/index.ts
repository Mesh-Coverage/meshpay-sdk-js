/**
 * Meshpay SDK for Node.js
 * Main entry point
 */

import { RequestConfig } from './types';
import { CustomersModule } from './modules/customers';
import { AccountsModule } from './modules/accounts';
import { PaymentsModule } from './modules/payments';
import { BillsModule } from './modules/bills';
import { IdentityModule } from './modules/identity';

/**
 * Main Meshpay SDK class
 * Provides access to all API modules
 */
export class Meshpay {
  public customers: CustomersModule;
  public accounts: AccountsModule;
  public payments: PaymentsModule;
  public bills: BillsModule;
  public identity: IdentityModule;

  constructor(config: RequestConfig) {
    this.customers = new CustomersModule(config);
    this.accounts = new AccountsModule(config);
    this.payments = new PaymentsModule(config);
    this.bills = new BillsModule(config);
    this.identity = new IdentityModule(config);
  }
}

// Export all types and classes
export * from './types';
export { MeshpayClient } from './client';
export { CustomersModule } from './modules/customers';
export { AccountsModule } from './modules/accounts';
export { PaymentsModule } from './modules/payments';
export { BillsModule } from './modules/bills';
export { IdentityModule } from './modules/identity';

// Default export
export default Meshpay;
