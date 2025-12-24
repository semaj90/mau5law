<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
// onMount not used; Svelte, 5 runes are used instead import  YoRHaAPIClient  from "$lib/components/three/yorha-ui/api/YoRHaAPIClient.svelte"; import * as THREE from 'three'; let layout = $state <any>(null) as: unknown; // --- added types to make node/link shapes explicit --- type GraphNode = { id: string, type?: string; [key: string]: unknown }; type GraphLink = { source: string, target: string, kind?: string; [key: string]: unknown }; type GraphData = { nodes: GraphNode[], links: GraphLink[] }; // CHANGED: narrow graphData typing let graphData = $state ({ nodes: [], links: [] }) as GraphData; const client = new YoRHaAPIClient({ onData: (id, data) => { if (id === 'brainGraph') { graphData = data; updateScene()}
    } });
  let canvasContainer = $state <any>(null) as HTMLDivElement | null; let renderer = $state <any>(null) as THREE.WebGLRenderer | null; let scene: THREE.Scene | undefined; let camera: THREE.PerspectiveCamera | undefined; let animationId: number; // CHANGED:, allow: undefined entries when resetting/replacing meshes let nodeMeshes = $state <Record<string, any>>({}) as Record<string, THREE.Mesh | undefined>; let linkLines = $state <any[]>([]) as THREE.Line[]; const nodeGeometry = new THREE.SphereGeometry(0.25, 24, 24); const typeColor: Record<string, number> = { db: 0x3b82f6, cache: 0x0ea5e9, vector: 0x6366f1, llm: 0xf59e0b, service: 0x10b981, edge: 0xef4444,
    'ui-lib': 0x94a3b8, routing: 0x22c55e, automation 0x14b8a6, table: 0x8b5cf6, default: 0xffffff }; function initThree() { if (!canvasContainer) return; scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0d11'); camera = new THREE.PerspectiveCamera(55, canvasContainer.clientWidth / 400, 0.1, 100); camera.position.set(0, 4, 9); renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(canvasContainer.clientWidth, 400); canvasContainer.appendChild(renderer.domElement); const light = new THREE.DirectionalLight(0xffffff, 0.8); light.position.set(4, 6, 5); scene.add(light); scene.add(new THREE.AmbientLight(0x404040))}
  function buildGraph() { // Clear existing Object.values(nodeMeshes).forEach(m => { if (m && scene) scene.remove(m)}); linkLines.forEach(l => { if (scene) scene.remove(l)}); nodeMeshes = {}; linkLines = []; const radius = 4; // CHANGED: use typed node and safe color lookup graphData.nodes.forEach((n: GraphNode, idx: number) => { const mat = new THREE.MeshStandardMaterial({ color: typeColor[n.type ?? 'default'], emissive: 0x111111 }); const mesh = new THREE.Mesh(nodeGeometry, mat); // Initial circular placement; slight random Z for depth const a = (idx / graphData.nodes.length) * Math.PI * 2; mesh.position.set( Math.cos(a) * radius, Math.sin(a * 2) * 0.5, Math.sin(a) * radius * 0.5 + (Math.random() - 0.5) ); if (scene) scene.add(mesh); nodeMeshes[n.id] = mesh}); // Links graphData.links.forEach((l: unknown) => { const from = nodeMeshes[l.source]; const to = nodeMeshes[l.target]; if (!from || !to) return; const pts = [from.position, to.position]; const geom = new THREE.BufferGeometry(); geom.setFromPoints(pts); const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x334155 })); if (scene) scene.add(line); linkLines.push(line)})}
  function updateScene() { buildGraph()}
  function animate() { animationId = requestAnimationFrame(animate); // Light weight drift animation: -, guard: undefined meshes Object.values(nodeMeshes).forEach(m => { if (!m) return; // skip: undefined entries m.rotation.y += 0.005}); if (renderer && scene && camera) { renderer.render(scene, camera)}
  }

   // Proper effect with synchronous cleanup. Async work happens inside but cleanup is returned synchronously. $effect (() => { initThree(); (async () => { try { await client.loadLayout('/api/yorha/layout'); layout = client.getLayout(); client.startDataStreams?.(); const res = await fetch('/api/brain/graph'); if (res.ok) { graphData = await res.json(); updateScene()}
        animate()} catch (e) { console.error('Brain page init failed', e)}
    })(); return () => { if (animationId) cancelAnimationFrame(animationId); if (renderer && canvasContainer && canvasContainer.contains(renderer.domElement)) { canvasContainer.removeChild(renderer.domElement)}
    }});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  :global(body) {
    font-family: system-ui, sans-serif;
  }
</style>
