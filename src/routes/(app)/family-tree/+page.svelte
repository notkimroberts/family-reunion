<script lang="ts">
import { createChart } from 'family-chart'
import 'family-chart/styles/family-chart.css'
import { onDestroy, onMount } from 'svelte'
import { enhance } from '$app/forms'
import { goto } from '$app/navigation'
import { DatePicker } from '$lib/components'
import { Alert, AlertDescription } from '$lib/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '$lib/components/ui/table'
import { APP_NAME } from '$lib/general/constants'
import { getAge, getInitials } from '$lib/utils'
import MemberSelect from './MemberSelect.svelte'

function handleMemberClick(id: string) {
    goto(`/family-tree/${id}`)
}

let addOpen = $state(false)
let addBirthDate = $state<string | undefined>(undefined)
let addRelationshipType = $state('')
let addRelatedMemberId = $state('')

let { data } = $props()
let treeContainer: HTMLDivElement
let loaded = $state(false)
let error = $state('')
let search = $state('')
let view = $state<'tree' | 'table'>('tree')

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

let chartInstance: { destroy?: () => void } | undefined

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

<svelte:head>
    <title>Family Tree — {APP_NAME}</title>
</svelte:head>
<section class="col-span-12 hidden lg:flex items-center gap-3">
    {#if view === 'table'}
        <Input type="text" class="max-w-sm" placeholder="Search by name..." bind:value={search} />
    {/if}
    <Button variant="outline" size="sm" onclick={() => (addOpen = true)}>+ Add Member</Button>
    <div class="ml-auto flex items-center rounded-lg border bg-muted p-1 gap-1">
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
        <Button variant="outline" size="sm" onclick={() => (addOpen = true)}>+ Add</Button>
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
                                {#if member.photoUrl}
                                    <AvatarImage src={member.photoUrl} alt={member.name} />
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
                </a>
            {/each}
        </div>
    {/if}
</section>

<!-- Desktop tree view (always in DOM to preserve chart state) -->
<section class="col-span-12 desktop-view family-tree-page" class:active={view === 'tree'}>
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

<!-- Desktop table view (always in DOM, CSS-toggled) -->
<section class="col-span-12 desktop-view" class:active={view === 'table'}>
    {#if data.members.length === 0}
        <div class="text-center py-12">
            <p class="text-muted-foreground text-lg">No family members have been added yet.</p>
            <Button href="/profile/relationships" class="mt-4">Add Relationships</Button>
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
                            <TableHead>Age</TableHead>
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
                                            {#if member.photoUrl}
                                                <AvatarImage
                                                    src={member.photoUrl}
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
                        addBirthDate = undefined
                        addRelationshipType = ''
                        addRelatedMemberId = ''
                    }
                    update()
                }
            }}
            class="space-y-4 pt-2">
            <div class="space-y-2">
                <label for="addName" class="text-sm font-medium"
                    >Name <span class="text-destructive">*</span></label>
                <Input id="addName" name="name" type="text" placeholder="Full name" required />
            </div>
            <div class="space-y-2">
                <label for="addBirthDate" class="text-sm font-medium">Birthday</label>
                <input type="hidden" name="birthDate" value={addBirthDate ?? ''} />
                <DatePicker id="addBirthDate" bind:value={addBirthDate} placeholder="Optional" />
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
                            <select
                                id="addRelType"
                                name="relationshipType"
                                bind:value={addRelationshipType}
                                class="border-input bg-background focus:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1">
                                <option value="">— no relationship —</option>
                                <option value="parent">parent of</option>
                                <option value="child">child of</option>
                                <option value="spouse">spouse of</option>
                                <option value="sibling">sibling of</option>
                                <option value="grandparent">grandparent of</option>
                                <option value="grandchild">grandchild of</option>
                                <option value="aunt_uncle">aunt/uncle of</option>
                                <option value="niece_nephew">niece/nephew of</option>
                                <option value="cousin">cousin of</option>
                            </select>
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
            <div class="border-t pt-4 space-y-3">
                <p class="text-xs text-muted-foreground">Your details (for the edit log)</p>
                <div class="space-y-2">
                    <label for="addEditorName" class="text-sm font-medium"
                        >Your name <span class="text-destructive">*</span></label>
                    <Input
                        id="addEditorName"
                        name="editorName"
                        type="text"
                        placeholder="Your name"
                        required />
                </div>
                <div class="space-y-2">
                    <label for="addEditorEmail" class="text-sm font-medium"
                        >Your email <span class="text-destructive">*</span></label>
                    <Input
                        id="addEditorEmail"
                        name="editorEmail"
                        type="email"
                        placeholder="you@example.com"
                        required />
                </div>
            </div>
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
