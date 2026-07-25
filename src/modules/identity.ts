/**
 * Identity Module
 * Identity verification endpoints
 */

import { MeshpayClient } from '../client';
import {
  BVNVerification,
  IdentityVerificationRequest,
  RequestConfig
} from '../types';

export class IdentityModule extends MeshpayClient {
  constructor(config: RequestConfig) {
    super(config);
  }

  /**
   * Verify BVN
   */
  verifyBVN(request: IdentityVerificationRequest): Promise<BVNVerification> {
    return this.post<BVNVerification>('/api/client/identity/verify-bvn', request);
  }
}
