/* The dev-only readout on the root error boundary, in two parts: what went wrong, then where.

   THE MESSAGE IS BUILT SEPARATELY FROM THE STACK, and that is the whole point. `error.stack` is not
   portable: V8 (Chrome, Node) puts "TypeError: message" on its first line, while JavaScriptCore and
   SpiderMonkey (Safari, Firefox) return frames ONLY. Returning `error.stack` alone therefore printed a
   hundred lines of `update_effect@…/runtime.js:4982` on Safari with no statement of what had actually
   happened — worse than the "[object Object]" it replaced, because it looked like information.

   Compiled frames make it worse: those line numbers are Vite's transformed modules, not source. A trace
   pointing at button.svelte:116 in an 86-line file cannot be read at all, so the message is not merely
   the useful half — it is very nearly the only useful part.

   The stack is still appended, deduplicated where V8 has already included the message. `cause` is
   surfaced because both stack formats drop it. String() is the last resort, and the JSON branch is
   wrapped because a circular reference makes JSON.stringify throw — an error page that throws while
   describing an error leaves a blank screen.

   Its own module rather than a function in +layout.svelte so it can be tested: this has now been wrong
   twice, in opposite directions. */
export function formatError(error: unknown): string {
    if (!(error instanceof Error)) {
        try {
            return JSON.stringify(error, undefined, 2) ?? String(error)
        } catch {
            return String(error)
        }
    }

    const headline = `${error.name}: ${error.message}`
    const stack = error.stack ?? ''
    /* V8 repeats the headline as the stack's first line; JavaScriptCore does not. */
    const frames = stack.startsWith(error.name) ? stack.slice(stack.indexOf('\n') + 1) : stack

    const cause =
        error.cause instanceof Error
            ? `\n\nCaused by: ${error.cause.name}: ${error.cause.message}`
            : ''

    return frames.trim() ? `${headline}${cause}\n\n${frames}` : `${headline}${cause}`
}
