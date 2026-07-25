/**
 * MeshPay SDK usage examples.
 *
 * Run against sandbox:
 *   MESHPAY_APP_ID=... MESHPAY_SECRET=... npx ts-node examples/basic.ts
 */

import { Meshpay, MeshpayError, SANDBOX_BASE_URL } from '../src/index';

const meshpay = new Meshpay({
  appId: process.env.MESHPAY_APP_ID ?? 'your-app-id',
  secret: process.env.MESHPAY_SECRET ?? 'your-secret',
  baseURL: SANDBOX_BASE_URL
});

/** Unique per run so the examples can be re-run without 409s. */
const runId = Date.now();

async function balanceExample(): Promise<void> {
  const balance = await meshpay.accounts.getBalance();
  console.log('Balance:', balance.available, balance.currency);
  console.log('  in kobo:', balance.available_kobo);
}

async function customerExample(): Promise<string> {
  const customer = await meshpay.customers.create({
    external_ref: `user-${runId}`,
    email: 'alice@example.com',
    phone: '+2348012345678',
    first_name: 'Alice',
    last_name: 'Johnson'
  });
  console.log('Created customer:', customer.id, customer.external_ref);

  const page = await meshpay.customers.list({ limit: 5 });
  console.log(`Customers: ${page.data.length} of ${page.total}`);

  return customer.id;
}

async function virtualAccountExample(customerId: string): Promise<void> {
  const account = await meshpay.accounts.issue({
    account_ref: `va-${runId}`,
    account_name: 'Alice Johnson',
    customer_id: customerId
  });
  console.log('Virtual account:', account.account_number, account.bank_name);

  const banks = await meshpay.accounts.listBanks();
  console.log(`Supported banks: ${banks.length}`);
}

async function transferExample(): Promise<void> {
  // Resolve the destination name before sending anything.
  const resolved = await meshpay.accounts.resolveBank({
    account_number: '0123456789',
    bank_code: '011'
  });
  console.log('Sending to:', resolved.account_name);

  const amountKobo = 50_000; // ₦500.00

  if (!(await meshpay.accounts.hasSufficientBalance(amountKobo))) {
    console.log('Insufficient balance — skipping transfer');
    return;
  }

  const transfer = await meshpay.payments.createTransfer({
    account_number: resolved.account_number,
    bank_code: '011',
    account_name: resolved.account_name,
    amount_kobo: amountKobo,
    narration: 'SDK example transfer',
    trx_reference: `transfer-${runId}`
  });
  console.log('Transfer:', transfer.reference, transfer.status);
}

async function chargeExample(): Promise<void> {
  // 1. Merchant creates the payment link.
  const charge = await meshpay.charges.create({
    payer_email: 'payer@example.com',
    amount_kobo: 250_000, // ₦2,500.00
    trx_reference: `invoice-${runId}`,
    callback_url: 'https://example.com/payment/complete',
    metadata: { invoice_id: String(runId) }
  });
  console.log('Charge:', charge.reference, charge.status);
  console.log('  pay at: https://app.meshpay.ng/pay/' + charge.reference);

  // 2. What the payer's browser sees — no credentials involved.
  const view = await meshpay.charges.public_.get(charge.reference);
  console.log('Payment page:', view.business_name, view.amount_kobo);

  // 3. Issue the one-off account to transfer into.
  const account = await meshpay.charges.public_.issueAccount(charge.reference);
  console.log('Pay into:', account.account_number, account.bank_name);
  console.log('  expires:', account.expires_at);

  // 4. The page polls this until it flips to 'paid'.
  const status = await meshpay.charges.public_.getStatus(charge.reference);
  console.log('Status:', status.status);
}

async function billExample(): Promise<void> {
  const plans = await meshpay.bills.listDataPlans('MTN');
  console.log(`MTN data plans: ${plans.length}`);

  const payment = await meshpay.bills.pay({
    type: 'airtime',
    amount: '100.00',
    phone_number: '+2348012345678',
    network: 'MTN',
    trx_reference: `airtime-${runId}`
  });
  console.log('Airtime:', payment.reference, payment.status);
}

async function main(): Promise<void> {
  try {
    await balanceExample();
    const customerId = await customerExample();
    await virtualAccountExample(customerId);
    await transferExample();
    await chargeExample();
    await billExample();
  } catch (err) {
    if (err instanceof MeshpayError) {
      console.error(`API error ${err.statusCode}: ${err.message}`);
      if (err.isDuplicate) {
        console.error('  a trx_reference was reused');
      }
    } else {
      throw err;
    }
  }
}

void main();
