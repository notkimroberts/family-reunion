import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, twoFactor } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { REUNION_NAME } from '$lib/general/constants'
import { getDb } from '$lib/server/db'
import * as schema from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'

function createAuthInstance() {
    return betterAuth({
        baseURL: env.BETTER_AUTH_URL,
        database: drizzleAdapter(getDb(), {
            provider: 'pg',
            schema,
        }),
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
            /* No public sign-up. Better Auth exposes POST /api/auth/sign-up/email whenever
               email+password is enabled, and better-auth's own handler is mounted ahead of
               SvelteKit routing — so there is no route file to guard and the (app) layout
               never sees the request. Without this, anyone could create a role='user'
               account and, since the layout guard only tested for *a* session, read every
               page behind the login. Admins are created with
               `bun run admin:create`. */
            disableSignUp: true,
        },
        /* TOTP for every account. The plugin only CHALLENGES accounts that have enrolled; making
           enrollment compulsory is hooks.server.ts's job (see needsTwoFactorSetup). The login page
           never asks to trust the device: there are few admins and they sign in rarely, so a code
           every time costs little, and a stolen laptop stays a password-plus-phone problem. */
        plugins: [admin(), twoFactor({ issuer: REUNION_NAME }), sveltekitCookies(getRequestEvent)],
        /* Railway's edge sets X-Real-IP to the client. The default, X-Forwarded-For, is refused
           when it holds more than one hop, and then every client shares one rate-limit bucket —
           three sign-in attempts in 10s from anyone lock out every admin. */
        advanced: {
            ipAddress: {
                ipAddressHeaders: ['x-real-ip'],
            },
        },
        session: {
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60,
            },
        },
    })
}

let _auth: ReturnType<typeof createAuthInstance> | undefined

function getAuth() {
    if (!_auth) {
        dbg.auth('initializing better-auth with email+password')
        _auth = createAuthInstance()
    }
    return _auth
}

export const auth = {
    get api() {
        return getAuth().api
    },
    get handler() {
        return getAuth().handler
    },
    get options() {
        return getAuth().options
    },
}

export type Session = {
    id: string
    userId: string
    expiresAt: Date
    token: string
    createdAt: Date
    updatedAt: Date
}

export type SessionUser = {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    role?: string | null
    createdAt: Date
    updatedAt: Date
}
