<script lang="ts">
/* The Stripe brand mark, following FacebookIcon/InstagramIcon: a plain inline SVG rather than a
   dependency. currentColor by default so it can sit muted in a table row and still be legible in dark
   mode; pass fill="#635BFF" (Stripe's own purple) where the brand colour is wanted. */
let { class: className = 'h-4 w-4', fill = 'currentColor' }: { class?: string; fill?: string } =
    $props()
</script>

<svg class={className} viewBox="0 0 24 24" {fill} aria-hidden="true">
    <path
        d="M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.423-.977 1.667 0 3.379.642 4.558 1.22l.666-4.111c-.935-.446-2.847-1.177-5.49-1.177-1.87 0-3.425.489-4.536 1.401-1.155.954-1.75 2.334-1.75 4 0 3.023 1.845 4.312 4.845 5.4 1.933.688 2.579 1.178 2.579 1.934 0 .732-.629 1.155-1.762 1.155-1.402 0-3.716-.689-5.229-1.578l-.667 4.156c1.29.732 3.694 1.488 6.185 1.488 1.978 0 3.624-.467 4.735-1.356 1.245-.977 1.89-2.422 1.89-4.29 0-3.09-1.889-4.38-4.535-5.446z" />
</svg>
