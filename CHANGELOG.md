# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.4](https://github.com/notkimroberts/family-reunion/compare/v0.0.3...v0.0.4) (2026-06-08)

### ⚠ BREAKING CHANGES

- schema migrations 0005 + 0006 drop user_profiles,
  pricing_tiers, storefront_config, family_member_edits, contact_submissions.
  Run interactively against any environment that hasn't applied them yet.

Registration flow:

- /register is fully public — no auth, name + email + party + Stripe
- /register/manage?token=… sets HttpOnly reg_token cookie and redirects
  to a clean URL so the plaintext stops appearing in access logs/Sentry
- /register/recover emails a fresh manage URL; rotation only commits if
  the email send succeeded
- Webhook idempotent on add_member retries; orphan-payment path logs loudly

Auth:

- emailAndPassword via Better Auth; magic link removed
- scripts/createAdmin.ts bootstraps the first admin
- /admin/\* is the only auth-gated surface

Schema:

- registrations: managementToken stored as SHA-256 hash; stripeSessionId UNIQUE
- party_members: tierLabel + priceCents snapshotted at charge time;
  optional familyMemberId FK to family_members for the admin link UI
- reunion_events: pricingTiers/externalShopUrl/shopProducts/shopActive JSONB
  consolidated from dropped tables; partial unique index ensures one open event
- family_members: partial birth dates supported (year-only OK for ancestors);
  CHECK enforces month⇒year, day⇒month
- relationships: unique (from, to, type); self-edge CHECK; cascade FKs

Security/correctness fixes from code review:

