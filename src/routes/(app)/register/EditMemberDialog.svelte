<script lang="ts">
import { Select as BitsSelect } from 'bits-ui'
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
import * as Select from '$lib/components/ui/select'
import { SHIRT_SIZES } from '$lib/general/constants'
import { formatBirthDate } from '$lib/utils/age'

type Member = {
    id: string
    name: string
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
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

let birthDate = $state(formatBirthDate(member.birthYear, member.birthMonth, member.birthDay))
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
                        <Select.Root
                            type="single"
                            value={shirtSize}
                            onValueChange={(v) => (shirtSize = v)}
                            name="shirtSize">
                            <Select.Trigger id="edit-shirtSize">
                                <BitsSelect.Value placeholder="No shirt" />
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="" label="No shirt" />
                                {#each SHIRT_SIZES as size (size)}
                                    <Select.Item value={size} label={size} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
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
