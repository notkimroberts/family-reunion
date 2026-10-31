<script lang="ts">
import { LogIn } from '@lucide/svelte'
import type { EventPerson } from '$lib/server/registrations'
import { formatReunionDateTime } from '$lib/utils'
import { setCheckedIn } from '../checkin/setCheckedIn.remote'
import DoorToggleButton from './DoorToggleButton.svelte'

/* One attendee's arrival. On, it reads the arrival time in the reunion zone; a tap undoes it.
   `locked` before the reunion day: no new arrivals, but an existing one can still be undone. */
let { person, eventId, locked }: { person: EventPerson; eventId: string; locked: boolean } =
    $props()
</script>

<DoorToggleButton
    isOn={person.checkedInAt !== null}
    onLabel={person.checkedInAt ? formatReunionDateTime(person.checkedInAt, 'time') : ''}
    offLabel="Check in"
    offIcon={LogIn}
    ariaLabel="{person.checkedInAt ? 'Undo arrival' : 'Check in'} for {person.name}"
    disabled={locked && person.checkedInAt === null}
    errorMessage="Could not {person.checkedInAt ? 'undo' : 'check in'} {person.name}. Try again."
    onToggle={(checkedIn) => setCheckedIn({ memberId: person.id, eventId, checkedIn })} />
