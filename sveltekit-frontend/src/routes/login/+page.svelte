<script lang="ts">
  import type { goto  } from '$app/navigation';
  import type { loginSchema  } from '$lib/schemas/auth';
  import type { superForm  } from 'sveltekit-superforms';
  import type { zodClient  } from 'sveltekit-superforms/adapters';
  import type { PageData } from './$types ';

  // Page data from server
  let { data }: { data: PageData } = $props ();

  // Form handling with Svelte 5 runes
  let { form, errors, enhance, message } = superForm(data.form, {
    validators: zodClient(loginSchema),
    resetForm: true,
    taintedMessage: null
  });

  // Show success banner if coming from registration
  let registrationSuccess = $derived (data?.registrationSuccess ?? null);

  // Handle demo login
  function handleDemoLogin() {
    form.update($form => ({
      ...$form ,
      email: 'demo@example.com',
      password: 'demo123'
    }));
  }

  // Handle register link
  function handleRegisterLink() {
    goto('/register');
  }
</script>

<svelte:head>
  <title>Login - Legal AI Platform</title>
  <meta name="description" content="Login to access your legal AI platform" />
</svelte:head>

<main class="login-page">
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">Welcome Back</h1>
        <p class="login-subtitle">Sign in to your Legal AI Platform account</p>
      </div>

      {#if registrationSuccess}
        <div class="success-banner">
          <span>✓</span>
          <span>Registration successful! Please log in with your credentials.</span>
        </div>
      {/if}

      {#if $message }
        <div class="error-message">
          <span>⚠</span>
          <span>{$message }</span>
        </div>
      {/if}

      <form method="POST" use:enhance class="login-form">
        <div class="form-field">
          <label for="email" class="form-label">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            bind:value={$form .email}
            placeholder="Enter your email"
            aria-invalid={$errors .email ? 'true' : undefined}
            class="form-input"
            required
          />
          {#if $errors .email}
            <span class="field-error">{$errors .email}</span>
          {/if}
        </div>

        <div class="form-field">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            bind:value={$form .password}
            placeholder="Enter your password"
            aria-invalid={$errors .password ? 'true' : undefined}
            class="form-input"
            required
          />
          {#if $errors .password}
            <span class="field-error">{$errors .password}</span>
          {/if}
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-full">
            Sign In
          </button>

          <button type="button" onclick={handleDemoLogin} class="btn btn-secondary btn-demo">
            Demo Login
          </button>
        </div>
      </form>

      <div class="login-footer">
        <p>
          Don't have an account?
          <button onclick={handleRegisterLink} class="link-btn">
            Create one here
          </button>
        </p>
      </div>
    </div>
  </div>
</main>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .login-container {
    width: 100%;
    max-width: 400px;
  }

  .login-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    padding: 2rem;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: #212529;
  }

  .login-subtitle {
    margin: 0;
    color: #6c757d;
    font-size: 0.875rem;
  }

  .success-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #d4edda;
    color: #155724;
    padding: 0.75rem;
    border: 1px solid #c3e6cb;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border: 1px solid #f5c6cb;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .login-form {
    margin-bottom: 1.5rem;
  }

  .form-field {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #212529;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .form-input[aria-invalid='true'] {
    border-color: #dc3545;
  }

  .form-input[aria-invalid='true']:focus {
    border-color: #dc3545;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
  }

  .field-error {
    color: #dc3545;
    font-size: 0.75rem;
    margin-top: 0.25rem;
    display: block;
  }

  .form-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    text-decoration: none;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
    border-color: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #545b62;
    border-color: #545b62;
  }

  .btn-full {
    width: 100%;
  }

  .btn-demo {
    width: 100%;
    background: #28a745;
    border-color: #28a745;
  }

  .btn-demo:hover:not(:disabled) {
    background: #1e7e34;
    border-color: #1e7e34;
  }

  .login-footer {
    text-align: center;
    padding-top: 1.5rem;
    border-top: 1px solid #e9ecef;
  }

  .login-footer p {
    margin: 0;
    color: #6c757d;
    font-size: 0.875rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    text-decoration: underline;
    font-size: inherit;
    padding: 0;
  }

  .link-btn:hover {
    color: #0056b3;
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .login-page {
      padding: 0.5rem;
    }

    .login-card {
      padding: 1.5rem;
    }

    .login-title {
      font-size: 1.75rem;
    }
  }
</style>
