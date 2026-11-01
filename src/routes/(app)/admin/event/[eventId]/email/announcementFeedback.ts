/* Every action on the email page returns these optional keys, so `form` has one shape. */
export type AnnouncementFeedback = {
    error?: string
    previewHtml?: string
    testSentTo?: string
    sent?: { sentCount: number; total: number; finished: boolean }
}
