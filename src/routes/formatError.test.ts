import { describe, expect, it } from 'vitest'
import { formatError } from './formatError'

/* Guards the readout on the dev error page against the failure it already had twice.

   First it printed `String(error)`, which is "[object Object]" for anything that is not an Error — and
   Svelte throws plain objects for hydration mismatches, the case most likely to reach that boundary.

   The fix for that reached for `error.stack`, which is not portable. V8 (Chrome, Node) puts
   "TypeError: message" on the stack's first line; JavaScriptCore and SpiderMonkey (Safari, Firefox)
   return frames only. So on Safari the page showed a hundred lines of runtime frames and never said
   what had gone wrong. Compiled Vite line numbers make those frames close to unreadable anyway, so the
   message is very nearly the only useful part. */

/* Safari / Firefox: frames only, no message. */
const JSC_STACK = `alternate@http://localhost:5173/src/lib/components/ui/button/button.svelte:116:21
update_reaction@http://localhost:5173/node_modules/.vite/deps/runtime.js:4882:18`

/* Chrome / Node: the message is repeated as the first line. */
const V8_STACK = `TypeError: boom
    at Button (http://localhost:5173/src/lib/components/ui/button/button.svelte:116:21)
    at update_reaction (http://localhost:5173/node_modules/.vite/deps/runtime.js:4882:18)`

function errorWith(stack: string, message = 'boom'): Error {
    const error = new TypeError(message)
    error.stack = stack
    return error
}

describe('formatError', () => {
    /* THE regression. A stack with no message must still say what happened. */
    it('states the error even when the stack omits it', () => {
        const output = formatError(errorWith(JSC_STACK))

        expect(output).toContain('TypeError: boom')
        expect(output.startsWith('TypeError: boom')).toBe(true)
    })

    it('keeps the frames after the message', () => {
        const output = formatError(errorWith(JSC_STACK))

        expect(output).toContain('button.svelte:116:21')
    })

    /* V8 already repeats the message, and printing it twice reads as two errors. */
    it('does not repeat a message the stack already carries', () => {
        const output = formatError(errorWith(V8_STACK))

        expect(output.match(/TypeError: boom/g)).toHaveLength(1)
        expect(output).toContain('at Button')
    })

    /* An Error with no stack at all — some thrown values are constructed by hand. */
    it('falls back to the message alone with no stack', () => {
        const error = new TypeError('boom')
        error.stack = ''

        expect(formatError(error)).toBe('TypeError: boom')
    })

    /* A re-thrown error keeps the original in `cause`, which both stack formats drop. */
    it('names the cause when there is one', () => {
        const error = new Error('outer', { cause: new RangeError('inner') })
        error.stack = JSC_STACK

        const output = formatError(error)

        expect(output).toContain('Error: outer')
        expect(output).toContain('Caused by: RangeError: inner')
    })

    it('ignores a non-Error cause rather than printing [object Object]', () => {
        const error = new Error('outer', { cause: { code: 42 } })
        error.stack = ''

        expect(formatError(error)).toBe('Error: outer')
    })

    /* What Svelte throws for a hydration mismatch: not an Error. */
    it('renders a plain object as JSON, not [object Object]', () => {
        const output = formatError({ code: 'hydration_mismatch', detail: 'nope' })

        expect(output).not.toContain('[object Object]')
        expect(output).toContain('hydration_mismatch')
    })

    /* An error page that throws while describing an error leaves a blank screen. */
    it('survives a circular value', () => {
        const circular: Record<string, unknown> = { name: 'loop' }
        circular.self = circular

        expect(() => formatError(circular)).not.toThrow()
    })

    it.each([
        ['a string', 'just a string'],
        ['undefined', undefined],
        ['null', null],
        ['a number', 42],
    ])('survives %s', (_label, value) => {
        expect(() => formatError(value)).not.toThrow()
        expect(formatError(value)).not.toBe('[object Object]')
    })
})
