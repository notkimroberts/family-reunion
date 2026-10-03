/* Palette and font stack for transactional email.

   Literals, not app.css tokens: CSS variables do not reach the inbox. Flat surfaces only —
   no gradients or shadows beyond a hairline border — matching the app's visual language. */
export const emailThemeValue = {
    pageBackground: '#f5f5f5',
    cardBackground: '#ffffff',
    insetBackground: '#fafafa',
    border: '#e5e5e5',
    text: '#171717',
    muted: '#737373',
    accent: '#171717',
    /* Something the reader has to act on — payment still owed. Amber, matching the app's warning
       surfaces; flat, with both colours stated so dark-mode inversion cannot wash it out. */
    actionBackground: '#fffbeb',
    actionBorder: '#f59e0b',
    actionText: '#78350f',
    fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif",
} as const
