/**
 * Meshpay API Types and Interfaces
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface RequestConfig {
  baseURL?: string;
  apiKey: string;
  apiSecret: string;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// Customer Types
// ============================================================================

export interface Customer {
  id: string;
  businessId: string;
  reference?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  kycLevel: KYCLevel;
  bvn?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export enum KYCLevel {
  LEVEL_0 = 'LEVEL_0',
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
  LEVEL_4 = 'LEVEL_4',
  LEVEL_5 = 'LEVEL_5'
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  reference?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface KYCUpgradeRequest {
  documentType: string;
  documentNumber: string;
  dateOfBirth?: string;
}

// ============================================================================
// Virtual Account Types
// ============================================================================

export interface VirtualAccount {
  id: string;
  businessId: string;
  customerId?: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  balance: number;
  linkedAccountNumber?: string;
  linkedBankCode?: string;
  linkedAccountName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueVARequest {
  customerId: string;
  accountName: string;
}

export interface LinkAccountRequest {
  accountNumber: string;
  bankCode: string;
  accountName: string;
}

export interface SetVAStatusRequest {
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Bank {
  code: string;
  name: string;
}

export interface BankResolutionRequest {
  accountNumber: string;
  bankCode: string;
}

export interface BankResolutionResponse {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface BalanceResponse {
  balance: number;
  currency: string;
  ledgerBalance?: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  id: string;
  reference: string;
  businessId: string;
  type: 'INFLOW' | 'OUTFLOW' | 'REVERSAL';
  amount: number;
  currency: string;
  description: string;
  status: TransactionStatus;
  sourceAccount?: string;
  destinationAccount?: string;
  sourceBank?: string;
  destinationBank?: string;
  transactionFee?: number;
  gatewayReference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED'
}

export interface CreateTransferRequest {
  amount: number;
  currency?: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName?: string;
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Bill Payment Types
// ============================================================================

export interface BillPayment {
  id: string;
  reference: string;
  businessId: string;
  billType: 'DATA' | 'AIRTIME' | 'ELECTRICITY';
  provider?: string;
  amount: number;
  status: BillPaymentStatus;
  phoneNumber?: string;
  customerId?: string;
  meterNumber?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum BillPaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface PayBillRequest {
  billType: 'DATA' | 'AIRTIME' | 'ELECTRICITY';
  provider?: string;
  amount: number;
  phoneNumber?: string;
  customerId?: string;
  meterNumber?: string;
  planId?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface DataPlan {
  id: string;
  name: string;
  provider: string;
  amount: number;
  dataSize: string;
  validity: string;
}

export interface ElectricityProvider {
  code: string;
  name: string;
}

export interface BillCustomerLookup {
  customerId: string;
  name: string;
  address: string;
  meterNumber: string;
  outstandingBalance?: number;
}

// ============================================================================
// Identity Verification Types
// ============================================================================

export interface BVNVerification {
  isValid: boolean;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  bvn?: string;
}

export interface IdentityVerificationRequest {
  bvn: string;
  dateOfBirth: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface MeshpayError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export class MeshpaySDKError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MeshpaySDKError';
    Object.setPrototypeOf(this, MeshpaySDKError.prototype);
  }
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent {
  id: string;
  type: string;
  businessId: string;
  data: Record<string, any>;
  timestamp: string;
}
