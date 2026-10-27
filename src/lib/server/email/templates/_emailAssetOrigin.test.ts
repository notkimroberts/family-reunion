import { describe, expect, it, vi } from 'vitest'

vi.mock('$lib/general/constants', () => ({ APP_DOMAIN: 'example.org' }))

const { emailAssetOrigin } = await import('./_emailAssetOrigin')

/* Images in an email sent from `bun run dev` pointed at localhost, which no mail service's image
   proxy can reach. */
describe('emailAssetOrigin', () => {
    it.each([
        'http://localhost:5173',
        'http://127.0.0.1:5174',
        'http://0.0.0.0:5173',
        'http://[::1]:5173',
    ])('loads images from the live site when the email came from %s', (origin) => {
        expect(emailAssetOrigin(origin)).toBe('https://example.org')
    })

    /* Production, a staging domain, a preview deploy: images follow the domain that sent the email. */
    it('keeps any reachable origin as it is', () => {
        expect(emailAssetOrigin('https://staging.example.net')).toBe('https://staging.example.net')
    })
})
