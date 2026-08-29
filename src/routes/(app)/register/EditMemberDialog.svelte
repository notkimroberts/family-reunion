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
import { parseYesNo } from '$lib/utils/parseYesNo'
import ShirtSizeSelect from './ShirtSizeSelect.svelte'
import YesNoSelect from './YesNoSelect.svelte'
import type { EditableMember } from './types'

let {
    token,
    member,
    open = $bindable(false),
}: {
    token: string
    member: EditableMember
    open: boolean
} = $props()

let birthDate = $state(formatBirthDate(member.birthYear, member.birthMonth, member.birthDay))
let shirtSize = $state(member.shirtSize ?? '')
let vegetarianMeal = $state<'yes' | 'no' | ''>(
    member.vegetarianMeal === null ? '' : member.vegetarianMeal ? 'yes' : 'no',
)

/* Save is offered only when a field differs from what was loaded. Compared against `member` rather
   than a snapshot taken at mount, so there is nothing to keep in step with the seeding above.

   The meal answer compares as a boolean through parseYesNo — the same conversion the action applies
   to the posted value — so the check is in the units the database stores rather than in the strings
   the select happens to use. */
let hasChanges = $derived(
    birthDate !== formatBirthDate(member.birthYear, member.birthMonth, member.birthDay) ||
        shirtSize !== (member.shirtSize ?? '') ||
        parseYesNo(vegetarianMeal) !== (member.vegetarianMeal ?? undefined),
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
                /* update() is what re-runs the page load, and returning a callback at all REPLACES
                   SvelteKit's default handler — so without this line the save reached the database
                   and the party table went on showing the old birthday, shirt size and meal answer
                   until the registrant refreshed by hand. They had no reason to: the dialog closed
                   as though it had worked.

                   reset: false because every field is bound to local $state, and form.reset() would
                   put the DOM inputs back to their HTML defaults while the state kept the new
                   values. */
                return async ({ result, update }) => {
                    await update({ reset: false })
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
                <div class="space-y-2">
                    <label for="edit-shirtSize" class="text-sm font-medium">T-Shirt Size</label>
                    <ShirtSizeSelect
                        id="edit-shirtSize"
                        name="shirtSize"
                        bind:value={shirtSize}
                        emptyLabel="No shirt" />
                </div>
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
                <Button type="submit" disabled={!hasChanges}>Save changes</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
