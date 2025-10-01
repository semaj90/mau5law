<script lang="ts">
  import { Progress as ProgressPrimitive } from "bits-ui";

  interface Props {
    value?: number;
    max?: number;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'yorha' | 'legal';
    class?: string;
  }

  let { value = 0, max = 100, variant = 'default', class: className = '' }: Props = $props();
</script>

<ProgressPrimitive.Root {value} {max} class="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 {className}">
  <ProgressPrimitive.Indicator
    class="h-full transition-all duration-300
    {variant === 'success' ? 'bg-green-500' : ''}
    {variant === 'error' ? 'bg-red-500' : ''}
    {variant === 'warning' ? 'bg-yellow-500' : ''}
    {variant === 'yorha' ? 'bg-black' : ''}
    {variant === 'legal' ? 'bg-indigo-600' : ''}
    {variant === 'default' ? 'bg-gray-600' : ''}"
  />
</ProgressPrimitive.Root>
