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
import { formatBirthDate } from '$lib/utils/age'
import ShirtSizeSelect from './ShirtSizeSelect.svelte'
import YesNoSelect from './YesNoSelect.svelte'
import type { EditableMember } from './types'

let {
    token,
    member,
    shirtsEnabled,
    open = $bindable(false),
}: {
    token: string
    member: EditableMember
    shirtsEnabled: boolean
    open: boolean
} = $props()

let birthDate = $state(formatBirthDate(member.birthYear, member.birthMonth, member.birthDay))
let shirtSize = $state(member.shirtSize ?? '')
let vegetarianMeal = $state<'yes' | 'no' | ''>(
    member.vegetarianMeal === null ? '' : member.vegetarianMeal ? 'yes' : 'no',
)
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
            <input type="hidden" name="token" value={token} />
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
                        <ShirtSizeSelect
                            id="edit-shirtSize"
                            name="shirtSize"
                            bind:value={shirtSize}
                            emptyLabel="No shirt" />
                    </div>
                {/if}
                <div class="space-y-2">
                    <label for="edit-vegetarian" class="text-sm font-medium"
                        >Vegetarian meal?</label>
                    <YesNoSelect
                        id="edit-vegetarian"
                        name="vegetarianMeal"
                        bind:value={vegetarianMeal}
                        allowClear />
                </div>
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
