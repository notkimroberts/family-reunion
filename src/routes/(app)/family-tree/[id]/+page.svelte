<script lang="ts">
import { SvelteMap } from 'svelte/reactivity'
import { enhance } from '$app/forms'
import { BirthDateInput } from '$lib/components'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '$lib/components/ui/breadcrumb'
import { Button } from '$lib/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '$lib/components/ui/dialog'
import { Input } from '$lib/components/ui/input'
import { getAge, getInitials } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'

// [fromLabel, toLabel]: label when current member is 'from' side vs 'to' side
const GROUP_LABELS: Record<string, [string, string]> = {
    parent: ['Children', 'Parents'],
    child: ['Parents', 'Children'],
    spouse: ['Spouse', 'Spouse'],
    sibling: ['Siblings', 'Siblings'],
    grandparent: ['Grandchildren', 'Grandparents'],
    grandchild: ['Grandparents', 'Grandchildren'],
    aunt_uncle: ['Nieces & Nephews', 'Aunts & Uncles'],
    niece_nephew: ['Aunts & Uncles', 'Nieces & Nephews'],
    cousin: ['Cousins', 'Cousins'],
}

const GROUP_ORDER = [
    'Parents',
    'Spouse',
    'Children',
    'Siblings',
    'Grandparents',
    'Grandchildren',
    'Aunts & Uncles',
    'Nieces & Nephews',
    'Cousins',
]

let { data } = $props()

type RelatedMember = (typeof data.relatedMembers)[number]

let groups = $derived.by(() => {
    const map = new SvelteMap<string, RelatedMember[]>()
    for (const rel of data.relationships) {
        const entry = GROUP_LABELS[rel.type]
        if (!entry) {
            continue
        }
        const isFrom = rel.from === data.member.id
        const label = isFrom ? entry[0] : entry[1]
        const otherId = isFrom ? rel.to : rel.from
        const other = data.relatedMembers.find((m) => m.id === otherId)
        if (!other) {
            continue
        }
        const existing = map.get(label)
        if (existing) {
            if (!existing.some((m) => m.id === other.id)) {
                existing.push(other)
            }
        } else {
            map.set(label, [other])
        }
    }
    return GROUP_ORDER.filter((label) => map.has(label)).map((label) => ({
        label,
        members: map.get(label)!,
    }))
})

let editOpen = $state(false)
let editBirthYear = $state<number | null>(data.member.birthYear)
let editBirthMonth = $state<number | null>(data.member.birthMonth)
let editBirthDay = $state<number | null>(data.member.birthDay)

let isAdmin = $derived(data.user?.role === 'admin')

/* Show "Born <date>" for partial dates; reserve "Age N" for the full-date case where it's accurate. */
let memberBornLabel = $derived(
    formatPartialBirthDate(data.member.birthYear, data.member.birthMonth, data.member.birthDay),
)
let memberAgeLabel = $derived(
    data.member.birthYear && data.member.birthMonth && data.member.birthDay
        ? `Age ${getAge(data.member.birthYear, data.member.birthMonth, data.member.birthDay)}`
        : undefined,
)
</script>

<svelte:head>
    <title>{data.member.name} — Family Tree</title>
</svelte:head>

<section class="col-span-12">
    <Breadcrumb class="mb-6">
        <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink href="/family-tree">Family Tree</BreadcrumbLink>
            </BreadcrumbItem>
            {#each data.ancestryChain as ancestor}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink href="/family-tree/{ancestor.id}"
                        >{ancestor.name}</BreadcrumbLink>
                </BreadcrumbItem>
            {/each}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>{data.member.name}</BreadcrumbPage>
            </BreadcrumbItem>
        </BreadcrumbList>
    </Breadcrumb>
    <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-4">
            <Avatar class="w-16 h-16 shrink-0">
                <AvatarFallback class="bg-primary text-primary-foreground text-xl">
                    {getInitials(data.member.name)}
                </AvatarFallback>
            </Avatar>
            <div>
                <h1>{data.member.name}</h1>
                {#if memberBornLabel}
                    <p class="text-muted-foreground">
                        Born {memberBornLabel}{#if memberAgeLabel}
                            · {memberAgeLabel}
                        {/if}
                    </p>
                {/if}
            </div>
        </div>
        <Button variant="outline" size="sm" onclick={() => (editOpen = true)} disabled={!isAdmin}>
            Edit
        </Button>
    </div>
</section>

{#if data.attendances.length > 0}
    <section class="col-span-12">
        <p class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Reunion attendance
        </p>
        <div class="flex flex-wrap gap-2">
            {#each data.attendances as a (a.partyMemberId)}
                <span
                    class="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
                    <span class="font-medium">{a.eventYear}</span>
                    <span class="text-muted-foreground">·</span>
                    <span class="text-muted-foreground">{a.tierLabel}</span>
                </span>
            {/each}
        </div>
    </section>
{/if}

{#if groups.length === 0}
    <section class="col-span-12">
        <p class="text-muted-foreground">No relationships recorded for this member.</p>
    </section>
{:else}
    {#each groups as group}
        <section class="col-span-12 md:col-span-6 flex flex-col gap-3">
            <p class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
            </p>
            <div class="space-y-2">
                {#each group.members as related}
                    {@const relatedBorn = formatPartialBirthDate(
                        related.birthYear,
                        related.birthMonth,
                        related.birthDay,
                    )}
                    <a
                        href="/family-tree/{related.id}"
                        class="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                        <Avatar class="w-9 h-9 shrink-0">
                            <AvatarFallback class="bg-primary text-primary-foreground text-sm">
                                {getInitials(related.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p class="font-medium text-sm">{related.name}</p>
                            {#if relatedBorn}
                                <p class="text-xs text-muted-foreground">Born {relatedBorn}</p>
                            {/if}
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/each}
{/if}

<!-- Edit member dialog -->
<Dialog bind:open={editOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Edit {data.member.name}</DialogTitle>
        </DialogHeader>
        <form
            method="POST"
            action="?/editMember"
            use:enhance={() => {
                return ({ result, update }) => {
                    if (result.type === 'success') {
                        editOpen = false
                    }
                    update()
                }
            }}
            class="space-y-4 pt-2">
            <div class="space-y-2">
                <label for="editName" class="text-sm font-medium"
                    >Name <span class="text-destructive">*</span></label>
                <Input id="editName" name="name" type="text" value={data.member.name} required />
            </div>
            <div class="space-y-2">
                <span class="text-sm font-medium">Birthday</span>
                <p class="text-xs text-muted-foreground">
                    Year only is fine for ancestors when month/day aren't known.
                </p>
                <input
                    type="hidden"
                    name="birthYear"
                    value={editBirthYear !== null ? String(editBirthYear) : ''} />
                <input
                    type="hidden"
                    name="birthMonth"
                    value={editBirthMonth !== null ? String(editBirthMonth) : ''} />
                <input
                    type="hidden"
                    name="birthDay"
                    value={editBirthDay !== null ? String(editBirthDay) : ''} />
                <BirthDateInput
                    idPrefix="edit-bday"
                    bind:year={editBirthYear}
                    bind:month={editBirthMonth}
                    bind:day={editBirthDay} />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onclick={() => (editOpen = false)}
                    >Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
