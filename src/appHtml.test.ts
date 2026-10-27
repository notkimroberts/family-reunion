import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_DOMAIN } from '$lib/general/constants'

/* vitest runs under node, where Bun.file does not exist. */
const appHtml = readFileSync(new URL('./app.html', import.meta.url), 'utf8')

/* app.html cannot import a constant, so Umami's domain is written out there. */
describe('app.html', () => {
    it('counts Umami visits on APP_DOMAIN and its www host only', () => {
        expect(appHtml).toContain(`data-domains="${APP_DOMAIN},www.${APP_DOMAIN}"`)
    })
})
