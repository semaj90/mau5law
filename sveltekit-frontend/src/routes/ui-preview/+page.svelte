<script lang="ts">
  import Button from '$lib/components/nes/Button.svelte';
  import Card from '$lib/components/nes/Card.svelte';
  import Dialog from '$lib/components/nes/Dialog.svelte';
  import Avatar from '$lib/components/nes/Avatar.svelte';
  import { onMount } from 'svelte';

  let showDialog = $state(false)
  let selectedTab = $state('buttons')

  interface TabItem { id: string; label: string }
  const tabs: TabItem[] = [
    { id: 'buttons', label: 'Buttons' },
    { id: 'avatars', label: 'Avatars' },
    { id: 'dialog', label: 'Dialog' },
    { id: 'cards', label: 'Cards' }
  ]

  function openDialog() { showDialog = true }
  function closeDialog() { showDialog = false }

  const buttonVariants = ['primary','success','warning','error','info','disabled'] as const
  type ButtonVariant = typeof buttonVariants[number]

  const avatarSizes = ['small','medium','large'] as const
  type AvatarSize = typeof avatarSizes[number]

  let focusReady = false
  onMount(() => { focusReady = true })
</script>

<style>
  .layout { display: grid; gap: 1.25rem; padding: 1.5rem; }
  .tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .tab-btn { cursor: pointer; }
  .tab-btn.active { outline: 3px solid var(--nes-primary, #212529); }
  .grid { display: grid; gap: 1rem; }
  .grid.buttons { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  .grid.avatars { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .cards-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .dialog-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }
  h1 { font-family: 'Press Start 2P', monospace; font-size: 1.1rem; }
  h2.section { margin: 0 0 .75rem; font-size: .9rem; letter-spacing: .5px; }
  .section-wrap { padding: 1rem; border: 2px dashed #ccc; border-radius: 8px; background: #fff; }
  .meta { font-size: .65rem; opacity: .7; margin-top: .4rem; }
</style>

<div class="layout">
  <h1>NES UI Preview</h1>

  <nav class="tabs" aria-label="Preview Tabs">
    {#each tabs as t}
      <button
        class="nes-btn tab-btn {selectedTab === t.id ? 'is-primary active' : ''}"
        aria-pressed={selectedTab === t.id}
        onclick={() => selectedTab = t.id}
      >{t.label}</button>
    {/each}
  </nav>

  {#if selectedTab === 'buttons'}
    <section class="section-wrap">
      <h2 class="section">Buttons</h2>
      <div class="grid buttons">
        {#each buttonVariants as v}
          <div>
            <Button variant={v} disabled={v === 'disabled'}>{v}</Button>
            <div class="meta">variant: {v}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if selectedTab === 'avatars'}
    <section class="section-wrap">
      <h2 class="section">Avatars</h2>
      <div class="grid avatars">
        {#each avatarSizes as size}
          <div>
            <Avatar size={size} label={size + ' user'} />
            <div class="meta">size: {size}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if selectedTab === 'dialog'}
    <section class="section-wrap">
      <h2 class="section">Dialog</h2>
      <Button variant="primary" onclick={openDialog}>Open Dialog</Button>
      <div class="meta">Simple open/close controlled by boolean state.</div>
      {#if showDialog}
        <Dialog title="Sample Dialog" on:close={closeDialog}>
          <p>This dialog demonstrates the NES modal style and accessibility hooks.</p>
          <div class="dialog-actions">
            <Button variant="error" onclick={closeDialog}>Cancel</Button>
            <Button variant="success" onclick={closeDialog}>Confirm</Button>
          </div>
        </Dialog>
      {/if}
    </section>
  {/if}

  {#if selectedTab === 'cards'}
    <section class="section-wrap">
      <h2 class="section">Cards</h2>
      <div class="cards-grid">
        <Card title="Legal Document" subtitle="Primary Source" footer="#1024A">
          <p>Representative example of a legal primary source container with NES styling.</p>
        </Card>
        <Card title="Embeddings" subtitle="Vector Ops" footer="Updated">
          <p>Showcase how vector search summaries might be wrapped in a retro card style.</p>
        </Card>
        <Card title="GPU Task" subtitle="Queued" footer="ETA: 3s">
          <p>Example status card for GPU inference or preprocessing jobs.</p>
        </Card>
      </div>
    </section>
  {/if}
</div>
