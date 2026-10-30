// Name a saved photo carries, shared by the proxy's attachment header and the share sheet
export function photoFilename(photoId: string): string {
    return `patterson-reunion-${photoId.slice(0, 8)}.jpg`
}
