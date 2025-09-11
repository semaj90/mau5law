<script lang="ts">
  // NES Auth Modal - Svelte 5 compatible
  interface Props {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    onSubmit?: (e: { email: string; password: string }) => void;
  }

  let {
    open = false,
    title = 'Sign in',
    onClose = () => {},
    onSubmit = () => {}
  }: Props = $props();

  let email = $state('');
  let password = $state('');

  function submit() {
    if (email && password) {
      onSubmit({ email, password });
      // Clear form after submission
      email = '';
      password = '';
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/50"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <div
      class="w-[28rem] rounded-md border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div class="mb-3 text-lg font-semibold">{title}</div>
      <div class="space-y-3">
        <input
          type="email"
          placeholder="Email"
          class="w-full rounded border border-neutral-700 bg-neutral-800 p-2"
          bind:value={email}
        />
        <input
          type="password"
          placeholder="Password"
          class="w-full rounded border border-neutral-700 bg-neutral-800 p-2"
          bind:value={password}
        />
      </div>
  <div class="mt-4 flex justify-end gap-2">
  <button class="rounded bg-neutral-700 px-3 py-1" onclick={onClose}>Cancel</button>
  <button class="rounded bg-emerald-600 px-3 py-1" onclick={submit}>Sign in</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    --modal-bg: rgba(0,0,0,0.5);
  }
</style>
