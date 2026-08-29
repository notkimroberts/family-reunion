/* Finds the running dev server and points `stripe listen` at it.

   The port was hardcoded to 5173, which is only Vite's FIRST choice — it silently increments to 5174 when
   5173 is taken, which happens every time a previous `bun run dev` is still alive or a second project is
   running. The failure was silent in the worst possible way: Stripe forwarded to a port with nothing on
   it, the CLI reported delivery failures that scroll past, and the app never saw
   `checkout.session.completed`. That means no confirmation email and a registration stuck at `pending`
   while the payer believes they have paid — the exact production failure this project already guards
   against, reproduced locally on every busy port.

   So probe instead. /api/health is the app's own liveness endpoint and touches no database, so hitting it
   is free and — unlike a bare TCP check — proves the thing on that port is THIS app rather than some other
   dev server that happened to grab the port.

   Refuses to start when nothing is found. Forwarding into the void is what this replaces. */

const DEFAULT_PORT = 5173
/* Vite increments from its base port; ten is far more than anyone runs at once. */
const PORTS_TO_PROBE = 10
const PROBE_TIMEOUT_MS = 1000
const WEBHOOK_PATH = '/api/webhooks/stripe'

async function isOurDevServer(port: number): Promise<boolean> {
    try {
        const response = await fetch(`http://localhost:${port}/api/health`, {
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        })
        if (!response.ok) {
            return false
        }
        const body = (await response.json()) as { status?: string }
        return body.status === 'ok'
    } catch {
        return false
    }
}

async function findPort(): Promise<number | undefined> {
    /* An explicit PORT wins and is not probed: it is the escape hatch for a tunnel, a container, or a
       port the probe cannot see. Trust it and let Stripe report the failure. */
    const explicit = process.env.PORT
    if (explicit) {
        return Number(explicit)
    }

    for (let offset = 0; offset < PORTS_TO_PROBE; offset++) {
        const port = DEFAULT_PORT + offset
        if (await isOurDevServer(port)) {
            return port
        }
    }
    return undefined
}

const port = await findPort()

if (port === undefined) {
    console.error(
        `No dev server answering /api/health on ports ${DEFAULT_PORT}-${DEFAULT_PORT + PORTS_TO_PROBE - 1}.\n\n` +
            'Start it first:\n' +
            '    bun run dev\n\n' +
            'Then run this again. If the server is somewhere this cannot reach — a tunnel, a container, a\n' +
            'different host — set the port explicitly:\n' +
            '    PORT=5180 bun run stripe:dev\n',
    )
    process.exit(1)
}

const target = `http://localhost:${port}${WEBHOOK_PATH}`
console.log(`Forwarding Stripe webhooks to ${target}`)

/* Everything after `--` is passed through, so `bun run stripe:dev -- --events checkout.session.completed`
   still works. */
const passthrough = process.argv.slice(2)

const stripe = Bun.spawn(['stripe', 'listen', '--forward-to', target, ...passthrough], {
    stdio: ['inherit', 'inherit', 'inherit'],
})

/* Propagate the exit code: a missing or unauthenticated Stripe CLI has to fail the command, not look
   like a clean exit. */
process.exit(await stripe.exited)
