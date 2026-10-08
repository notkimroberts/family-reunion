import type { RequestEvent } from '@sveltejs/kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logServerError } from './logServerError'

function run(error: unknown, status: number) {
    return logServerError({
        error,
        event: { url: new URL('https://example.test/contact-us') } as RequestEvent,
        status,
        message: 'message',
    })
}

describe('logServerError', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('does not print a stack for a 404', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        run(new Error('Not found: /contact-us'), 404)

        expect(consoleError).not.toHaveBeenCalled()
    })

    it('prints the stack of any other error', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        const error = new Error('boom')

        run(error, 500)

        expect(consoleError).toHaveBeenCalledWith(error.stack)
    })
})
