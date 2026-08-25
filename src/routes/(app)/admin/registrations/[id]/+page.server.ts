import { error, fail } from '@sveltejs/kit'
import { zod4 as zod } from 'sveltekit-superforms/adapters'
import { superValidate } from 'sveltekit-superforms/server'
import { requireAdmin } from '$lib/server/auth/guards'
import { dbg } from '$lib/server/debug'
import {
    addAdminMember,
    getRegistrationMembers,
    getRegistrationWithEvent,
    reissueManagementLink,
    setRegistrationStatus,
} from '$lib/server/registrations'
import { reportError } from '$lib/server/reportError'
import { getTiersForEvent } from '$lib/server/tiers'
import { parseYesNo } from '$lib/utils'
import type { PageServerLoad, Actions } from './$types'
import { adminAddMemberSchema, adminSetStatusSchema } from './schema'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const found = await getRegistrationWithEvent(event.params.id)
    if (!found) {
        throw error(404, 'Registration not found')
    }

    const members = await getRegistrationMembers(event.params.id)
    const tiers = await getTiersForEvent(found.registration.eventId)

    return {
        registration: found.registration,
        event: found.event,
        members,
        tiers,
        /* Sum of the price snapshots, so a later tier reprice never rewrites this total. */
        totalCents: members.reduce((sum, member) => sum + member.priceCents, 0),
    }
}

export const actions: Actions = {
    /* Adds a member offline. Deliberately does NOT go through checkout/addMember, which always
       opens a Stripe session — see addAdminMember for why. */
    add_member: async (event) => {
        requireAdmin(event)

        const form = await superValidate(event.request, zod(adminAddMemberSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        const { name, tierId, birthDate, shirtSize, ...address } = form.data

        const { memberId } = await addAdminMember({
            registrationId: event.params.id,
            member: {
                name,
                tierId,
                birthDate: birthDate || undefined,
                shirtSize: shirtSize || undefined,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2,
                addressCity: address.addressCity,
                addressState: address.addressState,
                addressZip: address.addressZip,
                vegetarianMeal: parseYesNo(address.vegetarianMeal),
                attendedReunion2025: parseYesNo(address.attendedReunion2025),
            },
        })

        dbg.register('admin added member %s to registration %s', memberId, event.params.id)
        return { form, memberAdded: true }
    },

    set_status: async (event) => {
        requireAdmin(event)

        const form = await superValidate(event.request, zod(adminSetStatusSchema))
        if (!form.valid) {
            return fail(400, { form })
        }

        await setRegistrationStatus({
            registrationId: event.params.id,
            status: form.data.status,
        })

        return { statusChanged: true, newStatus: form.data.status }
    },

    /* Rotates the token and emails a fresh link. The previous link stops working — unavoidable,
       since only the hash is stored, so nobody including an admin can resend the original. */
    reissue_link: async (event) => {
        requireAdmin(event)

        try {
            await reissueManagementLink({
                registrationId: event.params.id,
                manageUrl: (token) => `${event.url.origin}/register/manage?token=${token}`,
            })
        } catch (err) {
            /* The send failed, so nothing was rotated and the old link still works. Say so
               explicitly: an admin who thinks they have re-issued a link and has not is worse off
               than one who knows it failed. */
            reportError('admin re-issue management link failed', err, {
                registrationId: event.params.id,
            })
            return fail(502, {
                reissueError:
                    err instanceof Error
                        ? `${err.message} — their existing link still works.`
                        : 'Sending failed; their existing link still works.',
            })
        }

        return { linkReissued: true }
    },
}
