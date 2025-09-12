<!--
  LoadingButton Component Demo
  Demonstrates all variants and states of the headless loading button
-->

<script lang="ts">
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  
  // Demo state
  let loading1 = $state(false);
  let loading2 = $state(false);
  let loading3 = $state(false);
  let loading4 = $state(false);
  let loading5 = $state(false);
  
  // Simulate async operations
  async function simulateAsync(loadingState: { value: boolean }) {
    loadingState.value = true;
    await new Promise(resolve => setTimeout(resolve, 2000));
    loadingState.value = false;
  }
  
  const loadingState1 = { get value() { return loading1; }, set value(v) { loading1 = v; } };
  const loadingState2 = { get value() { return loading2; }, set value(v) { loading2 = v; } };
  const loadingState3 = { get value() { return loading3; }, set value(v) { loading3 = v; } };
  const loadingState4 = { get value() { return loading4; }, set value(v) { loading4 = v; } };
  const loadingState5 = { get value() { return loading5; }, set value(v) { loading5 = v; } };
</script>

<svelte:head>
  <title>LoadingButton Demo - Headless UI Components</title>
</svelte:head>

<div class="demo-container">
  <header class="demo-header">
    <h1>LoadingButton Component Demo</h1>
    <p class="demo-description">
      A headless, accessible loading button component with multiple variants and states.
      Built following the N64-UI-HOWTO principles for unstyled, composable UI primitives.
    </p>
  </header>

  <main class="demo-content">
    <!-- Basic Usage -->
    <section class="demo-section">
      <h2>Basic Usage</h2>
      <div class="demo-grid">
        <LoadingButton 
          loading={loading1} 
          onclick={() => simulateAsync(loadingState1)}
          loadingText="Processing..."
        >
          Click me!
        </LoadingButton>
        
        <LoadingButton 
          loading={loading2} 
          onclick={() => simulateAsync(loadingState2)}
          variant="secondary"
        >
          Secondary Button
        </LoadingButton>
      </div>
    </section>

    <!-- Variants -->
    <section class="demo-section">
      <h2>Variants</h2>
      <div class="demo-grid">
        <LoadingButton variant="primary" onclick={() => console.log('Primary clicked')}>
          Primary
        </LoadingButton>
        
        <LoadingButton variant="secondary" onclick={() => console.log('Secondary clicked')}>
          Secondary
        </LoadingButton>
        
        <LoadingButton variant="destructive" onclick={() => console.log('Destructive clicked')}>
          Destructive
        </LoadingButton>
        
        <LoadingButton variant="outline" onclick={() => console.log('Outline clicked')}>
          Outline
        </LoadingButton>
        
        <LoadingButton variant="ghost" onclick={() => console.log('Ghost clicked')}>
          Ghost
        </LoadingButton>
      </div>
    </section>

    <!-- Sizes -->
    <section class="demo-section">
      <h2>Sizes</h2>
      <div class="demo-grid demo-grid--aligned">
        <LoadingButton size="sm" onclick={() => console.log('Small clicked')}>
          Small
        </LoadingButton>
        
        <LoadingButton size="md" onclick={() => console.log('Medium clicked')}>
          Medium
        </LoadingButton>
        
        <LoadingButton size="lg" onclick={() => console.log('Large clicked')}>
          Large
        </LoadingButton>
      </div>
    </section>

    <!-- Loading States -->
    <section class="demo-section">
      <h2>Loading States</h2>
      <div class="demo-grid">
        <LoadingButton 
          loading={loading3} 
          onclick={() => simulateAsync(loadingState3)}
          loadingText="Saving..."
          variant="primary"
        >
          Save Document
        </LoadingButton>
        
        <LoadingButton 
          loading={loading4} 
          onclick={() => simulateAsync(loadingState4)}
          loadingText="Deleting..."
          variant="destructive"
        >
          Delete Item
        </LoadingButton>
        
        <LoadingButton 
          loading={loading5} 
          onclick={() => simulateAsync(loadingState5)}
          loadingText="Loading..."
          variant="outline"
          size="lg"
        >
          Load Data
        </LoadingButton>
      </div>
    </section>

    <!-- Disabled State -->
    <section class="demo-section">
      <h2>Disabled State</h2>
      <div class="demo-grid">
        <LoadingButton disabled onclick={() => console.log('Should not fire')}>
          Disabled Button
        </LoadingButton>
        
        <LoadingButton disabled variant="secondary">
          Also Disabled
        </LoadingButton>
      </div>
    </section>

    <!-- With Snippets -->
    <section class="demo-section">
      <h2>With Custom Content</h2>
      <div class="demo-grid">
        <LoadingButton onclick={() => console.log('Icon button clicked')}>
          {#snippet children()}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Star this!
          {/snippet}
        </LoadingButton>
      </div>
    </section>

    <!-- Form Integration -->
    <section class="demo-section">
      <h2>Form Integration</h2>
      <form class="demo-form" onsubmit={(e) => { e.preventDefault(); console.log('Form submitted'); }}>
        <div class="form-group">
          <label for="demo-input">Sample Input:</label>
          <input id="demo-input" type="text" placeholder="Enter some text..." />
        </div>
        
        <div class="form-actions">
          <LoadingButton type="submit" variant="primary">
            Submit Form
          </LoadingButton>
          
          <LoadingButton type="reset" variant="outline">
            Reset
          </LoadingButton>
        </div>
      </form>
    </section>
  </main>

  <footer class="demo-footer">
    <h3>Features Demonstrated:</h3>
    <ul>
      <li>✅ Accessible ARIA attributes (aria-busy, aria-label)</li>
      <li>✅ Keyboard navigation and focus management</li>
      <li>✅ Multiple variants (primary, secondary, destructive, outline, ghost)</li>
      <li>✅ Three sizes (sm, md, lg)</li>
      <li>✅ Loading states with custom text</li>
      <li>✅ Disabled state handling</li>
      <li>✅ Snippet support for custom content</li>
      <li>✅ Form integration (submit, reset types)</li>
      <li>✅ Proper event handling with onclick</li>
    </ul>
  </footer>
</div>

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .demo-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .demo-description {
    font-size: 1.125rem;
    color: #64748b;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .demo-content {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .demo-section {
    background: white;
    padding: 2rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .demo-section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1.5rem 0;
  }

  .demo-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-end;
  }

  .demo-grid--aligned {
    align-items: center;
  }

  .demo-form {
    max-width: 400px;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .form-group input:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    border-color: #3b82f6;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
  }

  .demo-footer {
    margin-top: 3rem;
    padding: 2rem;
    background: #f8fafc;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
  }

  .demo-footer h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .demo-footer ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 0.5rem;
  }

  .demo-footer li {
    font-size: 0.875rem;
    color: #475569;
    padding: 0.25rem 0;
  }

  @media (max-width: 768px) {
    .demo-container {
      padding: 1rem;
    }
    
    .demo-header h1 {
      font-size: 2rem;
    }
    
    .demo-section {
      padding: 1.5rem;
    }
    
    .demo-grid {
      flex-direction: column;
      align-items: stretch;
    }
    
    .demo-footer ul {
      grid-template-columns: 1fr;
    }
  }
</style>