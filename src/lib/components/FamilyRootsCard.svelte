<script lang="ts">
import { Button } from '$lib/components/ui/button'
import { Card, CardContent } from '$lib/components/ui/card'

// Will and Roxie, with a link down to the family story (#story on /).
</script>

<Card>
    <CardContent class="flex items-start gap-4">
        <div class="flex shrink-0 -space-x-3">
            <img
                src="/will_portrait.png"
                alt="Will Patterson"
                class="ring-card size-14 rounded-full object-cover object-top ring-4" />
            <img
                src="/roxie_portrait.png"
                alt="Roxie Patterson"
                class="ring-card size-14 rounded-full object-cover object-top ring-4" />
        </div>
        <div class="flex flex-col items-start gap-2">
            <p class="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                Where we come from
            </p>
            <p class="text-base font-semibold">William &amp; Roxie Patterson</p>
            <p class="text-muted-foreground text-sm">
                Married December 26, 1890, they raised fifteen children. Every family at the reunion
                descends from them.
            </p>
            <Button href="#story" variant="outline">Read our family story</Button>
        </div>
    </CardContent>
</Card>
