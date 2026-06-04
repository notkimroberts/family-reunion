import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'

export type AuthEvent = ServerLoadEvent | RequestEvent
