/**
 * HTTP transport for the MeshPay client API.
 *
 * Implements the five-header signed-request scheme the API enforces in
 * internal/middleware.RequireAPIKey:
 *
 *   x-app-id      your API key's app id
 *   x-timestamp   Unix milliseconds, must be within the server's skew window
 *   x-nonce       unique per request; replays are rejected
 *   x-signature   hex(HMAC-SHA256(secret, "{appId}.{timestamp}.{nonce}"))
 *
 * Note the request body is deliberately NOT part of the signature — this
 * matches internal/auth.ComputeSignature.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
  MeshpayConfig,
  MeshpayError,
  ErrorBody,
  PRODUCTION_BASE_URL
} from './types';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
  /** Skip request signing — used for the public /api/pay endpoints. */
  unsigned?: boolean;
}

/**
 * Computes a MeshPay request signature.
 *
 * Exported so callers can sign requests made outside this SDK (for example
 * from a language-agnostic HTTP client) with the identical scheme.
 */
export function computeSignature(
  secret: string,
  appId: string,
  timestamp: string,
  nonce: string
): string {
  return createHmac('sha256', secret)
    .update(`${appId}.${timestamp}.${nonce}`)
    .digest('hex');
}

/**
 * Verifies a webhook delivery.
 *
 * MeshPay signs the raw request body with your business's webhook secret and
 * sends the result hex-encoded in the `X-MeshPay-Signature` header. Pass the
 * body exactly as received — parsing and re-serialising it will change the
 * bytes and invalidate the signature.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature ?? '', 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export class MeshpayClient {
  readonly baseURL: string;
  private readonly appId: string;
  private readonly secret: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(config: MeshpayConfig) {
    if (!config?.appId || !config?.secret) {
      throw new MeshpayError('appId and secret are required', 0);
    }
    this.appId = config.appId;
    this.secret = config.secret;
    this.baseURL = (config.baseURL ?? PRODUCTION_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? 30_000;
    this.retries = config.retries ?? 3;
  }

  /** Builds the signed auth headers for a single request. */
  private authHeaders(): Record<string, string> {
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');
    return {
      'x-app-id': this.appId,
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': computeSignature(this.secret, this.appId, timestamp, nonce)
    };
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.baseURL + options.path + encodeQuery(options.query);
    const hasBody = options.body !== undefined && options.method !== 'GET';

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      // Re-sign every attempt: the timestamp must stay inside the skew
      // window and the nonce must not repeat.
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.unsigned ? {} : this.authHeaders())
      };
      if (hasBody) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const response = await this.fetchWithTimeout(url, {
          method: options.method,
          headers,
          body: hasBody ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
          throw await toApiError(response);
        }

        return (await parseBody(response)) as T;
      } catch (err) {
        lastError = err;

        // 4xx is a problem with the request itself — retrying is pointless
        // and, for writes, unsafe.
        if (err instanceof MeshpayError && err.isClientError) {
          throw err;
        }
        if (attempt < this.retries) {
          await delay(2 ** (attempt - 1) * 1000);
        }
      }
    }

    if (lastError instanceof MeshpayError) {
      throw lastError;
    }
    throw new MeshpayError(
      `Request failed after ${this.retries} attempts: ${describe(lastError)}`,
      0,
      { body: lastError }
    );
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MeshpayError(`Request timed out after ${this.timeout}ms`, 0);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ method: 'GET', path, query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'POST', path, body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', path });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeQuery(query?: Record<string, unknown>): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

/** 204s and empty bodies resolve to undefined rather than throwing. */
async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function toApiError(response: Response): Promise<MeshpayError> {
  const body = await parseBody(response);
  const envelope = body as Partial<ErrorBody> | undefined;
  const message =
    (typeof envelope?.message === 'string' && envelope.message) ||
    response.statusText ||
    `HTTP ${response.status}`;
  return new MeshpayError(message, response.status, {
    error: envelope?.error,
    body
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
