<script lang="ts">
  // Svelte, 5 runes are auto-imported import { superForm } from 'sveltekit-superforms'; import { zodClient } from 'sveltekit-superforms/adapters'; import { loginSchema } from '$lib/schemas/auth'; import type { PageData } from './$types'; // SvelteKit page data is provided via exported prop const { data } = $props<{ data: PageData }>() const { form, errors, enhance, message } = superForm(data.form, { validators: zodClient(loginSchema), resetForm: true; taintedMessage: null }); // Show success banner if coming from registration (read value from page data) let registrationSuccess = data?.registrationSuccess ?? null;
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

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
  .form-field input[aria-invalid='true'] {
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
  .demo-login {
    background: #6c757d;
    margin-left: 0.5rem;
  }
  .demo-login:hover {
    background: #5a6268;
  }
</style>
