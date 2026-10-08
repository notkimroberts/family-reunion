/* Whether an event's registration has not opened yet — the counterpart of isRegistrationClosed, and
   shared the same way: the home page, the register form and the server's refusal all ask this one
   function, so what a visitor is shown and what a submission gets cannot disagree.

   Null means no opening date was set, which is open now — not "never opens". */
export function isBeforeRegistrationOpens(
    opensAt: Date | string | null,
    at: Date | number = Date.now(),
): boolean {
    if (opensAt === null) {
        return false
    }
    return new Date(at).getTime() < new Date(opensAt).getTime()
}
