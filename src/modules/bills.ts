/** Bill payment endpoints — /api/client/bills */

import { MeshpayClient } from '../client';
import {
  Transaction,
  PayBillRequest,
  DataPlan,
  ElectricityProvider,
  BillLookupParams,
  BillCustomer
} from '../types';

export class Bills {
  constructor(private readonly client: MeshpayClient) {}

  /**
   * POST /api/client/bills/pay
   *
   * Which fields are required depends on `type`:
   * - `airtime` / `data`: `phone_number`, `network`
   * - `electricity`: `disco`, `meter_type`, `customer_id`
   * - `cabletv`: `cable_tv_type`, `customer_id`
   */
  pay(request: PayBillRequest): Promise<Transaction> {
    return this.client.post<Transaction>('/api/client/bills/pay', request);
  }

  /** GET /api/client/bills/data-plans/:telco */
  async listDataPlans(telco: string): Promise<DataPlan[]> {
    const res = await this.client.get<{ data: DataPlan[] }>(
      `/api/client/bills/data-plans/${encodeURIComponent(telco)}`
    );
    return res.data;
  }

  /** GET /api/client/bills/electricity/providers */
  async listElectricityProviders(): Promise<ElectricityProvider[]> {
    const res = await this.client.get<{ data: ElectricityProvider[] }>(
      '/api/client/bills/electricity/providers'
    );
    return res.data;
  }

  /**
   * GET /api/client/bills/lookup — resolve a biller customer's name before
   * paying. Only valid for `electricity` and `cabletv`.
   */
  lookupCustomer(params: BillLookupParams): Promise<BillCustomer> {
    return this.client.get<BillCustomer>('/api/client/bills/lookup', {
      type: params.type,
      provider_id: params.provider_id,
      customer_id: params.customer_id
    });
  }
}
