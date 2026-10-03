# Launch checklist — Patterson Family Reunion site

These checks need a person to do them: dashboards, DNS, money, phones and judgment. Do them in order.

**Tick the boxes in the description of the draft PR that adds this file. Do not merge that PR**, because it only exists to give the checklist a UI. This file is a copy taken when the PR was opened.

Open pull requests:

- **#86** `fix/photos-s3-sockets`: photos fix. Merge first.
- **#87** `release/family-launch`: release work, without the domain change.
- **#88** `feat/domain-cutover`: domain change. Draft, stacked on #87.

---

## 1. Photos (now)

- [ ] Open `/photos` on your phone and check that the thumbnails load. Production was restarted on 2026-10-03 at 16:25 UTC to clear the stuck connection pool.
- [ ] Merge **#86**. Railway then deploys it.
- [ ] After the deploy, open `/photos` again on your phone. Also download one year as a zip and cancel it halfway.
- [ ] One day later, search the Railway deploy logs for `socket usage at capacity`. You must get no results. If you get results, the pool is filling again. Restart the service and tell the developer.

## 2. Merge the release PR (#87)

- [ ] Check that CI is green on #87.
- [ ] Merge #87. Railway deploys to production. Stripe is still in **test** mode.
- [ ] Do one test registration with card `4242 4242 4242 4242`. Check that Stripe Checkout opens, that the button says **Book**, and that the note under it mentions the card fee. If Checkout fails to open, Stripe has rejected the statement-descriptor suffix. Set the shortened descriptor (section 4) and try again.
- [ ] On Stripe Checkout, click the back arrow. You must return to `/register` with your details filled in again and the message "Checkout cancelled — nothing was charged."
- [ ] Move #88 onto `main` without a force-push:
      `git switch feat/domain-cutover && git merge origin/main && git push`. Then change the base of #88 to `main`. The squash of #87 holds the same changes, so the merge is clean, and the diff of #88 shrinks back to the domain change.

## 3. Domain cutover (#88), in this order

Merging #88 before step 1 breaks every confirmation email. A family would pay and get no management link.

- [ ] **Resend:** add `pattersonfamilyreunion.com`. Add the DNS records Resend shows: the DKIM key at `resend._domainkey`, SPF and MX on `send.`, and DMARC. Wait until Resend says **Verified**.
- [ ] **Inbound mail:** add the domain in ImprovMX. Add the root MX records and **one** SPF TXT record that includes both ImprovMX and Resend. Two SPF records is an error that breaks both.
- [ ] **Gmail:** add "Send mail as" `reunion@pattersonfamilyreunion.com` through the Resend SMTP relay. Send a test email to the new address and reply to it.
- [ ] **Railway:** add the custom domain `pattersonfamilyreunion.com` to `family-reunion-app`. Set the DNS records Railway shows and wait for the certificate. At the DNS host, set `www` to a 301 redirect to the apex domain.
- [ ] **Railway variables:** set `BETTER_AUTH_URL=https://pattersonfamilyreunion.com`. Make sure `ORIGIN` is **not** set.
- [ ] **Stripe webhooks**, in test mode and in live mode: change the endpoint URL to `https://pattersonfamilyreunion.com/api/webhooks/stripe`. If you create a new endpoint instead of editing the old one, copy its new signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] **Resend webhook:** change it to `https://pattersonfamilyreunion.com/api/webhooks/resend`. If the secret changes, update `RESEND_WEBHOOK_SECRET`.
- [ ] **Sentry:** add the new domain to Allowed Domains.
- [ ] Send yourself the email previews from the new domain:
      `bun run email:preview -- --send you@example.com`
- [ ] Mark #88 ready and merge it.
- [ ] Smoke test:
  - `https://pattersonfamilyreunion.com/api/health` returns `ok`.
  - `/robots.txt` shows the Sitemap line.
  - Admin sign-in at `/login` works. You must sign in again, because cookies are per domain.
- [ ] Confirm that no real registration still holds an old-domain link. Then **detach** `pattersonfamilyreunion27.com` on Railway.
- [ ] Update the domain in the Facebook event and group posts. Reprint any paper forms, because they print the domain.

## 4. Stripe (before any real money)

