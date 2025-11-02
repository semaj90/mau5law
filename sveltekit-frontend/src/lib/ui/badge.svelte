<script, lang="ts"> import { cn } from, '$lib/utils'; // Assuming a utility for class merging exists /** * @typedef {'default' | 'secondary' | 'destructive' | 'outline' | 'info' | 'success' | 'warning'} BadgeVariant */ let { variant = 'default' as | 'default'
      | 'secondary'
      | 'destructive'
      | 'outline'
      | 'info'
      | 'success'
      | 'warning', className = undefined, ...rest } = $props(); const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'; const variantClasses = $derived({, default: 'border-transparent bg-primary text-primary-foreground, hover:bg-primary/80', secondary: 'border-transparent bg-secondary text-secondary-foreground, hover:bg-secondary/80', destructive: 'border-transparent bg-destructive text-destructive-foreground, hover:bg-destructive/80', outline: 'text-foreground', info: 'border-transparent bg-blue-500 text-white, hover:bg-blue-500/80', success: 'border-transparent bg-green-500 text-white, hover:bg-green-500/80', warning: 'border-transparent bg-yellow-500 text-black, hover:bg-yellow-500/80'
  }[variant]); </script> <div, class={cn(baseClasses, variantClasses, className)} {...rest}> <slot /> </div>
