# IconContainer Component

A responsive icon wrapper component that uses CSS container queries to adapt Lucide icons to their container size.

## Features

- **Container Query Responsive**: Icons automatically scale based on their parent container's width
- **Multiple Sizes**: Supports xs, sm, md, lg, xl, and 2xl size variants
- **Lucide Integration**: Works with any Lucide Svelte icon
- **Tailwind Compatible**: Uses Tailwind CSS classes for styling

## Installation

The component is already installed and configured in the UI component system.

## Usage

```svelte
<script>
  import { Search, User, Download } from 'lucide-svelte';
  import { IconContainer } from '$lib/components/ui';
</script>

<!-- Basic usage -->
<IconContainer icon={Search} size="md" />

<!-- With custom classes -->
<IconContainer icon={User} size="lg" class="text-blue-500" />

<!-- In buttons -->
<button class="flex items-center gap-2">
  <IconContainer icon={Download} size="sm" />
  Download
</button>
```

## Size Variants

- `xs`: 12px (h-3 w-3) - scales up in larger containers
- `sm`: 16px (h-4 w-4) - scales up in larger containers
- `md`: 20px (h-5 w-5) - scales up in larger containers
- `lg`: 24px (h-6 w-6) - scales up in larger containers
- `xl`: 32px (h-8 w-8) - scales up in larger containers
- `2xl`: 40px (h-10 w-10) - scales up in larger containers

## Container Query Breakpoints

Icons scale up at these container widths:

- **≥640px**: +1 size level (xs→sm, sm→md, etc.)
- **≥768px**: +2 size levels from base
- **≥1024px**: +3 size levels from base
- **≥1280px**: +4 size levels from base

## Demo

Visit `/icon-demo` to see the component in action with different container sizes.

## Technical Details

- Uses CSS `container-type: inline-size`
- Requires `@tailwindcss/container-queries` plugin
- Container queries provide better responsive design than viewport-based media queries
- Icons inherit text color from parent context

## Migration from Direct Lucide Usage

Replace:
```svelte
<Search class="h-4 w-4" />
```

With:
```svelte
<IconContainer icon={Search} size="sm" />
```

The component automatically handles responsive scaling based on container size.