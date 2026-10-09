/* The upload is not a photo this server can decode. Distinct from every other failure in
   createPhoto because it is the VISITOR's problem — resending the same bytes cannot help — while a
   bucket or database failure is OURS, is worth a retry, and must reach Sentry. */
export class UnreadablePhotoError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = 'UnreadablePhotoError'
    }
}
