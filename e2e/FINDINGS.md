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
- **Confirmed affected (run 2, 2026-10-27):** every card path. One adult (fee 524, recorded null);
  adult + child + gift (968, null); the `/register/pay` second charge (booking fee stays null; the two
  real fees sum to 854); a standalone gift at `/donate` (320, null).
- **Fix (proposed, not started):** also handle `charge.updated` and record the fee once the balance
  transaction exists, added at most once per payment intent; add the event to both Stripe webhook
  endpoints (test and live).
- **Status:** open. The scenarios check it with `expect.soft`, so they keep running.

## 2. The estimated fee for a cancelled booking with a gift leaves out the gift's share

- **Found:** run 2, "cancel a card booking with a gift". Expected Lost to refunds 896, panel showed 823.
- **Mechanism:** with no recorded fee (issue 1), the panel estimates the fee lost on a refunded booking
  from the booking's own total — the places, 27354 → 823. But the gift was on the SAME charge (29854),
  and Stripe kept the fee on all of it: 896. So In the bank reads 73¢ high for every such cancellation.
- **Effect:** only while issue 1 stands — a recorded fee is the whole charge's, so fixing issue 1 fixes
  this. Worth a unit test on the estimate path either way.
- **Status:** open; resolves with issue 1.

## 3. A registrant's first email can be titled "Registration updated" (observation)

- **Found:** run 2, "abandoned card checkout settled by check". The registrant abandoned Stripe, so no
  confirmation was ever sent; when an organizer marks the booking paid, the only email they get is
  "Registration updated: …".
- **Effect:** copy only — the body is correct (tier price, no card fee). A first email saying
  "updated" may confuse someone who never saw an original.
- **Status:** open, low priority. Decide whether a booking with no confirmation sent should get the
  confirmation wording instead.

## Checked and correct (run 2)

Charge = tier price grossed up (16500 → 17024; 10000 → 10330); a gift is charged at face value; the
owed email asks for the net (10000 → "$100.00") and the card then charges 10330; Zelle/check keeps the
tier price; Cover sets 0; a paid guest cannot be removed, an owed one can, with no refund; two card
charges both refunded in full; mixed refund 10330 to the card and 16500 by hand; unpaid and waived
cancellations refund nothing; paper paid/pending/waived; marking an abandoned card checkout paid drops
the card fee (17024 → 16500); a redelivered webhook sends no second email; the preview link registers
before opening; the closed gate holds.
