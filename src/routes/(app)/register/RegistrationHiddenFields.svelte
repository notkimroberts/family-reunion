<script lang="ts">
import type { PersonDetails } from './types'

/* Every hidden input the registration schema expects, in one place.

   Both today's production bugs came from this list living in two page components: a field present
   on one page and absent from the other, or absent from both because a child component was
   assumed to render it. Owning the whole set here means there is a single list to get right, and
   registrationFields.test.ts asserts it covers every required schema key.

   contactEmail and contactPhone are deliberately NOT here — YourInformationCard renders those as
   real inputs and supplies its own hidden fallbacks when collapsed. Duplicating them would put
   two same-named inputs in the FormData. */
let {
    eventId,
    contactName,
    details,
    membersJson,
}: {
    eventId: string
    contactName: string
    details: PersonDetails
    membersJson: string
} = $props()
</script>

<input type="hidden" name="eventId" value={eventId} />
<input type="hidden" name="contactName" value={contactName} />
<input type="hidden" name="selfTierId" value={details.tierId} />
<input type="hidden" name="selfBirthDate" value={details.birthDate ?? ''} />
<input type="hidden" name="selfShirtSize" value={details.shirtSize ?? ''} />
<input type="hidden" name="selfAddressLine1" value={details.addressLine1} />
<input type="hidden" name="selfAddressLine2" value={details.addressLine2 ?? ''} />
<input type="hidden" name="selfAddressCity" value={details.addressCity} />
<input type="hidden" name="selfAddressState" value={details.addressState} />
<input type="hidden" name="selfAddressZip" value={details.addressZip} />
<input type="hidden" name="selfVegetarianMeal" value={details.vegetarianMeal} />
<input type="hidden" name="selfAttendedReunion2025" value={details.attendedReunion2025} />
<input type="hidden" name="members" value={membersJson} />
