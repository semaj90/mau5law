<script lang="ts">
  import type { EvidenceConnection, EvidenceNode } from '$lib/server/db/schema-postgres';
  import { onMount } from 'svelte';
  import type { Writable } from 'svelte/store';

  export let nodes: Writable<EvidenceNode[]>;
  export let connections: Writable<EvidenceConnection[]>;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  // Connection styling based on strength
  function getConnectionStyle(strength: number) {
    if (strength >= 0.8) return { color: '#10b981', width: 3 }; // Strong - green
    if (strength >= 0.5) return { color: '#f59e0b', width: 2 }; // Medium - amber
    return { color: '#ef4444', width: 1 }; // Weak - red
  }

  function drawConnections() {
    if (!ctx || !$nodes.length) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each connection
    $connections.forEach(connection => {
      const fromNode = $nodes.find(n => n.id === connection.fromNodeId);
      const toNode = $nodes.find(n => n.id === connection.toNodeId);

      if (!fromNode || !toNode) return;

      const style = getConnectionStyle(connection.strength);

      // Calculate connection points (center of nodes)
      const fromX = fromNode.x + 125; // Approximate center (200px width / 2 + some padding)
      const fromY = fromNode.y + 50;  // Approximate center
      const toX = toNode.x + 125;
      const toY = toNode.y + 50;

      // Draw connection line
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrowhead
      drawArrowhead(fromX, fromY, toX, toY, style.color);

      // Draw connection label if strength is notable
      if (connection.strength > 0.3) {
        drawConnectionLabel(fromX, fromY, toX, toY, connection.strength);
      }
    });
  }

  function drawArrowhead(fromX: number, fromY: number, toX: number, toY: number, color: string) {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  function drawConnectionLabel(fromX: number, fromY: number, toX: number, toY: number, strength: number) {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    // Background circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(midX, midY, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Strength text
    ctx.fillStyle = '#374151';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(strength * 100)}%`, midX, midY);
  }

  function resizeCanvas() {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    drawConnections();
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    resizeCanvas();

    // Redraw when nodes or connections change
    const unsubscribeNodes = nodes.subscribe(() => {
      setTimeout(drawConnections, 0); // Defer to next tick for DOM updates
    });

    const unsubscribeConnections = connections.subscribe(() => {
      setTimeout(drawConnections, 0);
    });

    // Handle window resize
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribeNodes();
      unsubscribeConnections();
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<canvas
  bind:this={canvas}
  class="connections-canvas"
  width="100%"
  height="100%"
></canvas>

<style>
  .connections-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }
</style>