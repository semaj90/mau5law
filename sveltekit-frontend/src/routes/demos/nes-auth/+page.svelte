<script lang="ts">
  // SvelteKit passes 'form' when you use form actions
  export let form: any;

  // Page data (passed from +page.ts load). Define explicitly instead of inline interface in markup.
  import type { ChatMessage, Recommendation } from '$lib/components/ui/enhanced-bits/types';
  export let data: {
    chat?: ChatMessage[];
    recommendations?: Recommendation[];
  } = {};

  // Local state for auth modal
  let open = false;
  let mode: 'login' | 'register' = 'login';

  function openModal(m: 'login' | 'register' = 'login') {
    mode = m;
    open = true;
  }
  function closeModal() {
    open = false;
  }
</script>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.55);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 6rem;
    z-index: 1000;
  }
  .modal {
    max-width: 420px;
    width: 100%;
  }
  form .row {
    margin-bottom: .75rem;
  }
</style>

<div class="page nes-container with-title">
  <p class="title">NES Auth Demo</p>

  <div class="actions">
    <button class="nes-btn is-primary" on:click={() => openModal('login')}>
      Login
    </button>
    <button class="nes-btn is-success" on:click={() => openModal('register')}>
      Register
    </button>
  </div>

  {#if form?.message}
    <p class="nes-text is-success">{form.message}</p>
  {/if}

  {#if form?.error}
    <p class="nes-text is-error">{form.error}</p>
  {/if}
</div>

{#if open}
  <div class="backdrop" on:click|self={closeModal}>
    <section class="nes-container is-dark modal">
      <h3 class="nes-text is-primary" style="margin-top:0">
        {mode === 'login' ? 'Login' : 'Create Account'}
      </h3>

      <form method="POST" action="?/auth" autocomplete="on">
        <input type="hidden" name="mode" value={mode} />

        <div class="row">
          <label class="nes-field">
            <span>Email</span>
            <input
              class="nes-input"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              value={form?.fields?.email || ''} />
          </label>
        </div>

        <div class="row">
          <label class="nes-field">
            <span>Password</span>
            <input
              class="nes-input"
              name="password"
              type="password"
              required
              minlength="6"
              placeholder="••••••"
              value={form?.fields?.password || ''} />
          </label>
        </div>

        {#if mode === 'register'}
          <div class="row">
            <label class="nes-field">
              <span>Confirm Password</span>
              <input
                class="nes-input"
                name="confirm"
                type="password"
                required
                minlength="6"
                placeholder="Repeat password" />
            </label>
          </div>
        {/if}

        {#if form?.fieldErrors}
          <ul class="nes-list is-disc" style="margin: .5rem 0">
            {#each Object.entries(form.fieldErrors) as [k,v]}
              <li class="nes-text is-error">{k}: {v}</li>
            {/each}
          </ul>
        {/if}

        <div style="display:flex; gap:.5rem; margin-top:1rem">
          <button class="nes-btn is-primary" type="submit">
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
          <button class="nes-btn" type="button" on:click={closeModal}>
            Cancel
          </button>
          <button
            class="nes-btn is-warning"
            type="button"
            on:click={() => mode = mode === 'login' ? 'register' : 'login'}>
            Switch to {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </div>
      </form>
    </section>
  </div>
{/if}
