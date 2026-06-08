import { json, error } from '@sveltejs/kit'
import { getRegistrationStatus } from '$lib/server/registrations'
import type { RequestHandler } from './$types'

const TOKEN_COOKIE = 'reg_token'

/* Reads the management token from the reg_token cookie (set by /register/manage on first
   land). The cookie keeps the plaintext token out of polling-URL access logs. */
export const GET: RequestHandler = async ({ cookies }) => {
    const token = cookies.get(TOKEN_COOKIE)
    if (!token) {
        throw error(400, 'token required')
    }

    const result = await getRegistrationStatus(token)

    if (result === null) {
        throw error(404)
    }

    return json(result)
}
