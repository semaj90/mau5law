<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  let hashInput = $state('81d9c48f998f9025eb8f72e28a6c4f921ed407dd75891a9e9a8778c9ad5711bd');
  let searchResult: unknown = $state(null);
  let loading = $state(false);
  let error = $state('');
  $effect(() => {
    // Check if hash was provided in URL
    const urlHash = page.url.searchParams.get('hash');
    if (urlHash) {
      hashInput = urlHash;
      searchByHash();
    }
  });
  async function searchByHash() {
    if (!hashInput || hashInput.length !== 64) {
      error = 'Please enter a valid 64-character SHA256 hash';
      return;
    }
    loading = true;
    error = '';
    searchResult = null;
    try {
      // removed unused response assignment
      const result = await (response as { json?: unknown; ok?: unknown }).json();
      if ((response as { json?: unknown; ok?: unknown }).ok) {
        searchResult = result;
      } else {
        error = (result as { error?: unknown; message?: unknown }).error || 'Search failed';
      }
    } catch (e) {
      error = 'Network error occurred';
    } finally {
      loading = false;
    }
  }
  async function verifyIntegrity(evidenceId: string) {
    if (!evidenceId) return;
    loading = true;
    error = '';
    try {
      const response = await fetch('/api/evidence/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hashInput, evidenceId }),
      });
      const result = await (response as { json?: unknown; ok?: unknown }).json();
      if ((response as { json?: unknown; ok?: unknown }).ok) {
        alert(`Integrity Check: ${(result as { error?: unknown; message?: unknown }).message}`);
      } else {
        error = (result as { error?: unknown; message?: unknown }).error || 'Verification failed';
      }
    } catch (e) {
      error = 'Network error occurred';
    } finally {
      loading = false;
    }
  }
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText.then(() => {
      alert('Copied to clipboard!');
    });
  }
</script>

<svelte:head>
  <title>Evidence Hash Verification - Legal Case Management</title>
