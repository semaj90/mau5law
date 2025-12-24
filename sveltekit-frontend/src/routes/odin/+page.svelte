<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Separator } from 'bits-ui';

  // Svelte 5 Props (Runes)
  let { data } = $props();

  // Svelte 5 State (Runes)
  let activeTab = $state('overview');
  let isScanning = $state(false);

  // Svelte 5 Derived State
  // Using simple derivation here
  let userName = $derived(data.user.username.toUpperCase());

  function runScan() {
    isScanning = true;
    setTimeout(() => isScanning = false, 2000);
  }
</script>

<!-- "Project Odin" / NES Command Center Layout -->
<div class="screen-nes h-screen overflow-hidden">

  <!-- HEADER -->
  <header class="screen-nes-header border-b-4 border-nes-border pb-4">
    <div>
      <h1 class="screen-nes-title text-nes-accent2">PROJECT: ODIN</h1>
      <div class="screen-nes-subtitle">SUBJECT #8842-XC // {userName}</div>
    </div>

    <!-- NES Status Indicators -->
    <div class="flex gap-4">
      <div class="nes-status text-nes-success">
        <div class="nes-status-dot nes-status-online"></div> SYSTEM ONLINE
      </div>
      <div class="nes-badge-ace">SECURE CONNECTION</div>
    </div>
  </header>

  <!-- MAIN GRID LAYOUT -->
  <main class="grid grid-cols-12 gap-4 h-full pt-4">

    <!-- LEFT SIDEBAR (Subject Profile) -->
    <aside class="col-span-3 flex flex-col gap-4">
      <div class="nes-panel p-0">
        <div class="nes-panel-header">
          <span>ID</span>
          <span>SUBJ_PROFILE</span>
          <span>V1.2</span>
          <span>[X]</span>
        </div>
        <div class="p-4 flex flex-col items-center gap-4">
          <div class="w-32 h-32 border-2 border-nes-muted bg-black/50 flex items-center justify-center">
            <span class="text-4xl">👤</span>
          </div>
          <div class="w-full space-y-2">
            <div class="nes-row px-0 py-1 grid-cols-[1fr_auto]">
              <span class="text-nes-muted">THREAT LVL</span>
              <span class="text-nes-danger animate-pulse">CRITICAL</span>
            </div>
            <div class="nes-row px-0 py-1 grid-cols-[1fr_auto]">
              <span class="text-nes-muted">CLEARANCE</span>
              <span class="text-nes-accent">LEVEL 5</span>
            </div>
            <div class="nes-row px-0 py-1 grid-cols-[1fr_auto]">
              <span class="text-nes-muted">ROLE</span>
              <span class="text-nes-text">{data.role}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <button
        class="nes-btn nes-btn-primary w-full"
        onclick={runScan}
        disabled={isScanning}
      >
        {isScanning ? 'SCANNING...' : 'INITIATE DEEP SCAN'}
      </button>

      <div class="nes-panel p-4 flex-1">
        <div class="text-[10px] text-nes-muted mb-2">SCAN LOGS</div>
        <div class="font-mono text-[9px] text-nes-success space-y-1">
          <div>> CONNECTING TO GRID... OK</div>
          <div>> VERIFYING HASH... OK</div>
          <div>> LOADING MODULES... 100%</div>
          {#if isScanning}
            <div in:fade>> ENCRYPTING DATA STREAM...</div>
            <div in:fade class="animate-pulse">> UPLOADING TO AI CORE...</div>
          {/if}
        </div>
      </div>
    </aside>

    <!-- CENTER DASHBOARD (Evidence Board) -->
    <section class="col-span-9 flex flex-col gap-4">

      <!-- TABS (UnoCSS Grid) -->
      <div class="grid grid-cols-4 gap-2">
        {#each ['overview', 'evidence', 'intercepts', 'terminal'] as tab}
          <button
            class="nes-btn {activeTab === tab ? 'nes-btn-primary' : 'nes-btn-ghost'} uppercase"
            onclick={() => activeTab = tab}
          >
            {tab}
          </button>
        {/each}
      </div>

      <!-- DATA GRID (SSR Data) -->
      <div class="nes-panel flex-1 flex flex-col">
        <div class="nes-panel-header bg-nes-accent2/10 text-nes-accent2">
          <span>TIMESTAMP</span>
          <span>DATA_SOURCE (ERROR CODE)</span>
          <span>INTEGRITY</span>
          <span>STATUS</span>
        </div>

        <div class="nes-panel-body">
          {#if data.stats.length === 0}
            <div class="p-8 text-center text-nes-muted">NO ANOMALIES DETECTED. SYSTEM STABLE.</div>
          {:else}
            {#each data.stats as stat}
              <div class="nes-row group cursor-pointer hover:bg-white/5">
                <span class="font-mono text-nes-muted">2025-12-24 04:20</span>
                <span class="text-nes-text group-hover:text-nes-accent truncate pr-2">{stat.error_code}: {stat.message?.substring(0, 40)}...</span>
                <div class="w-24">
                  <div class="nes-progress h-2">
                    <div class="nes-progress-bar w-[85%] bg-nes-warning"></div>
                  </div>
                </div>
                <span class="nes-badge-warning ml-auto">FLAGGED ({stat.count})</span>
              </div>
            {/each}
          {/if}
        </div>

        <div class="p-2 border-t-4 border-nes-border bg-nes-bg text-[10px] flex justify-between">
          <span>TOTAL RECORDS: {data.stats.length}</span>
          <span class="animate-pulse">LIVE FEED ACTIVE</span>
        </div>
      </div>
    </section>
  </main>
</div>
