# Launch checklist — Patterson Family Reunion site

These checks need a person to do them: dashboards, DNS, money, phones and judgment. Do them in order.

**Tick the boxes in the description of the draft PR that adds this file. Do not merge that PR**, because it only exists to give the checklist a UI. This file is a copy taken when the PR was last updated.

Pull requests:

- **#86** `fix/photos-s3-sockets`: photos fix. Merged 2026-10-03.
- **#87** `release/family-launch`: release work, without the domain change. Merged 2026-10-03.
- **#91** `feat/scam-protection`: scam protection. Merged 2026-10-08.
- **#88** `feat/domain-cutover`: domain change. Open, based on `main`. Merge it only at step 3e.
- **#92** `feat/registration-opens`: registration stays closed until 2026-10-31 9:00 AM Pacific. Open.
- **#93** `fix/check-payee`: checks payable to Patterson Reunion Association. Open.

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

## 2a. Registration opens on October 31 (#92)

- [ ] Check that CI is green on #92, then merge it. Railway runs migration `0023`, which sets the opening to Saturday, October 31, 2026 at 9:00 AM Pacific.
- [ ] Open `/register`. It must say "Come back on Saturday, October 31, 2026 at 9:00 AM PDT" and show no form.
- [ ] Open the home page. In place of **Register Now** it must say "Registration opens Saturday, October 31, 2026 at 9:00 AM PDT".
- [ ] Settings → **Registration opens** shows `2026-10-31 09:00`. To move the date, change it there; leave it blank to open registration at once.
- [ ] Tell the family the date: a Facebook post, and the same time on anything already shared.
- [ ] On October 31 after 9:00 AM Pacific, check that the form is back and do one test registration.

## 3. Cut over everything to `pattersonfamilyreunion.com`

Do the parts in order. **Do not merge #88 before 3e.** #88 changes the From address of every email, the Zelle address shown on the site and the domain printed on the paper form. If the email setup is not ready, a family pays and gets no management link.

### 3a. Take control of the domain

- [ ] Sign in to the registrar account that holds `pattersonfamilyreunion.com`. If someone else holds it, have it moved into the committee's account first: they unlock it and give you the transfer code, or they add you as the owner.
- [ ] Make the account safe to keep for years. The account email must be one the committee controls, not a personal address that can lapse. Turn on two-factor sign-in.
- [ ] Turn on the registrar lock (transfer lock), auto-renew with a card that does not expire soon, and WHOIS privacy. Write down the renewal date.
- [ ] DNS host: **Namecheap**. In Namecheap, go to **Domain List → Manage → Domain** and check that **Nameservers** says **Namecheap BasicDNS**. With **Custom DNS** the records live elsewhere and the Namecheap steps below do not apply. Namecheap supports ALIAS records, which Railway needs for the root domain.
- [ ] Before you change anything, screenshot every DNS record the domain already has. If it served an old site or old email, note which records were for that.

### 3b. Email (before #88)

- [ ] **Resend:** add `pattersonfamilyreunion.com`. Add the DNS records Resend shows: the DKIM key at `resend._domainkey`, SPF and MX on `send.`, and DMARC. Wait until Resend says **Verified**.
- [ ] **DMARC policy:** start at `p=none` with a `rua=` report address. When the reports are clean for 2 weeks, change it to `p=reject`. Inboxes then refuse mail that pretends to come from our domain.
- [ ] **Inbound mail:** add the domain in ImprovMX, with a catch-all alias to the committee Gmail. In Namecheap → **Advanced DNS → Mail Settings**, choose **Custom MX** first: with any other choice Namecheap does not use your own MX records. Then add ImprovMX's root MX records and **one** SPF TXT record (Host `@`) that includes both ImprovMX and Resend. Two SPF records is an error that breaks both.
- [ ] Send a test email from a personal account to `reunion@pattersonfamilyreunion.com`. It must arrive in the committee Gmail.
- [ ] **Gmail:** add "Send mail as" `reunion@pattersonfamilyreunion.com` through the Resend SMTP relay. Reply to the test email from that address and check that the reply arrives.
- [ ] **Zelle:** enroll `reunion@pattersonfamilyreunion.com` with Zelle at PNC (section 13). Once #88 merges, the site names this address as the only Zelle recipient. Send $1 to it from another account to prove it works.
- [ ] Send yourself the email previews from the new domain: `bun run email:preview -- --send you@example.com`. They must arrive in the inbox, not spam.

