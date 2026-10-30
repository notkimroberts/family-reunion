import { join } from 'node:path'
import { chromium } from 'playwright-core'

/* Renders the "Registration is open" Facebook cards: each option-*.html is one 1080×1350 (4:5)
   card, screenshotted at 2× by Playwright's Chromium into a PNG of the same name.

   Run: bun social/registration-open/build.ts */

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350
const SCALE = 2
const OUT_DIR = import.meta.dir
const CARD_NAMES = ['option-c-heritage']

const browser = await chromium.launch()
const page = await browser.newPage({
    viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
    deviceScaleFactor: SCALE,
})
for (const name of CARD_NAMES) {
    await page.goto(`file://${join(OUT_DIR, `${name}.html`)}`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: join(OUT_DIR, `${name}.png`) })
}
await browser.close()
