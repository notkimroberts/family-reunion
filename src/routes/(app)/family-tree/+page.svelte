<script lang="ts">
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import { onDestroy, onMount } from 'svelte'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
import { Button } from '$lib/components/ui/button'
import { getAge, getInitials } from '$lib/utils'

let { data } = $props()
let treeContainer: HTMLDivElement
let loaded = $state(false)
let error = $state('')

let relationshipLabels = $derived(
    new Map(
        data.members.map((m) => {
            const rels = data.relationships.filter((r) => r.from === m.id || r.to === m.id)
            const types = new Set(rels.map((r) => r.type))
            if (types.has('parent')) {
                return [m.id, 'Parent']
            }
            if (types.has('child')) {
                return [m.id, 'Child']
            }
            if (types.has('spouse')) {
                return [m.id, 'Spouse']
            }
            return [m.id, '']
        }),
    ),
)

let chartInstance: { destroy?: () => void } | null = null

onMount(async () => {
    try {
        const nodes = data.members.map((m) => {
            const rels = data.relationships.filter((r) => r.from === m.id || r.to === m.id)
            const spouses = [
                ...new Set(
                    rels
                        .filter((r) => r.type === 'spouse')
                        .map((r) => (r.from === m.id ? r.to : r.from)),
                ),
            ]
            const children = [
                ...new Set(
                    rels.filter((r) => r.type === 'parent' && r.from === m.id).map((r) => r.to),
                ),
            ]
            const parents = [
                ...new Set(
                    rels.filter((r) => r.type === 'child' && r.from === m.id).map((r) => r.to),
                ),
            ]

            return {
                id: m.id,
                data: {
                    'first name': m.name.split(' ')[0] ?? '',
                    'last name': m.name.split(' ').slice(1).join(' ') ?? '',
                    age: m.birthYear ? `${getAge(m.birthYear, m.birthMonth, m.birthDay)}` : '',
                    photoUrl: m.photoUrl ?? '',
                    gender: 'M',
                },
                rels: {
                    spouses,
                    children,
                    father: parents[0] ?? null,
                    mother: parents[1] ?? null,
                },
            }
        })

        if (nodes.length > 0) {
            const f3Chart = createChart(treeContainer, nodes)
            chartInstance = f3Chart
            f3Chart.setSingleParentEmptyCard(false)
            f3Chart.setCardHtml().setCardInnerHtmlCreator((d) => {
                const name = `${d.data.data['first name']} ${d.data.data['last name']}`.trim()
                const photo = d.data.data.photoUrl
                    ? `<div style="width:2rem;height:2rem;border-radius:9999px;overflow:hidden;flex-shrink:0"><img src="${d.data.data.photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`
                    : `<div style="width:2rem;height:2rem;border-radius:9999px;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;flex-shrink:0">${getInitials(name)}</div>`
                return `
                    <div style="background:var(--card);border:1px solid var(--border);border-radius:0.5rem;padding:0.75rem;display:flex;align-items:center;gap:0.75rem;width:12rem;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
                        ${photo}
                        <div style="min-width:0">
                            <div style="font-weight:500;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--foreground)">${name}</div>
                            <div style="font-size:0.75rem;color:var(--muted-foreground)">${d.data.data.age ? `Age ${d.data.data.age}` : ''}</div>
                        </div>
                    </div>
                `
            })
            f3Chart.updateTree({ initial: true })
        }

        loaded = true
    } catch (e) {
        error = 'Family tree visualization could not be loaded.'
        loaded = true
    }
})

onDestroy(() => {
    if (chartInstance?.destroy) {
        chartInstance.destroy()
    }
})
</script>

<!-- Mobile list view -->
<section class="col-span-12 lg:hidden">
    {#if data.members.length === 0}
        <div class="text-center py-12">
            <p class="text-muted-foreground text-lg">No family members have been added yet.</p>
            <Button href="/profile/relationships" class="mt-4">Add Relationships</Button>
        </div>
    {:else}
        <div class="space-y-3">
            {#each data.members as member}
                <div class="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <Avatar class="w-10 h-10 shrink-0">
                        {#if member.photoUrl}
                            <AvatarImage src={member.photoUrl} alt={member.name} />
                        {/if}
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium truncate">{member.name}</p>
                        <div class="flex gap-3 text-sm text-muted-foreground">
                            {#if member.birthYear}
                                <span>
                                    Age {getAge(
                                        member.birthYear,
                                        member.birthMonth,
                                        member.birthDay,
                                    )}
                                </span>
                            {/if}
                            <span>{relationshipLabels.get(member.id) ?? ''}</span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</section>

<!-- Desktop chart view -->
<section class="col-span-12 hidden lg:block family-tree-page">
    {#if data.members.length === 0}
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <p class="text-muted-foreground text-lg">No family members have been added yet.</p>
                <Button href="/profile/relationships" class="mt-4">Add Relationships</Button>
            </div>
        </div>
    {:else if error}
        <div class="flex items-center justify-center h-full">
            <Alert variant="destructive" class="max-w-md">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
    {:else if !loaded}
        <div class="flex items-center justify-center h-full">
            <div
                class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin">
            </div>
        </div>
    {/if}

    <div bind:this={treeContainer} class="tree-container f3"></div>
</section>

<style>
.family-tree-page {
    height: calc(100vh - 8rem);
    position: relative;
    overflow: hidden;
}

.tree-container {
    width: 100%;
    height: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
}

.tree-container :global(.links_view path) {
    stroke: var(--border);
    stroke-width: 1.5;
    fill: none;
}
</style>
