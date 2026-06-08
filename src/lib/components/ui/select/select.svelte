<script lang="ts">
import { Select as SelectPrimitive } from 'bits-ui'

let { open = $bindable(false), ...restProps }: SelectPrimitive.RootProps = $props()
</script>

<SelectPrimitive.Root bind:open {...restProps} />
