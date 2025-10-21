<!-- @migration-task Error while migrating Svelte code: 'onsubmit|preventDefault' is not a valid attribute name;
https://svelte.dev/e/attribute_invalid_name -->
<!-- @migration-task Error while migrating Svelte code: 'onsubmit|preventDefault' is not a valid attribute name -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  interface Props {
    onsuccess?: () => void;
    open?: boolean;
  }
  let { onsuccess, open = $bindable() }: Props = $props();
  // We'll use a lightweight HTML/CSS modal fallback to avoid missing dialog primitives
  // State (Svelte 5 runes)
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error = $state('');
  async function handleRegister(event: Event) {
    // Added event parameter
    event.preventDefault(); // Explicitly prevent default form submission
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onsuccess?.();
      open = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Registration failed';
    } finally {
      loading = false;
    }
  }
  function closeModal() {
    open = false;
  }
</script>

<!-- Simple modal fallback -->
<div class="modal-root" aria-hidden={!open} class:show={open} onkeydown={(e) => e.key === 'Escape' && (open = false)} tabindex="-1">
  <!-- use a real button for the overlay so it is keyboard-accessible -->
  <button
    type="button"
    class="overlay"
    aria-label="Close registration modal"
    onclick={closeModal}
  ></button>
  <div class="content" role="dialog" aria-modal="true" aria-label="Register dialog">
    <h2 class="title">Register</h2>
    {#if error}
      <div class="error">{error}</div>
    {/if}
  <form onsubmit={handleRegister} class="form">
      <label>
        <span>Email</span>
        <input type="email" bind:value={email} required autocomplete="email" />
      </label>
      <label>
        <span>Password</span>
        <input type="password" bind:value={password} required autocomplete="new-password" />
      </label>
      <label>
        <span>Confirm Password</span>
        <input type="password" bind:value={confirmPassword} required autocomplete="new-password" />
      </label>
      <div class="actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <button type="button" class="close-btn" onclick={closeModal}>Cancel</button>
      </div>
    </form>
  </div>
</div>

<style>
  .error {
    color: #b00020;
    font-size: 0.875rem;
  }
  form.form {
    display: flex;
    flex-direction column;
    gap: 0.85rem;
  }
  label {
    display: flex;
    flex-direction column;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-weight: 500;
  }
  input {
    padding: 0.55rem 0.7rem;
    font-size: 0.95rem;
    border: 1px solid #d0d0d5;
    border-radius: 0.45rem;
  }
  input:focus {
    outline: 2px solid #6366f1;
    outline-offset: 1px;
  }
  .actions {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
  button {
    appearance: none;
    border: none;
    border-radius: 0.45rem;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
  }
  button[type='submit'] {
    background: #6366f1;
    color: white;
  }
  button[disabled] {
    opacity: 0.6;
    cursor: progress;
  }
  .close-btn {
    background: #e5e7eb;
  }
  .close-btn:hover {
    background: #d1d5db;
  }
</style>
