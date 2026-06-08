import { describe, it, expect, vi } from 'vitest'
import { renderRecoveryEmail, renderContactEmail, renderRegistrationConfirmation } from './index'

vi.mock('$env/dynamic/private', () => ({ env: {} }))
vi.mock('$lib/general/constants', () => ({ APP_NAME: 'Family Reunion', APP_DOMAIN: 'example.com' }))
vi.mock('$lib/server/debug', () => ({ dbg: { email: vi.fn() } }))

describe('renderRecoveryEmail', () => {
    it('includes the management URL in the body', () => {
        const { text } = renderRecoveryEmail({
            eventTitle: 'Family Reunion 2026',
            manageUrl: 'https://example.com/register/manage?token=abc',
        })
        expect(text).toContain('https://example.com/register/manage?token=abc')
    })

    it('subject references the event', () => {
        const { subject } = renderRecoveryEmail({
            eventTitle: 'Family Reunion 2026',
            manageUrl: 'https://example.com/link',
        })
        expect(subject).toContain('Family Reunion 2026')
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
        manageUrl: 'https://example.com/register/manage?token=tok',
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

    it('body includes the total amount and manage URL', () => {
        const { text } = renderRegistrationConfirmation(data)
        expect(text).toContain('$150.00')
        expect(text).toContain('https://example.com/register/manage?token=tok')
    })

    it('handles a single party member', () => {
        const { text } = renderRegistrationConfirmation({ ...data, partyMembers: ['Alice'] })
        expect(text).toContain('  - Alice')
    })
})
