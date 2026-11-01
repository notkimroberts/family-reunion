import { emailLayout } from './_emailLayout'
import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'
import { primaryButton } from './_primaryButton'
import { SAFETY_NOTICE_TEXT } from './_safetyNoticeText'
import type { AnnouncementEmailData } from './types'

/* A blank line between paragraphs, however the textarea's line ends arrive. */
const PARAGRAPH_BREAK = /\r?\n\s*\r?\n/

/* The owner's message to every family. The words are the owner's, so every one is escaped and no
   markup is accepted: a single line break stays a line break, a blank line starts a paragraph. The
   safety notice is added like every other email, so a fake "organizer" message that lacks it, or
   names another way to pay, still reads as wrong. */
export function renderAnnouncement(data: AnnouncementEmailData): {
    subject: string
    text: string
    html: string
} {
    const { text: textColor, fontStack } = emailThemeValue
    const paragraphs = data.body
        .trim()
        .split(PARAGRAPH_BREAK)
        .map((paragraph) => paragraph.trim())

    const text = [
        ...paragraphs.flatMap((paragraph) => [paragraph, '']),
        `Reunion website: ${data.siteOrigin}`,
        '',
        SAFETY_NOTICE_TEXT,
    ].join('\n')

    const bodyHtml = [
        ...paragraphs.map(
            (paragraph) =>
                `<p style="margin:0 0 14px 0;font-family:${fontStack};font-size:15px;line-height:1.6;color:${textColor};">${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`,
        ),
        '<div style="height:8px;"></div>',
        primaryButton(data.siteOrigin, 'Visit the reunion website'),
    ].join('\n')

    return {
        subject: data.subject,
        text,
        html: emailLayout({
            preheader: paragraphs[0] ?? data.subject,
            heading: data.eventTitle,
            bodyHtml,
            siteOrigin: data.siteOrigin,
        }),
    }
}
