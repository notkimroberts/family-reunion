/* The reunion's Zelle QR code, cropped from the code the bank issued and redrawn on its own module
   grid so it prints sharp. It encodes ZELLE_RECIPIENT and nothing else: re-issue the image whenever
   that address changes, or the code pays an account the site no longer names. `accountName` is what
   Zelle shows the payer before they send, so printing it beside the code lets them check it. */
export const zelleQrCodeValue = {
    qrPath: '/zelle_qr.png',
    logoPath: '/zelle_logo.png',
    accountName: 'Patterson Reunion Assn',
    alt: 'Zelle QR code for Patterson Reunion Assn',
    scanHint: 'Scan in your banking app to pay by Zelle.',
} as const
