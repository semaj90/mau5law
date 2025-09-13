<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { Select } from 'bits-ui';

  interface Props {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: any;
  }

  let { value = $bindable(), onValueChange, children, ...restProps }: Props = $props();
</script>

<Select.Root bind:value {onValueChange} {...restProps}>
  {@render children?.()}
</Select.Root>
