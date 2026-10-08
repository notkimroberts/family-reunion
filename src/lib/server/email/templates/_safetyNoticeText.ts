import { ZELLE_RECIPIENT } from '$lib/general/constants'
import { paymentMethods, paymentSafetyCopyValue } from '$lib/general/scamSafety'

const copy = paymentSafetyCopyValue

/* The scam warning for the plain-text part, appended last in every template — the text-part twin of
   the block _emailLayout puts under every HTML card, in the same order as the site's card. */
export const SAFETY_NOTICE_TEXT = [
    copy.heading,
    copy.lede,
    '',
    `${copy.acceptedHeading}:`,
    ...paymentMethods(ZELLE_RECIPIENT).map(({ label, detail }) => `- ${label} ${detail}`),
    '',
    `${copy.neverHeading}:`,
    ...copy.neverAskedFor.map((item) => `- ${item}`),
    '',
    copy.verifyLine,
    copy.statementLine,
].join('\n')
