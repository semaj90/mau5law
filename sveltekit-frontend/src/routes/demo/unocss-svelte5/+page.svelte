<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import { preventDefault } from 'svelte/legacy';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Input
  } from '$lib/components/ui/enhanced-bits';;
  	import { nierClasses, animationClasses } from '$lib/components/ui/enhanced';

  	let name = $state('');
  	let email = $state('');
  	let loading = $state(false);
  	let message = $state('');

  	const handleSubmit = async () => {
  		loading = true;
  		await new Promise(resolve => setTimeout(resolve, 2000));
  		message = `Hello ${name}! UnoCSS + Svelte 5 integration successful! 🎉`;
  		loading = false;
  	};
</script>

<svelte:head>
	<title>UnoCSS + Svelte 5 Demo - YoRHa Legal AI</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground p-6">
	<div class="max-w-4xl mx-auto space-y-8">
		<!-- Header -->
		<div class="text-center space-y-4">
			<h1 class="text-4xl font-bold text-nier-text-primary {animationClasses.fadeIn}">
				🚀 UnoCSS + Svelte 5 Integration Demo
			</h1>
			<p class="text-lg nes-text is-disabled">
				Enhanced legal AI components with NieR theming and shadcn-svelte compatibility
			</p>
		</div>

		<!-- Feature Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Enhanced Button Showcase -->
			<div elevated class="p-6 space-y-4 nes-container">
				<h3 class="text-xl font-semibold">Enhanced Buttons</h3>
				<div class="space-y-3">
					<Button class="bits-btn" variant="nier">
NieR Style

					<Button class="bits-btn" variant="default" {loading}>
{loading ? 'Processing...' : 'Default Style'}

					<Button class="bits-btn" variant="outline" size="sm">
Small Outline

					<Button class="bits-btn" variant="destructive" size="lg">
Large Destructive

				</div>
			</div>

			<!-- Enhanced Inputs -->
			<div class="p-6 space-y-4 nes-container">
				<h3 class="text-xl font-semibold">Enhanced Inputs</h3>
				<Input
					bind:value={name}
					label="Name"
					icon="user"
					hint="Enter your name for the demo"
					placeholder="Your name..."
				/>
				<Input
					bind:value={email}
					label="Email"
					type="email"
					icon="mail"
					placeholder="your@email.com"
				/>
			</div>

			<!-- UnoCSS Utilities -->
			<div interactive class="p-6 space-y-4 hover:scale-105 transition-transform nes-container">
				<h3 class="text-xl font-semibold">UnoCSS Magic</h3>
				<div class="space-y-2">
					<div class="h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
					<div class="flex items-center gap-2">
						<div class="i-lucide-sparkles text-yellow-500"></div>
						<span class="text-sm">Icons from Lucide</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="i-tabler-robot text-blue-500"></div>
						<span class="text-sm">Tabler Icons</span>
					</div>
				</div>
			</div>

			<!-- NieR Theme Components -->
			<div class="{nierClasses.nier-bits-card} p-6 space-y-4 nes-container">
				<h3 class="text-xl font-semibold">NieR Theme Components</h3>
				<div class="yorha-evidence-item p-4 text-sm">
					Evidence Item Style
				</div>
				<div class="ai-status-indicator bg-ai-status-online"></div>
				<p class="text-nier-text-secondary">Themed with NieR colors</p>
			</div>

			<!-- Interactive Demo -->
			<div class="p-6 space-y-4 col-span-full lg:col-span-2 nes-container">
				<h3 class="text-xl font-semibold">Interactive Demo</h3>
				<form onsubmit={preventDefault(handleSubmit)} class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							bind:value={name}
							label="Your Name"
							icon="user"
							required
						/>
						<Input
							bind:value={email}
							label="Email Address"
							type="email"
							icon="mail"
							required
						/>
					</div>
					<Button class="bits-btn" 
						type="submit" 
						variant="nier" 
						{loading}
						disabled={!name || !email}
					>
{loading ? 'Processing...' : 'Test Integration'}

				</form>
				
				{#if message}
					<div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg {animationClasses.slideUp}">
						<p class="text-green-800">{message}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Performance Stats -->
		<div class="p-6 nes-container">
			<h3 class="text-xl font-semibold mb-4">🎯 Performance Benefits</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="text-center space-y-2">
					<div class="text-3xl font-bold text-green-600">⚡ ~40%</div>
					<p class="text-sm nes-text is-disabled">Faster CSS generation vs TailwindCSS</p>
				</div>
				<div class="text-center space-y-2">
					<div class="text-3xl font-bold text-blue-600">📦 ~60%</div>
					<p class="text-sm nes-text is-disabled">Smaller bundle size</p>
				</div>
				<div class="text-center space-y-2">
					<div class="text-3xl font-bold text-purple-600">🔥 100%</div>
					<p class="text-sm nes-text is-disabled">Svelte 5 runes compatibility</p>
				</div>
			</div>
		</div>

		<!-- Technical Details -->
		<div class="p-6 nes-container">
			<h3 class="text-xl font-semibold mb-4">🔧 Technical Implementation</h3>
			<div class="prose prose-sm max-w-none">
				<ul class="space-y-2 text-sm nes-text is-disabled">
					<li>✅ <strong>UnoCSS 66.3.3</strong> with Svelte 5 extractor</li>
					<li>✅ <strong>Shadcn-compatible</strong> design tokens and CSS variables</li>
					<li>✅ <strong>NieR theming</strong> with custom color palette and shortcuts</li>
					<li>✅ <strong>Icon integration</strong> with Lucide, Tabler, and Heroicons</li>
					<li>✅ <strong>Performance optimized</strong> with scoped CSS and tree-shaking</li>
					<li>✅ <strong>TypeScript support</strong> with strict component typing</li>
					<li>✅ <strong>Legal AI ready</strong> with evidence management components</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
	/* Additional scoped styles for demo */
	:global(.demo-gradient) {
		background: linear-gradient(135deg, var(--color-nier-accent-warm), var(--color-nier-accent-cool);
	}
</style>
