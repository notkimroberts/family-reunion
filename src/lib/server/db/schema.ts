import { sql } from 'drizzle-orm'
import {
    boolean,
    check,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core'
import { HOTEL_STAY_ANSWERS } from '$lib/general/constants'
import type { ReunionMetadata } from '$lib/general/reunionMetadata'

export const eventStatusEnum = pgEnum('event_status', ['draft', 'open', 'closed', 'archived'])
export const registrationStatusEnum = pgEnum('registration_status', [
    'pending',
    'paid',
    'refunded',
    'waived',
])

/* Values from HOTEL_STAY_ANSWERS, so the column, the form's zod schema and the admin summary cannot
   drift apart. See that constant for why there are three and not two. */
export const hotelStayEnum = pgEnum('hotel_stay', HOTEL_STAY_ANSWERS)

/* Better Auth tables */
export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    role: text('role'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
})

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
})

export const account = pgTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/* Application tables */

export const reunionEvents = pgTable(
    'reunion_events',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        year: integer('year').notNull(),
        title: text('title').notNull(),
        status: eventStatusEnum('status').notNull().default('draft'),
        /* withTimezone, like registration_audit.created_at, because the time of day is shown to people
           and must survive the server's zone.

           As plain `timestamp` these held an instant only by coincidence: postgres.js writes a Date as
           its UTC digits and parses the naive value back with `new Date(...)`, which reads it in the
           PROCESS's zone — exact on Railway, hours out on a developer's laptop. Any NEW column whose
           time of day is displayed wants withTimezone for the same reason. Still outstanding on
           registrations.paid_at, which the admin list renders. */
        startDate: timestamp('start_date', { withTimezone: true }),
        endDate: timestamp('end_date', { withTimezone: true }),
        /* Everything /program displays: venue, menu, drinks, sites, activities, schedule.

           This was six jsonb columns. None of them was ever a predicate — nothing filtered, ordered,
           joined or indexed on any — so they cost a migration per shape change and bought nothing.
           Every column that remains on this table IS read as a predicate: status carries the
           one_open_event index, year is the ordering, the dates drive the countdown and the lock.

           NOT NULL DEFAULT '{}' so readers write `event.metadata.venue?.name`, never
           `event.metadata?.venue?.name`. The shape lives in $lib/general/reunionMetadata and the
           settings editor validates against it before writing — that is the only writer. */
        metadata: jsonb('metadata').$type<ReunionMetadata>().notNull().default({}),
        registrationLockDate: timestamp('registration_lock_date', { withTimezone: true }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('one_open_event')
            .on(t.status)
            .where(sql`${t.status} = 'open'`),
    ],
)

export const tiers = pgTable(
    'tiers',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        eventId: uuid('event_id')
            .notNull()
            .references(() => reunionEvents.id, { onDelete: 'cascade' }),
        label: text('label').notNull(),
        priceCents: integer('price_cents').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('tiers_event_id_idx').on(t.eventId)],
)

