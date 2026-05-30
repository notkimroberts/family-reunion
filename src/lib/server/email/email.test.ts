import { describe, it, expect, vi } from 'vitest'
import { renderMagicLinkEmail, renderContactEmail, renderRegistrationConfirmation } from './index'

vi.mock('$env/dynamic/private', () => ({ env: {} }))
vi.mock('$lib/general/constants', () => ({ APP_NAME: 'Family Reunion', APP_DOMAIN: 'example.com' }))
vi.mock('$lib/server/debug', () => ({ dbg: { email: vi.fn() } }))

describe('renderMagicLinkEmail', () => {
    it('includes the sign-in URL in the body', () => {
        const { text } = renderMagicLinkEmail('https://example.com/auth/magic?token=abc')
        expect(text).toContain('https://example.com/auth/magic?token=abc')
    })

    it('mentions expiry in the body', () => {
        const { text } = renderMagicLinkEmail('https://example.com/link')
        expect(text).toContain('5 minutes')
    })

    it('subject references the app name', () => {
        const { subject } = renderMagicLinkEmail('https://example.com/link')
        expect(subject).toContain('Family Reunion')
    })
})

describe('renderContactEmail', () => {
    it('puts the sender name in the subject', () => {
        const { subject } = renderContactEmail(
            { name: 'Jane Doe', email: 'jane@example.com' },
            'Hello',
        )
        expect(subject).toBe('Contact Form: Jane Doe')
    })

    it('includes sender name, email, and message in the body', () => {
        const { text } = renderContactEmail(
            { name: 'Jane Doe', email: 'jane@example.com' },
            'I have a question.',
        )
        expect(text).toContain('Jane Doe')
        expect(text).toContain('jane@example.com')
        expect(text).toContain('I have a question.')
    })
})

describe('renderRegistrationConfirmation', () => {
    const data = {
        name: 'Alice',
        eventTitle: 'Roberts Family Reunion 2026',
        partyMembers: ['Alice (Adult)', 'Bob (Child, age 8)'],
        totalAmount: '$150.00',
    }

    it('subject includes the event title', () => {
        const { subject } = renderRegistrationConfirmation(data)
        expect(subject).toBe('Registration Confirmed: Roberts Family Reunion 2026')
    })

    it('body greets the registrant by name', () => {
        const { text } = renderRegistrationConfirmation(data)
        expect(text).toContain('Hi Alice,')
    })

    it('body lists all party members', () => {
        const { text } = renderRegistrationConfirmation(data)
        expect(text).toContain('Alice (Adult)')
        expect(text).toContain('Bob (Child, age 8)')
    })

    it('body includes the total amount', () => {
        const { text } = renderRegistrationConfirmation(data)
        expect(text).toContain('$150.00')
    })

    it('handles a single party member', () => {
        const { text } = renderRegistrationConfirmation({ ...data, partyMembers: ['Alice'] })
        expect(text).toContain('  - Alice')
    })
})
