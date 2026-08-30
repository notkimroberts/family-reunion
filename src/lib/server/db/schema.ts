import { sql } from 'drizzle-orm'
import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    integer,
    jsonb,
    pgEnum,
    uniqueIndex,
    index,
    check,
} from 'drizzle-orm/pg-core'

export const eventStatusEnum = pgEnum('event_status', ['draft', 'open', 'closed', 'archived'])
export const shirtSizeCategoryEnum = pgEnum('shirt_size_category', ['adult', 'child'])
export const registrationStatusEnum = pgEnum('registration_status', [
    'pending',
    'paid',
    'refunded',
    'waived',
])

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
        startDate: timestamp('start_date'),
        endDate: timestamp('end_date'),
        venue: jsonb('venue').$type<{
            name: string
            address: string
            description: string
            imageUrl?: string
        }>(),
        menu: jsonb('menu').$type<string[]>(),
        drinks: jsonb('drinks').$type<string[]>(),
        recommendedSites: jsonb('recommended_sites').$type<
            {
                name: string
                description?: string
                url?: string
            }[]
        >(),
        recommendedActivities:
            jsonb('recommended_activities').$type<{ name: string; description?: string }[]>(),
        schedule: jsonb('schedule').$type<{ day: string; time: string; activity: string }[]>(),
        registrationLockDate: timestamp('registration_lock_date'),
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
        shirtSizeCategory: shirtSizeCategoryEnum('shirt_size_category').notNull().default('adult'),
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
        /* withTimezone, unlike the other tables here — this is the only column whose time of day is
           ever shown to anyone. A plain `timestamp` is stored without an offset while holding a UTC
           instant, so postgres.js parses it as server-local and the offset is silently lost: the
           history rendered 4:06 AM for a change made at 9:06 PM Pacific. timestamptz makes the value
           an instant, so it survives the trip regardless of where the server runs. */
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('registration_audit_registration_id_idx').on(t.registrationId)],
)
