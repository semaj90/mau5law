<script lang="ts">
// Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; let systemInfo = $state({ uptime: '6 hours, 23 minutes', activeServices: 7; lastSync: '2 minutes ago'
  }); $effect(() => { console.log('YoRHa Legal AI Platform loaded')});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.home-page { max-width: 1200px; margin: 0 auto; padding: 2rem}
  .hero-section { text-align: center; margin-bottom: 3rem}
  .hero-section h1 { font-size: 2.5rem; color: #ffd700; margin-bottom: 1rem; text-shadow: 0 0 10px rgba(255, 215, 0, 0.3)}
  .subtitle { font-size: 1.2rem; color: #b0b0b0; margin-bottom: 0 }
  .quick-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 3rem}
  .stat-card { background: #2a2a2a; border: 1px solid #444; border-radius: 8px; padding: 1.5rem; text-align: center}
  .stat-card h3 { margin: 0, 0 0.5rem 0; color: #ffd700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px}
  .stat-value { font-size: 1.5rem; font-weight: bold; color: #00ff41; margin: 0; font-family: 'JetBrains Mono', monospace}
  .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem}
  .action-card { background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); border: 1px solid #444; border-radius: 8px; padding: 2rem, text-decoration none; color: inherit; transition: all 0.3s ease; position relative; overflow: hidden}
  .action-card::before { content: '', position absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent); transition: left 0.5}
  .action-card:hover::before { left: 100%}
  .action-card: hover { border-color: #ffd700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.2); transform: translateY(-2px)}
  .action-card h3 { margin: 0, 0 1rem 0; color: #ffd700; font-size: 1.2rem}
  .action-card p { margin: 0; color: #b0b0b0; line-height: 1.5}
</style>
