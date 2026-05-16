<script lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
import { Card } from '$lib/components/ui/card'
import { Input } from '$lib/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { getInitials } from '$lib/utils'
import { getAge } from '$lib/utils/age'

let { data } = $props()
let search = $state('')

let filtered = $derived(
    data.members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
)
</script>

<section class="col-span-12">
    <Input type="text" class="max-w-sm" placeholder="Search by name..." bind:value={search} />
</section>

{#if filtered.length === 0}
    <section class="col-span-12">
        <p class="text-muted-foreground">No family members found.</p>
    </section>
{:else}
    <!-- Mobile cards -->
    <section class="col-span-12 lg:hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each filtered as member}
                <Card class="p-4">
                    <div class="flex items-center gap-4">
                        <Avatar class="w-12 h-12 shrink-0">
                            {#if member.profilePhotoUrl}
                                <AvatarImage src={member.profilePhotoUrl} alt={member.name} />
                            {/if}
                            <AvatarFallback class="bg-primary text-primary-foreground text-lg">
                                {getInitials(member.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 class="font-semibold">{member.name}</h3>
                            {#if member.birthYear}
                                <p class="text-sm text-muted-foreground">
                                    Age {getAge(
                                        member.birthYear,
                                        member.birthMonth,
                                        member.birthDay,
                                    )}
                                </p>
                            {/if}
                        </div>
                    </div>
                </Card>
            {/each}
        </div>
    </section>

    <!-- Desktop table -->
    <section class="col-span-12 hidden lg:block overflow-hidden">
        <Card>
            <div class="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Age</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {#each filtered as member}
                            <TableRow>
                                <TableCell>
                                    <div class="flex items-center gap-4">
                                        <Avatar class="w-10 h-10 shrink-0">
                                            {#if member.profilePhotoUrl}
                                                <AvatarImage
                                                    src={member.profilePhotoUrl}
                                                    alt={member.name} />
                                            {/if}
                                            <AvatarFallback
                                                class="bg-primary text-primary-foreground text-sm">
                                                {getInitials(member.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span class="font-medium">{member.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {#if member.birthYear}
                                        {getAge(
                                            member.birthYear,
                                            member.birthMonth,
                                            member.birthDay,
                                        )}
                                    {/if}
                                </TableCell>
                            </TableRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>
        </Card>
    </section>
{/if}
