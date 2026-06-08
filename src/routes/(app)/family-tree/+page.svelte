<script lang="ts">
import { Minus, MoveHorizontal, MoveVertical, Plus } from '@lucide/svelte'
import { Select as BitsSelect } from 'bits-ui'
import { select } from 'd3-selection'
import { zoomIdentity } from 'd3-zoom'
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import { onDestroy, onMount } from 'svelte'
import { enhance } from '$app/forms'
import { goto } from '$app/navigation'
import { BirthDateInput, MemberSelect } from '$lib/components'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Avatar, AvatarFallback } from '$lib/components/ui/avatar'
import { Button } from '$lib/components/ui/button'
import { Card } from '$lib/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '$lib/components/ui/dialog'
import { Input } from '$lib/components/ui/input'
import * as Select from '$lib/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { APP_NAME } from '$lib/general/constants'
import { getInitials } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'

function handleMemberClick(id: string) {
    goto(`/family-tree/${id}`)
}

/* After family-chart's initial fit, drive d3-zoom directly to place the founding
   couple's midpoint near the top of the viewport at a closer zoom level. We do
   this ourselves instead of using family-chart's `tree_position: 'main_to_middle'`
   because chained updateTree calls schedule competing d3 transitions and the
   second one (with scale/position) gets clobbered by an interrupted transition. */
const TARGET_SCALE = 0.7
const TOP_MARGIN_PX = 100

type ZoomLike = {
    transform: (s: unknown, t: unknown) => unknown
    scaleBy: (s: unknown, k: number) => unknown
}
type LayoutNode = { x: number; y: number; data: { id: string } }
type ChartLike = {
    svg: SVGElement
    store: { getTree: () => { data: LayoutNode[] } | undefined }
    setOrientationVertical: () => unknown
    setOrientationHorizontal: () => unknown
    updateTree: (props: {
        initial?: boolean
        tree_position?: 'fit' | 'main_to_middle' | 'inherit'
    }) => unknown
    updateMainId: (id: string) => unknown
    destroy?: () => void
}

function positionFoundingCoupleAtTop(
    chart: ChartLike,
    mainId: string,
    spouseId: string | undefined,
    container: HTMLDivElement,
) {
    const tree = chart.store.getTree()
    if (!tree) {
        return
    }
    const main = tree.data.find((n) => n.data.id === mainId)
    if (!main) {
        return
    }
    const spouse = spouseId ? tree.data.find((n) => n.data.id === spouseId) : undefined
    const centerX = spouse ? (main.x + spouse.x) / 2 : main.x
    const centerY = main.y

    const listener = (
        (chart.svg as unknown as { __zoomObj?: unknown }).__zoomObj
            ? chart.svg
            : (chart.svg.parentNode as Element | null)
    ) as (Element & { __zoomObj?: ZoomLike }) | null
    const zoom = listener?.__zoomObj
    if (!listener || !zoom) {
        return
    }

    const k = TARGET_SCALE
    const tx = container.clientWidth / 2 - centerX * k
    const ty = TOP_MARGIN_PX - centerY * k
    const transform = zoomIdentity.translate(tx, ty).scale(k)
    zoom.transform(select(listener), transform)
}

const ZOOM_STEP = 1.4

function zoomBy(chart: ChartLike | undefined, factor: number) {
    if (!chart) {
        return
    }
    const listener = (
        (chart.svg as unknown as { __zoomObj?: unknown }).__zoomObj
            ? chart.svg
            : (chart.svg.parentNode as Element | null)
    ) as (Element & { __zoomObj?: ZoomLike }) | null
    const zoom = listener?.__zoomObj
    if (!listener || !zoom) {
        return
    }
    zoom.scaleBy(select(listener), factor)
}

let addOpen = $state(false)
let addFirstName = $state('')
let addLastName = $state('')
let addBirthYear = $state<number | null>(null)
let addBirthMonth = $state<number | null>(null)
let addBirthDay = $state<number | null>(null)
let addRelationshipType = $state('')
let addRelatedMemberId = $state('')

let addName = $derived(`${addFirstName.trim()} ${addLastName.trim()}`.trim())

let { data } = $props()
let treeContainer: HTMLDivElement
let loaded = $state(false)
let error = $state('')
let search = $state('')
let view = $state<'tree' | 'table'>('tree')

let isAdmin = $derived(data.user?.role === 'admin')

let filtered = $derived(
    data.members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
)

