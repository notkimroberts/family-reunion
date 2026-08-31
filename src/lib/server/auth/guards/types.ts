import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit'

export type AuthEvent = ServerLoadEvent | RequestEvent
