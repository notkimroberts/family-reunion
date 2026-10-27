import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { request } from '@playwright/test'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_BASE_URL, E2E_STATE_DIR } from './support/env'
import { totp } from './support/totp'

export const ADMIN_STORAGE_STATE = join(E2E_STATE_DIR, 'admin.json')

/* Enrolls the e2e organizer in 2FA through the running server's own endpoints, exactly as
   /login/setup-2fa does, and saves the signed-in browser state for the admin scenarios. The runner
   recreated the account before the server started, so this always starts from "not enrolled".

   Better Auth checks the Origin of every POST, hence the header. */
export default async function globalSetup(): Promise<void> {
    const api = await request.newContext({
        baseURL: E2E_BASE_URL,
        extraHTTPHeaders: { origin: E2E_BASE_URL },
    })

    const signIn = await api.post('/api/auth/sign-in/email', {
        data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD },
    })
    if (!signIn.ok()) {
        throw new Error(`Admin sign-in failed: ${signIn.status()} ${await signIn.text()}`)
    }

    const enable = await api.post('/api/auth/two-factor/enable', {
        data: { password: E2E_ADMIN_PASSWORD },
    })
    if (!enable.ok()) {
        throw new Error(`2FA enable failed: ${enable.status()} ${await enable.text()}`)
    }
    const { totpURI } = (await enable.json()) as { totpURI: string }
    const secret = new URL(totpURI).searchParams.get('secret') ?? ''

    const verify = await api.post('/api/auth/two-factor/verify-totp', {
        data: { code: totp(secret) },
    })
    if (!verify.ok()) {
        throw new Error(`2FA enrollment failed: ${verify.status()} ${await verify.text()}`)
    }

    await mkdir(E2E_STATE_DIR, { recursive: true })
    await api.storageState({ path: ADMIN_STORAGE_STATE })
    await writeFile(join(E2E_STATE_DIR, 'totp.json'), JSON.stringify({ secret }))
    await api.dispose()
}