let relationshipCounts = $derived(
    new Map(
        data.members.map((m) => {
            const rels = data.relationships.filter((r) => r.from === m.id || r.to === m.id)
            const spouseCount = new Set(
                rels
                    .filter((r) => r.type === 'spouse')
                    .map((r) => (r.from === m.id ? r.to : r.from)),
            ).size
            const childCount = new Set(
                rels.filter((r) => r.type === 'parent' && r.from === m.id).map((r) => r.to),
            ).size
            const parentCount = new Set(
                rels.filter((r) => r.type === 'child' && r.from === m.id).map((r) => r.to),
            ).size
            const parts: string[] = []
            if (spouseCount > 0) {
                parts.push(`${spouseCount} ${spouseCount === 1 ? 'spouse' : 'spouses'}`)
            }
            if (childCount > 0) {
                parts.push(`${childCount} ${childCount === 1 ? 'child' : 'children'}`)
            }
            if (parentCount > 0) {
                parts.push(`${parentCount} ${parentCount === 1 ? 'parent' : 'parents'}`)
            }
            return [m.id, parts.join(' · ')]
        }),
    ),
)

let chartInstance = $state<ChartLike | undefined>(undefined)
let rootId: string | undefined
let rootSpouseId: string | undefined
let orientation = $state<'vertical' | 'horizontal'>('vertical')

/* Apply orientation and re-render. In vertical layout, re-anchor the founding
   couple at the top (matching the initial render). In horizontal, let the
   library center on `main`. */
function applyChartSettings() {
    const chart = chartInstance
    if (!chart) {
        return
    }
    if (orientation === 'horizontal') {
        chart.setOrientationHorizontal()
    } else {
        chart.setOrientationVertical()
    }
    chart.updateTree({ tree_position: 'main_to_middle' })
    if (orientation === 'vertical' && rootId) {
        const id = rootId
        const spouseId = rootSpouseId
        requestAnimationFrame(() => {
            positionFoundingCoupleAtTop(chart, id, spouseId, treeContainer)
        })
    }
}

function handleSetOrientation(next: 'vertical' | 'horizontal') {
    if (orientation === next) {
        return
    }
    orientation = next
    applyChartSettings()
}

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
                    born: formatPartialBirthDate(m.birthYear, m.birthMonth, m.birthDay) ?? '',
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
            chartInstance = f3Chart as unknown as ChartLike
            f3Chart.setSingleParentEmptyCard(false)
            f3Chart.setCardHtml().setCardInnerHtmlCreator((d) => {
                const name = `${d.data.data['first name']} ${d.data.data['last name']}`.trim()
                const photo = `<div style="width:2rem;height:2rem;border-radius:9999px;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;flex-shrink:0">${getInitials(name)}</div>`
                return `
                    <div style="background:var(--card);border:1px solid var(--border);border-radius:0.5rem;padding:0.75rem;display:flex;align-items:center;gap:0.75rem;width:12rem;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
                        ${photo}
                        <div style="min-width:0">
                            <div style="font-weight:500;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--foreground)">${name}</div>
                            <div style="font-size:0.75rem;color:var(--muted-foreground)">${d.data.data.born ? `Born ${d.data.data.born}` : ''}</div>
                        </div>
                    </div>
                `
            })

            /* Pick the founding-ancestor couple as the centered "main" — earliest birth year
               with no recorded parents in the relationship graph. Falls back to the earliest
               birth year overall, then to the first node. */
            const parentedIds = new Set(
                data.relationships
                    .filter((r) => r.type === 'child' || r.type === 'parent')
                    .map((r) => (r.type === 'child' ? r.from : r.to)),
            )
            const candidates = data.members.filter((m) => m.birthYear !== null)
            const rooted = candidates.filter((m) => !parentedIds.has(m.id))
            const root = (rooted.length ? rooted : candidates).reduce<
                (typeof candidates)[number] | null
            >(
                (acc, m) =>
                    !acc ||
                    (m.birthYear !== null && acc.birthYear !== null && m.birthYear < acc.birthYear)
                        ? m
                        : acc,
                null,
            )
            if (root) {
                f3Chart.updateMainId(root.id)
                rootId = root.id
            }

            /* family-chart forces a 'fit' on initial:true regardless of tree_position,
               so we render once to lay out the cards, then take direct control of the
               d3 zoom transform on the next animation frame (after the fit transition
               settles). We center on the midpoint of the founding couple, not just on
               the main, so both cards sit horizontally centered. */
            f3Chart.updateTree({ initial: true })

            let spouseId: string | undefined
            if (root) {
                const spouseRel = data.relationships.find(
                    (r) => r.type === 'spouse' && (r.from === root.id || r.to === root.id),
                )
                if (spouseRel) {
                    spouseId = spouseRel.from === root.id ? spouseRel.to : spouseRel.from
                    rootSpouseId = spouseId
                }
            }

            if (root) {
                requestAnimationFrame(() => {
                    positionFoundingCoupleAtTop(
                        f3Chart as unknown as ChartLike,
                        root.id,
                        spouseId,
                        treeContainer,
                    )
                })
            }
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

<svelte:head>
    <title>Family Tree — {APP_NAME}</title>
