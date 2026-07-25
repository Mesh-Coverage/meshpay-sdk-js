/**
 * Bill Payments Module
 * Pay bills for data, airtime, and electricity
 */

import { MeshpayClient } from '../client';
import {
  BillPayment,
  PayBillRequest,
  DataPlan,
  ElectricityProvider,
  BillCustomerLookup,
  RequestConfig
} from '../types';

export class BillsModule extends MeshpayClient {
  constructor(config: RequestConfig) {
    super(config);
  }

  /**
   * Pay a bill
   */
  payBill(request: PayBillRequest): Promise<BillPayment> {
    return this.post<BillPayment>('/api/client/bills/pay', request);
  }

  /**
   * Fetch data plans for a specific telco
   */
  fetchDataPlans(telco: string): Promise<DataPlan[]> {
    const query = this.encodeQuery({ telco });
    return this.get<DataPlan[]>(`/api/client/bills/data-plans/${telco}${query}`);
  }

  /**
   * Fetch electricity providers
   */
  fetchElectricityProviders(): Promise<ElectricityProvider[]> {
    return this.get<ElectricityProvider[]>('/api/client/bills/electricity/providers');
  }

  /**
   * Lookup bill customer details
   */
  lookupCustomer(
    meterNumber: string,
    provider: string
  ): Promise<BillCustomerLookup> {
    const query = this.encodeQuery({ meterNumber, provider });
    return this.get<BillCustomerLookup>(`/api/client/bills/lookup${query}`);
  }
}