- parseBirthDate rejects NaN segments (was crashing webhook tx on bad input)
- decodeSessionMetadata fails closed on missing required fields
- Stripe refunds use idempotency keys (no double-refund on retry)
- removeMember surfaces a 502 on refund failure instead of silent delete
- /family-tree/[id] attendances admin-only (was leaking PII publicly)
- EditMemberDialog wrapped in {#key} so state resets between members
- updateMemberDetails preserves fields not in the form (no silent shirtSize wipe)
- Admin tier mutations transactional with FOR UPDATE; numeric inputs validated
- MemberSelect retype no longer wipes typed input on previously-linked rows
- Webhook test now asserts totalAmount so $NaN regressions can't ship

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- feat(family-tree): zoom controls + center founding couple at top on load

Add +/- zoom buttons in the bottom-right of the chart for users unfamiliar
with drag/scroll-wheel zoom. Initial view now centers the midpoint of the
founding couple near the top of the viewport rather than fitting the entire
tree, making the starting state easier to read.

Drives d3-zoom directly via the listener family-chart installs on the SVG.
We compute the transform from the layout positions rather than chaining
family-chart's `tree_position: 'main_to_middle'` after `initial: true` —
the second updateTree's transition was being clobbered, and cardToMiddle
uses tree.data[0] which isn't necessarily the main_id node.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- feat(family-tree): widen tree section beyond layout max-width on desktop

Break out of the (app) layout's max-w-6xl container so the chart has room
to breathe on wide monitors. Capped at 100rem to avoid spanning absurdly
wide on ultrawide displays. Mobile/tablet unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- chore(family-tree): tune initial zoom and top margin

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- fix(deps): strip Apple-internal registry URLs from bun.lock

The previous bun install was run with NPM_CONFIG_REGISTRY=https://npm.apple.com
in the environment, which Bun honored over the project's bunfig.toml. Every
tarball URL was rewritten to npm.apple.com — unreachable from CI runners,
causing the "Install dependencies" step to fail with ConnectionRefused on
every package.

Empty-string URL entries fall back to the default registry (registry.npmjs.org)
configured in bunfig.toml, which is what we want in CI and on contributor
machines outside Apple's network.

To avoid this in the future, run bun install in this repo with:
NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ bun install

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- chore(hooks): block commits that introduce Apple-internal registry URLs in bun.lock

When NPM_CONFIG_REGISTRY=https://npm.apple.com is set in the shell env, Bun
honors it over the project's bunfig.toml and rewrites every tarball URL in
bun.lock to point at Apple's internal mirror. CI runners can't reach those
URLs and "Install dependencies" fails on every package. This guard catches
the staged bun.lock before commit and tells the contributor how to fix it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- fix(deps): pin bun.lock to working better-auth/kysely versions

The previous reinstall (to strip Apple registry URLs) also let bun resolve
@better-auth/kysely-adapter from 1.6.11 to 1.6.14 and kysely from 0.28.17 to
0.29.2. Adapter 1.6.14 imports DEFAULT_MIGRATION_TABLE from kysely, but
0.29.x dropped that export — the build fails with MISSING_EXPORT during
rollup bundling.

Restore bun.lock to the version on commit 14f01c8 (last known good) and
layer the d3-selection/d3-zoom additions on top with bun install. All other
package versions remain locked to what main uses.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

### Features

- add Sentry error monitoring and release tracking ([#21](https://github.com/notkimroberts/family-reunion/issues/21)) ([82d2578](https://github.com/notkimroberts/family-reunion/commit/82d2578610f4a7b35be587d4ecca2abf5083c01b))
- admin sidebar layout with event filtering and responsive redesigns ([#13](https://github.com/notkimroberts/family-reunion/issues/13)) ([57b9d28](https://github.com/notkimroberts/family-reunion/commit/57b9d2893eef829cb18c8b51b89ea3df636bbf86))
- configure Sentry source maps, code mappings, and MCP ([#23](https://github.com/notkimroberts/family-reunion/issues/23)) ([538afa5](https://github.com/notkimroberts/family-reunion/commit/538afa549fc076dbd0dd7bc15e14339ff155cec3))
- make home route public ([#3](https://github.com/notkimroberts/family-reunion/issues/3)) ([3eefa10](https://github.com/notkimroberts/family-reunion/commit/3eefa1084080961e5e5eddd735c9cafca34a703d))
- overhaul program page design ([#7](https://github.com/notkimroberts/family-reunion/issues/7)) ([47fbbcc](https://github.com/notkimroberts/family-reunion/commit/47fbbcce8656261b71f2ab654f8a0cff099e0eaf))
- overhaul registration party UI ([#8](https://github.com/notkimroberts/family-reunion/issues/8)) ([114746e](https://github.com/notkimroberts/family-reunion/commit/114746e8307f8a36354f4aaa890fec8e9f47f0af))
- overhaul seed data with faker.js and extended relationship types ([#5](https://github.com/notkimroberts/family-reunion/issues/5)) ([ac6c091](https://github.com/notkimroberts/family-reunion/commit/ac6c09171043fbfa6c2a2c70d5260e805c8ff184))
- page titles ([d41f4a7](https://github.com/notkimroberts/family-reunion/commit/d41f4a763abb6826046ad4e197776ef0c1d08c29))
- Stripe + Resend integration ([#11](https://github.com/notkimroberts/family-reunion/issues/11)) ([33c580b](https://github.com/notkimroberts/family-reunion/commit/33c580b3010c922422ba47f927f689cfeea92b1e))
- token-based registration, email+password auth, schema consolidation ([#29](https://github.com/notkimroberts/family-reunion/issues/29)) ([0aa8830](https://github.com/notkimroberts/family-reunion/commit/0aa883040030a8a1e783395313a3edcd3d517fd7))
- update login / register flow ([19ec719](https://github.com/notkimroberts/family-reunion/commit/19ec719b3cfb5de2db50b4b41eace821a45607d2))

### Bug Fixes

- better gallery ([4043708](https://github.com/notkimroberts/family-reunion/commit/40437080e8ca29b8db403e825b1e2005bf11ffce))
- db migration ([6ff381a](https://github.com/notkimroberts/family-reunion/commit/6ff381a14526dca1db5c53fa75ebfc735bdcd056))
- db refresh ([#2](https://github.com/notkimroberts/family-reunion/issues/2)) ([a8b6e04](https://github.com/notkimroberts/family-reunion/commit/a8b6e04fb3683417fa9d54708971dbdf96be1a0d))
- hide `/family-tree`, `/gallery`, `/shop` ([39d1bf2](https://github.com/notkimroberts/family-reunion/commit/39d1bf246b3598dc50e9bf7b2b0a98a63ad2c393))
- home page updates ([fa69e3c](https://github.com/notkimroberts/family-reunion/commit/fa69e3cb326b95d923dc0aa509c5f333f42868af))
- homepage update ([2b09779](https://github.com/notkimroberts/family-reunion/commit/2b0977945b24cc7a351968948c838569d8d96792))
- improve family tree ([dcf8c98](https://github.com/notkimroberts/family-reunion/commit/dcf8c981c51e99afeaa2d2f506fbaaa67a4429b2))
- improving registration ([345560c](https://github.com/notkimroberts/family-reunion/commit/345560c1cc0dcc2283d12dde6bdda44617d7844b))
- make migrations 0005 and 0006 idempotent for re-run safety ([#30](https://github.com/notkimroberts/family-reunion/issues/30)) ([b688e3f](https://github.com/notkimroberts/family-reunion/commit/b688e3fca2a9b53d22e0bccbec08f6136896a8e0))
- **migrations:** install pgcrypto and null orphan photo uploader refs ([#32](https://github.com/notkimroberts/family-reunion/issues/32)) ([32d8725](https://github.com/notkimroberts/family-reunion/commit/32d87252dbcc5f4305a00c983ec2e66523478f59))
- **migrations:** make 0005/0006 data-safe for staging deploy ([75b1a52](https://github.com/notkimroberts/family-reunion/commit/75b1a52d4204d7456fe0f66d4d23a8756f57c281))
- **migrations:** make 0005/0006 idempotent so partial applies can be retried ([037e35b](https://github.com/notkimroberts/family-reunion/commit/037e35b8b517500b92c113423e3001ab05d22068))
- **migrations:** use $$ dollar-quoting in 0005/0006 DO blocks ([#31](https://github.com/notkimroberts/family-reunion/issues/31)) ([e7e8b88](https://github.com/notkimroberts/family-reunion/commit/e7e8b88b992de1c3b12138a94108a8d50dc9dcf0))
- mobile nav ([6bc844e](https://github.com/notkimroberts/family-reunion/commit/6bc844ef8915d675b1c07cee0626f71fd9f909bd))
- more login updates ([7ed16e6](https://github.com/notkimroberts/family-reunion/commit/7ed16e6cfdfa2585d3079032a95be4cc3b302532))
- restore bun.lock to pre-merge versions to fix Railway build ([#24](https://github.com/notkimroberts/family-reunion/issues/24)) ([eb85789](https://github.com/notkimroberts/family-reunion/commit/eb857895fedb2277b4cb79a07574c4b351246a05)), closes [#23](https://github.com/notkimroberts/family-reunion/issues/23)
- **ui:** drop bind:value from Select wrapper to fix SSR TypeError ([#34](https://github.com/notkimroberts/family-reunion/issues/34)) ([0bdf113](https://github.com/notkimroberts/family-reunion/commit/0bdf11362ae0ca9f219392be207905fc0e82256b))
- updates ([60b75f0](https://github.com/notkimroberts/family-reunion/commit/60b75f0328b14d1be5aec8218758924cb3723881))

### Refactoring

- add users module, remove userProfiles schema imports from routes ([#16](https://github.com/notkimroberts/family-reunion/issues/16)) ([dd1ff8b](https://github.com/notkimroberts/family-reunion/commit/dd1ff8bf59d466d3a6835f51838ddcb1bc3cc24c))
- apply coding rules across codebase ([#25](https://github.com/notkimroberts/family-reunion/issues/25)) ([3b77bd9](https://github.com/notkimroberts/family-reunion/commit/3b77bd996b1276a638ea607fd190b4e57dd67fb0)), closes [#23](https://github.com/notkimroberts/family-reunion/issues/23)
- apply coding rules across codebase ([#26](https://github.com/notkimroberts/family-reunion/issues/26)) ([48004cc](https://github.com/notkimroberts/family-reunion/commit/48004cc5d4f18f9fe4fc0d6b9d935ac06b2580f8)), closes [#23](https://github.com/notkimroberts/family-reunion/issues/23)
- apply coding rules across codebase ([#28](https://github.com/notkimroberts/family-reunion/issues/28)) ([87aef5d](https://github.com/notkimroberts/family-reunion/commit/87aef5d17265280d4cb83ddf43967e91503d0839))
- deepen email module — centralise delivery, extract testable renderers ([#18](https://github.com/notkimroberts/family-reunion/issues/18)) ([56d59e8](https://github.com/notkimroberts/family-reunion/commit/56d59e8c69018f3c7430aab6076c2a6fbbf505b1))
- deepen registration module — routes no longer query schema directly ([#15](https://github.com/notkimroberts/family-reunion/issues/15)) ([2edc535](https://github.com/notkimroberts/family-reunion/commit/2edc53568f0a3402a639281c37e3188f911004c7))
- extract payment and registration server modules ([#12](https://github.com/notkimroberts/family-reunion/issues/12)) ([fb3232a](https://github.com/notkimroberts/family-reunion/commit/fb3232aed6b54b8812055f9672b13ee321990805))
- module restructure — lifecycle splits, one-function-per-file, bracket fixes, docs ([#20](https://github.com/notkimroberts/family-reunion/issues/20)) ([5a5e02c](https://github.com/notkimroberts/family-reunion/commit/5a5e02c4b4f4e954cadaf7bd9de9486565c02acb))
- replace SSO with magic link only auth ([#27](https://github.com/notkimroberts/family-reunion/issues/27)) ([88cf4db](https://github.com/notkimroberts/family-reunion/commit/88cf4dbad75f90b8aa0f16fe67102de118d9b235)), closes [#23](https://github.com/notkimroberts/family-reunion/issues/23)
- split register page — extract MemberFormFields, dialogs, pricing utils ([#19](https://github.com/notkimroberts/family-reunion/issues/19)) ([34ab46f](https://github.com/notkimroberts/family-reunion/commit/34ab46f263b098ee6fc9f2fc9e9d88846ef3c7db))
- type the Stripe session metadata boundary ([#17](https://github.com/notkimroberts/family-reunion/issues/17)) ([51b3794](https://github.com/notkimroberts/family-reunion/commit/51b37941c0f05f22013899e8d102bafd1c2a2509))

## [0.0.3](https://github.com/notkimroberts/family-reunion/compare/v0.0.2...v0.0.3) (2026-05-16)

### Features

- add photos ([22fa2ea](https://github.com/notkimroberts/family-reunion/commit/22fa2ea8741dae80efcb7bd369a65c33a4fc4902))
- DaisyUI to Shadcn Svelte ([f0bca42](https://github.com/notkimroberts/family-reunion/commit/f0bca4283cdcbcbb12cf74ab76d07430e151499d))
- family photo ([1e017d7](https://github.com/notkimroberts/family-reunion/commit/1e017d7087637d8ec6a4d33a81f29b4878a3dab3))
- new layout ([8b9f43a](https://github.com/notkimroberts/family-reunion/commit/8b9f43aaa2424bdd24e8bbcf3fd76481da07602c))
- ui updates ([3101fa5](https://github.com/notkimroberts/family-reunion/commit/3101fa595be599d383a1bd7f2a94aa192675ac64))

### Bug Fixes

- favicon ([67fcf70](https://github.com/notkimroberts/family-reunion/commit/67fcf70002f71147beecda3c3ed6ec2cd947435d))
- file uploads locally to `/static/uploads/` ([d494c5e](https://github.com/notkimroberts/family-reunion/commit/d494c5e027ff6cfdcde0167cb38da7ecf06fc95d))
- tailwind typography ([2e7fd43](https://github.com/notkimroberts/family-reunion/commit/2e7fd43cd836edb43fb270c1b91cc52b07f1e65f))
- udpate homepage ([609ce00](https://github.com/notkimroberts/family-reunion/commit/609ce00706dc7fccf88d5350b53c551027ab44d3))
- update db migration ([5f30e58](https://github.com/notkimroberts/family-reunion/commit/5f30e588d6446e510f597e5939daa35339bb8a72))

## 0.0.2 (2026-05-10)

### Features

- family-reunion app ([2e65d72](https://github.com/notkimroberts/family-reunion/commit/2e65d727cfbe5c961bea63abc794270578f4bda7))

### Bug Fixes

- `bun start` for deployment ([1bd4768](https://github.com/notkimroberts/family-reunion/commit/1bd4768e2f11b8b2792551961251790237b99173))
- Better Auth tables ([1efbef6](https://github.com/notkimroberts/family-reunion/commit/1efbef67b4953e6cc9e3b1f8a4e096697b1c7ece))
- create a `user_profile` after registering ([0826434](https://github.com/notkimroberts/family-reunion/commit/08264348a721825718f73fb0d8550b24b7adcc4d))
- db migration runs as railway predeploy ([0ab7d48](https://github.com/notkimroberts/family-reunion/commit/0ab7d480d38f2f72c7eec8eded70efa376166bed))
