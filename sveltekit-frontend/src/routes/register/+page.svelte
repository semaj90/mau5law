<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { registerSchema } from '$lib/schemas/auth';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { form, errors, enhance, message } = superForm(data.form, {
    validators: zodClient(registerSchema),
    resetForm: true,
    taintedMessage: null
  });
</script>

{#if $message}
  <div class="error-message">
    {$message}
  </div>
{/if}

<form method="POST" use:enhance>
  <div class="form-field">
    <input
      name="name"
      type="text"
      placeholder="Full Name"
      bind:value={$form.name}
      aria-invalid={$errors.name ? 'true' : undefined}
      required
    />
    {#if $errors.name}
      <span class="field-error">{$errors.name}</span>
    {/if}
  </div>

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

  <div class="form-field">
    <input
      name="confirmPassword"
      type="password"
      placeholder="Confirm Password"
      bind:value={$form.confirmPassword}
      aria-invalid={$errors.confirmPassword ? 'true' : undefined}
      required
    />
    {#if $errors.confirmPassword}
      <span class="field-error">{$errors.confirmPassword}</span>
    {/if}
  </div>

  <div class="form-field">
    <select name="role" bind:value={$form.role} aria-invalid={$errors.role ? 'true' : undefined}>
      <option value="prosecutor">Prosecutor</option>
      <option value="detective">Detective</option>
      <option value="admin">Administrator</option>
      <option value="user">User</option>
    </select>
    {#if $errors.role}
      <span class="field-error">{$errors.role}</span>
    {/if}
  </div>

  <div class="form-field checkbox-field">
    <label>
      <input
        name="terms"
        type="checkbox"
        bind:checked={$form.terms}
        aria-invalid={$errors.terms ? 'true' : undefined}
        required
      />
      I agree to the Terms of Service
    </label>
    {#if $errors.terms}
      <span class="field-error">{$errors.terms}</span>
    {/if}
  </div>

  <button type="submit">Register</button>
</form>

<style>
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

  .form-field input,
  .form-field select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.375rem;
  }

  .form-field input[aria-invalid="true"],
  .form-field select[aria-invalid="true"] {
    border-color: #dc3545;
  }

  .checkbox-field {
    display: flex;
    align-items: center;
  }

  .checkbox-field input[type="checkbox"] {
    width: auto;
    margin-right: 0.5rem;
  }

  .field-error {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  button {
    background: #28a745;
    color: white;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  button:hover {
    background: #1e7e34;
  }
</style>

