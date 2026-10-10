import type { RegistrationState } from '$lib/general/registration'
import { formatReunionDateTime } from '$lib/utils'

/* The settings banner's words for a registration state: what the public sees right now, named with
   the dates that decide it. Reads the STORED dates, never unsaved edits — it states what is true. */
export function registrationBanner(
    state: RegistrationState,
    opensAt: Date | string | null,
    closesAt: Date | string | null,
): { headline: string; note: string } {
    const closes = closesAt
        ? `Closes ${formatReunionDateTime(closesAt, 'short')}.`
        : 'No closing date.'

    switch (state) {
        case 'draft':
            return {
                headline: 'Not published',
                note: 'Nobody outside the admin can register or see this year. The dates below take effect once it is open.',
            }
        case 'scheduled':
            return {
                headline: `Opens ${formatReunionDateTime(opensAt ?? '', 'short')}`,
                note: `Until then the register page says when to come back. ${closes}`,
            }
        case 'open':
            return {
                headline: 'Registration open',
                note: `The public registration form is accepting parties and payments. ${closes}`,
            }
        case 'closedByDate':
            return {
                headline: 'Closed by date',
                note: `The closing date passed ${formatReunionDateTime(closesAt ?? '', 'short')}. The status still says Open; move or clear the date to reopen.`,
            }
        case 'closed':
            return {
                headline: 'Registration closed',
                note: 'Nobody new can register. Organizers can still add and change registrations.',
            }
        case 'archived':
            return {
                headline: 'Archived',
                note: 'A past reunion, kept for its numbers. Nobody can register, and its dates are read-only.',
            }
    }
}
