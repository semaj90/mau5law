<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import '../../lib/styles/warden-theme.css';

  interface Evidence {
    id: string;
    fileName: string;
    documentType: string;
    inferenceConfidence: number;
    status: 'pending' | 'approved' | 'rejected' | 'locked';
    createdAt: string;
    fileHash: string;
    metadata?: Record<string, unknown>;
  }

  let pendingEvidence: Evidence[] = [];
  let approvedEvidence: Evidence[] = [];
  let isLoading = true;
  let error = '';
  let isUploading = false;
  let selectedEvidence: Evidence | null = null;
  let uploadProgress = 0;

  onMount(async () => {
    await loadEvidence();
  });

  const loadEvidence = async () => {
    try {
      const response = await fetch('/api/evidence/pending');
      if (!response.ok) {
        if (response.status === 401) {
          await goto('/login');
          return;
        }
        throw new Error('Failed to load evidence');
      }

      const data = await response.json();
      pendingEvidence = data.pending || [];
      approvedEvidence = data.approved || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load evidence';
    } finally {
      isLoading = false;
    }
  };

  const handleFileUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    isUploading = true;
    error = '';
    uploadProgress = 0;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      uploadProgress = 100;
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reload evidence
      await loadEvidence();
      input.value = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      isUploading = false;
      uploadProgress = 0;
    }
  };

  const approveEvidence = async (evidence: Evidence) => {
    try {
      const response = await fetch(`/api/evidence/${evidence.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) throw new Error('Approval failed');

      await loadEvidence();
      selectedEvidence = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Approval failed';
    }
  };

  const rejectEvidence = async (evidence: Evidence) => {
    try {
      const response = await fetch(`/api/evidence/${evidence.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: 'Rejected by prosecutor',
        }),
      });

      if (!response.ok) throw new Error('Rejection failed');

      await loadEvidence();
      selectedEvidence = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Rejection failed';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'verdict-amber';
      case 'approved':
        return 'verdict-green';
      case 'rejected':
        return 'verdict-red';
      case 'locked':
        return 'legal-black';
      default:
        return 'charcoal-slate';
    }
  };
</script>

