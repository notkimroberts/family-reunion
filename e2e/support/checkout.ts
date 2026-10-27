import { expect, type Page } from '@playwright/test'

/* Stripe's always-succeeding test card. */
export const TEST_CARD = {
    number: '4242 4242 4242 4242',
    expiry: '12 / 34',
    cvc: '123',
    zip: '94612',
}

/* Pays on Stripe's real hosted Checkout page with the test card and waits to be sent back to the
   site. The email is prefilled from customer_email. Stripe may offer to save details with Link;
   that box is left unticked so nothing is remembered between scenarios. */
export async function payOnStripeCheckout(page: Page, name: string): Promise<void> {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 })
    await page.locator('#cardNumber').fill(TEST_CARD.number)
    await page.locator('#cardExpiry').fill(TEST_CARD.expiry)
    await page.locator('#cardCvc').fill(TEST_CARD.cvc)
    await page.locator('#billingName').fill(name)
    const postal = page.locator('#billingPostalCode')
    if (await postal.isVisible()) {
        await postal.fill(TEST_CARD.zip)
    }
    const saveWithLink = page.locator('#enableStripePass')
    if ((await saveWithLink.count()) > 0 && (await saveWithLink.isChecked())) {
        await saveWithLink.uncheck()
    }
    await page.getByTestId('hosted-payment-submit-button').click()
    await page.waitForURL((url) => !url.hostname.includes('stripe.com'), { timeout: 90_000 })
}

/* Backs out of Stripe's page with its own back link, as a registrant changing their mind would. */
export async function cancelOnStripeCheckout(page: Page): Promise<void> {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 })
    await page.getByTestId('business-link').click()
    await page.waitForURL((url) => !url.hostname.includes('stripe.com'), { timeout: 60_000 })
    await expect(page).toHaveURL(/\/register\?cancelled=true|\/register$/)
}
