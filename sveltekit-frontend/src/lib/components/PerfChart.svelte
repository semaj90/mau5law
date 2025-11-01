<script lang="ts">
  // Svelte 5 runes are auto-imported
  interface Props {
    points?: number[];
    width?: number;
    height?: number;
    color?: string;
  }

  // exported props (idiomatic Svelte)
  export let points: number[] = [];
  export let width = 160;
  export let height = 50;
  export let color = '#2563eb';

  // reactive derived values with guards
  $: capped = points ? points.slice(-60) : [];
  $: max = capped.length ? Math.max(1, ...capped.map(v => (isFinite(v) ? v : 0))) : 1;

  $: d = (() => {
    if (!capped.length) return '';
    const denom = capped.length > 1 ? capped.length - 1 : 1;
    return capped
      .map((v, i) => {
        const safeV = isFinite(v) ? v : 0;
        const x = (i / denom) * width;
        const y = height - (safeV / max) * height;
        // clamp values to svg bounds
        const cx = Math.max(0, Math.min(width, x));
        const cy = Math.max(0, Math.min(height, y));
        return `${cx},${cy}`;
      })
      .join(' ');
  })();
</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} class="overflow-visible" role="img" aria-label="performance chart">
  <polyline points={d} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
</svg>

<style>
  svg {
    display: block;
  }
</style>