export const registrations = pgTable(
    'registrations',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        managementToken: text('management_token').notNull().unique(),
        /* The previous token's hash, kept briefly after a rotation.

           Rotation is unavoidable whenever a link has to be re-sent — only the hash is stored, so
           the original plaintext cannot be recovered by anyone. But rotating alone would invalidate
           every link already in the registrant's inbox AND log out an open manage session, because
           the plaintext lives in their reg_token cookie. Honouring the previous hash for a short
           window means an organiser can edit a registration without silently breaking the
           registrant's access. */
        previousManagementToken: text('previous_management_token').unique(),
        previousTokenExpiresAt: timestamp('previous_token_expires_at'),
        contactName: text('contact_name').notNull(),
        contactEmail: text('contact_email').notNull(),
        contactPhone: text('contact_phone'),
        /* Whether this party plans to stay at the host hotel, for the room block.

           A booking-level answer, not a per-attendee one: a household books rooms together, so this
           belongs beside contactEmail rather than on party_members — see ADR 0008.

           NULL means NEVER ASKED, and is distinct from 'undecided', which means asked and genuinely
           unsure. Every registration taken before the question existed is NULL, and the admin room
           count must not read those as maybes. */
        stayingAtHostHotel: hotelStayEnum('staying_at_host_hotel'),
        eventId: uuid('event_id')
            .notNull()
            .references(() => reunionEvents.id),
        stripeSessionId: text('stripe_session_id').unique(),
        /* The Stripe PaymentIntent for the original checkout, at registration level.

           party_members carries its own copy, but that one is per-member and documented as unreliable —
           null for a cheque payer AND for an abandoned checkout, with removeMember falling back to
           retrieving it from the session. This is the id the admin list links to the Stripe dashboard
           with, so it needs to be the registration's own. */
        stripePaymentIntentId: text('stripe_payment_intent_id'),
        /* What Stripe actually took in fees, in cents, ACCUMULATED across every charge on this
           registration.

           Accumulated because the unit is the charge, not the registration: the initial checkout is one
           PaymentIntent and every add_member is another, each paying 2.9% + 30¢ again.
           stripe_payment_intent_id only ever holds the first, so the total cannot be recovered from it
           afterwards — it has to be added up as the webhooks arrive.

           NULL means not known: every row that predates this column, and any charge whose balance
           transaction could not be read. The admin panel falls back to the 2.9% + 30¢ estimate for
           those and says it is estimating. Zero is a real answer and means a charge with no fee.

           This is also the amount LOST when a registration is refunded — Stripe does not return the
           processing fee, so the refund's own balance transaction has fee 0 and this figure is simply
           gone. No second column is needed to report that. */
        stripeFeeCents: integer('stripe_fee_cents'),
        status: registrationStatusEnum('status').notNull().default('pending'),
        /* When the money actually arrived, as distinct from updatedAt.

           updatedAt cannot answer this: any later edit — a corrected email, a shirt size — bumps it, so
           it drifts away from the payment date the moment anyone touches the row. Stripe fulfilment also
           writes no audit row, so before this column there was no record of when an online payment
           landed.

           NULL for every registration paid before this column existed, and for anything not paid. The
           admin list shows the date when it has one and says nothing when it does not, rather than
           printing updatedAt and calling it a payment date. */
        paidAt: timestamp('paid_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        index('registrations_contact_email_idx').on(t.contactEmail),
        index('registrations_event_id_idx').on(t.eventId),
    ],
)

