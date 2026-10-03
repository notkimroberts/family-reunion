/* Renders every transactional email variant for review.
   Usage: bun run email:preview                    — writes email-previews/<name>.html and .txt
          bun run email:preview -- --send <address> — also sends each one there
          … --from-domain <domain>                  — sends from, and links to, <domain> instead

   Each sent subject starts "[Preview · <name>]", where <name> is the fixture and file name — so a
   comment about one email can name exactly which template and variant it means.

   Sending needs RESEND_API_KEY in .env (Bun loads it) and the sending domain verified in Resend.
   That is APP_DOMAIN by default, exactly as production — a preview sent from anywhere else does not
   show real deliverability. --from-domain exists for the window before a domain cutover, when
   APP_DOMAIN already names the new domain but only the old one is verified and serving:
   `--from-domain pattersonfamilyreunion27.com`. It moves From, Reply-To, the links and the header
   image onto that domain, as production does from the request origin, so every link and image
   resolves. The printed contact address (CONTACT_EMAIL) stays the production one.

   The script builds its own client because a standalone script cannot use $env/dynamic/private. */
import { mkdir } from 'node:fs/promises'
import { Resend } from 'resend'
import {
    APP_DOMAIN,
    CONTACT_EMAIL,
    EMAIL_FROM_ADDRESS,
    REUNION_NAME,
} from '../src/lib/general/constants'
import { emailPreviewFixtures } from './emailPreviewFixtures'

const OUTPUT_DIR = 'email-previews'
const SEND_FLAG = '--send'
const FROM_DOMAIN_FLAG = '--from-domain'

/* The value after a flag, or undefined when the flag is absent. */
function flagValue(flag: string): string | undefined {
    const index = process.argv.indexOf(flag)
    return index === -1 ? undefined : process.argv[index + 1]
}

/* Moves an address on APP_DOMAIN onto another domain, keeping the local part. */
function onDomain(address: string, domain: string): string {
    return address.replace(`@${APP_DOMAIN}`, `@${domain}`)
}

const fromDomain = process.argv.includes(FROM_DOMAIN_FLAG)
    ? flagValue(FROM_DOMAIN_FLAG)
    : APP_DOMAIN
if (!fromDomain) {
    console.error(`Usage: bun run email:preview -- ${FROM_DOMAIN_FLAG} <domain>`)
    process.exit(1)
}

const rendered = emailPreviewFixtures(`https://${fromDomain}`).map(({ name, render }) => ({
    name,
    ...render(),
}))

await mkdir(OUTPUT_DIR, { recursive: true })
await Promise.all(
    rendered.flatMap(({ name, html, text }) => [
        Bun.write(`${OUTPUT_DIR}/${name}.html`, html),
        Bun.write(`${OUTPUT_DIR}/${name}.txt`, text),
    ]),
)
console.log(`Wrote ${rendered.length} emails to ${OUTPUT_DIR}/`)

if (process.argv.includes(SEND_FLAG)) {
    const to = flagValue(SEND_FLAG)
    if (!to) {
        console.error(`Usage: bun run email:preview -- ${SEND_FLAG} <address>`)
        process.exit(1)
    }
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set')
        process.exit(1)
    }
    /* Reply-To moves with From: during a cutover only the old domain has inbound forwarding, so a
       reply to the new one would go nowhere. */
    const fromAddress = onDomain(EMAIL_FROM_ADDRESS, fromDomain)
    const replyTo = onDomain(CONTACT_EMAIL, fromDomain)

    /* One batch call rather than thirteen sends, which would trip Resend's rate limit. The SDK never
       rejects — it resolves with { data, error } — so error has to be checked. */
    const { error } = await new Resend(process.env.RESEND_API_KEY).batch.send(
        rendered.map(({ name, subject, text, html }) => ({
            from: `${REUNION_NAME} <${fromAddress}>`,
            replyTo,
            to,
            subject: `[Preview · ${name}] ${subject}`,
            text,
            html,
        })),
    )
    if (error) {
        console.error('Resend rejected the batch:', error)
        if (fromDomain === APP_DOMAIN) {
            console.error(
                `If ${APP_DOMAIN} is not verified in Resend yet, send from one that is: ${FROM_DOMAIN_FLAG} <domain>`,
            )
        }
        process.exit(1)
    }
    console.log(`Sent ${rendered.length} emails to ${to} from ${fromAddress}`)
}
