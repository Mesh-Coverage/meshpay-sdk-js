# Meshpay SDK for Node.js

Official Node.js SDK for the Meshpay API. This SDK provides a simple and convenient way to integrate Meshpay payment services into your Node.js applications.

## Features

- 🔐 HMAC-SHA256 request signing for secure API communication
- 🔄 Automatic request retries with exponential backoff
- 📦 Full TypeScript support with complete type definitions
- 🛠️ Modular design with separate modules for each API resource
- ⚡ Lightweight with minimal dependencies
- 📚 Comprehensive documentation and examples

## Installation

```bash
npm install @meshpay/sdk

# or with yarn
yarn add @meshpay/sdk

# or with pnpm
pnpm add @meshpay/sdk
```

## Quick Start

```typescript
import Meshpay from '@meshpay/sdk';

const meshpay = new Meshpay({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  baseURL: 'https://api.meshpay.app' // optional, defaults to production
});

// Create a customer
const customer = await meshpay.customers.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '+2348012345678'
});

console.log('Customer created:', customer);
```

## Configuration

Initialize the SDK with your API credentials:

```typescript
const meshpay = new Meshpay({
  apiKey: 'sk_live_...',           // Your API key
  apiSecret: 'secret_...',         // Your API secret
  baseURL: 'https://api.meshpay.app', // Optional: API base URL
  timeout: 30000,                  // Optional: Request timeout in ms (default: 30000)
  retries: 3                       // Optional: Number of retries (default: 3)
});
```

## Available Modules

### Customers

Manage customer profiles and KYC information.

```typescript
// Create a customer
const customer = await meshpay.customers.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '+2348012345678',
  dateOfBirth: '1990-01-15',
  address: '123 Main St',
  city: 'Lagos',
  state: 'Lagos',
  country: 'NG'
});

// List customers
const { data, total, limit, offset } = await meshpay.customers.list(20, 0);

// Get a customer
const customer = await meshpay.customers.getCustomer('customer-id');

// Update a customer
const updated = await meshpay.customers.update('customer-id', {
  email: 'newemail@example.com',
  phoneNumber: '+2349876543210'
});

// Delete a customer
await meshpay.customers.deleteCustomer('customer-id');

// Upgrade customer KYC level
const upgraded = await meshpay.customers.upgradeKYC('customer-id', {
  documentType: 'BVN',
  documentNumber: '12345678901',
  dateOfBirth: '1990-01-15'
});
```

### Accounts (Virtual Accounts)

Issue and manage virtual accounts for receiving payments.

```typescript
// Issue a virtual account
const account = await meshpay.accounts.issueVirtualAccount({
  accountName: 'John Doe',
  customerId: 'customer-id'
});

// List virtual accounts
const { data } = await meshpay.accounts.listVirtualAccounts(20, 0);

// Get a virtual account
const account = await meshpay.accounts.getVirtualAccount('account-id');

// Set account status
const updated = await meshpay.accounts.setVirtualAccountStatus('account-id', {
  status: 'ACTIVE' // or 'INACTIVE'
});

// Link account to settlement account
const linked = await meshpay.accounts.linkAccount('account-id', {
  accountNumber: '0123456789',
  bankCode: '011',
  accountName: 'Business Account'
});

// Unlink account
const unlinked = await meshpay.accounts.unlinkAccount('account-id');

// Get balance
const { balance, currency } = await meshpay.accounts.getBalance();

// List supported banks
const banks = await meshpay.accounts.listBanks();

// Resolve bank account
const resolved = await meshpay.accounts.resolveBank({
  accountNumber: '0123456789',
  bankCode: '011'
});
console.log('Account name:', resolved.accountName);
```

### Payments

Create transfers and manage transactions.

```typescript
// Create a transfer
const transfer = await meshpay.payments.createTransfer({
  amount: 50000, // in kobo/cents
  currency: 'NGN',
  destinationAccountNumber: '0123456789',
  destinationBankCode: '011',
  destinationAccountName: 'Recipient Name',
  description: 'Payment for services',
  reference: 'TXN-001',
  metadata: {
    orderId: '12345'
  }
});

// List transactions
const { data, total } = await meshpay.payments.listTransactions(20, 0);

// Get a transaction
const transaction = await meshpay.payments.getTransaction('transaction-reference');
```

### Bill Payments

Pay bills for airtime, data, and electricity.

```typescript
// Pay a bill
const payment = await meshpay.bills.payBill({
  billType: 'DATA', // 'DATA', 'AIRTIME', or 'ELECTRICITY'
  provider: 'MTN',
  amount: 5000,
  phoneNumber: '+2348012345678',
  reference: 'BILL-001'
});

// Fetch data plans for a telco
const plans = await meshpay.bills.fetchDataPlans('MTN');
console.log('Available plans:', plans);

// Fetch electricity providers
const providers = await meshpay.bills.fetchElectricityProviders();

// Lookup bill customer
const customer = await meshpay.bills.lookupCustomer(
  '12345678901', // meter number
  'DISCO'        // provider
);
console.log('Outstanding balance:', customer.outstandingBalance);
```

