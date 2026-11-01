import { describe, expect, it } from 'vitest'
import { renderAnnouncement } from './renderAnnouncement'

const render = (body: string) =>
    renderAnnouncement({
        eventTitle: 'Patterson Family Reunion 2027',
        subject: 'News',
        body,
        siteOrigin: 'https://example.com',
    })

describe('renderAnnouncement', () => {
    it("escapes the owner's text rather than rendering it as markup", () => {
        const { html } = render('<script>alert(1)</script> & <b>bold</b>')
        expect(html).not.toContain('<script>alert(1)</script>')
        expect(html).not.toContain('<b>bold</b>')
        expect(html).toContain('&lt;script&gt;')
    })

    it('makes a blank line a paragraph and a single line break a <br>', () => {
        const { html, text } = render('One\ntwo\r\n\r\nThree')
        expect(html).toContain('One<br>two</p>')
        expect(html).toContain('>Three</p>')
        expect(text.startsWith('One\ntwo\n\nThree\n')).toBe(true)
    })

    it('uses the subject as typed and links back to the site', () => {
        const { subject, text, html } = render('Hello')
        expect(subject).toBe('News')
        expect(text).toContain('https://example.com')
        expect(html).toContain('href="https://example.com"')
    })
})
