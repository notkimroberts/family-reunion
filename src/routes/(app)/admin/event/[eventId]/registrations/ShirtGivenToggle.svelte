<script lang="ts">
import { Shirt } from '@lucide/svelte'
import type { EventPerson } from '$lib/server/registrations'
import { setShirtHandedOver } from '../checkin/setShirtHandedOver.remote'
import DoorToggleButton from './DoorToggleButton.svelte'

/* One attendee's shirt handed over. Apart from arrival, because shirts run out or arrive late. */
let { person, eventId }: { person: EventPerson; eventId: string } = $props()
</script>

<DoorToggleButton
    isOn={person.shirtGivenAt !== null}
    onLabel="Given"
    offLabel="Give"
    offIcon={Shirt}
    ariaLabel="{person.shirtGivenAt ? 'Undo shirt' : 'Give shirt'} for {person.name}"
    errorMessage="Could not record the shirt for {person.name}. Try again."
    onToggle={(given) => setShirtHandedOver({ memberId: person.id, eventId, given })} />
