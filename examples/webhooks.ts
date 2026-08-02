/**
 * Handling MeshPay webhooks with Express.
 *
 *   MESHPAY_WEBHOOK_SECRET=... npx ts-node examples/webhooks.ts
 *
 * The secret is your business's webhook signing secret, revealed from the
 * dashboard's developer menu.
 */

import express from 'express';

import {
  constructWebhookEvent,
  WebhookVerificationError
} from '../src/index';
import type {
  MeshpayWebhookEvent,
  WebhookDataFor
} from '../src/index';

const app = express();
const SECRET = process.env.MESHPAY_WEBHOOK_SECRET ?? 'your-webhook-secret';

app.post(
  '/webhooks/meshpay',
  // Raw body, not express.json() — re-serialising a parsed object changes
  // the bytes and the signature will not match.
  express.raw({ type: 'application/json' }),
  (req, res) => {
    let event: MeshpayWebhookEvent;

    try {
      event = constructWebhookEvent(
        req.body,
        req.header('X-MeshPay-Signature') ?? '',
        SECRET
      );
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        console.warn('Rejected webhook:', err.message);
        res.sendStatus(401);
        return;
      }
      throw err;
    }

    // Acknowledge before doing any real work: MeshPay retries on a non-2xx,
    // and slow handlers are indistinguishable from failed ones.
    res.sendStatus(200);

    void handle(event);
  }
);

/**
 * Every handler must be idempotent — an event can arrive more than once,
 * either from an automatic retry or a manual resend from the dashboard.
 */
async function handle(event: MeshpayWebhookEvent): Promise<void> {
  console.log(`[${event.event}] at ${new Date(event.timestamp * 1000).toISOString()}`);

  switch (event.event) {
    case 'inflow.success':
      await onInflow(event.data);
      break;

    case 'charge.success':
      // `transaction` is the reference GET /transactions accepts;
      // `trx_reference` is the idempotency key you created the charge with.
      console.log(
        `Payment link ${event.data.trx_reference} settled by ${event.data.transaction}`
      );
      break;

    case 'transfer.success':
      console.log(
        `Payout ${event.data.trx_reference} settled.`,
        `Wallet movement: ${
          event.data.amount_kobo +
          event.data.fee_kobo +
          (event.data.stamp_duty_kobo ?? 0)
        } kobo`
      );
      break;

    case 'transfer.failed':
      console.log(`Payout ${event.data.trx_reference} failed — funds returned`);
      break;

    case 'bill.failed':
      console.log(
        `Bill ${event.data.trx_reference} failed:`,
        event.data.metadata?.failure_reason ?? 'no reason given'
      );
      break;

    case 'inflow.reversed':
    case 'transfer.reversed':
    case 'bill.reversed':
      console.log(`Reversal on ${event.data.reference} — adjust your ledger`);
      break;

    case 'pos.charge.success':
    case 'pos.charge.failed':
    case 'bill.success':
      console.log(`${event.event}: ${event.data.reference}`);
      break;
  }
}

/** Narrowing a single event's payload with WebhookDataFor. */
async function onInflow(data: WebhookDataFor<'inflow.success'>): Promise<void> {
  console.log(
    `Received ${data.amount_kobo} kobo into ${data.account_ref ?? 'wallet'}`,
    data.counterparty?.sender_name
      ? `from ${data.counterparty.sender_name}`
      : ''
  );
  // data.customer_ref is the external_ref of the linked customer, if any.
  // data.session_id is the NIBSS reference, for tracing with the banks.
}

app.listen(3000, () => console.log('Listening on :3000'));
