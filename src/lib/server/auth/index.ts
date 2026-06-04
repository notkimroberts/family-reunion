import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, magicLink } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { getDb } from '$lib/server/db'
import * as schema from '$lib/server/db/schema'
import { userProfiles } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { sendMagicLinkEmail } from '$lib/server/email'

function createAuthInstance() {
    return betterAuth({
        baseURL: env.BETTER_AUTH_URL,
        database: drizzleAdapter(getDb(), {
            provider: 'pg',
            schema,
        }),
        plugins: [
            admin(),
            sveltekitCookies(getRequestEvent),
            magicLink({
                sendMagicLink: async ({ email, url }) => {
                    dbg.auth('sending magic link to=%s url=%s', email, url)
                    await sendMagicLinkEmail(email, url)
                },
            }),
        ],
        databaseHooks: {
            user: {
                create: {
                    after: async (user) => {
                        dbg.auth('creating user_profile for new user=%s (%s)', user.email, user.id)
                        await getDb().insert(userProfiles).values({
                            userId: user.id,
                        })
                    },
                },
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
        dbg.auth('initializing better-auth with social providers')
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
