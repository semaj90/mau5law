<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';

  // Define CaseFile interface locally
  interface CaseFile {
    id: string;
    title: string;
    content?: string;
    fileSize?: number;
    createdAt?: Date;
    riskScore?: number;
  }

  // Simple risk calculation function
  function calculateRiskScore(file: CaseFile): number {
    // Simple heuristic based on file properties
    let risk = 0;
    if (file.title?.toLowerCase().includes('confidential')) risk += 30;
    if (file.title?.toLowerCase().includes('classified')) risk += 50;
    if ((file.fileSize || 0) > 10000000) risk += 20; // Large files
    return Math.min(risk + Math.random() * 30, 100); // Add some randomness, cap at 100
  }

  interface Props {
    caseFiles?: CaseFile[];
  }

  let { caseFiles = [] }: Props = $props();
  let canvas: HTMLCanvasElement;

  function renderScene() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to container size
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.font = '14px "Courier New", monospace';

    caseFiles.forEach((file, idx) => {
      const y = 10 + idx * 60;
      const risk = file.riskScore || calculateRiskScore(file);

      ctx.fillStyle = risk > 75 ? '#ff4757' : '#2f3542';
      ctx.fillRect(10, y, rect.width - 20, 50);

      ctx.fillStyle = 'white';
      ctx.fillText(file.title, 20, y + 20);
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(`Risk: ${risk}%`, 20, y + 40);
    });
  }

  onMount(() => {
    renderScene();
    // Re-render if window resizes
    const onResize = () => renderScene();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  $: if (caseFiles) renderScene();
</script>

<div class="canvas-container nes-container" role="region" aria-label="High-performance evidence visualization">
  <canvas bind:this={canvas as any} width="800" height="600"></canvas>
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 400px;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
