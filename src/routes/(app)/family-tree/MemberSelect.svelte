<script lang="ts">
type Member = { id: string; name: string }

type Props = {
    members: Member[]
    value: string
    name: string
    placeholder?: string
}

let { members, value = $bindable(''), name, placeholder = 'Search members…' }: Props = $props()

let search = $state('')
let open = $state(false)

$effect(() => {
    if (!value) {
        search = ''
    } else {
        const m = members.find((m) => m.id === value)
        if (m) {
            search = m.name
        }
    }
})

let filtered = $derived(
    search.trim()
        ? members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
        : [...members].sort((a, b) => a.name.localeCompare(b.name)),
)

function handleInput() {
    value = ''
    open = true
}

function handleSelect(member: Member) {
    value = member.id
    search = member.name
    open = false
}

function handleBlur() {
    setTimeout(() => {
        open = false
        if (!value) {
            search = ''
        }
    }, 150)
}
</script>

<div class="relative">
    <input type="hidden" {name} {value} />
    <input
        type="text"
        bind:value={search}
        {placeholder}
        oninput={handleInput}
        onfocus={() => (open = true)}
        onblur={handleBlur}
        autocomplete="off"
        class="border-input bg-background focus:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1" />
    {#if open && filtered.length > 0}
        <div
            class="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
            {#each filtered as member}
                <button
                    type="button"
                    class="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left"
                    onmousedown={() => handleSelect(member)}>
                    {member.name}
                </button>
            {/each}
        </div>
    {/if}
</div>
