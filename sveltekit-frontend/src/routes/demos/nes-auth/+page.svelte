<!-- @migration-task Error while migrating Svelte code: Cannot use `$props()` more than once
https://svelte.dev/e/props_duplicate -->
<!-- @migration-task Error while migrating Svelte code: Cannot use `$props()` more than once -->
<script lang="ts">
  import { Button, Card, Dialog, Input, Label, Alert, AlertDescription } from '$lib/components/ui/enhanced-bits';

  // SvelteKit passes 'form' when you use form actions
  let { form = $bindable() }: { form?: any } = $props();

  // Page data (passed from +page.ts load). Define explicitly instead of inline interface in markup.
  interface ChatMessage {
    id: string;
    content: string;
    timestamp: Date;
    userId: string;
  }

  interface Recommendation {
    id: string;
    title: string;
    description: string;
    confidence: number;
  }

  let { data = $bindable({ chat: [], recommendations: [] }) }: {
    data?: {
      chat?: ChatMessage[];
      recommendations?: Recommendation[];
    };
  } = $props();

  // Local state for auth modal using Svelte 5 runes
  let open = $state(false);
  let mode = $state<'login' | 'register'>('login');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);

  function openModal(m: 'login' | 'register' = 'login') {
    mode = m;
    open = true;
    // Reset form fields
    email = form?.fields?.email || '';
    password = '';
    confirmPassword = '';
  }

  function closeModal() {
    open = false;
    isLoading = false;
  }

  function switchMode() {
    mode = mode === 'login' ? 'register' : 'login';
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    isLoading = true;

    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('email', email);
    formData.append('password', password);
    if (mode === 'register') {
      formData.append('confirm', confirmPassword);
    }

    try {
      const response = await fetch('?/auth', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Handle successful auth
        closeModal();
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .hero-section {
    text-align: center;
    margin-bottom: 3rem;
  }

  .hero-title {
    font-size: 3rem;
    font-weight: bold;
    background: linear-gradient(45deg, #00ff9f, #00b4ff);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 2rem;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .feature-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 2rem;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-success {
    background-color: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .status-error {
    background-color: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .form-grid {
    display: grid;
    gap: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }

    .demo-grid {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>

<div class="demo-page">
  <div class="demo-container">
    <!-- Hero Section -->
    <div class="hero-section">
      <h1 class="hero-title">Enhanced-Bits Auth Demo</h1>
      <p class="hero-subtitle">
        Experience our headless UI library with NES-inspired design and Svelte 5 runes
      </p>

      <!-- Status Indicators -->
      {#if form?.message}
        <div class="status-indicator status-success">
          <span>✅</span>
          {form.message}
        </div>
      {/if}

      {#if form?.error}
        <div class="status-indicator status-error">
          <span>❌</span>
          {form.error}
        </div>
      {/if}
    </div>

    <!-- Demo Grid -->
    <div class="demo-grid">
      <!-- Authentication Demo Card -->
      <Card.Root class="feature-card">
        <Card.Header>
          <Card.Title class="text-white text-xl font-bold">
            🔐 Authentication System
          </Card.Title>
          <Card.Description class="text-gray-300">
            Secure user authentication with enhanced-bits components
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="actions-grid">
            <Button
              onclick={() => openModal('login')}
              variant="primary"
              class="bits-btn-primary"
            >
              🎮 Login
            </Button>
            <Button
              onclick={() => openModal('register')}
              variant="success"
              class="bits-btn-success"
            >
              ⭐ Register
            </Button>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Component Library Demo Card -->
      <Card.Root class="feature-card">
        <Card.Header>
          <Card.Title class="text-white text-xl font-bold">
            🧩 Component Library
          </Card.Title>
          <Card.Description class="text-gray-300">
            Headless UI components with NES styling
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="actions-grid">
            <Button variant="outline" class="bits-btn-outline">
              📝 Forms
            </Button>
            <Button variant="ghost" class="bits-btn-ghost">
              💬 Dialogs
            </Button>
            <Button variant="destructive" class="bits-btn-destructive">
              🗑️ Actions
            </Button>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Legal AI Integration Card -->
      <Card.Root class="feature-card">
        <Card.Header>
          <Card.Title class="text-white text-xl font-bold">
            ⚖️ Legal AI Integration
          </Card.Title>
          <Card.Description class="text-gray-300">
            AI-powered legal document analysis
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="actions-grid">
            <Button variant="secondary" class="bits-btn-secondary">
              📊 Analytics
            </Button>
            <Button variant="primary" class="bits-btn-primary">
              🤖 AI Chat
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>

<!-- Enhanced-Bits Authentication Dialog -->
<Dialog bind:open={open} legal={true} size="md">
  {#snippet content()}
    <div class="p-6 space-y-6">
      <!-- Dialog Header -->
      <div class="text-center space-y-2">
        <h2 class="text-2xl font-bold text-nier-text-primary">
          {mode === 'login' ? '🎮 Player Login' : '⭐ Create Account'}
        </h2>
        <p class="text-center text-nier-text-muted">
          {mode === 'login'
            ? 'Enter your credentials to access the legal AI platform'
            : 'Join our community of legal professionals'
          }
        </p>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="form-grid">
          <!-- Email Field -->
          <div class="space-y-2">
            <Label for="email">📧 Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="lawyer@example.com"
              bind:value={email}
              required
              class="bits-input"
            />
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <Label for="password">🔒 Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              bind:value={password}
              required
              minlength="6"
              class="bits-input"
            />
          </div>

          <!-- Confirm Password (Register only) -->
          {#if mode === 'register'}
            <div class="space-y-2">
              <Label for="confirm">🔐 Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                bind:value={confirmPassword}
                required
                minlength="6"
                class="bits-input"
              />
            </div>
          {/if}
        </div>

        <!-- Field Errors -->
        {#if form?.fieldErrors}
          <Alert variant="destructive">
            <AlertDescription>
              <ul class="space-y-1">
                {#each Object.entries(form.fieldErrors) as [field, error]}
                  <li>• {field}: {error}</li>
                {/each}
              </ul>
            </AlertDescription>
          </Alert>
        {/if}

        <!-- Form Actions -->
        <div class="form-actions">
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            class="flex-1 bits-btn-primary"
          >
            {#if isLoading}
              ⏳ Processing...
            {:else}
              {mode === 'login' ? '🎮 Login' : '⭐ Register'}
            {/if}
          </Button>

          <Button
            type="button"
            variant="outline"
            onclick={closeModal}
            class="bits-btn-outline"
          >
            ❌ Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onclick={switchMode}
            class="bits-btn-secondary"
          >
            🔄 Switch to {mode === 'login' ? 'Register' : 'Login'}
          </Button>
        </div>
      </form>
    </div>
  {/snippet}
</Dialog>