export const partyMembers = pgTable(
    'party_members',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        registrationId: uuid('registration_id')
            .notNull()
            .references(() => registrations.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        birthYear: integer('birth_year'),
        birthMonth: integer('birth_month'),
        birthDay: integer('birth_day'),
        shirtSize: text('shirt_size'),
        addressLine1: text('address_line1'),
        addressLine2: text('address_line2'),
        addressCity: text('address_city'),
        addressState: text('address_state'),
        addressZip: text('address_zip'),
        vegetarianMeal: boolean('vegetarian_meal'),
        attendedReunion2025: boolean('attended_reunion_2025'),
        tierLabel: text('tier_label').notNull(),
        priceCents: integer('price_cents').notNull(),
        stripePaymentIntentId: text('stripe_payment_intent_id'),
        /* Idempotency key for add_member inserts. One Stripe Checkout session per added
           member, stable across webhook redeliveries, so a UNIQUE index on it lets the
           database reject a duplicate insert atomically instead of relying on a
           read-then-insert that two concurrent deliveries can both pass.

           NULL for every member created by the registration branch; Postgres treats NULLs as
           distinct, so those rows never collide with each other.

           Deliberately NOT keyed on (registration_id, stripe_payment_intent_id, name): the
           registration branch backfills a single payment intent onto every member of a
           registration, so a party containing two people with the same name (Jr/Sr) would
           violate that index on the backfill UPDATE and take the webhook down with it. */
        stripeCheckoutSessionId: text('stripe_checkout_session_id'),
        /* Marks the attendee row belonging to the registration's contact.

           The contact is always an attendee — the public form makes them pick their own tier — so the
           same person exists as registrations.contactName AND as a party_members row. Nothing linked
           the two, so both were independently editable and they drifted in practice.

           registrations keeps the contact's identity, alongside contactEmail and contactPhone, which
           are booking-level data nobody would derive from an attendee. This flag says which attendee
           is that person, so their name has one editable field and one writer rather than two copies
           quietly disagreeing. See updateRegistrationContact. */
        isContact: boolean('is_contact').notNull().default(false),
        /* When this attendee arrived at the reunion, recorded from the door by an organiser.

           A TIMESTAMP, not a boolean: "who was here by 11am" and "who arrived after the food ran
           out" are answerable from an instant and unrecoverable from a flag. NULL means not arrived,
           and the check-in tick toggles between the two so a mis-tapped name is as cheap to correct
           as it was to make.

           timestamptz, unlike registrations.paid_at, which is still naive and has the latent bug this
           avoids: Railway runs UTC and the reunion is Pacific, so a naive column stores a wall clock
           nobody can place afterwards. Display goes through formatReunionDateTime. */
        checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
        /* Which admin recorded the arrival. No FK to `user`: the attendee row must outlive the
           account, and this answers "who ticked my aunt in when she never came" without one. */
        checkedInBy: text('checked_in_by'),
        /* When this attendee was handed their shirt, also from the door.

           A SEPARATE fact from arriving, not a detail of it. The two come apart in both directions on
           the day: shirts run out or a box is late, so somebody arrives with no shirt to give them; and
           a size that was never recorded is a person who is here and has to be caught later. Folding it
           into checkedInAt would make "who still needs a shirt" unanswerable, which is the whole reason
           to record it.

           No `_by` column, unlike the arrival. Attendance is checked against catering and gets argued
           about; nobody is ever going to ask which greeter handed over a t-shirt. */
        shirtGivenAt: timestamp('shirt_given_at', { withTimezone: true }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('party_members_registration_id_idx').on(t.registrationId),
        /* At most one contact per registration, enforced rather than assumed — two flagged rows would
           make "the contact's name" ambiguous again, which is the whole problem. */
        uniqueIndex('party_members_one_contact_per_registration')
            .on(t.registrationId)
            .where(sql`${t.isContact}`),
        uniqueIndex('party_members_stripe_checkout_session_id_key').on(t.stripeCheckoutSessionId),
        check(
            'party_members_birth_date_prefix',
            sql`(${t.birthDay} IS NULL OR ${t.birthMonth} IS NOT NULL) AND (${t.birthMonth} IS NULL OR ${t.birthYear} IS NOT NULL)`,
        ),
    ],
)

export const donationStatusEnum = pgEnum('donation_status', ['pending', 'paid', 'refunded'])

/* Gifts to the reunion, from both places one can be given: added to a registration checkout, or
   made on its own at /donate.

   ONE TABLE for both, so "what did the reunion take in gifts" has a single answer. A gift given
   during registration is still a gift — folding it into registrations.total would mix money that
   buys a chair with money that does not, and the two are reported separately on purpose.

   Amounts here are NOT grossed up, unlike tier prices. A tier price is what the reunion must net,
   so the payer is charged more; a gift is whatever the donor chose to give, and charging $51.75
   for a $50 gift reads as a mistake. The fee comes off it, and the admin panel says so. */
export const donations = pgTable(
    'donations',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        /* Nullable: nothing stops a gift arriving while no reunion is open. */
        eventId: uuid('event_id').references(() => reunionEvents.id),
        /* Set only for a gift added during registration. On delete set null rather than cascade —
           the money reached the bank and must stay reported even if the booking is removed. */
        registrationId: uuid('registration_id').references(() => registrations.id, {
            onDelete: 'set null',
        }),
        donorName: text('donor_name').notNull(),
        donorEmail: text('donor_email').notNull(),
        message: text('message'),
        amountCents: integer('amount_cents').notNull(),
        /* What Stripe actually took, from the charge's balance transaction.

           NULL means not known — and for a gift made DURING registration it means the fee is
           accounted on the registration instead: both line items share one charge and therefore one
           balance transaction, so counting it here as well would double-count it. */
        stripeFeeCents: integer('stripe_fee_cents'),
        stripeSessionId: text('stripe_session_id').unique(),
        stripePaymentIntentId: text('stripe_payment_intent_id'),
        status: donationStatusEnum('status').notNull().default('pending'),
        /* withTimezone, like the reunion_events datetimes: this date is shown to an organiser, so it
           has to survive the server's zone. */
        paidAt: timestamp('paid_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        index('donations_event_id_idx').on(t.eventId),
        index('donations_status_idx').on(t.status),
    ],
)

export const registrationAuditActionEnum = pgEnum('registration_audit_action', [
    'status_changed',
    'member_added',
    'member_updated',
    'member_removed',
    'contact_updated',
    'link_reissued',
])

/* Append-only record of admin changes to someone else's registration.

   registrations.updated_at was the only trace, so with several organisers sharing the admin panel
   "who marked this paid?" and "who removed that person?" had no answer. These changes involve money
   and other people's places, which is exactly what wants a history.

   actor_user_id is set null rather than cascade on user delete: removing an organiser's account must
   not erase the record that a change happened. detail carries the shape of that action — a status
   change stores { from, to }, a member change stores the name and what altered. */
export const registrationAudit = pgTable(
    'registration_audit',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        registrationId: uuid('registration_id')
            .notNull()
            .references(() => registrations.id, { onDelete: 'cascade' }),
        actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
        /* Snapshot of who acted, kept alongside the FK rather than relying on it.

           Two reasons. On delete set null erases the actor when an organiser's account is removed,
           which defeats the purpose of a history. And in dev there is no session, so hooks.server.ts
           substitutes a user id that has no row — the FK rejected it and the whole audit write was
           lost silently. A name that is only ever read back needs no referential integrity. */
        actorName: text('actor_name'),
        action: registrationAuditActionEnum('action').notNull(),
        detail: jsonb('detail'),
        /* withTimezone, like the reunion_events datetimes — this is a column whose time of day is
           ever shown to anyone. A plain `timestamp` is stored without an offset while holding a UTC
           instant, so postgres.js parses it as server-local and the offset is silently lost: the
           history rendered 4:06 AM for a change made at 9:06 PM Pacific. timestamptz makes the value
           an instant, so it survives the trip regardless of where the server runs. */
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('registration_audit_registration_id_idx').on(t.registrationId)],
)

