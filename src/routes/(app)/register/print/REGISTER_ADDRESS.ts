import { APP_DOMAIN } from '$lib/general/constants'

/* The online form's address as printed on the paper form: without a scheme, because a reader types
   it. Shared so page 1's box and page 2's reminder cannot name different addresses. */
export const REGISTER_ADDRESS = `${APP_DOMAIN}/register`
