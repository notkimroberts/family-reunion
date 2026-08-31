import { REUNION_LOCATIONS } from './REUNION_LOCATIONS'
import type { ReunionLocation } from './ReunionLocation'

/* The recommended place to stay, picked out of REUNION_LOCATIONS rather than restated.

   Undefined when no hotel is listed, and every caller must handle that: the list is a plain constant
   an organiser edits, and a year with no host hotel is a legitimate state — better a prompt that does
   not appear than one linking to last year's hotel. */
/* #__PURE__ so bundlers may drop this — and REUNION_LOCATIONS with it — from chunks that import
   something else from the constants barrel. A bare top-level .find() is treated as side-effectful and
   pins the whole location list into every one of them. */
export const HOST_HOTEL: ReunionLocation | undefined = /* #__PURE__ */ REUNION_LOCATIONS.find(
    (location) => location.kind === 'hotel',
)
