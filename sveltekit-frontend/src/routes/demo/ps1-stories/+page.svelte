<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open
https://svelte.dev/e/element_invalid_closing_tag -->
<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open -->
<script lang="ts">
</script>
	import PS1Surface from '../../../stories/PS1Surface.stories.svelte';
	import PS1ParallaxDynamic from '../../../stories/PS1ParallaxDynamic.stories.svelte';
	
	let activeDemo = $state('surface');
</script>

<svelte:head>
	<title>PS1 Stories Demo - Legal AI Platform</title>
	<meta name="description" content="PlayStation 1 inspired visual components demo" />
</svelte:head>

<div class="ps1-stories-page">
	<header class="demo-header">
		<h1 class="ps1-title">🎮 PS1 Stories Demo</h1>
		<p class="subtitle">PlayStation 1 inspired visual components</p>
		
		<nav class="demo-nav">
			<button 
				class="nav-btn {activeDemo === 'surface' ? 'active' : ''}"
				onclick={() => activeDemo = 'surface'}
			>
				🔷 Surface Rendering
			</button>
			<button 
				class="nav-btn {activeDemo === 'parallax' ? 'active' : ''}"
				onclick={() => activeDemo = 'parallax'}
			>
				🌟 Dynamic Parallax
			</button>
		</nav>
	</header>
	
	<main class="demo-container">
		{#if activeDemo === 'surface'}
			<div class="story-wrapper">
				<PS1Surface />
			</div>
		{:else if activeDemo === 'parallax'}
			<div class="story-wrapper">
				<PS1ParallaxDynamic />
			</div>
		{/if}
	</main>
</div>

<style>
	.ps1-stories-page {
		min-height: 100vh;
		background: #0a0a0a;
		color: #fff;
		font-family: 'Courier New', monospace;
	}
	
	.demo-header {
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		border-bottom: 2px solid #333;
		padding: 20px;
		text-align: center;
	}
	
	.ps1-title {
		font-size: 2.5em;
		color: #00ff88;
		text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
		margin-bottom: 10px;
	}
	
	.subtitle {
		color: #888;
		font-size: 16px;
		margin-bottom: 20px;
	}
	
	.demo-nav {
		display: flex;
		justify-content: center;
		gap: 15px;
		flex-wrap: wrap;
	}
	
	.nav-btn {
		background: #333;
		border: 2px solid #555;
		color: #ccc;
		padding: 12px 20px;
		font-family: inherit;
		font-size: 14px;
		cursor: pointer;
		border-radius: 6px;
		transition: all 0.3s;
		position: relative;
		overflow: hidden;
	}
	
	.nav-btn:hover {
		border-color: #00ff88;
		color: #00ff88;
		box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
	}
	
	.nav-btn.active {
		background: rgba(0, 255, 136, 0.1);
		border-color: #00ff88;
		color: #00ff88;
		box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
	}
	
	.nav-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.1), transparent);
		transition: left 0.5s;
	}
	
	.nav-btn:hover::before {
		left: 100%;
	}
	
	.demo-container {
		position: relative;
		width: 100%;
		overflow-x: hidden;
	}
	
	.story-wrapper {
		width: 100%;
		min-height: calc(100vh - 140px);
		animation: fadeIn 0.5s ease-in-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.ps1-title {
			font-size: 2em;
		}
		
		.demo-nav {
			flex-direction: column;
			align-items: center;
		}
		
		.nav-btn {
			min-width: 200px;
		}
	}
	
	/* PS1 Scanline effect for the entire page */
	.ps1-stories-page::before {
		content: '';
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			90deg,
			transparent,
			transparent 2px,
			rgba(0, 255, 136, 0.02) 2px,
			rgba(0, 255, 136, 0.02) 4px
		);
		pointer-events: none;
		z-index: 1000;
	}
</style>
