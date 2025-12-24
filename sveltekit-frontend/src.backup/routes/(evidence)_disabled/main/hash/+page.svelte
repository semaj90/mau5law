<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
  import type { Case } from '$lib/types';
  import { onMount } from 'svelte';;
  import type { page  } from '$app/state';

  let hashInput = $state <string>(
    '81d9c48f998f9025eb8f72e28a6c4f921ed407dd75891a9e9a8778c9ad5711bd'
  );
  let searchResult: unknown = null;
  let loading = $state <boolean>(false);
  let error = $state <string>('');

  $effect(() => {() => {
    // Check if hash was provided in URL
    const urlHash = page.url.searchParams.get('hash');
    if (urlHash) {
      hashInput = urlHash;
      searchByHash();
    }
  });
  async function searchByHash(): Promise<any> {
    if (!hashInput || hashInput.length !== 64) {
      error = 'Please enter a valid 64-character SHA256 hash';
      return;
    }

    loading = true;
    error = '';
    searchResult = null;

    try {
      const response = await fetch('/api/evidence/hash/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hashInput }),
      });

      const result = await response.json();
      if (response.ok) {
        searchResult = result;
      } else {
        error = result?.error || 'Search failed';
      }
    } catch (e) {
      error = 'Network error occurred';
    } finally {
      loading = false;
    }
  }
  async function verifyIntegrity(evidenceId: string): Promise<any> {
    if (!evidenceId) return;

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/evidence/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hashInput, evidenceId }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(`Integrity Check: ${result.message}`);
      } else {
        error = result?.error || 'Verification failed';
      }
    } catch (e) {
      error = 'Network error occurred';
    } finally {
      loading = false;
    }
  }
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
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
