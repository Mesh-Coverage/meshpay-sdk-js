/**
 * Basic Meshpay SDK Usage Examples
 */

import Meshpay, { MeshpaySDKError } from '../src/index';

// Initialize the SDK
const meshpay = new Meshpay({
  apiKey: process.env.MESHPAY_API_KEY || 'your-api-key',
  apiSecret: process.env.MESHPAY_API_SECRET || 'your-api-secret'
});

// ============================================================================
// Customer Examples
// ============================================================================

async function customerExamples() {
  console.log('\n=== Customer Examples ===\n');

  try {
    // Create a customer
    const newCustomer = await meshpay.customers.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      phoneNumber: '+2348012345678',
      address: '456 Oak Street',
      city: 'Lagos'
    });
    console.log('✓ Customer created:', newCustomer.id);

    // List customers
    const customers = await meshpay.customers.list(10, 0);
    console.log(`✓ Found ${customers.total} customers, showing ${customers.data.length}`);

    // Get specific customer
    const customer = await meshpay.customers.get(newCustomer.id);
    console.log('✓ Customer retrieved:', customer.firstName, customer.lastName);

    // Update customer
    const updated = await meshpay.customers.update(newCustomer.id, {
      email: 'alice.johnson@example.com'
    });
    console.log('✓ Customer updated, new email:', updated.email);
  } catch (error) {
    console.error('✗ Customer error:', error);
  }
}

// ============================================================================
// Virtual Account Examples
// ============================================================================

async function accountExamples() {
  console.log('\n=== Virtual Account Examples ===\n');

  try {
    // Issue a virtual account
    const account = await meshpay.accounts.issueVirtualAccount({
      accountName: 'Business Account',
      customerId: 'created_customer_id'
    });
    console.log('✓ Virtual account issued:', account.accountNumber);
    console.log('  Bank:', account.bankName);

    // List accounts
    const accounts = await meshpay.accounts.listVirtualAccounts(5, 0);
    console.log(`✓ Found ${accounts.total} accounts`);

    // Get account details
    const details = await meshpay.accounts.getVirtualAccount(account.id);
    console.log('✓ Account status:', details.status);

    // Get available banks
    const banks = await meshpay.accounts.listBanks();
    console.log(`✓ ${banks.length} supported banks`);

    // Resolve account name
    const resolved = await meshpay.accounts.resolveBank({
      accountNumber: '0123456789',
      bankCode: '011'
    });
    console.log('✓ Resolved account name:', resolved.accountName);

    // Get balance
    const balance = await meshpay.accounts.getBalance();
    console.log('✓ Account balance:', balance.balance, balance.currency);
  } catch (error) {
    console.error('✗ Account error:', error);
  }
}

// ============================================================================
// Payment Examples
// ============================================================================

async function paymentExamples() {
  console.log('\n=== Payment Examples ===\n');

  try {
    // Create a transfer
    const transfer = await meshpay.payments.createTransfer({
      amount: 50000, // 500 NGN
      destinationAccountNumber: '0123456789',
      destinationBankCode: '011',
      description: 'Test transfer',
      metadata: {
        orderId: 'ORD-12345'
      }
    });
    console.log('✓ Transfer created:', transfer.reference);
    console.log('  Status:', transfer.status);

    // List transactions
    const transactions = await meshpay.payments.listTransactions(10, 0);
    console.log(`✓ Found ${transactions.total} transactions`);

    // Get specific transaction
    const tx = await meshpay.payments.getTransaction(transfer.reference);
    console.log('✓ Transaction details:');
    console.log('  Amount:', tx.amount);
    console.log('  Status:', tx.status);
  } catch (error) {
    if (error instanceof MeshpaySDKError) {
      console.error(`✗ API Error [${error.code}]:`, error.message);
    } else {
      console.error('✗ Payment error:', error);
    }
  }
}

// ============================================================================
// Bill Payment Examples
// ============================================================================

async function billExamples() {
  console.log('\n=== Bill Payment Examples ===\n');

  try {
    // Get data plans
    const plans = await meshpay.bills.fetchDataPlans('MTN');
    console.log(`✓ Found ${plans.length} data plans for MTN`);

    // Get electricity providers
    const providers = await meshpay.bills.fetchElectricityProviders();
    console.log(`✓ Found ${providers.length} electricity providers`);

    // Pay a bill
    const payment = await meshpay.bills.payBill({
      billType: 'DATA',
      provider: 'MTN',
      amount: 5000,
      phoneNumber: '+2348012345678',
      planId: 'plan-123'
    });
    console.log('✓ Bill payment created:', payment.reference);
    console.log('  Status:', payment.status);
  } catch (error) {
    console.error('✗ Bill payment error:', error);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('Meshpay SDK Examples\n');
  console.log('API Key:', meshpay.customers['apiKey'] ? '✓ Configured' : '✗ Missing');

  await customerExamples();
  await accountExamples();
  await paymentExamples();
  await billExamples();

  console.log('\n✓ All examples completed!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
