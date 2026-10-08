import type { RequestEvent } from '@sveltejs/kit'
import { describe, expect, it } from 'vitest'
import { securityHeaders } from './securityHeaders'

function run(response: Response) {
    return securityHeaders({
        event: {} as RequestEvent,
        resolve: async () => response,
    })
}

describe('securityHeaders', () => {
    it('forbids framing and sets the transport and content headers', async () => {
        const response = await run(new Response('ok'))

        expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'")
        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
        expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000')
    })

    /* The photo proxy sets its own caching headers; adding ours must not replace them. */
    it('keeps the headers a route already set', async () => {
        const response = await run(
            new Response('bytes', { headers: { 'Cache-Control': 'private, max-age=300' } }),
        )

        expect(response.headers.get('Cache-Control')).toBe('private, max-age=300')
    })
})
