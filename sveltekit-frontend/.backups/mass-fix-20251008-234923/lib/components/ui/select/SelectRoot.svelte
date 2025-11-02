<script lang="ts">
  import { Select } from 'bits-ui';
  interface Props {
    value?: string;
    onValueChange?: (_value: string) => void;
    children?: unknown;
  }
  let { value = $bindable(), onValueChange, children, ...restProps }: Props = $props();
</script>

<Select bind:value {onValueChange} {...restProps}>
  {@render children?.()}
</Select>
;