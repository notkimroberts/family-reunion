import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderCancellationEmail } from './renderCancellationEmail'
import type { CancellationEmailData, RefundRoute } from './types'

const BASE: CancellationEmailData = {
    name: 'Alice Patterson',
    eventTitle: 'Patterson Family Reunion 2027',
    partyNames: ['Alice Patterson', 'Marcus Patterson'],
    totalCents: 33018,
    refundRoute: 'stripe',
    registerUrl: 'https://example.com/register',
}

const ALL_ROUTES: RefundRoute[] = ['stripe', 'by_hand', 'nothing_paid', 'waived']

/* Routes where money is actually going back, and so where an amount must appear. */
const ROUTES_WITH_MONEY: RefundRoute[] = ['stripe', 'by_hand']

function render(overrides: Partial<CancellationEmailData> = {}) {
    return renderCancellationEmail({ ...BASE, ...overrides })
}

describe('renderCancellationEmail', () => {
    it.each(ALL_ROUTES)('produces both bodies for %s', (refundRoute) => {
        const { subject, text, html } = render({ refundRoute })
        expect(subject).toBe('Registration cancelled: Patterson Family Reunion 2027')
        expect(text.length).toBeGreaterThan(0)
        expect(html).toContain('<!doctype html>')
    })

    it.each(ALL_ROUTES)('names everyone who was cancelled, for %s', (refundRoute) => {
        const { text, html } = render({ refundRoute })
        for (const name of BASE.partyNames) {
            expect(text).toContain(name)
            expect(html).toContain(name)
        }
    })

    /* The distinction the whole template exists for. A cheque handed to an organiser cannot be
       refunded by Stripe, and telling that family their card has been refunded is a false statement
       followed by a phone call. */
    it('promises a card refund only when Stripe took the payment', () => {
        expect(render({ refundRoute: 'stripe' }).text).toContain('card you paid with')
        expect(render({ refundRoute: 'by_hand' }).text).not.toContain('card you paid with')
    })

    it('says a by-hand refund is arranged rather than automatic', () => {
        const { text } = render({ refundRoute: 'by_hand' })
        expect(text).toContain('paid the organisers directly')
        expect(text).toContain('Nothing has been refunded through this website')
    })

    it.each(ROUTES_WITH_MONEY)('states the amount for %s', (refundRoute) => {
        const { text, html } = render({ refundRoute })
        expect(text).toContain('330.18')
        expect(html).toContain('330.18')
    })

    /* "$0.00 refunded" reads as a refund that failed. Nothing was ever owed here, so no number. */
    it.each(['nothing_paid', 'waived'] as RefundRoute[])(
        'states no amount for %s',
        (refundRoute) => {
            const { text, html } = render({ refundRoute, totalCents: 0 })
            expect(text).not.toContain('Refunded')
            expect(text).not.toContain('0.00')
            expect(html).not.toContain('Refunded')
        },
    )

    it('distinguishes an unpaid cancellation from a waived one', () => {
        expect(render({ refundRoute: 'nothing_paid' }).text).toContain(
            'No payment had been received',
        )
        expect(render({ refundRoute: 'waived' }).text).toContain('place had been covered')
    })

    /* Every route must still say the registration is cancelled — that is the point of the email, and
       the money sentence must not be the only thing carrying it. */
    it.each(ALL_ROUTES)('%s says the registration is cancelled', (refundRoute) => {
        expect(render({ refundRoute }).text).toContain('has been cancelled')
        expect(render({ refundRoute }).html).toContain('Registration cancelled')
    })

    /* The management link dies with the registration, so this is the registrant's only way back. */
    it.each(ALL_ROUTES)('offers the way back for %s', (refundRoute) => {
        const { text, html } = render({ refundRoute })
        expect(text).toContain(BASE.registerUrl)
        expect(html).toContain(BASE.registerUrl)
    })

    /* Names and titles are registrant-supplied and land in HTML. */
    it('escapes registrant-supplied values', () => {
        const { html } = render({
            name: 'Alice <script>alert(1)</script>',
            partyNames: ['Bob & "Sons"'],
            eventTitle: 'Reunion <b>27</b>',
        })
        expect(html).not.toContain('<script>')
        expect(html).toContain('&lt;script&gt;')
        expect(html).toContain('Bob &amp; &quot;Sons&quot;')
        expect(html).not.toContain('<b>27</b>')
    })

    it('sets a preheader rather than letting the client sample the wordmark', () => {
        expect(render().html).toContain(
            'Patterson Family Reunion 2027 registration has been cancelled',
        )
    })

    /* A party of one is the common case for a cancellation. */
    it('handles a party of one', () => {
        const { text } = render({ partyNames: ['Alice Patterson'] })
        expect(text).toContain('Alice Patterson')
    })
})

/* The email must be sendable — the SDK rejects a missing subject or body, and a template that returns
   an empty string would only fail in production. */
describe('renderCancellationEmail output is complete', () => {
    beforeEach(() => vi.clearAllMocks())

    it.each(ALL_ROUTES)('%s fills subject, text and html', (refundRoute) => {
        const result = render({ refundRoute })
        expect(result.subject.trim()).not.toBe('')
        expect(result.text.trim()).not.toBe('')
        expect(result.html).toMatch(/<\/html>\s*$/)
    })
})
