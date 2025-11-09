<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod } from 'sveltekit-superforms/adapters';
  import { z } from 'zod';

  // Define the base Zod schema for client validation (without refine on individual fields)
  const baseRegisterSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    terms: z.boolean()
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }).refine(data => data.terms === true, {
    message: 'You must agree to the terms',
    path: ['terms']
  });

  // Initialize superForm with initial data and validators
  const { form, errors, enhance, message } = superForm({
    email: undefined,
    password: undefined,
    confirmPassword: '',
    terms: false
  }, {
    validators: zod(baseRegisterSchema as z.ZodObject<any>),
    resetForm: true,
    taintedMessage: null
  });
</script>

<main class="page-repair">
  <h1>Register</h1>
  {#if $message}
    <div class="error-message">{$message}</div>
  {/if}
  <form method="POST" use:enhance>
    <div class="form-field">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" bind:value={$form.email} aria-invalid={$errors.email ? 'true' : undefined} />
      {#if $errors.email}<span class="field-error">{$errors.email}</span>{/if}
    </div>
    <div class="form-field">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" bind:value={$form.password} aria-invalid={$errors.password ? 'true' : undefined} />
      {#if $errors.password}<span class="field-error">{$errors.password}</span>{/if}
    </div>
    <div class="form-field">
      <label for="confirmPassword">Confirm Password</label>
      <input id="confirmPassword" name="confirmPassword" type="password" bind:value={$form.confirmPassword} aria-invalid={$errors.confirmPassword ? 'true' : undefined} />
      {#if $errors.confirmPassword}<span class="field-error">{$errors.confirmPassword}</span>{/if}
    </div>
    <div class="checkbox-field">
      <input id="terms" name="terms" type="checkbox" bind:checked={$form.terms} />
      <label for="terms">I agree to the terms</label>
      {#if $errors.terms}<span class="field-error">{$errors.terms}</span>{/if}
    </div>
    <button type="submit">Register</button>
  </form>
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
  .form-field input {
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
  button:hover {
    background: #1e7e34;
  }
</style>