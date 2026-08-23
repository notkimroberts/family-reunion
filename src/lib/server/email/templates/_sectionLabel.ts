import { emailThemeValue } from './_emailThemeValue'
import { escapeHtml } from './_escapeHtml'

/* Small uppercase letter-spaced heading used to label a block within the card. */
export function sectionLabel(label: string): string {
    const { muted, fontStack } = emailThemeValue
    return `<p style="margin:0 0 8px 0;font-family:${fontStack};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${muted};">${escapeHtml(label)}</p>`
}
