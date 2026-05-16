<script lang="ts">
import { enhance } from '$app/forms'
import { Button } from '$lib/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import { Separator } from '$lib/components/ui/separator'

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
    <section class="col-span-12 xl:col-span-8">
        <Card>
            <CardHeader>
                <CardTitle>First, create your family profile</CardTitle>
            </CardHeader>
            <CardContent>
                <form method="POST" action="?/create_member" use:enhance class="space-y-4">
                    <div class="space-y-2">
                        <label for="name" class="text-sm font-medium">Your Name</label>
                        <Input id="name" name="name" type="text" value={data.user.name} required />
                    </div>
                    <div class="space-y-2">
                        <label for="birthYear" class="text-sm font-medium"
                            >Birth Year (optional)</label>
                        <Input
                            id="birthYear"
                            name="birthYear"
                            type="number"
                            min="1900"
                            max="2030" />
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label for="birthMonth" class="text-sm font-medium"
                                >Birth Month (optional)</label>
                            <select
                                id="birthMonth"
                                name="birthMonth"
                                class="w-full border rounded-md px-3 py-2 text-sm bg-background">
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
                        </div>
                        <div class="space-y-2">
                            <label for="birthDay" class="text-sm font-medium"
                                >Birth Day (optional)</label>
                            <Input id="birthDay" name="birthDay" type="number" min="1" max="31" />
                        </div>
                    </div>
                    <Button type="submit" class="mt-2">Create Profile</Button>
                </form>
            </CardContent>
        </Card>
    </section>
{:else}
    <section class="col-span-12 xl:col-span-6">
        <Card>
            <CardHeader>
                <CardTitle>Add Relationship</CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    method="POST"
                    action="?/add_relationship"
                    use:enhance
                    class="flex flex-col gap-4">
                    <div class="space-y-2">
                        <label for="type" class="text-sm font-medium">I am the...</label>
                        <select
                            id="type"
                            name="type"
                            class="w-full border rounded-md px-3 py-2 text-sm bg-background"
                            required>
                            <option value="" disabled selected>Select relationship</option>
                            {#each relationshipTypes as type}
                                <option value={type.value}>{type.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label for="toMemberId" class="text-sm font-medium">...of</label>
                        <select
                            id="toMemberId"
                            name="toMemberId"
                            class="w-full border rounded-md px-3 py-2 text-sm bg-background"
                            required>
                            <option value="" disabled selected>Select family member</option>
                            {#each data.allMembers as member}
                                <option value={member.id}>{member.name}</option>
                            {/each}
                        </select>
                    </div>
                    <Button type="submit" size="sm" class="w-fit">Add Relationship</Button>
                </form>
            </CardContent>
        </Card>
    </section>

    <section class="col-span-12 xl:col-span-6">
        <Card>
            <CardHeader>
                <CardTitle>My Connections</CardTitle>
            </CardHeader>
            <CardContent>
                {#if data.myRelationships.length === 0}
                    <p class="text-muted-foreground">No relationships defined yet.</p>
                {:else}
                    <div class="space-y-3">
                        {#each data.myRelationships as rel}
                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span>
                                    <span class="font-medium">{getTypeLabel(rel.type)}</span>

                                    <span class="text-primary font-semibold"
                                        >{rel.toMember.name}</span>
                                </span>
                                <form method="POST" action="?/remove_relationship" use:enhance>
                                    <input type="hidden" name="relationshipId" value={rel.id} />
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="sm"
                                        class="text-destructive hover:text-destructive">
                                        Remove
                                    </Button>
                                </form>
                            </div>
                        {/each}
                    </div>
                {/if}
            </CardContent>
        </Card>
    </section>
{/if}

<section class="col-span-12">
    <Button href="/profile" variant="ghost">&larr; Back to Profile</Button>
</section>
