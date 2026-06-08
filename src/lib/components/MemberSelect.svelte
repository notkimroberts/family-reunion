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
let lastSyncedValue = $state<string | undefined>(undefined)

/* Sync `search` to the selected member's name only when `value` itself changes (initial
   mount, dialog reopen with a different attendee). User-driven typing must NOT trigger
   this sync — otherwise every keystroke would be overwritten with the prior selection. */
$effect(() => {
    if (value !== lastSyncedValue) {
        lastSyncedValue = value
        if (value) {
            const m = members.find((m) => m.id === value)
            search = m ? m.name : ''
        } else {
            search = ''
        }
    }
})

let filtered = $derived(
    search.trim()
        ? members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
        : [...members].sort((a, b) => a.name.localeCompare(b.name)),
)

function handleInput() {
    open = true
}

function handleSelect(member: Member) {
    value = member.id
    lastSyncedValue = member.id
    search = member.name
    open = false
}

function handleBlur() {
    setTimeout(() => {
        open = false
        if (search.trim() === '') {
            /* Empty input = unlink. */
            value = ''
            lastSyncedValue = ''
        } else if (value) {
            /* User typed but didn't pick — restore the prior selection's name. */
            const m = members.find((m) => m.id === value)
            if (m) {
                search = m.name
            }
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
