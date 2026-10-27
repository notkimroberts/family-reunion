import { sql } from './db'

export type BookingRow = {
    id: string
    status: string
    contactEmail: string
    stripeSessionId: string | null
    stripePaymentIntentId: string | null
    stripeFeeCents: number | null
}

export type MemberRow = {
    id: string
    name: string
    tierLabel: string
    priceCents: number
    cardFeeCents: number
    paymentDue: boolean
    settlement: string | null
    stripePaymentIntentId: string | null
}

export type GiftRow = {
    id: string
    status: string
    amountCents: number
    registrationId: string | null
    stripeSessionId: string | null
    stripePaymentIntentId: string | null
    stripeFeeCents: number | null
}

/* The only booking in the database — every scenario starts empty and makes one, unless it says so. */
export async function onlyBooking(): Promise<BookingRow> {
    const rows = await sql<BookingRow[]>`
        SELECT id, status, contact_email AS "contactEmail", stripe_session_id AS "stripeSessionId",
               stripe_payment_intent_id AS "stripePaymentIntentId", stripe_fee_cents AS "stripeFeeCents"
        FROM registrations`
    if (rows.length !== 1) {
        throw new Error(`Expected one booking, found ${rows.length}`)
    }
    return rows[0]
}

export async function membersOf(registrationId: string): Promise<MemberRow[]> {
    return sql<MemberRow[]>`
        SELECT id, name, tier_label AS "tierLabel", price_cents AS "priceCents",
               card_fee_cents AS "cardFeeCents", payment_due AS "paymentDue", settlement,
               stripe_payment_intent_id AS "stripePaymentIntentId"
        FROM party_members WHERE registration_id = ${registrationId} ORDER BY is_contact DESC, name`
}

export async function gifts(): Promise<GiftRow[]> {
    return sql<GiftRow[]>`
        SELECT id, status, amount_cents AS "amountCents", registration_id AS "registrationId",
               stripe_session_id AS "stripeSessionId",
               stripe_payment_intent_id AS "stripePaymentIntentId", stripe_fee_cents AS "stripeFeeCents"
        FROM donations ORDER BY created_at`
}
