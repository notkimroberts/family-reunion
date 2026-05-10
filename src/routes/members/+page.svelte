<script lang="ts">
import PageTitle from '$lib/components/PageTitle.svelte'
import { getAge } from '$lib/utils/age'

let { data } = $props()
let search = $state('')

let filtered = $derived(
    data.members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
)
</script>

<PageTitle title="Family Members" />

<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Family Members</h1>

    <div class="mb-6">
        <input
            type="text"
            class="input w-full max-w-sm"
            placeholder="Search by name..."
            bind:value={search} />
    </div>

    {#if filtered.length === 0}
        <p class="text-base-content/60">No family members found.</p>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {#each filtered as member}
                <div class="card bg-base-100 shadow-xs">
                    <div class="card-body items-center text-center p-4">
                        <div class="avatar avatar-placeholder mb-2">
                            <div class="w-16 rounded-full bg-primary text-primary-content">
                                {#if member.profilePhotoUrl}
                                    <img src={member.profilePhotoUrl} alt={member.name} />
                                {:else}
                                    <span class="text-xl">{member.name[0]?.toUpperCase()}</span>
                                {/if}
                            </div>
                        </div>
                        <h3 class="font-semibold">{member.name}</h3>
                        {#if member.birthYear}
                            <p class="text-sm text-base-content/60">
                                Age {getAge(member.birthYear, member.birthMonth, member.birthDay)}
                            </p>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
