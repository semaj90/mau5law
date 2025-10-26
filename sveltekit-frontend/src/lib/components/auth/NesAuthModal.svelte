<script lang="ts">
  // Svelte 5 runes are auto-imported
  // NES Auth Modal - Svelte 5 compatible
  interface Props {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    onSubmit?: (payload: { email: string; password: string }) => void;
    form?: any;
  }

  // Svelte 5 runes - props via $props()
  let {
    open = $bindable(false),
    title = 'Sign in',
    onClose = () => {},
    onSubmit = () => {},
    form = null
  }: Props = $props();

  // component state
  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let submitting = $state(false);

  function close() {
    open = false;
    onClose?.();
  }

  async function submit(e?: Event) {
    e?.preventDefault();
    error = null;

    if (!email || !password) {
      error = 'Please provide email and password.';
      return;
    }

    try {
      submitting = true;
      // call parent callback (if provided)
      await onSubmit({ email, password });
      // close modal on successful submit
      email = '';
      password = '';
      close();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Submission failed';
    } finally {
      submitting = false;
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 grid place-items-center" role="dialog" aria-modal="true" aria-label={title}>
  <div class="fixed inset-0 bg-black/50" onclick={close}></div>
    <form class="relative z-10 w-full max-w-md rounded bg-neutral-900 p-6 text-neutral-100" onsubmit={submit}>
      <div class="mb-3 text-lg font-semibold">{title}</div>

      {#if error}
        <div class="mb-3 text-sm text-red-400">{error}</div>
      {/if}

      <div class="space-y-3">
        <label class="block text-sm">Email
          <input
            type="email"
            required
            bind:value={email}
            class="w-full rounded border border-neutral-700 bg-neutral-800 p-2 mt-1"
            placeholder="you@example.com"
            autofocus
          />
        </label>

        <label class="block text-sm">Password
          <input
            type="password"
            required
            bind:value={password}
            class="w-full rounded border border-neutral-700 bg-neutral-800 p-2 mt-1"
            placeholder="••••••••"
          />
        </label>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded bg-neutral-700 px-3 py-1" onclick={close}>Cancel</button>
        <button type="submit" class="rounded bg-emerald-600 px-3 py-1" disabled={submitting}>
          {#if submitting}Signing in...{:else}Sign in{/if}
        </button>
      </div>
    </form>
  </div>
{/if}

<style>
  /* Minimal modal styles; keep project-wide theming elsewhere */
  :global(body) {
    --modal-bg: rgba(0,0,0,0.5);
  }
</style>