</svelte:head>
<div class="space-y-4">
  <div class="space-y-4">
    <h1 class="space-y-4">🔐 Evidence Hash Verification</h1>
    <p class="space-y-4">Verify file integrity and search for evidence using SHA256 hashes</p>
  </div>
  <div class="space-y-4">
    <div class="space-y-4">
      <h2 class="space-y-4">Hash Search & Verification</h2>
      <div class="space-y-4">
        <label for="hash-input" class="space-y-4"> SHA256 Hash (64 characters) </label>
        <div class="space-y-4">
          <input
            id="hash-input"
            type="text"
            bind:value={hashInput}
            placeholder="Enter SHA256 hash..."
            class="space-y-4"
            maxlength="64"
          />
          <button onclick={() => searchByHash()} disabled={loading || !hashInput} class="space-y-4">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <p class="space-y-4">Example: 81d9c48f998f9025eb8f72e28a6c4f921ed407dd75891a9e9a8778c9ad5711bd</p>
      </div>
      {#if error}
        <div class="space-y-4">
          <strong>Error:</strong>
          {error}
        </div>
      {/if}
      {#if searchResult}
        <div class="space-y-4">
          <h3 class="space-y-4">Search Results</h3>
          {#if searchResult.found}
            <div class="space-y-4">
              <strong>✅ {searchResult.message}</strong>
            </div>
            <div class="space-y-4">
              {#each searchResult.evidence as item}
                <div class="space-y-4">
                  <div class="space-y-4">
                    <div class="space-y-4">
                      <h4 class="space-y-4">
                        {(
                          item as {
                            title?: unknown;
                            id?: unknown;
                            fileName?: unknown;
                            fileSize?: unknown;
                            fileType?: unknown;
                            caseName?: unknown;
                            caseNumber?: unknown;
                            uploaderName?: unknown;
                            uploadedAt?: unknown;
                            hash?: unknown;
                            description?: unknown;
                            fileUrl?: unknown;
                          }
                        ).title}
                      </h4>
                      <span class="space-y-4">
                        ID: {(
                          item as {
                            title?: unknown;
                            id?: unknown;
                            fileName?: unknown;
                            fileSize?: unknown;
                            fileType?: unknown;
                            caseName?: unknown;
                            caseNumber?: unknown;
                            uploaderName?: unknown;
                            uploadedAt?: unknown;
                            hash?: unknown;
                            description?: unknown;
                            fileUrl?: unknown;
                          }
                        ).id}
                      </span>
                    </div>
                    <div class="space-y-4">
                      <div>
                        <p>
                          <strong>File:</strong>
                          {(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).fileName || 'N/A'}
                        </p>
                        <p>
                          <strong>Size:</strong>
                          {(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).fileSize
                            ? (
                                (
                                  item as {
                                    title?: unknown;
                                    id?: unknown;
                                    fileName?: unknown;
                                    fileSize?: unknown;
                                    fileType?: unknown;
                                    caseName?: unknown;
                                    caseNumber?: unknown;
                                    uploaderName?: unknown;
                                    uploadedAt?: unknown;
                                    hash?: unknown;
                                    description?: unknown;
                                    fileUrl?: unknown;
                                  }
                                ).fileSize / 1024
                              ).toFixed(1) + ' KB'
                            : 'N/A'}
                        </p>
                        <p>
                          <strong>Type:</strong>
                          {(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).fileType || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Case:</strong>
                          {(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).caseName || 'N/A'} ({(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).caseNumber || 'N/A'})
                        </p>
                        <p>
                          <strong>Uploaded by:</strong>
                          {(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).uploaderName || 'N/A'}
                        </p>
                        <p>
                          <strong>Uploaded:</strong>
                          {(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).uploadedAt
                            ? new Date(
                                (
                                  item as {
                                    title?: unknown;
                                    id?: unknown;
                                    fileName?: unknown;
                                    fileSize?: unknown;
                                    fileType?: unknown;
                                    caseName?: unknown;
                                    caseNumber?: unknown;
                                    uploaderName?: unknown;
                                    uploadedAt?: unknown;
                                    hash?: unknown;
                                    description?: unknown;
                                    fileUrl?: unknown;
                                  }
                                ).uploadedAt,
                              ).toLocaleString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div class="space-y-4">
                      <strong>Hash:</strong>
                      {(
                        item as {
                          title?: unknown;
                          id?: unknown;
                          fileName?: unknown;
                          fileSize?: unknown;
                          fileType?: unknown;
                          caseName?: unknown;
                          caseNumber?: unknown;
                          uploaderName?: unknown;
                          uploadedAt?: unknown;
                          hash?: unknown;
                          description?: unknown;
                          fileUrl?: unknown;
                        }
                      ).hash}
                      <button
                        onclick={() =>
                          copyToClipboard(
                            (
                              item as {
                                title?: unknown;
                                id?: unknown;
                                fileName?: unknown;
                                fileSize?: unknown;
                                fileType?: unknown;
                                caseName?: unknown;
                                caseNumber?: unknown;
                                uploaderName?: unknown;
                                uploadedAt?: unknown;
                                hash?: unknown;
                                description?: unknown;
                                fileUrl?: unknown;
                              }
                            ).hash,
                          )}
                        class="space-y-4"
                        title="Copy hash"
                      >
                        📋
                      </button>
                    </div>
                    {#if (item as { title?: unknown; id?: unknown; fileName?: unknown; fileSize?: unknown; fileType?: unknown; caseName?: unknown; caseNumber?: unknown; uploaderName?: unknown; uploadedAt?: unknown; hash?: unknown; description?: unknown; fileUrl?: unknown }).description}
                      <p class="space-y-4">
                        {(
                          item as {
                            title?: unknown;
                            id?: unknown;
                            fileName?: unknown;
                            fileSize?: unknown;
                            fileType?: unknown;
                            caseName?: unknown;
                            caseNumber?: unknown;
                            uploaderName?: unknown;
                            uploadedAt?: unknown;
                            hash?: unknown;
                            description?: unknown;
                            fileUrl?: unknown;
                          }
                        ).description}
                      </p>
                    {/if}
                    <div class="space-y-4">
                      <button
                        onclick={() =>
                          verifyIntegrity(
                            (
                              item as {
                                title?: unknown;
                                id?: unknown;
                                fileName?: unknown;
                                fileSize?: unknown;
                                fileType?: unknown;
                                caseName?: unknown;
                                caseNumber?: unknown;
                                uploaderName?: unknown;
                                uploadedAt?: unknown;
                                hash?: unknown;
                                description?: unknown;
                                fileUrl?: unknown;
                              }
                            ).id,
                          )}
                        disabled={loading}
                        class="space-y-4"
                      >
                        Verify Integrity
                      </button>
                      {#if (item as { title?: unknown; id?: unknown; fileName?: unknown; fileSize?: unknown; fileType?: unknown; caseName?: unknown; caseNumber?: unknown; uploaderName?: unknown; uploadedAt?: unknown; hash?: unknown; description?: unknown; fileUrl?: unknown }).fileUrl}
                        <a
                          href={(
                            item as {
                              title?: unknown;
                              id?: unknown;
                              fileName?: unknown;
                              fileSize?: unknown;
                              fileType?: unknown;
                              caseName?: unknown;
                              caseNumber?: unknown;
                              uploaderName?: unknown;
                              uploadedAt?: unknown;
                              hash?: unknown;
                              description?: unknown;
                              fileUrl?: unknown;
                            }
                          ).fileUrl}
                          target="_blank"
                          class="space-y-4"
                        >
                          View File
                        </a>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="space-y-4">
              <strong>⚠️ {searchResult.message}</strong>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div class="space-y-4">
    <div class="space-y-4">
      <h2 class="space-y-4">About Hash Verification</h2>
      <div class="space-y-4">
        <p>This tool allows you to search for evidence files by their SHA256 hash and verify file integrity.</p>
        <h3>How it works:</h3>
        <ul>
          <li>
            <strong>File Upload:</strong> When evidence is uploaded, a SHA256 hash is automatically calculated and stored
          </li>
          <li><strong>Hash Search:</strong> Search for evidence using the exact 64-character SHA256 hash</li>
          <li>
            <strong>Integrity Verification:</strong> Compare provided hashes with stored hashes to detect file tampering
          </li>
        </ul>
        <h3>Use cases:</h3>
        <ul>
          <li>Verify that an evidence file hasn't been modified</li>
          <li>Find evidence files by their cryptographic fingerprint</li>
          <li>Ensure chain of custody integrity</li>
          <li>Cross-reference files across different cases</li>
        </ul>
        <div class="space-y-4">
          <p class="space-y-4">
            <strong>Security Note:</strong> SHA256 hashes provide cryptographic assurance that files have not been altered.
            Each file has a unique hash that changes if even a single byte is modified.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
;