### Identity Verification

Verify customer identity using BVN.

```typescript
// Verify BVN
const verification = await meshpay.identity.verifyBVN({
  bvn: '12345678901',
  dateOfBirth: '1990-01-15'
});

if (verification.isValid) {
  console.log('Name:', verification.firstName, verification.lastName);
}
```

## Error Handling

The SDK throws `MeshpaySDKError` for API errors. Handle them with try-catch:

```typescript
import { MeshpaySDKError } from '@meshpay/sdk';

try {
  const customer = await meshpay.customers.get('invalid-id');
} catch (error) {
  if (error instanceof MeshpaySDKError) {
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Status:', error.statusCode);
    console.log('Details:', error.details);
  } else {
    console.log('Unexpected error:', error);
  }
}
```

## Authentication

The SDK automatically handles HMAC-SHA256 request signing using your API credentials. Each request includes:

- `X-Meshpay-API-Key`: Your API key
- `X-Meshpay-Signature`: HMAC-SHA256 signature
- `X-Meshpay-Timestamp`: Request timestamp
- `X-Meshpay-Nonce`: Random nonce for replay protection

## Pagination

List endpoints support pagination with `limit` and `offset` parameters:

```typescript
// Get page 2 with 20 items per page
const { data, total, limit, offset } = await meshpay.customers.list(20, 20);

console.log(`Showing ${offset + 1}-${offset + limit} of ${total} items`);
```

## Metadata

Most endpoints accept a `metadata` object for storing custom data:

```typescript
const transfer = await meshpay.payments.createTransfer({
  amount: 50000,
  destinationAccountNumber: '0123456789',
  destinationBankCode: '011',
  metadata: {
    orderId: 'ORD-12345',
    userId: 'user-42',
    customField: 'value'
  }
});
```

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import Meshpay, {
  Customer,
  VirtualAccount,
  Transaction,
  MeshpaySDKError
} from '@meshpay/sdk';

const meshpay = new Meshpay({ apiKey: '...', apiSecret: '...' });
const customer: Customer = await meshpay.customers.get('id');
```

## Retry Policy

The SDK automatically retries failed requests with exponential backoff:

- Retries are only performed for 5xx server errors and network errors
- 4xx client errors are not retried
- Default retry count: 3
- Backoff calculation: `2^(attempt - 1) * 1000ms`

## Rate Limiting

The Meshpay API implements rate limiting. If you exceed rate limits, the SDK will return a 429 error. Consider implementing request queuing or backoff strategies in your application.

## Webhooks

To verify webhook signatures from Meshpay:

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return signature === expectedSignature;
}
```

## Examples

### Complete Payment Flow

```typescript
import Meshpay, { MeshpaySDKError } from '@meshpay/sdk';

const meshpay = new Meshpay({
  apiKey: 'sk_live_...',
  apiSecret: 'secret_...'
});

async function processPayment() {
  try {
    // 1. Create customer
    const customer = await meshpay.customers.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '+2348012345678'
    });

    // 2. Create virtual account
    const account = await meshpay.accounts.issueVirtualAccount({
      accountName: 'John Doe Account',
      customerId: customer.id
    });

    // 3. Link to settlement account
    await meshpay.accounts.linkAccount(account.id, {
      accountNumber: '0123456789',
      bankCode: '011',
      accountName: 'Business Account'
    });

    // 4. Check balance
    const { balance } = await meshpay.accounts.getBalance();
    console.log('Current balance:', balance);

    // 5. Create transfer
    const transfer = await meshpay.payments.createTransfer({
      amount: 10000,
      destinationAccountNumber: '9876543210',
      destinationBankCode: '033',
      description: 'Payment to customer'
    });

    console.log('Transfer created:', transfer.reference);
  } catch (error) {
    if (error instanceof MeshpaySDKError) {
      console.error(`API Error [${error.code}]:`, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

processPayment();
```

## Testing

Run the test suite:

```bash
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Building

Build the SDK from TypeScript:

```bash
npm run build
```

The compiled JavaScript and type definitions will be in the `dist/` directory.

## Publishing to npm

1. Update version in `package.json`
2. Build the SDK: `npm run build`
3. Publish: `npm publish`

For beta releases:

```bash
npm publish --tag beta
```

## Changelog

### v0.1.0

- Initial release
- Support for customers, accounts, payments, and bills modules
- Full TypeScript support
- HMAC-SHA256 request signing
- Automatic retries with exponential backoff

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License. See LICENSE file for details.

## Support

For issues, questions, or support:

- 📧 Email: support@meshpay.app
- 🐛 Issues: https://github.com/Mesh-Coverage/meshpay-sdk-js/issues
- 📖 Documentation: https://docs.meshpay.app

## Security

If you discover a security vulnerability, please email security@meshpay.app instead of using the issue tracker.
