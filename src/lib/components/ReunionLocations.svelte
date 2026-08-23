<script lang="ts">
import { LocationCard } from '$lib/components'
import { REUNION_LOCATIONS } from '$lib/general/constants'
</script>

{#each REUNION_LOCATIONS as location (location.name)}
    <LocationCard {location} />
{/each}
