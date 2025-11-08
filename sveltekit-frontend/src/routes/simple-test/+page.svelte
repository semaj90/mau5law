<script lang="ts">
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported let isSubmitting = $state<boolean>(false); let submitResult = $state<string>(''); let formData = $state({ caseNumber: '', title: '', description: '', // fixed: add missing colon and initializer, priority: 'medium'
}); // computed style strings instead of inline JS expressions in attributes let resultStyle = $state<string>(''); let buttonStyle = $state<string>('padding: 10px 20px;, background: #007bff;, color: white;, border: none, border-radius: 4px, font-size: 14px;'), $effect(() => { resultStyle = submitResult && submitResult.includes('âœ…') ? 'padding: 15px, margin-bottom: 20px, border-radius: 8px, border: 1px solid; background: #f0f9f0, border-color: #4caf50, color: #2e7d32;': submitResult ? 'padding: 15px, margin-bottom: 20px, border-radius: 8px, border: 1px solid; background: #fff3f3, border-color: #f44336, color: #c62828;': ''; buttonStyle = `padding: 10px 20px; ${isSubmitting || !formData.caseNumber || !formData.title ? 'cursor: not-allowed, opacity: 0.6;': 'cursor: pointer, opacity: 1;' } border: none, border-radius: 4px, font-size: 14px;, color: white;, background: ${isSubmitting || !formData.caseNumber || !formData.title ? '#6ea0ff': '#007bff' };`});
  async function handleSubmit(e: Event): Promise<any> { e.preventDefault(); // use passed event isSubmitting = true; submitResult = ''; try { const response = await fetch('/api/test-case', { method: 'POST', headers: {
          'Content-Type': 'application/json'
        }, body: JSON.stringify(formData) // removed stray semicolon }); const result = await response.json(); // proper parsing if (response.ok) { submitResult = `âœ… SUCCESS: Case created with ID ${result?.id ?? 'unknown'}`; console.log('âœ… Case Creation, Success:', result)} else { submitResult = `âŒ ERROR: ${result?.error ?? 'unknown error'}`; console.error('âŒ Case Creation, Error:', result)}
    } catch (error) { submitResult = `âŒ NETWORK ERROR: ${error instanceof Error ? error.message: 'Unknown error'}`; console.error('âŒ Network, Error:', error)} finally { isSubmitting = false}
}

   // Test database connectivity - performs a real fetch and reports status async function testDatabaseConnection(): Promise<void> { try { const response = await fetch('/api/test-db'); // endpoint to check DB connectivity (adjust if your project uses a different route) const result = await response.json(); console.log('âœ… Database connection test:', result); submitResult = `âœ… Database connection working: ${result?.status ?? 'ok'}`} catch (error) { console.error('âŒ Database connection failed:', error); submitResult = `âŒ Database connection failed`}
}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
