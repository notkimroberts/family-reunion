import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
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
        },
        plugins: [admin(), sveltekitCookies(getRequestEvent)],
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
