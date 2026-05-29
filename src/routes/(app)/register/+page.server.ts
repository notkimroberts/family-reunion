import { redirect, fail, error } from '@sveltejs/kit'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import {
    reunionEvents,
    pricingTiers,
    registrations,
    partyMembers,
    userProfiles,
} from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import {
    createPendingRegistration,
    addMember,
    removeMember,
    cancelRegistration,
    deleteOwnPendingRegistrations,
    type MemberInput,
} from '$lib/server/registrations'
import type { PageServerLoad, Actions } from './$types'
import {
    registrationSchema,
    addMemberSchema,
    updateMemberSchema,
    removeMemberSchema,
    cancelRegistrationSchema,
} from './schema'

export const load: PageServerLoad = async (event) => {
    const user = requireAuth(event)

    const memberAdded = event.url.searchParams.get('member_added') === 'true'

    const openEvents = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.status, 'open'))
        .orderBy(desc(reunionEvents.year))
        .limit(1)

    const openEvent = openEvents[0] ?? null

    const tiers = openEvent
        ? await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, openEvent.id))
        : []

    if (openEvent) {
        await deleteOwnPendingRegistrations(user.id, openEvent.id)

        const [existingReg] = await db
            .select()
            .from(registrations)
            .where(
                and(
                    eq(registrations.userId, user.id),
                    eq(registrations.eventId, openEvent.id),
                    inArray(registrations.status, ['paid', 'waived']),
                ),
            )
            .limit(1)

        if (existingReg) {
            const members = await db
                .select({
                    id: partyMembers.id,
                    name: partyMembers.name,
                    birthDate: partyMembers.birthDate,
                    shirtSize: partyMembers.shirtSize,
                    pricingTierId: partyMembers.pricingTierId,
                    stripePaymentIntentId: partyMembers.stripePaymentIntentId,
                    tierLabel: pricingTiers.label,
                    priceCents: pricingTiers.priceCents,
                })
                .from(partyMembers)
                .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
                .where(eq(partyMembers.registrationId, existingReg.id))

            const form = await superValidate({ eventId: openEvent.id }, zod(registrationSchema))

            return {
                user,
                existingRegistration: existingReg,
                members,
                tiers,
                event: openEvent,
                memberAdded,
                registrationCancelled: false,
                form,
                profile: null,
            }
        }
    }

    const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)

    const [cancelledReg] = openEvent
        ? await db
              .select({ id: registrations.id })
              .from(registrations)
              .where(
                  and(
                      eq(registrations.userId, user.id),
                      eq(registrations.eventId, openEvent.id),
                      eq(registrations.status, 'refunded'),
                  ),
              )
              .limit(1)
        : []

    const form = await superValidate({ eventId: openEvent?.id ?? '' }, zod(registrationSchema))

    return {
        user,
        existingRegistration: null,
        members: [],
        tiers,
        event: openEvent,
        memberAdded: false,
        registrationCancelled: !!cancelledReg,
        form,
        profile: profile ?? null,
    }
}

export const actions: Actions = {
    register: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(registrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const {
            eventId,
            selfTierId,
            selfBirthDate,
            selfShirtSize,
            members: membersJson,
        } = form.data
        const additionalMembers: MemberInput[] = JSON.parse(membersJson)

        dbg.register(
            'user=%s eventId=%s members=%d',
            user.id,
            eventId,
            additionalMembers.length + 1,
        )

        const { checkoutUrl } = await createPendingRegistration({
            userId: user.id,
            userName: user.name,
            eventId,
            selfTierId,
            selfBirthDate: selfBirthDate || undefined,
            selfShirtSize: selfShirtSize || undefined,
            additionalMembers,
            successUrl: (id) => `${event.url.origin}/register/confirmation?registration_id=${id}`,
            cancelUrl: (id) => `${event.url.origin}/register?cancelled=true&registration_id=${id}`,
        })

        throw redirect(303, checkoutUrl)
    },

    add_member: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(addMemberSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { registrationId, name, tierId, birthDate, shirtSize } = form.data

        const checkoutUrl = await addMember({
            registrationId,
            userId: user.id,
            name,
            tierId,
            birthDate: birthDate || undefined,
            shirtSize: shirtSize || undefined,
            successUrl: `${event.url.origin}/register?member_added=true`,
            cancelUrl: `${event.url.origin}/register`,
        })

        throw redirect(303, checkoutUrl)
    },

    update_member: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(updateMemberSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        const { memberId, birthDate, shirtSize } = form.data

        const [member] = await db
            .select({
                id: partyMembers.id,
                registrationUserId: registrations.userId,
            })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            .where(eq(partyMembers.id, memberId))
            .limit(1)

        if (!member || member.registrationUserId !== user.id) {
            throw error(403)
        }

        await db
            .update(partyMembers)
            .set({
                birthDate: birthDate || null,
                shirtSize: shirtSize || null,
            })
            .where(eq(partyMembers.id, memberId))

        dbg.register('update_member memberId=%s', memberId)
        return { success: true }
    },

    remove_member: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(removeMemberSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        await removeMember(form.data.memberId, user.id)
        return { success: true }
    },

    cancel: async (event) => {
        const user = requireAuth(event)
        const form = await superValidate(event.request, zod(cancelRegistrationSchema))

        if (!form.valid) {
            return fail(400, { form })
        }

        await cancelRegistration(form.data.registrationId, user.id)
        throw redirect(303, '/register')
    },
}
