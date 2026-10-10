import { beforeEach, describe, expect, it, vi } from 'vitest'
import { REGISTRATION_DRAFT_KEY } from './REGISTRATION_DRAFT_KEY'
import { clearRegistrationDraft } from './clearRegistrationDraft'
import { saveRegistrationDraft } from './saveRegistrationDraft'
import type { RegistrationFormData } from './schema'
import { takeRegistrationDraft } from './takeRegistrationDraft'

/* The form a registrant gets back after backing out of Stripe. Both halves sit in superforms'
   onResult and onMount, where a throw would block the Stripe redirect or break the page, so the
   failure cases matter as much as the round trip. */

const PERSON = {
    tierId: 'tier-adult',
    birthDate: undefined,
    shirtSize: 'M',
    addressLine1: '1 Main St',
    addressLine2: '',
    addressCity: 'Oakland',
    addressState: 'CA',
    addressZip: '94612',
    vegetarianMeal: 'no',
    attendedReunion2025: 'yes',
} satisfies RegistrationFormData['self']

const DRAFT: RegistrationFormData = {
    eventId: 'evt-1',
    contactFirstName: 'Alice',
    contactLastName: 'Patterson',
    contactEmail: 'alice@example.com',
    contactPhone: '',
    self: PERSON,
    members: [{ ...PERSON, name: 'Jada Patterson', tierId: 'tier-child' }],
    stayingAtHostHotel: 'undecided',
    donationCents: 3500,
}

const CURRENT = { eventId: 'evt-1', tierIds: ['tier-adult', 'tier-child'] }

function memoryStorage(): Storage {
    const items = new Map<string, string>()
    return {
        get length() {
            return items.size
        },
        clear: () => items.clear(),
        getItem: (key) => items.get(key) ?? null,
        key: (index) => [...items.keys()][index] ?? null,
        removeItem: (key) => {
            items.delete(key)
        },
        setItem: (key, value) => {
            items.set(key, value)
        },
    }
}

describe('registration draft', () => {
    let storage: Storage

    beforeEach(() => {
        storage = memoryStorage()
        vi.stubGlobal('sessionStorage', storage)
    })

    it('gives back exactly what was saved', () => {
        saveRegistrationDraft(DRAFT)

        expect(takeRegistrationDraft(CURRENT)).toEqual(DRAFT)
    })

    /* Addresses and birth dates must not outlive the one restore they were kept for. */
    it('removes the draft once read', () => {
        saveRegistrationDraft(DRAFT)
        takeRegistrationDraft(CURRENT)

        expect(storage.getItem(REGISTRATION_DRAFT_KEY)).toBeNull()
        expect(takeRegistrationDraft(CURRENT)).toBeUndefined()
    })

    /* A successful checkout lands on /register/view, which clears it. */
    it('clears the draft on request', () => {
        saveRegistrationDraft(DRAFT)
        clearRegistrationDraft()

        expect(storage.getItem(REGISTRATION_DRAFT_KEY)).toBeNull()
    })

    it('refuses a draft from a different event', () => {
        saveRegistrationDraft(DRAFT)

        expect(takeRegistrationDraft({ ...CURRENT, eventId: 'evt-2' })).toBeUndefined()
    })

    /* A tier removed or replaced since would restore a price nobody can be charged. */
    it('refuses a draft naming a tier no longer offered', () => {
        saveRegistrationDraft(DRAFT)

        expect(takeRegistrationDraft({ ...CURRENT, tierIds: ['tier-adult'] })).toBeUndefined()
    })

    it('returns nothing for a corrupt or outdated draft, and still clears it', () => {
        storage.setItem(REGISTRATION_DRAFT_KEY, '{not json')
        expect(takeRegistrationDraft(CURRENT)).toBeUndefined()

        storage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({ version: 0, data: DRAFT }))
        expect(takeRegistrationDraft(CURRENT)).toBeUndefined()
        expect(storage.getItem(REGISTRATION_DRAFT_KEY)).toBeNull()
    })

    /* Storage disabled: reading sessionStorage itself throws SecurityError. Saving must not throw,
       or superforms would turn it into an error result and cancel the redirect to Stripe. */
    it('never throws when storage is unavailable', () => {
        vi.stubGlobal('sessionStorage', undefined)
        Object.defineProperty(globalThis, 'sessionStorage', {
            configurable: true,
            get() {
                throw new DOMException('denied', 'SecurityError')
            },
        })

        expect(() => saveRegistrationDraft(DRAFT)).not.toThrow()
        expect(() => clearRegistrationDraft()).not.toThrow()
        expect(takeRegistrationDraft(CURRENT)).toBeUndefined()

        vi.unstubAllGlobals()
    })
})
