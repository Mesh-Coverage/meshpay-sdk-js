/** Identity verification endpoints — /api/client/identity */

import { MeshpayClient } from '../client';
import {
  VerifyBVNRequest,
  VerifyBusinessRequest,
  VerificationResult
} from '../types';

export class Identity {
  constructor(private readonly client: MeshpayClient) {}

  /** POST /api/client/identity/bvn */
  verifyBVN(request: VerifyBVNRequest): Promise<VerificationResult> {
    return this.client.post<VerificationResult>(
      '/api/client/identity/bvn',
      request
    );
  }

  /** POST /api/client/identity/business — corporate/CAC verification. */
  verifyBusiness(request: VerifyBusinessRequest): Promise<VerificationResult> {
    return this.client.post<VerificationResult>(
      '/api/client/identity/business',
      request
    );
  }
}
