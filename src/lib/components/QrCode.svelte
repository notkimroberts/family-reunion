<script lang="ts">
import { encode } from 'uqr'
import { cn } from '$lib/utils'

/* The quiet zone the QR spec asks for, in modules. */
const QR_BORDER = 4

/* A QR code drawn as one SVG path, so no {@html} and no image request. Always dark on white, in
   both themes: an authenticator app's scanner needs dark modules on a light ground. */
let {
    value,
    label,
    class: className = '',
}: { value: string; label: string; class?: string } = $props()

let qr = $derived(encode(value, { border: QR_BORDER }))
let modulesPath = $derived(
    qr.data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join(''),
)
</script>

<svg
    viewBox="0 0 {qr.size} {qr.size}"
    role="img"
    aria-label={label}
    shape-rendering="crispEdges"
    class={cn('size-48 rounded-lg bg-white', className)}>
    <path d={modulesPath} class="fill-neutral-950" />
</svg>
