import {
    APP_DOMAIN,
    STATEMENT_DESCRIPTOR_PREFIX,
    STATEMENT_DESCRIPTOR_SUFFIXES,
} from '$lib/general/constants'

const statementNames = Object.values(STATEMENT_DESCRIPTOR_SUFFIXES).map(
    (suffix) => `${STATEMENT_DESCRIPTOR_PREFIX}* ${suffix}`,
)

/* The scam warning's words, shared by the site card and every email so a reader meets one rule set
   wherever they look. Short phrases on purpose: the readers this exists for are the ones a fake
   "organizer" message is aimed at. */
export const paymentSafetyCopyValue = {
    heading: 'Protect yourself from scams',
    lede: 'Scammers sometimes pretend to be reunion organizers. These rules always apply.',
    acceptedHeading: 'We only take payment by',
    neverHeading: 'We never ask for',
    neverAskedFor: [
        'Gift cards',
        'Cash App, Venmo or PayPal',
        'Wire transfers or cryptocurrency',
        'A check made out to a person',
        'Your card or bank details by phone, text or email',
    ],
    statementLine: `Card payments show on your statement as ${statementNames.join(' or ')}.`,
    verifyLine: `Not sure a message is from us? Type ${APP_DOMAIN} into your browser yourself and use Get in Touch. Do not use a phone number or link from the message.`,
}
