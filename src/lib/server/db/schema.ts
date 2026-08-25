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
export const relationshipTypeEnum = pgEnum('relationship_type', [
    'parent',
    'child',
    'spouse',
    'sibling',
    'grandparent',
    'grandchild',
    'great_grandparent',
    'great_grandchild',
    'great_great_grandparent',
    'great_great_grandchild',
    'great_great_great_grandparent',
    'great_great_great_grandchild',
    'great_great_great_great_grandparent',
    'great_great_great_great_grandchild',
    'great_great_great_great_great_grandparent',
    'great_great_great_great_great_grandchild',
    'aunt_uncle',
    'niece_nephew',
    'cousin',
    'half_sibling',
    'step_parent',
    'step_child',
    'step_sibling',
    'in_law',
    'great_aunt_uncle',
    'great_niece_nephew',
    'second_cousin',
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

export type StorefrontProduct = { name: string; imageUrl: string; description?: string }

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
        shirtsEnabled: boolean('shirts_enabled').notNull().default(false),
        registrationLockDate: timestamp('registration_lock_date'),
        externalShopUrl: text('external_shop_url'),
        shopProducts: jsonb('shop_products').$type<StorefrontProduct[]>(),
        shopActive: boolean('shop_active').notNull().default(false),
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
        status: registrationStatusEnum('status').notNull().default('pending'),
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
        /* Optional link to the canonical family-tree node for this person. Admin-set, nullable, set null on family_member delete. */
        familyMemberId: uuid('family_member_id').references(() => familyMembers.id, {
            onDelete: 'set null',
        }),
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
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('party_members_registration_id_idx').on(t.registrationId),
        index('party_members_family_member_id_idx').on(t.familyMemberId),
        uniqueIndex('party_members_stripe_checkout_session_id_key').on(t.stripeCheckoutSessionId),
        check(
            'party_members_birth_date_prefix',
            sql`(${t.birthDay} IS NULL OR ${t.birthMonth} IS NOT NULL) AND (${t.birthMonth} IS NULL OR ${t.birthYear} IS NOT NULL)`,
        ),
    ],
)

export const familyMembers = pgTable(
    'family_members',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        birthYear: integer('birth_year'),
        birthMonth: integer('birth_month'),
        birthDay: integer('birth_day'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
        check(
            'family_members_birth_date_prefix',
            sql`(${t.birthDay} IS NULL OR ${t.birthMonth} IS NOT NULL) AND (${t.birthMonth} IS NULL OR ${t.birthYear} IS NOT NULL)`,
        ),
    ],
)

export const relationships = pgTable(
    'relationships',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        fromMemberId: uuid('from_member_id')
            .notNull()
            .references(() => familyMembers.id, { onDelete: 'cascade' }),
        toMemberId: uuid('to_member_id')
            .notNull()
            .references(() => familyMembers.id, { onDelete: 'cascade' }),
        type: relationshipTypeEnum('type').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('rel_unique').on(t.fromMemberId, t.toMemberId, t.type),
        index('relationships_to_idx').on(t.toMemberId),
        check('rel_no_self', sql`${t.fromMemberId} <> ${t.toMemberId}`),
    ],
)

export const photos = pgTable(
    'photos',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        eventId: uuid('event_id')
            .notNull()
            .references(() => reunionEvents.id),
        uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, {
            onDelete: 'set null',
        }),
        r2Key: text('r2_key').notNull(),
        url: text('url').notNull(),
        caption: text('caption'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('photos_event_id_idx').on(t.eventId)],
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
        action: registrationAuditActionEnum('action').notNull(),
        detail: jsonb('detail'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [index('registration_audit_registration_id_idx').on(t.registrationId)],
)
