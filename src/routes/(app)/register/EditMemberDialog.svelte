<script lang="ts">
import { enhance } from '$app/forms'
import { DatePicker } from '$lib/components'
import { Button } from '$lib/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '$lib/components/ui/dialog'
import { SHIRT_SIZES, selectClass } from '$lib/general/constants'

type Member = {
    id: string
    name: string
    birthDate: string | null
    shirtSize: string | null
    tierLabel: string
}

let {
    member,
    shirtsEnabled,
    open = $bindable(false),
}: {
    member: Member
    shirtsEnabled: boolean
    open: boolean
} = $props()

let birthDate = $state(member.birthDate ?? undefined)
let shirtSize = $state(member.shirtSize ?? '')
</script>

<Dialog bind:open>
    <DialogContent class="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>Edit {member.name}</DialogTitle>
        </DialogHeader>
        <form
            method="POST"
            action="?/update_member"
            use:enhance={() => {
                return ({ result }) => {
                    if (result.type === 'success') {
                        open = false
                    }
                }
            }}>
            <input type="hidden" name="memberId" value={member.id} />
            <input type="hidden" name="birthDate" value={birthDate ?? ''} />

            <div class="space-y-4 py-4">
                <div class="space-y-2">
                    <label for="edit-birthDate" class="text-sm font-medium">Birthday</label>
                    <DatePicker
                        id="edit-birthDate"
                        bind:value={birthDate}
                        placeholder="Select birthday" />
                </div>
                {#if shirtsEnabled}
                    <div class="space-y-2">
                        <label for="edit-shirtSize" class="text-sm font-medium">T-Shirt Size</label>
                        <select
                            id="edit-shirtSize"
                            name="shirtSize"
                            bind:value={shirtSize}
                            class={selectClass}>
                            <option value="">No shirt</option>
                            {#each SHIRT_SIZES as size (size)}
                                <option value={size}>{size}</option>
                            {/each}
                        </select>
                    </div>
                {/if}
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onclick={() => (open = false)}>
                    Cancel
                </Button>
                <Button type="submit">Save changes</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
