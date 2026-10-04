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
- [ ] **DMARC policy:** start at `p=none` with a `rua=` report address. When the reports are clean for 2 weeks, change it to `p=reject`. Inboxes then refuse mail that pretends to come from our domain.
- [ ] **Inbound mail:** add the domain in ImprovMX. Add the root MX records and **one** SPF TXT record that includes both ImprovMX and Resend. Two SPF records is an error that breaks both.
- [ ] **Gmail:** add "Send mail as" `reunion@pattersonfamilyreunion.com` through the Resend SMTP relay. Send a test email to the new address and reply to it.
- [ ] **Railway:** add the custom domain `pattersonfamilyreunion.com` to `family-reunion-app`. Set the DNS records Railway shows and wait for the certificate. At the DNS host, set `www` to a 301 redirect to the apex domain.
- [ ] **Railway variables:** set `BETTER_AUTH_URL=https://pattersonfamilyreunion.com`. Make sure `ORIGIN` is **not** set.
- [ ] **Stripe webhooks**, in test mode and in live mode: change the endpoint URL to `https://pattersonfamilyreunion.com/api/webhooks/stripe`. If you create a new endpoint instead of editing the old one, copy its new signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] **Resend webhook:** change it to `https://pattersonfamilyreunion.com/api/webhooks/resend`. If the secret changes, update `RESEND_WEBHOOK_SECRET`.
- [ ] **Sentry:** add the new domain to Allowed Domains.
- [ ] **Zelle:** enroll `reunion@pattersonfamilyreunion.com` with Zelle at PNC (section 13). The site names this address as the only Zelle recipient once #88 merges.
- [ ] Send yourself the email previews from the new domain:
      `bun run email:preview -- --send you@example.com`
- [ ] Mark #88 ready and merge it.
- [ ] Smoke test:
  - `https://pattersonfamilyreunion.com/api/health` returns `ok`.
  - `/robots.txt` shows the Sitemap line.
  - Admin sign-in at `/login` works. You must sign in again, because cookies are per domain.
- [ ] Confirm that no real registration still holds an old-domain link. Then **detach** `pattersonfamilyreunion27.com` on Railway.
- [ ] Do **not** let `pattersonfamilyreunion27.com` lapse. Turn on auto-renew. At the DNS host, set a 301 redirect to the new domain, and keep ImprovMX for it for 2 years or more. Old emails, paper forms and Facebook posts link to it. If it lapses, a scammer can buy it and receive the replies.
- [ ] When nothing sends mail from the old domain any more, set its DMARC to `p=reject` and its SPF to `v=spf1 -all`. Then nobody can send mail as that domain.
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

## 11. Scam protection

- [ ] Before the 2FA change deploys, tell every admin to have an authenticator app ready. Each admin must set up 2FA at the next sign-in. The owner goes first.
- [ ] Store every admin's backup codes in a safe place. If an admin loses the phone and the codes, run `bun run admin:reset-2fa <email>` through `railway ssh`.
- [ ] After the deploy, run `curl -sI https://<domain>/` and look for the security headers. Then check that Stripe Checkout opens, the map loads, and photos and the photo zip load.
- [ ] Check that section 5's `ADDRESS_HEADER` and `XFF_DEPTH` are set. Without them, the recovery-email limit treats all visitors as one IP address.
- [ ] Facebook: pin a post with the same payment rules as the site. Make the group require admin approval for new posts and new members. Fake "pay here" posts are the most likely attack.
- [ ] Tell the committee: organizers never ask for payment by text, and they use only the official Zelle account.
- [ ] Optional: register one common misspelling of the domain (about $12 per year) and redirect it to the real domain.

## 12. Scam protection: later

These items are not in the current work. Do them in this order.

- [ ] **Email links on one domain.** Do this after #88 merges and the Stripe and Resend webhooks point at the new domain.
  - Remove the `family-reunion-production.up.railway.app` service domain on Railway. It serves the full site, and an email sent through it links there. That teaches people a second "real" address.
  - Ask the developer to build email links and Stripe URLs from `BETTER_AUTH_URL`, not from the host of the request.
- [ ] **Content Security Policy, report-only first.** Ask the developer to add `Content-Security-Policy-Report-Only`, with reports to Sentry. After 2 weeks with no unexpected reports, change it to enforce. Do not enforce it first: one missing source breaks part of a page with no error the user can see.
- [ ] **Stripe custom Checkout domain (optional, paid).** In Stripe Dashboard → Settings → Custom domains, add `pay.pattersonfamilyreunion.com`. Payers then type their card only on our domain. Check the monthly price first. Do it only after #88.
- [ ] **Decide on BIMI. Recommended: skip.** BIMI shows our logo beside our emails in Gmail. Gmail and Apple Mail need a paid certificate: a VMC, which needs a registered trademark, or a CMC, which needs 12 months of logo use. DMARC `p=reject` (section 3) gives the real protection.

## 13. Zelle email (PNC)

The site and every email tell people to send Zelle only to the reunion email address (`CONTACT_EMAIL`). Zelle must be enrolled with that exact address. When #88 changes the domain, the address changes too, so do these steps for `reunion@pattersonfamilyreunion.com` before #88 merges. If you do not, the site names an address that Zelle does not know.

In the PNC Mobile app, you add or change your Zelle email in Zelle Settings. PNC says your Zelle account, U.S. mobile number and email address can all be updated any time in Zelle® Settings.

1. Open the PNC Mobile app (or PNC Online Banking) and go to Zelle (it's usually under "Send Money with Zelle").
2. Open Zelle Settings.
3. Tap Edit or Add next to your email, or switch your enrollment from your phone number to an email address.
4. Enter the email address. You may be asked to verify your email address with a code, so check that inbox.
5. Confirm which PNC account Zelle should deposit into.

**If it says the email is already in use:** An email address or mobile number can only be linked to one Zelle® account. If that email is enrolled at another bank, follow the prompts to transfer your mobile number or email address to use with Zelle® at PNC instead. If no transfer prompt appears, log into the other bank or the Zelle app, remove the email there, then re-enroll it with PNC.

**If you use a Zelle QR code:** changing your email could break your old code. Money sent to a Zelle® QR Code that is not associated with an enrolled U.S. mobile number or email address will not be delivered, so you may need to share your new QR code.

If you get stuck, call PNC's official line at 1-888-PNC-BANK. Some search results list other "Zelle support" phone numbers, and those can be scams. Only use the number on pnc.com or the back of your card.

Sources:

- [PNC – Guide to Using Zelle](https://www.pnc.com/en/personal-banking/banking/online-and-mobile-banking/zelle/guide-to-using-zelle.html)
- [PNC – Zelle](https://www.pnc.com/en/personal-banking/banking/online-and-mobile-banking/zelle.html)
- [Linking an email to another bank's Zelle](https://ncr-fi51840090.freshdesk.com/en/support/solutions/articles/48001230286-how-can-i-change-my-mobile-number-email-address-linked-to-another-banks-zelle-account-)
- [Does PNC Use Zelle?](https://cftau.org/does-pnc-use-zelle/)
