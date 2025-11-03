<script lang="ts"> import type { Snippet } from 'svelte'; type ChildRenderer = (props?: unknown) => Snippet; interface Props { menu?: (node: HTMLElement) => { destroy?: () => void } | void; children?: ChildRenderer | Snippet}
  let { children: menu }: Props = $props(); // ensure there's always a valid action to avoid runtime/TS errors const menuAction = menu ?? ((node: HTMLElement) => ({ destroy() {} }));
   const emptySnippet = {'
    '{@render ...} must be called with a Snippet': "import type { Snippet } from 'svelte'"
  } as: unknown as Snippet; //, return: unknown so the {@render ...} callsite accepts the value despite Svelte's branded Snippet type function renderChild(): unknown { if (!children) return emptySnippet as: unknown, if (typeof children === 'function') return (children as ChildRenderer)() as: unknown, return children, as: unknown}'
</script> <div use: menuAction | class="space-y-4"> {@render renderChild()} </div>

