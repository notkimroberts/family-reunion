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

let {
    registrationId,
    open = $bindable(false),
}: {
    registrationId: string
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
                <AlertDialogTitle>Cancel your registration?</AlertDialogTitle>
                <AlertDialogDescription>
                    Your entire registration will be cancelled and a full refund issued to the
                    original payment method.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Keep registration</AlertDialogCancel>
                <Button variant="destructive" onclick={() => (step = 2)}>Continue</Button>
            </AlertDialogFooter>
        {:else}
            <AlertDialogHeader>
                <AlertDialogTitle>Are you really sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently cancel your registration and cannot be undone. Everyone in
                    your party will be removed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="outline" onclick={() => (step = 1)}>Go back</Button>
                <form method="POST" action="?/cancel" use:enhance>
                    <input type="hidden" name="registrationId" value={registrationId} />
                    <AlertDialogAction
                        type="submit"
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, cancel registration
                    </AlertDialogAction>
                </form>
            </AlertDialogFooter>
        {/if}
    </AlertDialogContent>
</AlertDialog>
