/* Whether an event's registration lock date has passed — the one rule that decides whether anyone
   may register, and therefore whether the home page shows Register Now, whether the register form
   renders at all, how the deadline pill is worded, and whether the server accepts a submission.

   Shared because it was written four times and two of the copies disagreed: the home page compared
   against its ticking countdown clock while the deadline pill rendered on the same line compared
   against a fresh `new Date()`, so the two could contradict each other for a tick. `at` is passed in
   by callers that already have a clock (the home page's `now`) and defaults to the current instant
   for those that do not.

   Null means no deadline was set, which is open forever — not closed. */
export function isRegistrationClosed(
    lockDate: Date | string | null,
    at: Date | number = Date.now(),
): boolean {
    if (lockDate === null) {
        return false
    }
    return new Date(lockDate).getTime() < new Date(at).getTime()
}
