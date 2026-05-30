<script lang="ts">
import { enhance } from '$app/forms'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '$lib/components/ui/alert-dialog'
import { Button } from '$lib/components/ui/button'
import { formatPrice } from '$lib/utils'

type Member = { id: string; name: string; priceCents: number }

let {
    member,
    open = $bindable(false),
}: {
    member: Member
    open: boolean
} = $props()

let step = $state(1)

$effect(() => {
    if (!open) {
        step = 1
    }
})
</script>

<AlertDialog bind:open>
    <AlertDialogContent>
        {#if step === 1}
            <AlertDialogHeader>
                <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                    A refund of ${formatPrice(member.priceCents)} will be issued to the original payment
                    method.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="destructive" onclick={() => (step = 2)}>Continue</Button>
            </AlertDialogFooter>
        {:else}
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    {member.name} will be permanently removed from your registration. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="outline" onclick={() => (step = 1)}>Go back</Button>
                <form
                    method="POST"
                    action="?/remove_member"
                    use:enhance={() =>
                        async ({ result, update }) => {
                            await update()
                            if (result.type === 'success') {
                                open = false
                            }
                        }}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <AlertDialogAction
                        type="submit"
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, remove
                    </AlertDialogAction>
                </form>
            </AlertDialogFooter>
        {/if}
    </AlertDialogContent>
</AlertDialog>
