<script lang="ts">
import { enhance } from '$app/forms'

let { data } = $props()

const relationshipTypes = [
    { value: 'parent', label: 'Parent of' },
    { value: 'child', label: 'Child of' },
    { value: 'spouse', label: 'Spouse of' },
    { value: 'sibling', label: 'Sibling of' },
    { value: 'grandparent', label: 'Grandparent of' },
    { value: 'grandchild', label: 'Grandchild of' },
    { value: 'aunt_uncle', label: 'Aunt/Uncle of' },
    { value: 'niece_nephew', label: 'Niece/Nephew of' },
    { value: 'cousin', label: 'Cousin of' },
]

function getTypeLabel(type: string) {
    return relationshipTypes.find((t) => t.value === type)?.label ?? type
}
</script>

{#if !data.myFamilyMember}
    <section class="card bg-base-100 col-span-12 xl:col-span-8 shadow-xs">
        <div class="card-body">
            <h2 class="card-title">First, create your family profile</h2>
            <form method="POST" action="?/create_member" use:enhance>
                <fieldset class="fieldset w-full">
                    <label class="label">Your Name</label>
                    <input
                        name="name"
                        type="text"
                        class="input w-full"
                        value={data.user.name}
                        required />
                </fieldset>
                <fieldset class="fieldset w-full">
                    <label class="label">Birth Year (optional)</label>
                    <input
                        name="birthYear"
                        type="number"
                        class="input w-full"
                        min="1900"
                        max="2030" />
                </fieldset>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <fieldset class="fieldset w-full">
                        <label class="label">Birth Month (optional)</label>
                        <select name="birthMonth" class="select w-full">
                            <option value="">—</option>
                            <option value="1">January</option>
                            <option value="2">February</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </fieldset>
                    <fieldset class="fieldset w-full">
                        <label class="label">Birth Day (optional)</label>
                        <input
                            name="birthDay"
                            type="number"
                            class="input w-full"
                            min="1"
                            max="31" />
                    </fieldset>
                </div>
                <button type="submit" class="btn btn-primary mt-4">Create Profile</button>
            </form>
        </div>
    </section>
{:else}
    <section class="card bg-base-100 col-span-12 xl:col-span-6 shadow-xs">
        <div class="card-body">
            <h2 class="card-title">Add Relationship</h2>
            <form method="POST" action="?/add_relationship" use:enhance class="flex flex-col gap-3">
                <fieldset class="fieldset w-full">
                    <label class="label">I am the...</label>
                    <select name="type" class="select w-full" required>
                        <option value="" disabled selected>Select relationship</option>
                        {#each relationshipTypes as type}
                            <option value={type.value}>{type.label}</option>
                        {/each}
                    </select>
                </fieldset>
                <fieldset class="fieldset w-full">
                    <label class="label">...of</label>
                    <select name="toMemberId" class="select w-full" required>
                        <option value="" disabled selected>Select family member</option>
                        {#each data.allMembers as member}
                            <option value={member.id}>{member.name}</option>
                        {/each}
                    </select>
                </fieldset>
                <button type="submit" class="btn btn-primary btn-sm w-fit">Add Relationship</button>
            </form>
        </div>
    </section>

    <section class="card bg-base-100 col-span-12 xl:col-span-6 shadow-xs">
        <div class="card-body">
            <h2 class="card-title">My Connections</h2>
            {#if data.myRelationships.length === 0}
                <p class="text-base-content/60">No relationships defined yet.</p>
            {:else}
                <div class="space-y-3">
                    {#each data.myRelationships as rel}
                        <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                            <span>
                                <span class="font-medium">{getTypeLabel(rel.type)}</span>
                                <span class="text-primary font-semibold">{rel.toMember.name}</span>
                            </span>
                            <form method="POST" action="?/remove_relationship" use:enhance>
                                <input type="hidden" name="relationshipId" value={rel.id} />
                                <button type="submit" class="btn btn-ghost btn-xs text-error">
                                    Remove
                                </button>
                            </form>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </section>
{/if}

<section class="col-span-12">
    <a href="/profile" class="btn btn-ghost">&larr; Back to Profile</a>
</section>
