/* The reunion's own timezone: the zone every datetime an organiser types on the settings page is read
   in, and the zone every datetime a visitor is shown is stated in. See parseReunionWallClock.

   PACIFIC, because the reunion is held in Oakland, California — see REUNION_LOCATIONS. Not the
   family's Mississippi origins, which is what the home page's history section is about; where the
   Pattersons came from and where they gather are two different places.

   The zone id rather than "PST": America/Los_Angeles carries the DST rules, so a July deadline is
   correctly labelled PDT and a January one PST. Hard-coding an offset would put summer an hour out.

   One zone rather than the reader's, because a reunion has one deadline and one start time. */
export const REUNION_TIME_ZONE = 'America/Los_Angeles'
