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
    fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif",
} as const
