import { expect, type Page } from '@playwright/test'

export type Guest = { first: string; last: string; tier: 'Adult' | 'Child'; shirt: string }

export type Party = {
    first: string
    last: string
    email: string
    shirt?: string
    guests?: Guest[]
    hotel?: 'yes' | 'no' | 'undecided'
    giftCents?: number
}

/* Fills the contact card, saves it, adds each guest and answers the hotel and gift questions — the
   part the public form and admin paper entry share, since they render the same components. The
   public form saves through CheckoutBar's button; paper entry has only the card's own Save. */
export async function fillParty(page: Page, party: Party, saveVia: 'bar' | 'card'): Promise<void> {
    await page.locator('#contactEmail').fill(party.email)
    await page.locator('#contactPhone').fill('5105550123')
    await page.locator('#contactFirstName').fill(party.first)
    await page.locator('#contactLastName').fill(party.last)
    await page.locator('#selfAddress-line1').fill('1 Main St')
    await page.locator('#selfAddress-city').fill('Oakland')
    await page.locator('#selfAddress-state').selectOption('CA')
    await page.locator('#selfAddress-zip').fill('94612')
    await page.locator('#selfTier').selectOption({ label: 'Adult' })
    await page.locator('#selfShirtSize').selectOption(party.shirt ?? 'M')
    await page.locator('#self-vegetarian').selectOption('no')
    await page.locator('#self-attended2025').selectOption('no')
    if (saveVia === 'bar') {
        await page.getByRole('button', { name: 'Save your details' }).click()
    } else {
        await page.getByRole('button', { name: 'Save', exact: true }).first().click()
    }

    for (const guest of party.guests ?? []) {
        await page.getByRole('button', { name: 'Add another person' }).click()
        await page.locator('#new-first').fill(guest.first)
        await page.locator('#new-last').fill(guest.last)
        await page.locator('#new-tier').selectOption({ label: guest.tier })
        await page.locator('#new-shirt').selectOption(guest.shirt)
        await page.locator('#new-attended2025').selectOption('no')
        await page
            .locator('[data-slot="card"]', { has: page.locator('#new-first') })
            .getByRole('button', { name: 'Save', exact: true })
            .click()
        await expect(page.getByText(`${guest.first} ${guest.last}`).first()).toBeVisible()
    }

    const hotel = page.locator('#stayingAtHostHotel')
    if ((await hotel.count()) > 0) {
        await hotel.selectOption(party.hotel ?? 'no')
    }

    if (party.giftCents) {
        await page
            .getByRole('button', { name: `$${(party.giftCents / 100).toFixed(2)}`, exact: true })
            .click()
    }
}

/* The public form, start to finish: fills the party, ticks the safety notice and presses
   Pay & Register, leaving the page on Stripe Checkout. */
export async function fillRegistration(
    page: Page,
    party: Party,
    path = '/register',
): Promise<void> {
    await page.goto(path)
    await fillParty(page, party, 'bar')
    await page.getByRole('button', { name: 'Read the safety notice' }).click()
    await page.getByLabel('I have read this. I will only pay one of the ways listed above.').check()
    await page.getByRole('button', { name: 'Pay & Register' }).last().click()
}

/* Waits on /register/view until the webhook has marked the booking paid. */
export async function expectRegistered(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/register\/view/)
    await expect(page.getByRole('heading', { name: "You're registered!" })).toBeVisible({
        timeout: 60_000,
    })
}
