<script lang="ts">
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let className = '';

  const base = 'inline-flex items-center justify-center rounded-2xl border transition-colors duration-150 select-none';
  const byVariant = {
    primary:   'bg-gray-900 text-white border-gray-900 hover:bg-gray-800',
    secondary: 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50',
    ghost:     'bg-transparent text-gray-700 border-transparent hover:bg-gray-100'
  }[variant];

  const bySize = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }[size];
</script>

<button {type} {disabled}
  class={`${base} ${byVariant} ${bySize} disabled:opacity-60 disabled:cursor-not-allowed ${className}`}>
  <slot />
</button>