</svelte:head>
<section class="col-span-12 hidden lg:flex items-center gap-3">
    {#if view === 'table'}
        <Input type="text" class="max-w-sm" placeholder="Search by name..." bind:value={search} />
    {/if}
    {#if isAdmin}
        <Button variant="outline" size="sm" onclick={() => (addOpen = true)}>+ Add Member</Button>
    {/if}
    {#if view === 'tree'}
        <div class="ml-auto flex items-center rounded-lg border bg-muted p-1 gap-1">
            <Button
                variant={orientation === 'vertical' ? 'default' : 'ghost'}
                size="sm"
                aria-label="Vertical layout"
                onclick={() => handleSetOrientation('vertical')}>
                <MoveVertical class="h-4 w-4" />
            </Button>
            <Button
                variant={orientation === 'horizontal' ? 'default' : 'ghost'}
                size="sm"
                aria-label="Horizontal layout"
                onclick={() => handleSetOrientation('horizontal')}>
                <MoveHorizontal class="h-4 w-4" />
            </Button>
        </div>
    {/if}
    <div
        class="flex items-center rounded-lg border bg-muted p-1 gap-1"
        class:ml-auto={view === 'table'}>
        <Button
            variant={view === 'tree' ? 'default' : 'ghost'}
            size="sm"
            onclick={() => (view = 'tree')}>Tree</Button>
        <Button
            variant={view === 'table' ? 'default' : 'ghost'}
            size="sm"
            onclick={() => (view = 'table')}>Table</Button>
    </div>
</section>

<!-- Mobile: search + card grid (always shown on small screens) -->
<section class="col-span-12 lg:hidden">
    <div class="flex items-center gap-3 mb-4">
        <Input type="text" class="flex-1" placeholder="Search by name..." bind:value={search} />
        {#if isAdmin}
            <Button variant="outline" size="sm" onclick={() => (addOpen = true)}>+ Add</Button>
        {/if}
    </div>
    {#if data.members.length === 0}
        <div class="text-center py-12">
            <p class="text-muted-foreground text-lg">No family members have been added yet.</p>
        </div>
    {:else if filtered.length === 0}
        <p class="text-muted-foreground">No family members found.</p>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each filtered as member}
                <a href="/family-tree/{member.id}" class="block">
                    <Card class="p-4 hover:bg-accent transition-colors">
                        <div class="flex items-center gap-4">
                            <Avatar class="w-12 h-12 shrink-0">
                                <AvatarFallback class="bg-primary text-primary-foreground text-lg">
                                    {getInitials(member.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3>{member.name}</h3>
                                {#if member.birthYear}
                                    <p class="text-sm text-muted-foreground">
                                        Born {formatPartialBirthDate(
                                            member.birthYear,
                                            member.birthMonth,
                                            member.birthDay,
                                        )}
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </Card>
                </a>
            {/each}
        </div>
    {/if}
</section>

<!-- Desktop tree view (always in DOM to preserve chart state) -->
<section
    class="border border-gray-500 rounded-xl col-span-12 desktop-view family-tree-page"
    class:active={view === 'tree'}>
    {#if data.members.length === 0}
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <p class="text-muted-foreground text-lg">No family members have been added yet.</p>
                {#if isAdmin}
                    <Button onclick={() => (addOpen = true)} class="mt-4">+ Add Member</Button>
                {/if}
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
    {#if loaded && !error && data.members.length > 0}
        <div class="zoom-controls">
            <Button
                variant="outline"
                size="icon"
                aria-label="Zoom in"
                onclick={() => zoomBy(chartInstance, ZOOM_STEP)}>
                <Plus class="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                aria-label="Zoom out"
                onclick={() => zoomBy(chartInstance, 1 / ZOOM_STEP)}>
                <Minus class="h-4 w-4" />
            </Button>
        </div>
    {/if}
</section>

<!-- Desktop table view (always in DOM, CSS-toggled) -->
<section class="col-span-12 desktop-view" class:active={view === 'table'}>
    {#if data.members.length === 0}
        <div class="text-center py-12">
            <p class="text-muted-foreground text-lg">No family members have been added yet.</p>
            {#if isAdmin}
                <Button onclick={() => (addOpen = true)} class="mt-4">+ Add Member</Button>
            {/if}
        </div>
    {:else if filtered.length === 0}
        <p class="text-muted-foreground">No family members found.</p>
    {:else}
        <Card>
            <div class="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Born</TableHead>
                            <TableHead>Relationships</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {#each filtered as member}
                            <TableRow
                                class="cursor-pointer"
                                onclick={() => handleMemberClick(member.id)}>
                                <TableCell>
                                    <div class="flex items-center gap-4">
                                        <Avatar class="w-10 h-10 shrink-0">
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
                                        {formatPartialBirthDate(
                                            member.birthYear,
                                            member.birthMonth,
                                            member.birthDay,
                                        )}
                                    {/if}
                                </TableCell>
                                <TableCell class="text-muted-foreground text-sm">
                                    {relationshipCounts.get(member.id) ?? ''}
                                </TableCell>
                            </TableRow>
                        {/each}
                    </TableBody>
                </Table>
            </div>
        </Card>
    {/if}
</section>

<!-- Add Member dialog -->
<Dialog bind:open={addOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
        </DialogHeader>
        <form
            method="POST"
            action="?/addMember"
            use:enhance={() => {
                return ({ result, update }) => {
                    if (result.type === 'success') {
                        addOpen = false
                        addFirstName = ''
                        addLastName = ''
                        addBirthYear = null
                        addBirthMonth = null
                        addBirthDay = null
                        addRelationshipType = ''
                        addRelatedMemberId = ''
                    }
                    update()
                }
            }}
            class="space-y-4 pt-2">
            <input type="hidden" name="name" value={addName} />
            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label for="addFirstName" class="text-xs font-medium text-muted-foreground">
                        First name <span class="text-destructive">*</span>
                    </label>
                    <Input
                        id="addFirstName"
                        type="text"
                        bind:value={addFirstName}
                        placeholder="First"
                        autocomplete="given-name"
                        required />
                </div>
                <div class="space-y-1">
                    <label for="addLastName" class="text-xs font-medium text-muted-foreground">
                        Last name <span class="text-destructive">*</span>
                    </label>
                    <Input
                        id="addLastName"
                        type="text"
                        bind:value={addLastName}
                        placeholder="Last"
                        autocomplete="family-name"
                        required />
                </div>
            </div>
            <div class="space-y-2">
                <span class="text-sm font-medium">Birthday</span>
                <p class="text-xs text-muted-foreground">
                    Year only is fine for ancestors when month/day aren't known.
                </p>
                <input
                    type="hidden"
                    name="birthYear"
                    value={addBirthYear !== null ? String(addBirthYear) : ''} />
                <input
                    type="hidden"
                    name="birthMonth"
                    value={addBirthMonth !== null ? String(addBirthMonth) : ''} />
                <input
                    type="hidden"
                    name="birthDay"
                    value={addBirthDay !== null ? String(addBirthDay) : ''} />
                <BirthDateInput
                    idPrefix="add-bday"
                    bind:year={addBirthYear}
                    bind:month={addBirthMonth}
                    bind:day={addBirthDay} />
            </div>
            {#if data.members.length > 0}
                <div class="border-t pt-4 space-y-3">
                    <p class="text-xs text-muted-foreground">
                        Relationship to existing member (optional)
                    </p>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="space-y-2">
                            <label for="addRelType" class="text-sm font-medium"
                                >This person is</label>
                            <Select.Root
                                type="single"
                                value={addRelationshipType}
                                onValueChange={(v) => (addRelationshipType = v)}
                                name="relationshipType">
                                <Select.Trigger id="addRelType">
                                    <BitsSelect.Value placeholder="— no relationship —" />
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="" label="— no relationship —" />
                                    <Select.Item value="parent" label="parent of" />
                                    <Select.Item value="child" label="child of" />
                                    <Select.Item value="spouse" label="spouse of" />
                                    <Select.Item value="sibling" label="sibling of" />
                                    <Select.Item value="grandparent" label="grandparent of" />
                                    <Select.Item value="grandchild" label="grandchild of" />
                                    <Select.Item value="aunt_uncle" label="aunt/uncle of" />
                                    <Select.Item value="niece_nephew" label="niece/nephew of" />
                                    <Select.Item value="cousin" label="cousin of" />
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="space-y-2">
                            <label for="addRelMember" class="text-sm font-medium">Member</label>
                            <MemberSelect
                                members={data.members}
                                bind:value={addRelatedMemberId}
                                name="relatedMemberId" />
                        </div>
                    </div>
                </div>
            {/if}
            <DialogFooter>
                <Button type="button" variant="ghost" onclick={() => (addOpen = false)}
                    >Cancel</Button>
                <Button type="submit">Add Member</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<style>
.desktop-view {
    display: none;
}

@media (min-width: 1024px) {
    .desktop-view.active {
        display: block;
    }
}

.family-tree-page {
    height: calc(100vh - 8rem);
    position: relative;
    overflow: hidden;
}

/* Break out of the layout's max-w-6xl container on wide screens so the tree
   has room to breathe. Capped at 100rem so it doesn't span absurdly wide on
   ultrawide monitors. */
@media (min-width: 1024px) {
    .family-tree-page {
        width: min(calc(100vw - 2rem), 100rem);
        margin-left: max(calc(-50vw + 50% + 1rem), calc(-50rem + 50%));
        margin-right: auto;
    }
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

.zoom-controls {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 10;
}
</style>
