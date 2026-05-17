<script lang="ts">
import { SvelteMap } from 'svelte/reactivity'
import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '$lib/components/ui/breadcrumb'
import { getAge, getInitials } from '$lib/utils'

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
    <div class="flex items-center gap-4">
        <Avatar class="w-16 h-16 shrink-0">
            {#if data.member.photoUrl}
                <AvatarImage src={data.member.photoUrl} alt={data.member.name} />
            {/if}
            <AvatarFallback class="bg-primary text-primary-foreground text-xl">
                {getInitials(data.member.name)}
            </AvatarFallback>
        </Avatar>
        <div>
            <h1 class="text-2xl font-bold">{data.member.name}</h1>
            {#if data.member.birthYear}
                <p class="text-muted-foreground">
                    Age {getAge(
                        data.member.birthYear,
                        data.member.birthMonth,
                        data.member.birthDay,
                    )}
                </p>
            {/if}
        </div>
    </div>
</section>

{#if groups.length === 0}
    <section class="col-span-12">
        <p class="text-muted-foreground">No relationships recorded for this member.</p>
    </section>
{:else}
    {#each groups as group}
        <section class="col-span-12 md:col-span-6">
            <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {group.label}
            </h2>
            <div class="space-y-2">
                {#each group.members as related}
                    <a
                        href="/family-tree/{related.id}"
                        class="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                        <Avatar class="w-9 h-9 shrink-0">
                            {#if related.photoUrl}
                                <AvatarImage src={related.photoUrl} alt={related.name} />
                            {/if}
                            <AvatarFallback class="bg-primary text-primary-foreground text-sm">
                                {getInitials(related.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p class="font-medium text-sm">{related.name}</p>
                            {#if related.birthYear}
                                <p class="text-xs text-muted-foreground">
                                    Age {getAge(
                                        related.birthYear,
                                        related.birthMonth,
                                        related.birthDay,
                                    )}
                                </p>
                            {/if}
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/each}
{/if}
