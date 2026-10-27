import { expect, type Page } from '@playwright/test'

export type MoneyPanelFigures = {
    inTheBank: number
    registrations: number
    gifts: number
    stripeFees: number
    lostToRefunds: number
    outstanding: number
}

const toCents = (text: string) => Math.round(Number(text.replace(/[^0-9.]/g, '')) * 100)

/* Reads the Money block on the organizer's registrations list. A line the panel leaves out (it shows
   only what has happened) reads as 0. */
export async function readMoneyPanel(page: Page, eventId: string): Promise<MoneyPanelFigures> {
    await page.goto(`/admin/event/${eventId}/registrations`)
    await expect(page.getByText('In the bank')).toBeVisible()
    const amountAfter = async (label: string | RegExp) => {
        const row = page.locator('div', { has: page.getByText(label, { exact: true }) }).last()
        if ((await page.getByText(label, { exact: true }).count()) === 0) {
            return 0
        }
        return toCents((await row.locator('span').last().textContent()) ?? '0')
    }
    return {
        inTheBank: toCents(
            (await page
                .getByText('In the bank')
                .locator('xpath=following-sibling::span[1]')
                .textContent()) ?? '0',
        ),
        registrations: await amountAfter('Registrations'),
        gifts: await amountAfter(/^Gifts \(\d+\)$/),
        stripeFees: await amountAfter('Stripe fees'),
        lostToRefunds: await amountAfter('Lost to refunds'),
        outstanding: await amountAfter('Outstanding'),
    }
}

/* The panel's own promise: the lines under the headline are the terms of its sum. */
export function expectPanelAddsUp(figures: MoneyPanelFigures): void {
    expect(figures.registrations + figures.gifts - figures.stripeFees - figures.lostToRefunds).toBe(
        figures.inTheBank,
    )
}