- [ ] Put the **live** `STRIPE_SECRET_KEY` and the **live-mode** `STRIPE_WEBHOOK_SECRET` on Railway. They are two different values. A test-mode secret with a live key makes every webhook fail. Payments then succeed, but registrations stay `pending` and no email goes out.
- [ ] Dashboard → Public details: set the business name to "Patterson Family Reunion", the support email to `reunion@pattersonfamilyreunion.com`, the phone to `(510) 809-8309`, and the website to `https://pattersonfamilyreunion.com`.
- [ ] Statement descriptor: `PATTERSON REUNION`. **Shortened descriptor: `PATTERSON`.** The code adds `* REUNION` or `* GIFT`, so the total must stay at 22 characters or fewer.
- [ ] Branding: icon `static/will_and_roxie_512.png`, logo, and brand and accent colours that match the site.
- [ ] Customer emails: turn **off** the Stripe receipts for successful payments and for refunds. The site sends its own confirmation, and two emails confuse people.
- [ ] Turn on Apple Pay and Google Pay.

## 5. Railway

- [ ] Check that `BODY_SIZE_LIMIT` is set. The default of 512K rejects most phone photos, and this fails only in production.
- [ ] Set `ADDRESS_HEADER` and `XFF_DEPTH`. Without them the photo-upload rate limit treats all visitors as one IP address, so the whole family shares 40 uploads per hour.
- [ ] Turn on Postgres backups before real registrations exist.

## 6. Content

- [ ] In the event settings, in the program JSON, set `venue.address` to `2323 Broadway, Oakland, CA`. Confirmation emails read the venue from the database, not from the code.
- [ ] Check that the event status is `open`, and that the tiers, prices, lock date and start and end dates are correct. Check that no seed text remains, for example "TBD" or "Mountain resort".
- [ ] The venue is at 2323 Broadway and the hotel at 2455 Broadway, about one block apart. The site says "half a block" in the hotel tagline, on the register page and on the paper form. Choose the correct words.
- [ ] Check that the new phone number `(510) 809-8309` appears everywhere: the site, the emails, the paper form and the Facebook carousel.
- [ ] Read every email on an iPhone and in Gmail, in light mode and in dark mode. To send them all now from the verified domain:
      `bun run email:preview -- --send you@example.com --from-domain pattersonfamilyreunion27.com`
      The header photo shows after #87 deploys.

## 7. Payment rehearsal (with live keys, real card, then refund)

- [ ] Register 1 adult. You receive one confirmation email, and the card statement reads `PATTERSON* REUNION`.
- [ ] Register 1 adult, 1 child and a gift. The total includes the gift and the email lists the gift.
- [ ] Cancel at Stripe. The form comes back filled in and nothing is charged.
- [ ] In the Stripe dashboard, resend the `checkout.session.completed` webhook. No second email arrives.
- [ ] Admin: enter a paper registration paid by cheque (the email says "received", not "gone through"), one waived, and one pending (the email shows a boxed payment request).
- [ ] Admin: change one person's T-shirt size. The email shows `M → L` and nothing else.
- [ ] Admin: cancel with a refund. The email lists each refunded place, the gift is kept, and the refund appears in Stripe.
- [ ] Recover the management link at `/register/recover`.
- [ ] Make a standalone gift at `/donate`. The button says **Donate** and the receipt shows the date.
- [ ] After the lock date, a submit shows "Registration has closed, so nothing was charged".

## 8. Devices

- [ ] Test on an iPhone SE or another small phone, on Android Chrome and on an iPad, with the large text setting on and in dark mode.
- [ ] Check deliverability: Gmail, iPhone Mail, Outlook and Yahoo deliver to the inbox, not to spam. Get a mail-tester.com score.
- [ ] Check link previews: Facebook Sharing Debugger and iMessage, for `/` and `/register`.

## 9. People

- [ ] Do a soft launch: send the link to 3–5 relatives of different ages first. Watch Sentry, Stripe and Resend for 48 hours before you send it to the whole family.
- [ ] Decide who answers `reunion@` and the text number, and who watches the Sentry bounce alerts.
- [ ] Write down the refund and cancellation policy, the child-age cutoff and the deadline. No page states the refund policy yet.

## 10. Housekeeping

- [ ] Delete the stale branch `feat/cut-over-to-the-real-reunion-domain` on GitHub. It is from Aug 30, and its PR #71 is closed.
- [ ] Remove the photos worktree after #86 merges: `git worktree remove ../family-reunion-hotfix`.
- [ ] Authorise the Sentry MCP (`/mcp`). The Resend MCP is failing at the network proxy.
