import { STATEMENT_DESCRIPTOR_SUFFIXES } from '$lib/general/constants'

/* What a payer reads on Stripe's side, per kind of checkout.

   statementDescriptorSuffix is appended to the account's shortened descriptor (set in the Stripe
   Dashboard, e.g. "PATTERSON"), so the card statement reads "PATTERSON* REUNION". Stripe rejects the
   whole session if prefix + "* " + suffix exceeds 22 characters, or the suffix has no letter or
   contains < > \ ' " * — kept short so the prefix has room. A relative who does not recognise the
   charge disputes it.

   submitMessage renders under the Pay button. The registration one exists because line-item prices
   include the card fee while the register page lists it separately. */
export const checkoutBrandingValue = {
    registration: {
        statementDescriptorSuffix: STATEMENT_DESCRIPTOR_SUFFIXES.registration,
        submitMessage:
            'Prices include a card processing fee. A confirmation email follows once payment goes through.',
    },
    donation: {
        statementDescriptorSuffix: STATEMENT_DESCRIPTOR_SUFFIXES.donation,
        submitMessage: 'This gift is not tax-deductible. A receipt follows by email.',
    },
}
