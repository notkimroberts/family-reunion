import { CONTACT_EMAIL } from './CONTACT_EMAIL'

/* The only Zelle address the reunion takes money at, printed in every scam warning so a payer can
   tell a real request from a fake one. It must be the address actually enrolled with Zelle: when
   APP_DOMAIN moves, CONTACT_EMAIL moves with it, so the enrollment has to move too
   (LAUNCH_CHECKLIST section 13) or the site names an address Zelle does not know. */
export const ZELLE_RECIPIENT = CONTACT_EMAIL
