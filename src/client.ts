/**
 * Meshpay API Client Base
 * Handles authentication, request/response, and error handling
 */

import * as crypto from 'crypto';
import { MeshpaySDKError, ApiResponse, RequestConfig } from './types';

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  body?: any;
  headers?: Record<string, string>;
}

export class MeshpayClient {
  private baseURL: string;
  private apiKey: string;
  private apiSecret: string;
  private timeout: number;
  private retries: number;

  constructor(config: RequestConfig) {
    this.baseURL = config.baseURL || 'https://api.meshpay.app';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;

    if (!this.apiKey || !this.apiSecret) {
      throw new MeshpaySDKError(
        'INVALID_CONFIG',
        400,
        'API key and secret are required'
      );
    }
  }

  /**
   * Generate HMAC-SHA256 signature for request authentication
   */
  private generateSignature(
    method: string,
    path: string,
    timestamp: string,
    nonce: string,
    body?: any
  ): string {
    let bodyString = '';
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      bodyString = JSON.stringify(body);
    }

    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyString}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
  }

  /**
   * Generate a nonce for request signing
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Execute an HTTP request
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const signature = this.generateSignature(
      options.method,
      options.path,
      timestamp,
      nonce,
      options.body
    );

    const url = `${this.baseURL}${options.path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Meshpay-API-Key': this.apiKey,
      'X-Meshpay-Signature': signature,
      'X-Meshpay-Timestamp': timestamp,
      'X-Meshpay-Nonce': nonce,
      'User-Agent': 'Meshpay-SDK-JS/1.0',
      ...options.headers
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await this.performFetch(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          timeout: this.timeout
        });

        if (!response.ok) {
          const error = await this.handleErrorResponse(response);
          throw error;
        }

        const data = await response.json();
        return this.handleSuccessResponse<T>(data);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (client errors)
        if (error instanceof MeshpaySDKError && error.statusCode < 500) {
          throw error;
        }

        // Wait before retrying on 5xx or network errors
        if (attempt < this.retries) {
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError || new MeshpaySDKError(
      'REQUEST_FAILED',
      500,
      'Request failed after retries'
    );
  }

  /**
   * Perform the actual fetch request
   */
  private performFetch(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error('Request timeout')),
        options.timeout || 30000
      );

      // Use node-fetch or native fetch
      const fetchFn = typeof fetch === 'undefined' ? require('node-fetch') : fetch;

      fetchFn(url, options)
        .then((response: Response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful API responses
   */
  private handleSuccessResponse<T>(data: any): T {
    if (data && typeof data === 'object') {
      // If the response has a 'data' property, return that
      if ('data' in data) {
        return data.data as T;
      }
      // Otherwise return the whole response
      return data as T;
    }
    return data;
  }

  /**
   * Handle error API responses
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    try {
      const errorData = await response.json() as Record<string, any>;
      const message = errorData.message || errorData.error || 'API Error';
      const code = errorData.code || `HTTP_${response.status}`;

      return new MeshpaySDKError(
        code,
        response.status,
        message,
        errorData.errors || errorData.details
      );
    } catch {
      return new MeshpaySDKError(
        `HTTP_${response.status}`,
        response.status,
        response.statusText || 'API Error'
      );
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request helper
   */
  protected get<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>({
      method: 'GET',
      path,
      headers
    });
  }

  /**
   * POST request helper
   */
  protected post<T = any>(
    path: string,
    body: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'POST',
      path,
      body,
      headers
    });
  }

  /**
   * PATCH request helper
   */
  protected patch<T = any>(
    path: string,
    body: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'PATCH',
      path,
      body,
      headers
    });
  }

  /**
   * DELETE request helper
   */
  protected doDelete<T = any>(
    path: string,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      path,
      headers
    });
  }

  /**
   * Encode query parameters
   */
  protected encodeQuery(params: Record<string, any>): string {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(String(value));
        return `${encodedKey}=${encodedValue}`;
      })
      .join('&');

    return query ? `?${query}` : '';
  }
}