### 3c. Website (before #88)

- [ ] **Railway:** add the custom domain `pattersonfamilyreunion.com` to `family-reunion-app` in production. Then in Namecheap → **Advanced DNS → Host Records**:
  - Delete Namecheap's parking records: `URL Redirect @ → http://www.pattersonfamilyreunion.com/` and `CNAME www → parkingpage.namecheap.com`. If the `@` redirect stays, the root and `www` redirect to each other and the page never loads.
  - Add an **ALIAS Record**: Host `@`, Value the target Railway shows.
  - Add any **TXT Record** Railway shows for verification.
  - Wait until Railway shows the certificate as active. DNS changes can take up to 30 minutes.
- [ ] **`www` redirect** in Namecheap → **Advanced DNS → Host Records** → **Add New Record** → **URL Redirect Record**: Host `www`, Value `https://pattersonfamilyreunion.com`, type **Permanent (301)**. Not "Unmasked" (a temporary redirect) or "Masked" (a frame). Save with the green check mark.
  - Test `http://www.pattersonfamilyreunion.com/register`, `https://www.pattersonfamilyreunion.com/register` and `www.pattersonfamilyreunion.com/register`. Each must end on `https://pattersonfamilyreunion.com` with no security warning, ideally on `/register`. Or run `curl -sI https://www.pattersonfamilyreunion.com/register` and look for `301`.
  - If the `https://www` address shows a security warning, Namecheap's redirect has no certificate for it. Then ask the developer to add `www` as a second Railway domain and redirect it in the app instead.
- [ ] Open `https://pattersonfamilyreunion.com/api/health`. It must return `ok`. The site still shows the old domain in its text until 3e. That is expected.

### 3d. Services that call the site (before #88)

- [ ] **Stripe webhooks**, in test mode and in live mode: change the endpoint URL to `https://pattersonfamilyreunion.com/api/webhooks/stripe`. Edit the existing endpoint, so its signing secret stays the same. If you create a new endpoint, copy its new signing secret into `STRIPE_WEBHOOK_SECRET`. The webhook's URL decides the domain of the management link in every confirmation email.
- [ ] **Resend webhook:** change it to `https://pattersonfamilyreunion.com/api/webhooks/resend`. If the secret changes, update `RESEND_WEBHOOK_SECRET`.
- [ ] **Stripe Dashboard → Public details:** set the website to `https://pattersonfamilyreunion.com` and the support email to `reunion@pattersonfamilyreunion.com`.
- [ ] **Sentry:** add the new domain to Allowed Domains.

### 3e. Switch the app (merge #88)

- [ ] **Railway variables:** set `BETTER_AUTH_URL=https://pattersonfamilyreunion.com`. Make sure `ORIGIN` is **not** set. Do this together with the merge: from this moment, admin sign-in works only on the new domain.
- [ ] Check that CI is green on #88, then merge it. Railway deploys.
- [ ] Sign in again at `https://pattersonfamilyreunion.com/login`. Cookies are per domain, so every admin must sign in again.

### 3f. Check everything on the new domain

- [ ] `/robots.txt` shows `Sitemap: https://pattersonfamilyreunion.com/sitemap.xml`.
- [ ] The payment-safety box on `/`, `/register` and `/donate` names `pattersonfamilyreunion.com` and `reunion@pattersonfamilyreunion.com`.
- [ ] Do one test registration. The confirmation email comes from `reunion@pattersonfamilyreunion.com`, its links open `pattersonfamilyreunion.com`, the header photo loads, and a reply reaches the committee Gmail.
- [ ] Recover a link at `/register/recover` and make a test gift at `/donate`. Both emails come from the new domain.
- [ ] Paste `https://pattersonfamilyreunion.com` into the Facebook Sharing Debugger and into iMessage. The preview shows Will and Roxie.

### 3g. The old domain, `pattersonfamilyreunion27.com`

Not needed: `pattersonfamilyreunion27.com` was only used for testing, never live, so nothing real links to it or sends from it.

