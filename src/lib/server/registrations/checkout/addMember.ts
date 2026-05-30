import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { pricingTiers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { createAddMemberCheckout } from '$lib/server/payments'

export async function addMember(params: {
    registrationId: string
    userId: string
    name: string
    tierId: string
    birthDate?: string
    shirtSize?: string
    successUrl: string
    cancelUrl: string
}): Promise<string> {
    const [registration] = await db
        .select()
        .from(registrations)
        .where(
            and(
                eq(registrations.id, params.registrationId),
                eq(registrations.userId, params.userId),
            ),
        )
        .limit(1)
    if (!registration) {
        throw error(404)
    }

    const [tier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, params.tierId))
        .limit(1)
    if (!tier) {
        throw error(400, 'Invalid pricing tier')
    }

    dbg.register('add_member registrationId=%s name=%s', params.registrationId, params.name)

    return createAddMemberCheckout({
        name: params.name,
        tierLabel: tier.label,
        priceCents: tier.priceCents,
        registrationId: params.registrationId,
        memberTierId: params.tierId,
        memberBirthDate: params.birthDate,
        memberShirtSize: params.shirtSize,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
    })
}
