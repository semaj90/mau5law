<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import { page } from '$app/state';
  	import { goto } from '$app/navigation';
  	import { cn } from '$lib/utils';
  	import Badge from '$lib/components/ui/Badge.svelte';
  	import Button from '$lib/components/ui/button/Button.svelte';
  	const navItems = [
  		{ href: '/', label: 'Dashboard', icon: '🏠' },
  		{ href: '/evidence/analyze', label: 'Evidence Analysis', icon: '🔍' },
  		{ href: '/cases', label: 'Cases', icon: '📁' },
  		{ href: '/semantic-search-demo', label: 'Search Demo', icon: '🔎' },
  		{ href: '/dev/self-prompting-demo', label: 'Agent Orchestration', icon: '🤖' },
  		{ href: '/dev/mcp-tools', label: 'MCP Tools', icon: '🔧' }
  	];
  	let currentPath = $derived(page.url.pathname)
  	// Optimized navigation with instant transitions
  	function handleNavigation(href: string, event?: Event) {
  		event?.preventDefault();
  		// Use replaceState for instant visual feedback, then navigate
  		history.pushState(null, '', href);
  		goto(href, { replaceState: false, noScroll: false, keepFocus: false, invalidateAll: false });
  	}
</script>

<nav class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between h-16">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<h1 class="text-xl font-bold">⚖️ Legal AI System</h1>
				</div>
				<div class="ml-10 flex items-center space-x-1">
					{#each navItems as item}
						<button class="nes-btn"
							variant={currentPath === item.href ? 'default' : 'ghost'}
							size="sm"
							onclick={() => handleNavigation(item.href)}
							class={cn(
								"justify-start gap-2 cursor-pointer transition-all duration-100",
								currentPath === item.href && "bg-muted"
							)}
						>
							<span>{item.icon}</span>
							{item.label}
						</button>
					{/each}
				</div>
			</div>
			
			<div class="flex items-center space-x-4">
				<!-- AI Search Button -->
				<button class="nes-btn"
					variant="outline"
					size="sm"
					onclick={() => {
						// Trigger global FindModal via Ctrl+K event
						window.dispatchEvent(new KeyboardEvent('keydown', {
							key: 'k',
							ctrlKey: true,
							bubbles: true
						}));
					}}
					class="gap-2"
				>
					<span>🔍</span>
					AI Search
				</button>
				
				<Badge variant="outline" class="gap-2">
					<span>🤖</span>
					Multi-Agent Pipeline
				</Badge>
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="System Online"></div>
					<span class="text-sm nes-text is-disabled">Online</span>
				</div>
			</div>
		</div>
	</div>
</nav>