export const photoStatusEnum = pgEnum('photo_status', ['pending', 'approved', 'rejected'])

/* Contributed images in the family gallery. See ADR 0009, which amends ADR 0005 — this table and
   the storage layer beneath it were deleted three days before they were reinstated, so the reasons
   are worth having to hand.

   NOTHING HERE IS PUBLIC UNTIL status = 'approved'. Upload carries no credential at all, so the
   moderation gate is the whole of the protection: it is the only thing between a stranger and the
   family's website. Every public read filters on the status, and the byte proxy re-checks it rather
   than trusting the caller to have come from a filtered list.

   No uploader identity. There is no link to a party member, a registrant or a user, and none is
   wanted: an anonymous endpoint cannot honestly claim to know who posted. contributorName is a
   free-text courtesy field, untrusted like any other, and is escaped on render.

   The keys are the ONLY pointers to the objects in the bucket, exactly as photos.r2_key was before
   ADR 0005 dropped it and orphaned a bucket. Delete the row and the objects go with it, in that
   order, or the same thing happens again. */
export const photos = pgTable(
    'photos',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        /* Nullable, mirroring donations.event_id and for the same shape of reason: the 290 recovered
           archive photos predate every row in reunion_events, and a photo contributed between
           reunions is recorded rather than refused. */
        eventId: uuid('event_id').references(() => reunionEvents.id, { onDelete: 'set null' }),
        status: photoStatusEnum('status').notNull().default('pending'),
        /* Bucket keys for the two renditions. The upload itself is never stored. */
        displayKey: text('display_key').notNull(),
        thumbKey: text('thumb_key').notNull(),
        /* Dimensions of the display rendition, so the grid can reserve space and not reflow as
           images arrive. */
        width: integer('width').notNull(),
        height: integer('height').notNull(),
        caption: text('caption'),
        contributorName: text('contributor_name'),
        /* Where a photo came from, for imports only — 'archive:<filepicker-handle>' for the 290
           recovered from the family's previous website. Unique, so re-running the importer skips
           what it already brought in and a batch that dies half way can simply be re-run. NULL for
           everything contributed through the site, which has no external identity to record. */
        sourceKey: text('source_key').unique(),
        /* When the photograph was taken, where it is known — lets the archive be browsed by year
           without inventing a reunion_events row for 2014. */
        takenYear: integer('taken_year'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('photos_status_idx').on(t.status), index('photos_event_id_idx').on(t.eventId)],
)
