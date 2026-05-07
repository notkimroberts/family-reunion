import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    integer,
    jsonb,
    pgEnum,
} from 'drizzle-orm/pg-core'

export const eventStatusEnum = pgEnum('event_status', ['draft', 'open', 'closed', 'archived'])
export const registrationStatusEnum = pgEnum('registration_status', ['pending', 'paid', 'refunded'])
export const relationshipTypeEnum = pgEnum('relationship_type', [
    'parent',
    'child',
    'spouse',
    'sibling',
    'grandparent',
    'grandchild',
    'aunt_uncle',
    'niece_nephew',
    'cousin',
])

export const userProfiles = pgTable('user_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique(),
    phone: text('phone'),
    mailingAddress: jsonb('mailing_address').$type<{
        street: string
        city: string
        state: string
        zip: string
    }>(),
    profilePhotoUrl: text('profile_photo_url'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const reunionEvents = pgTable('reunion_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    year: integer('year').notNull(),
    title: text('title').notNull(),
    status: eventStatusEnum('status').notNull().default('draft'),
    venue: jsonb('venue').$type<{
        name: string
        address: string
        description: string
        imageUrl?: string
    }>(),
    menu: jsonb('menu').$type<string[]>(),
    drinks: jsonb('drinks').$type<string[]>(),
    recommendedSites:
        jsonb('recommended_sites').$type<{ name: string; description?: string; url?: string }[]>(),
    recommendedActivities:
        jsonb('recommended_activities').$type<{ name: string; description?: string }[]>(),
    schedule: jsonb('schedule').$type<{ day: string; time: string; activity: string }[]>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const pricingTiers = pgTable('pricing_tiers', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
        .notNull()
        .references(() => reunionEvents.id),
    label: text('label').notNull(),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age'),
    priceCents: integer('price_cents').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const registrations = pgTable('registrations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    eventId: uuid('event_id')
        .notNull()
        .references(() => reunionEvents.id),
    stripeSessionId: text('stripe_session_id'),
    totalAmountCents: integer('total_amount_cents').notNull(),
    status: registrationStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const partyMembers = pgTable('party_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    registrationId: uuid('registration_id')
        .notNull()
        .references(() => registrations.id),
    name: text('name').notNull(),
    birthYear: integer('birth_year').notNull(),
    birthMonth: integer('birth_month'),
    birthDay: integer('birth_day'),
    pricingTierId: uuid('pricing_tier_id')
        .notNull()
        .references(() => pricingTiers.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const familyMembers = pgTable('family_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id'),
    name: text('name').notNull(),
    birthYear: integer('birth_year'),
    birthMonth: integer('birth_month'),
    birthDay: integer('birth_day'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const relationships = pgTable('relationships', {
    id: uuid('id').primaryKey().defaultRandom(),
    fromMemberId: uuid('from_member_id')
        .notNull()
        .references(() => familyMembers.id),
    toMemberId: uuid('to_member_id')
        .notNull()
        .references(() => familyMembers.id),
    type: relationshipTypeEnum('type').notNull(),
    createdByUserId: text('created_by_user_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const photos = pgTable('photos', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
        .notNull()
        .references(() => reunionEvents.id),
    uploadedByUserId: text('uploaded_by_user_id').notNull(),
    r2Key: text('r2_key').notNull(),
    url: text('url').notNull(),
    caption: text('caption'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const storefrontConfig = pgTable('storefront_config', {
    id: uuid('id').primaryKey().defaultRandom(),
    externalShopUrl: text('external_shop_url').notNull(),
    products: jsonb('products').$type<{ name: string; imageUrl: string; description?: string }[]>(),
    isActive: boolean('is_active').notNull().default(true),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const contactSubmissions = pgTable('contact_submissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})
