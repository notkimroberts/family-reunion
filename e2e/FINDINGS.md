# Issues found by the e2e scenarios

A running list, kept while the suite is brought up. Each entry: what the run showed, the evidence,
and the status of a fix. Fixes go in their own PR after the run is complete.

## 1. Stripe's actual fee is never recorded (`stripe_fee_cents` stays null)

- **Found:** 2026-10-27, first full run. Every card scenario: `registrations.stripe_fee_cents` was
  still null 20 s after the booking was paid.
- **Mechanism:** Stripe attaches the balance transaction to a charge about 3 seconds AFTER it sends
  `checkout.session.completed`. The webhook calls `retrievePaymentFee` while handling that event,
  reads `latest_charge.balance_transaction = null`, and records nothing.
- **Evidence (Stripe event log, three payments from the run, same pattern each time):**
  ```
  20:38:09  charge.succeeded            balance_transaction = null
  20:38:09  checkout.session.completed  ← the webhook reads the fee here
  20:38:12  charge.updated              balance_transaction = txn_… (fee 524)
  ```
- **Effect:** the admin money panel always shows its 2.9% + 30¢ estimate, never the real fee, and
  "Lost to refunds" is the estimate too. Likely the same in production (same API flow).
- **Likely affected too:** gifts (`donations.stripe_fee_cents`) and the `/register/pay` second charge
  — same read at the same moment. To confirm in the next run.
- **Fix (proposed, not started):** also handle `charge.updated` and record the fee once the balance
  transaction exists, added at most once per payment intent; add the event to both Stripe webhook
  endpoints (test and live).
- **Status:** open. The scenarios check it with `expect.soft`, so they keep running.
