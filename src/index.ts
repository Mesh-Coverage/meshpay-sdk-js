/**
 * MeshPay SDK for Node.js.
 *
 * @example
 * ```ts
 * import { Meshpay } from '@mesh-coverage/meshpayjs';
 *
 * const meshpay = new Meshpay({
 *   appId: process.env.MESHPAY_APP_ID!,
 *   secret: process.env.MESHPAY_SECRET!
 * });
 *
 * const balance = await meshpay.accounts.getBalance();
 * ```
 */

import { MeshpayClient } from './client';
import { MeshpayConfig } from './types';
import { Customers } from './modules/customers';
import { Accounts } from './modules/accounts';
import { Payments } from './modules/payments';
import { Bills } from './modules/bills';
import { Identity } from './modules/identity';
import { Charges, PublicCharges } from './modules/charges';

export class Meshpay {
  /** The underlying HTTP transport, for calling endpoints the SDK doesn't wrap. */
  readonly client: MeshpayClient;

  readonly customers: Customers;
  readonly accounts: Accounts;
  readonly payments: Payments;
  readonly bills: Bills;
  readonly identity: Identity;
  readonly charges: Charges;

  constructor(config: MeshpayConfig) {
    this.client = new MeshpayClient(config);
    this.customers = new Customers(this.client);
    this.accounts = new Accounts(this.client);
    this.payments = new Payments(this.client);
    this.bills = new Bills(this.client);
    this.identity = new Identity(this.client);
    this.charges = new Charges(this.client, new PublicCharges(this.client));
  }
}

export {
  MeshpayClient,
  computeSignature,
  verifyWebhookSignature
} from './client';
export type { HttpMethod, RequestOptions } from './client';

export { Customers } from './modules/customers';
export { Accounts } from './modules/accounts';
export { Payments } from './modules/payments';
export { Bills } from './modules/bills';
export { Identity } from './modules/identity';
export { Charges, PublicCharges } from './modules/charges';

export * from './types';

export default Meshpay;
