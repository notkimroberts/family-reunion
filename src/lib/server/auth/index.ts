import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
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
        /* No admin() plugin. It mounted /api/auth/admin/* ahead of SvelteKit routing and let any
           admin set-role, set-user-password, remove-user and update-user (email included) on any
           account — so any organizer could make themselves the owner. The app called none of them;
           the admin:* scripts are the account tools. Pinned by adminApi.test.ts. */
        plugins: [twoFactor({ issuer: REUNION_NAME }), sveltekitCookies(getRequestEvent)],
        user: {
            additionalFields: {
                /* The column the admin plugin used to declare. input: false, so /update-user cannot
                   set it — the role decides who is the owner. */
                role: { type: 'string', required: false, input: false },
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
