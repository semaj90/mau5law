<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { loginSchema } from '$lib/schemas/auth';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { form, errors, enhance, message } = superForm(data.form, {
    validators: zodClient(loginSchema),
    resetForm: true,
    taintedMessage: null
  });

  // Show success banner if coming from registration
  let registrationSuccess = $state(data.registrationSuccess);
</script>

{#if registrationSuccess}
  <div class="success-banner">
    {registrationSuccess}
  </div>
{/if}

{#if $message}
  <div class="error-message">
    {$message}
  </div>
{/if}

<form method="POST" use:enhance>
  <div class="form-field">
    <input
      name="email"
      type="email"
      placeholder="Email"
      bind:value={$form.email}
      aria-invalid={$errors.email ? 'true' : undefined}
      required
    />
    {#if $errors.email}
      <span class="field-error">{$errors.email}</span>
    {/if}
  </div>

  <div class="form-field">
    <input
      name="password"
      type="password"
      placeholder="Password"
      bind:value={$form.password}
      aria-invalid={$errors.password ? 'true' : undefined}
      required
    />
    {#if $errors.password}
      <span class="field-error">{$errors.password}</span>
    {/if}
  </div>

  <button type="submit">Login</button>
</form>

<style>
  .success-banner {
    background: #d4edda;
    color: #155724;
    padding: 0.75rem;
    border: 1px solid #c3e6cb;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border: 1px solid #f5c6cb;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .form-field {
    margin-bottom: 1rem;
  }

  .form-field input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.375rem;
  }

  .form-field input[aria-invalid="true"] {
    border-color: #dc3545;
  }

  .field-error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  button {
    background: #007bff;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  button:hover {
    background: #0056b3;
  }
</style>

