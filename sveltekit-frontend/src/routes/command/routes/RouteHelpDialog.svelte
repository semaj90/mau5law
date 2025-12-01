<script lang="ts">
	import { Dialog } from 'bits-ui';

	let { open = $bindable(false) } = $props();
</script>

<Dialog.Root bind:open={open} closeOnEscape={true} closeOnOutsideClick={true}>
	<Dialog.Portal>
		<!-- Dimmed background -->
		<Dialog.Overlay class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />

		<!-- Centered modal -->
		<Dialog.Content class="fixed inset-0 z-50 flex items-center justify-center px-4">
			<div class="pkmn-water-frame">
				<div class="pkmn-water-inner">
					<!-- Header -->
					<header class="pkmn-modal-header">
						<div>
							<Dialog.Title class="pkmn-modal-title">
								"Drop what in there?"
							</Dialog.Title>
							<Dialog.Description class="pkmn-modal-subtitle">
								Files for the <span class="uppercase">/all-routes Command Center</span>.
							</Dialog.Description>
						</div>

						<Dialog.Close
							class="nes-btn nes-btn-danger text-[9px] px-2 py-1"
							aria-label="Close"
						>
							✖
						</Dialog.Close>
					</header>

					<!-- Body -->
					<section class="pkmn-modal-body">
						<p>
							To get the <span class="uppercase">/command/routes</span> dashboard
							online, drop these files into your SvelteKit frontend:
						</p>

						<!-- Grid: File path / Role / Notes -->
						<div class="pkmn-modal-grid">
							<div class="pkmn-modal-heading-row">File</div>
							<div class="pkmn-modal-heading-row">Role</div>
							<div class="pkmn-modal-heading-row">Notes</div>

							<!-- 1) Route index helper -->
							<div class="font-mono break-all">
								<code>src/lib/server/routesIndex.ts</code>
							</div>
							<div>
								Route scanner for <code>+page</code>, <code>+server</code>, layouts.
							</div>
							<div>
								Uses <code>import.meta.glob()</code> to build a typed list of all routes,
								tags, and guessed methods.
							</div>

							<!-- 2) API endpoint -->
							<div class="font-mono break-all mt-1">
								<code>src/routes/api/routes/all/+server.ts</code>
							</div>
							<div class="mt-1">
								JSON API exposing <code>collectRoutes()</code>.
							</div>
							<div class="mt-1">
								<code>GET /api/routes/all</code> → returns <code>&#123; routes: RouteEntry[] &#125;</code>
								for the Command Center to consume.
							</div>

							<!-- 3) Page loader -->
							<div class="font-mono break-all mt-1">
								<code>src/routes/command/routes/+page.ts</code>
							</div>
							<div class="mt-1">
								Client-side loader that calls the API.
							</div>
							<div class="mt-1">
								Uses <code>fetch('/api/routes/all')</code> and passes
								<code>routes</code> into the Svelte page as <code>data.routes</code>.
							</div>

							<!-- 4) Command Center UI -->
							<div class="font-mono break-all mt-1">
								<code>src/routes/command/routes/+page.svelte</code>
							</div>
							<div class="mt-1">
								The actual <span class="uppercase">/all-routes Command Center</span> UI.
							</div>
							<div class="mt-1">
								Renders the NES-style table, search, tag filters, and "▶ Play" actions
								for each route.
							</div>

							<!-- 5) UnoCSS theme -->
							<div class="font-mono break-all mt-1">
								<code>uno.config.ts</code>
							</div>
							<div class="mt-1">
								Theme + shortcuts for NES + Pokémon border.
							</div>
							<div class="mt-1">
								Add the <code>screen-nes</code>, <code>nes-btn</code>,
								and <code>pkmn-water-*</code> shortcuts so the dashboard + modal
								match your YoRHa × NES aesthetic.
							</div>
						</div>

						<p class="mt-3">
							That's it. No changes needed for TRT-LLM / Triton – this is
							all frontend sugar for visualizing the 900+ routes your backend
							is already serving.
						</p>

						<div class="mt-4 p-3 bg-black/30 rounded border border-nesBorder/30">
							<p class="text-[10px] opacity-80">
								<strong>Pro tip:</strong> After adding these files, run
								<code class="px-1 bg-black/50">npm run dev:quic</code>
								to see the Command Center with MinIO SIMD acceleration!
							</p>
						</div>
					</section>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	/* Pokémon watercolor frame */
	:global(.pkmn-water-frame) {
		position: relative;
		max-width: 42rem;
		width: 100%;
		margin: 0 auto;
		padding: 3px;
		border-radius: 0.75rem;
		box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
		background:
			radial-gradient(circle at 0 0, #ff4d4d 0, #ff4d4d 20%, transparent 60%),
			radial-gradient(circle at 100% 0, #4dd0ff 0, #4dd0ff 20%, transparent 60%),
			radial-gradient(circle at 0 100%, #4dff7a 0, #4dff7a 20%, transparent 60%),
			#3a3226;
	}

	:global(.pkmn-water-inner) {
		border: 4px solid #f8f4e3;
		border-radius: 0.5rem;
		background: rgba(44, 48, 53, 0.95);
		backdrop-filter: blur(8px);
		padding: 1.5rem;
		color: #f8f4e3;
	}

	:global(.pkmn-modal-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(248, 244, 227, 0.6);
	}

	:global(.pkmn-modal-title) {
		font-size: 0.875rem;
		font-weight: bold;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #ffcc66;
	}

	:global(.pkmn-modal-subtitle) {
		font-size: 0.75rem;
		color: rgba(248, 244, 227, 0.7);
		margin-top: 0.25rem;
	}

	:global(.pkmn-modal-body) {
		font-size: 0.6875rem;
		line-height: 1.6;
	}

	:global(.pkmn-modal-grid) {
		margin-top: 0.5rem;
		display: grid;
		grid-template-columns: minmax(0, 2.2fr) minmax(0, 2.4fr) minmax(0, 2fr);
		gap: 0.25rem 0.75rem;
		font-size: 0.625rem;
	}

	:global(.pkmn-modal-heading-row) {
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.5625rem;
		opacity: 0.8;
	}

	code {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.125rem 0.25rem;
		border-radius: 0.125rem;
		font-family: 'Courier New', monospace;
	}
</style>
