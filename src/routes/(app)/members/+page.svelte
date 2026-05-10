<script lang="ts">
import { getInitials } from '$lib/utils'
import { getAge } from '$lib/utils/age'

let { data } = $props()
let search = $state('')

let filtered = $derived(
    data.members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
)
</script>

<section class="col-span-12">
    <input
        type="text"
        class="input w-full max-w-sm"
        placeholder="Search by name..."
        bind:value={search} />
</section>

{#if filtered.length === 0}
    <section class="col-span-12">
        <p class="text-base-content/60">No family members found.</p>
    </section>
{:else}
    <!-- Mobile cards -->
    <section class="col-span-12 lg:hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each filtered as member}
                <div class="card bg-base-100 shadow-xs">
                    <div class="card-body flex-row items-center gap-4 p-4">
                        <div class="avatar avatar-placeholder">
                            <div class="w-12 rounded-full bg-primary text-primary-content">
                                {#if member.profilePhotoUrl}
                                    <img src={member.profilePhotoUrl} alt={member.name} />
                                {:else}
                                    <span class="text-lg">{getInitials(member.name)}</span>
                                {/if}
                            </div>
                        </div>
                        <div>
                            <h3 class="font-semibold">{member.name}</h3>
                            {#if member.birthYear}
                                <p class="text-sm text-base-content/60">
                                    Age {getAge(
                                        member.birthYear,
                                        member.birthMonth,
                                        member.birthDay,
                                    )}
                                </p>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <!-- Desktop table -->
    <section class="card bg-base-100 col-span-12 shadow-xs overflow-hidden hidden lg:block">
        <div class="overflow-x-auto">
            <table class="table table-zebra">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Age</th>
                    </tr>
                </thead>
                <tbody>
                    {#each filtered as member}
                        <tr>
                            <td>
                                <div class="flex items-center gap-4">
                                    <div class="avatar avatar-placeholder">
                                        <div
                                            class="w-10 rounded-full bg-primary text-primary-content">
                                            {#if member.profilePhotoUrl}
                                                <img
                                                    src={member.profilePhotoUrl}
                                                    alt={member.name} />
                                            {:else}
                                                <span class="text-sm"
                                                    >{getInitials(member.name)}</span>
                                            {/if}
                                        </div>
                                    </div>
                                    <span class="font-medium">{member.name}</span>
                                </div>
                            </td>
                            <td>
                                {#if member.birthYear}
                                    {getAge(member.birthYear, member.birthMonth, member.birthDay)}
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </section>
{/if}
