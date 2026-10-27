import { expect, type Browser, type Locator, type Page } from '@playwright/test'
import { ADMIN_STORAGE_STATE } from '../globalSetup'
import { fillParty, type Guest, type Party } from './register'

/* A browser signed in as the e2e organizer (2FA done in globalSetup), separate from the
   registrant's, as two different people would be. */
export async function adminPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({ storageState: ADMIN_STORAGE_STATE })
    return context.newPage()
}

export async function openBooking(page: Page, eventId: string, registrationId: string) {
    await page.goto(`/admin/event/${eventId}/registrations/${registrationId}`)
    await expect(page.getByRole('button', { name: 'Edit registration' })).toBeVisible()
}

/* Edit registration → Add another person → Save changes: the organizer adding someone to an
   existing booking. */
export async function addPersonAsAdmin(page: Page, guest: Guest): Promise<void> {
    await page.getByRole('button', { name: 'Edit registration' }).click()
    await page.getByRole('button', { name: 'Add another person' }).click()
    await page.locator('#new-first').fill(guest.first)
    await page.locator('#new-last').fill(guest.last)
    await page.locator('#new-tier').selectOption({ label: guest.tier })
    await page.locator('#new-shirt').selectOption(guest.shirt)
    await page
        .locator('[data-slot="card"]', { has: page.locator('#new-first') })
        .getByRole('button', { name: 'Save', exact: true })
        .click()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('button', { name: 'Edit registration' })).toBeVisible()
}

/* The amber Payment due menu on one person's row → a settlement → confirm. */
export async function settleOwedPlace(
    page: Page,
    how: 'Paid by Zelle or check' | 'Cover their place',
): Promise<void> {
    await page.getByRole('button', { name: 'Payment due' }).first().click()
    await page.getByRole('menuitem', { name: how }).click()
    await page
        .getByRole('alertdialog')
        .getByRole('button', { name: how === 'Cover their place' ? 'Cover place' : 'Mark paid' })
        .click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
}

export async function cancelBookingAsAdmin(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Cancel registration' }).first().click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel registration' }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden({ timeout: 60_000 })
}

/* Admin paper entry, as an organizer types in a mailed-in form, with the payment status chosen. */
export async function enterPaperRegistration(
    page: Page,
    eventId: string,
    party: Party,
    status: 'paid' | 'pending' | 'waived',
): Promise<void> {
    await page.goto(`/admin/event/${eventId}/registrations/new`)
    await fillParty(page, party, 'card')
    await page.locator('#orderStatus').selectOption(status)
    await page.getByRole('button', { name: 'Add Registration' }).click()
    await expect(page.getByText('Registration added.')).toBeVisible()
}

/* The registrant's /register/pay link, from the email that asked for the money. */
export function payLinkFrom(text: string): string {
    const match = text.match(/https?:\/\/\S+\/register\/pay\?token=[^\s)>"]+/)
    if (!match) {
        throw new Error('No /register/pay link in the email')
    }
    return match[0]
}

/* One "Person N" card in the edit form, found by the name typed in it. Svelte drops the value
   attribute at hydration, so the card is found by reading each name input rather than by a CSS
   attribute selector. */
export async function personCardFor(page: Page, name: string): Promise<Locator> {
    const cards = page.locator('div.rounded-lg.border.p-4', { hasText: /Person \d/ })
    const count = await cards.count()
    for (let index = 0; index < count; index += 1) {
        const values = await cards
            .nth(index)
            .locator('input[type="text"]')
            .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))
        if (values.includes(name)) {
            return cards.nth(index)
        }
    }
    throw new Error(`No person card for ${name}`)
}
