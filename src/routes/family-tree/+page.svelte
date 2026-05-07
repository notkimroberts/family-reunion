<script lang="ts">
import 'family-chart/styles/family-chart.css'
import { onDestroy, onMount } from 'svelte'
import PageTitle from '$lib/components/PageTitle.svelte'
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
        const { createChart } = await import('family-chart')

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
                    ? `<div class="avatar"><div class="w-8 rounded-full"><img src="${d.data.data.photoUrl}" alt="" /></div></div>`
                    : `<div class="avatar placeholder"><div class="w-8 rounded-full bg-neutral text-neutral-content"><span class="text-xs">${getInitials(name)}</span></div></div>`
                return `
						<div class="card card-compact bg-base-300 shadow-md border border-base-300 w-48">
							<div class="card-body p-3 flex-row items-center gap-3">
								${photo}
								<div class="min-w-0">
									<h3 class="card-title text-sm truncate text-base-content">${name}</h3>
									<p class="text-xs text-base-content/60">${d.data.data.age ? `Age ${d.data.data.age}` : ''}</p>
								</div>
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

<PageTitle title="Family Tree" />

<!-- Mobile list view -->
<div class="px-4 py-6 md:hidden">
    {#if data.members.length === 0}
        <div class="text-center">
            <p class="text-base-content/60 text-lg">No family members have been added yet.</p>
            <a href="/profile/relationships" class="btn btn-primary mt-4">Add Relationships</a>
        </div>
    {:else}
        <h1 class="text-2xl font-bold mb-4">Family Tree</h1>
        <div class="space-y-3">
            {#each data.members as member}
                <div class="flex items-center gap-3 rounded-lg border border-base-200 p-3">
                    {#if member.photoUrl}
                        <div class="avatar">
                            <div class="w-10 rounded-full">
                                <img src={member.photoUrl} alt={member.name} />
                            </div>
                        </div>
                    {:else}
                        <div class="avatar placeholder">
                            <div class="w-10 rounded-full bg-neutral text-neutral-content">
                                <span class="text-sm">{getInitials(member.name)}</span>
                            </div>
                        </div>
                    {/if}
                    <div class="min-w-0 flex-1">
                        <p class="font-medium truncate">{member.name}</p>
                        <div class="flex gap-3 text-sm text-base-content/60">
                            {#if member.birthYear}
                                <span
                                    >Age {getAge(
                                        member.birthYear,
                                        member.birthMonth,
                                        member.birthDay,
                                    )}</span>
                            {/if}
                            <span>{relationshipLabels.get(member.id) ?? ''}</span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Desktop chart view -->
<div class="family-tree-page hidden md:block">
    {#if data.members.length === 0}
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <p class="text-base-content/60 text-lg">No family members have been added yet.</p>
                <a href="/profile/relationships" class="btn btn-primary mt-4">Add Relationships</a>
            </div>
        </div>
    {:else if error}
        <div class="flex items-center justify-center h-full">
            <div class="alert alert-error max-w-md">
                <span>{error}</span>
            </div>
        </div>
    {:else if !loaded}
        <div class="flex items-center justify-center h-full">
            <span class="loading loading-spinner loading-lg"></span>
        </div>
    {/if}

    <div bind:this={treeContainer} class="tree-container f3"></div>
</div>

<style>
.family-tree-page {
    height: calc(100vh - 4rem);
    position: relative;
    overflow: hidden;
    padding: 1rem;
}

.tree-container {
    width: 100%;
    height: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
}

.tree-container :global(.links_view path) {
    stroke: oklch(var(--bc) / 0.3);
    stroke-width: 1.5;
    fill: none;
}
</style>
