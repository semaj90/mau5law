<!--
  Minimal Case Creation Test - Testing API integration without UI library dependencies
-->
<script lang="ts">
import type { Case } from '$lib/types';
  // Svelte 5 runes are auto-imported

let isSubmitting = $state<boolean>(false);
let submitResult = $state<string>('');
let formData = $state({
    caseNumber: '',
    title: '',
    description: '', // fixed: add missing colon and initializer
    priority: 'medium',
});

// computed style strings instead of inline JS expressions in attributes
let resultStyle = $state<string>('');
let buttonStyle = $state<string>('padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 14px;');

$effect(() => {
  resultStyle = submitResult && submitResult.includes('✅')
    ? 'padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 1px solid; background: #f0f9f0; border-color: #4caf50; color: #2e7d32;'
    : submitResult
      ? 'padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 1px solid; background: #fff3f3; border-color: #f44336; color: #c62828;'
      : '';
  buttonStyle = `padding: 10px 20px; ${isSubmitting || !formData.caseNumber || !formData.title ? 'cursor: not-allowed; opacity: 0.6;' : 'cursor: pointer; opacity: 1;' } border: none; border-radius: 4px; font-size: 14px; color: white; background: ${isSubmitting || !formData.caseNumber || !formData.title ? '#6ea0ff' : '#007bff' };`;
});

async function handleSubmit(e: Event): Promise<any> {
    e.preventDefault(); // use passed event
    isSubmitting = true;
    submitResult = '';
    try {
      const response = await fetch('/api/test-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData) // removed stray semicolon
      });
      const result = await response.json(); // proper parsing
      if (response.ok) {
        submitResult = `✅ SUCCESS: Case created with ID ${result?.id ?? 'unknown'}`;
        console.log('✅ Case Creation Success:', result);
      } else {
        submitResult = `❌ ERROR: ${result?.error ?? 'unknown error'}`;
        console.error('❌ Case Creation Error:', result);
      }
    } catch (error) {
      submitResult = `❌ NETWORK ERROR: ${error instanceof Error ? error.message: 'Unknown error'}`;
      console.error('❌ Network Error:', error);
    } finally {
      isSubmitting = false;
    }
}

// Test database connectivity - performs a real fetch and reports status
async function testDatabaseConnection(): Promise<void> {
    try {
      const response = await fetch('/api/test-db'); // endpoint to check DB connectivity (adjust if your project uses a different route)
      const result = await response.json();
      console.log('✅ Database connection test:', result);
      submitResult = `✅ Database connection working: ${result?.status ?? 'ok'}`;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      submitResult = `❌ Database connection failed`;
    }
}
</script>

<svelte:head>
  <title>Simple Test Case - Database & API Integration</title>
</svelte:head>
<div class="container" style="max-width: 800px; margin: 40px auto; padding: 20px; font-family: system-ui;">
  <div class="header" style="margin-bottom: 30px;">
    <h1 style="color: #333; margin: 0 0 10px 0;">Simple Test Case Creation</h1>
    <p style="color: #666; margin: 0;">Testing database save and API integration without UI library dependencies</p>
  </div>
  {#if submitResult}
    <div class="result" style={resultStyle}>
      <strong>{submitResult}</strong>
    </div>
  {/if}
  <div class="nier-bits-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 30px; background: white;">
    <h2 style="margin-top: 0; color: #333;">Case Information Form</h2>
    <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 20px;">
      <div>
        <label for="caseNumber" style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">
          Case Number *
        </label>
        <input
          id="caseNumber"
          name="caseNumber"
          type="text"
          placeholder="ABC-2024-123456"
          bind:value={formData.caseNumber}
          required
          style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;"
        />
      </div>
      <div>
        <label for="title" style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">
          Case Title *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Enter a descriptive case title"
          bind:value={formData.title}
          required
          style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;"
        />
      </div>
      <div>
        <label for="description" style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Provide detailed case description"
          bind:value={formData.description}
          rows="4"
          style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; resize: vertical;"
        ></textarea>
      </div>
      <div>
        <label for="priority" style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">
          Priority Level
        </label>
        <select
          id="priority"
          bind:value={formData.priority}
          style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid #eee;">
        <button
          type="button"
          onclick={testDatabaseConnection}
          style="padding: 10px 20px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; font-size: 14px;"
        >
          Test Database Connection
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.caseNumber || !formData.title}
          style={buttonStyle}
        >
          {isSubmitting ? '⏳ Creating...' : '💾 Create Case'}
        </button>
      </div>
    </form>
  </div>
  <div
    class="info"
    style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;"
  >
    <h3 style="margin-top: 0; color: #333;">✅ Testing Complete Integration</h3>
    <ul style="margin: 0; color: #666;">
      <li><strong>Frontend:</strong> Svelte 5 form handling and state management</li>
      <li><strong>API:</strong> POST request to /api/test-case endpoint</li>
      <li><strong>Backend:</strong> Data processing and validation</li>
      <li><strong>Database:</strong> Mock save operation with ID generation</li>
      <li><strong>Response:</strong> Success/error feedback with console logging</li>
    </ul>
  </div>
</div>