- ~~Confirm that no real registration still holds an old-domain link. Then **detach** `pattersonfamilyreunion27.com` on Railway.~~
- ~~Do **not** let `pattersonfamilyreunion27.com` lapse. Turn on auto-renew. At the DNS host, set a 301 redirect to the new domain, and keep ImprovMX for it for 2 years or more. Old emails, paper forms and Facebook posts link to it. If it lapses, a scammer can buy it and receive the replies.~~
- ~~When nothing sends mail from the old domain any more, set its DMARC to `p=reject` and its SPF to `v=spf1 -all`. Then nobody can send mail as that domain.~~
- ~~Remove the old domain from Resend only after that, and keep its Zelle enrollment until no one uses the old address.~~

### 3h. Everywhere the domain is printed

- [ ] Facebook: update the event, the group and the pinned payment post.
- [ ] Reprint the paper forms, because they print the domain. Replace the save-the-date flyer if it shows the old domain.
- [ ] Rebuild the Facebook FAQ carousel (`bun social/facebook-faq/build.ts`) if it should show `reunion@pattersonfamilyreunion.com` in place of the committee Gmail.
- [ ] Update email signatures and anything the committee has already printed or posted.

## 4. Stripe (before any real money)

- [ ] Put the **live** `STRIPE_SECRET_KEY` and the **live-mode** `STRIPE_WEBHOOK_SECRET` on Railway. They are two different values. A test-mode secret with a live key makes every webhook fail. Payments then succeed, but registrations stay `pending` and no email goes out.
- [ ] Dashboard → Public details: set the business name to "Patterson Family Reunion", the support email to `reunion@pattersonfamilyreunion.com`, the phone to `(510) 809-8309`, and the website to `https://pattersonfamilyreunion.com`.
- [ ] Statement descriptor: `PATTERSON REUNION`. **Shortened descriptor: `PATTERSON`.** The code adds `* REUNION` or `* GIFT`, so the total must stay at 22 characters or fewer.
- [ ] Branding: icon `static/will_and_roxie_512.png`, logo, and brand and accent colours that match the site.
- [ ] Customer emails: turn **off** the Stripe receipts for successful payments and for refunds. The site sends its own confirmation, and two emails confuse people.
- [ ] Turn on Apple Pay and Google Pay.

## 5. Railway

- [ ] Check that `BODY_SIZE_LIMIT` is set. The default of 512K rejects most phone photos, and this fails only in production.
- [x] Set `ADDRESS_HEADER` and `XFF_DEPTH`. Without them the photo-upload rate limit treats all visitors as one IP address, so the whole family shares 40 uploads per hour. Set on 2026-10-05 to `X-Forwarded-For` and `1` (deployment `a5ffa0fe`).
- [ ] Verify them: submit `/register/recover` once, upload one photo on `/photos/contribute`, and search the deploy logs for `ADDRESS_HEADER`. Both pages must work, and the search must give no results. An error such as "absent from request" means the header name is wrong; delete both variables to undo.
- [ ] Turn on Postgres backups before real registrations exist.

## 6. Content

- [ ] In the event settings, in the program JSON, set `venue.address` to `2323 Broadway, Oakland, CA`. Confirmation emails read the venue from the database, not from the code.
- [ ] Check that the event status is `open`, and that the tiers, prices, lock date and start and end dates are correct. Check that no seed text remains, for example "TBD" or "Mountain resort".
- [ ] The venue is at 2323 Broadway and the hotel at 2455 Broadway, about one block apart. The site says "half a block" in the hotel tagline, on the register page and on the paper form. Choose the correct words.
- [ ] Check that the new phone number `(510) 809-8309` appears everywhere: the site, the emails, the paper form and the Facebook carousel.
- [x] **Find out the correct payee name for checks.** It is **Patterson Reunion Association**, the name on the PNC deposit account.
- [ ] **Ship the payee change: merge #93.** Production still says checks go to "Patterson Family Reunion" until it merges. Then check that the payment box on `/`, `/register` and `/donate`, the paper form, the confirmation email and the pinned Facebook post all say "Patterson Reunion Association".
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
- [x] Check that section 5's `ADDRESS_HEADER` and `XFF_DEPTH` are set. Without them, the recovery-email limit treats all visitors as one IP address.
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
