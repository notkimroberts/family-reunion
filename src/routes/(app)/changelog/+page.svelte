<script lang="ts">
type Props = {
    data: {
        html: string
    }
}

let { data }: Props = $props()
</script>

<section class="card bg-base-100 col-span-12 xl:col-span-8 xl:col-start-3 shadow-xs">
    <div class="card-body">
        <article class="prose prose-sm max-w-none">
            {@html data.html}
        </article>
    </div>
</section>
