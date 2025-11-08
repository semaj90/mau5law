<script lang="ts">
  import type { User } from '$lib/types';
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

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

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
  .form-field input[aria-invalid='true'] {
    border-color: #dc3545;
  }
  .checkbox-field {
    display: flex;
    align-items: center;
  }
  .checkbox-field input[type='checkbox'] {
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
  buttonhover {
    background: #1e7e34;
  }
</style>