<div class="evidence-grid min-h-screen">
  <!-- Header -->
  <header class="bg-bone-white border-b border-blueprint-grid sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-6 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-legal-black">Evidence Intake</h1>
          <p class="text-charcoal-slate mt-1">Chain-of-Custody Management</p>
        </div>
        <a href="/dashboard" class="btn btn-secondary">
          ← Dashboard
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 py-8">
    {#if error}
      <div class="mb-6 p-4 bg-verdict-red bg-opacity-10 border border-verdict-red rounded">
        <p class="text-verdict-red font-mono text-sm">{error}</p>
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left: Upload & Queue -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Upload Section -->
        <div class="card">
          <h2 class="text-lg font-semibold text-legal-black mb-4">📤 Upload Evidence</h2>

          <label class="block cursor-pointer">
            <div class="border-2 border-dashed border-blueprint-grid rounded p-8 text-center hover:border-verdict-red transition">
              <p class="text-legal-black font-mono mb-2">
                {isUploading ? `Uploading... ${uploadProgress}%` : '📄 Click or drag to upload'}
              </p>
              <p class="text-charcoal-slate text-sm">PDF, images, documents</p>
              <input
                type="file"
                on:change={handleFileUpload}
                disabled={isUploading}
                class="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </div>
          </label>

          {#if uploadProgress > 0 && uploadProgress < 100}
            <div class="mt-4 bg-charcoal-slate rounded overflow-hidden h-2">
              <div
                class="bg-verdict-red h-full transition-all"
                style="width: {uploadProgress}%"
              />
            </div>
          {/if}
        </div>

        <!-- Pending Queue -->
        <div class="card">
          <h2 class="text-lg font-semibold text-legal-black mb-4">
            ⏳ Pending Approval ({pendingEvidence.length})
          </h2>

          {#if isLoading}
            <p class="text-charcoal-slate font-mono">Loading evidence...</p>
          {:else if pendingEvidence.length === 0}
            <p class="text-charcoal-slate font-mono">No pending evidence</p>
          {:else}
            <div class="space-y-3">
              {#each pendingEvidence as evidence (evidence.id)}
                <button
                  on:click={() => (selectedEvidence = evidence)}
                  class={`w-full text-left p-4 rounded border-2 transition ${
                    selectedEvidence?.id === evidence.id
                      ? 'border-verdict-red bg-verdict-red bg-opacity-5'
                      : 'border-blueprint-grid hover:border-sapphire-link'
                  }`}
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <p class="font-mono text-legal-black font-semibold">
                        {evidence.fileName}
                      </p>
                      <p class="text-charcoal-slate text-sm mt-1 font-mono">
                        {evidence.documentType} • {(evidence.inferenceConfidence * 100).toFixed(0)}% confidence
                      </p>
                      <p class="text-blueprint-grid text-xs mt-2 font-mono">
                        Hash: {evidence.fileHash.substring(0, 16)}...
                      </p>
                    </div>
                    <span class="status-chip pending">Pending</span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Approved Archive -->
        <div class="card">
          <h2 class="text-lg font-semibold text-legal-black mb-4">
            ✓ Approved ({approvedEvidence.length})
          </h2>

          {#if approvedEvidence.length === 0}
            <p class="text-charcoal-slate font-mono">No approved evidence yet</p>
          {:else}
            <div class="space-y-2">
              {#each approvedEvidence as evidence (evidence.id)}
                <div class="p-3 rounded border border-blueprint-grid bg-verdict-green bg-opacity-5">
                  <p class="font-mono text-legal-black text-sm font-semibold">
                    {evidence.fileName}
                  </p>
                  <p class="text-charcoal-slate text-xs mt-1 font-mono">
                    Approved • {new Date(evidence.createdAt).toLocaleDateString()}
                  </p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Right: Evidence Details & Actions -->
      <div class="space-y-6">
        {#if selectedEvidence}
          <div class="card border-verdict-red">
            <h3 class="text-lg font-semibold text-legal-black mb-4">📋 Evidence Details</h3>

            <div class="space-y-4 font-mono text-sm">
              <div>
                <p class="text-charcoal-slate">File Name</p>
                <p class="text-legal-black font-semibold mt-1">{selectedEvidence.fileName}</p>
              </div>

              <div>
                <p class="text-charcoal-slate">Classification</p>
                <p class="text-legal-black font-semibold mt-1">{selectedEvidence.documentType}</p>
              </div>

              <div>
                <p class="text-charcoal-slate">AI Confidence</p>
                <div class="mt-2 bg-charcoal-slate rounded overflow-hidden h-2">
                  <div
                    class="bg-verdict-amber h-full"
                    style="width: {selectedEvidence.inferenceConfidence * 100}%"
                  />
                </div>
                <p class="text-legal-black font-semibold mt-1">
                  {(selectedEvidence.inferenceConfidence * 100).toFixed(1)}%
                </p>
              </div>

              <div>
                <p class="text-charcoal-slate">SHA-256 Hash</p>
                <p class="text-sapphire-link font-semibold mt-1 break-all text-xs">
                  {selectedEvidence.fileHash}
                </p>
              </div>

              <div>
                <p class="text-charcoal-slate">Uploaded</p>
                <p class="text-legal-black font-semibold mt-1">
                  {new Date(selectedEvidence.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 space-y-3">
              <button
                on:click={() => approveEvidence(selectedEvidence)}
                class="w-full btn btn-success"
              >
                ✓ Approve & Index
              </button>
              <button
                on:click={() => rejectEvidence(selectedEvidence)}
                class="w-full btn btn-outline"
              >
                ✗ Reject
              </button>
            </div>

            <!-- Chain of Custody -->
            <div class="mt-6 pt-6 border-t border-blueprint-grid">
              <p class="text-charcoal-slate text-xs font-mono mb-3">CHAIN OF CUSTODY</p>
              <div class="bg-crt rounded p-3 text-crt-green text-xs font-mono leading-relaxed">
                <p>[UPLOAD] {new Date(selectedEvidence.createdAt).toISOString()}</p>
                <p>[PENDING] Awaiting prosecutor approval</p>
                <p>[HASH] {selectedEvidence.fileHash.substring(0, 32)}...</p>
              </div>
            </div>
          </div>
        {:else}
          <div class="card text-center text-charcoal-slate">
            <p class="font-mono">Select evidence to review</p>
          </div>
        {/if}

        <!-- Stats -->
        <div class="card">
          <h3 class="text-lg font-semibold text-legal-black mb-4">📊 Queue Stats</h3>
          <div class="space-y-3 font-mono text-sm">
            <div class="flex justify-between">
              <span class="text-charcoal-slate">Pending</span>
              <span class="text-verdict-amber font-semibold">{pendingEvidence.length}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-charcoal-slate">Approved</span>
              <span class="text-verdict-green font-semibold">{approvedEvidence.length}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-charcoal-slate">Total</span>
              <span class="text-legal-black font-semibold">
                {pendingEvidence.length + approvedEvidence.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  :global(body) {
    background-color: var(--bone-white);
  }
</style>
