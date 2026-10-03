import { REGISTRATION_DRAFT_KEY } from './REGISTRATION_DRAFT_KEY'
import { registrationDraftSchema } from './registrationDraftSchema'
import type { RegistrationFormData } from './schema'

/* Reads and REMOVES the saved draft, returning it only if it still fits the form on screen.

   Always removes, whatever the outcome, so personal details do not linger in storage after a
   checkout that completed. Refuses a draft for a different event or naming a tier no longer offered:
   restoring a price that no longer exists would show the registrant a total they cannot be charged.
   Never throws, for the same reason as saveRegistrationDraft. */
export function takeRegistrationDraft(current: {
    eventId: string
    tierIds: string[]
}): RegistrationFormData | undefined {
    try {
        const raw = sessionStorage.getItem(REGISTRATION_DRAFT_KEY)
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY)
        if (!raw) {
            return undefined
        }

        const parsed = registrationDraftSchema.safeParse(JSON.parse(raw))
        if (!parsed.success) {
            return undefined
        }

        const draft = parsed.data.data
        const tierIds = [draft.self.tierId, ...draft.members.map((member) => member.tierId)]
        const fitsForm =
            draft.eventId === current.eventId &&
            tierIds.every((tierId) => current.tierIds.includes(tierId))
        return fitsForm ? draft : undefined
    } catch {
        return undefined
    }
}
