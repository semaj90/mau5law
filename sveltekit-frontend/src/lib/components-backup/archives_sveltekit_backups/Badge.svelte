<script lang="ts">
  interface Props {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    size?: 'default' | 'sm' | 'lg';
    children?: import('svelte').Snippet;
  }

  let { variant = 'default', size = 'default', children }: Props = $props();
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input'
  };
  const sizes = {
    default: 'px-2.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };
</script>

<span className="${1}">
  {@render children?.()}
</span>
