<script lang="ts">
  import { goto } from '$app // TODO: Verify store subscription is correct for Svelte 5/navigation';
  import type { Evidence } from '$lib // TODO: Verify store subscription is correct for Svelte 5/types/evidence';
  import EvidenceCard from '$lib // TODO: Verify store subscription is correct for Svelte 5/ui/EvidenceCard.svelte';
  import Modal from '$lib // TODO: Verify store subscription is correct for Svelte 5/ui/Modal.svelte';
  import {
    ArrowLeft,
    Calendar,
    Edit,
    FileText,
    Plus,
    Tag,
    Trash2,
    Upload,
    User
  } from 'lucide-svelte';
 // Import the unified Evidence type

  // --- START: Added types to resolve 'Cannot find module './$types // TODO: Verify store subscription is correct for Svelte 5'' ---
  interface Case {
    id: string;
    title: string;
    caseNumber: string;
    status: 'open' | 'pending' | 'closed' | string; // Allow string for flexibility
    description: string;
    createdAt: string;
    updatedAt: string;
    assignedTo: string;
    tags: string[];
  }

  // Define PageData type for the data prop
  interface PageData {
    case: Case;
  }
  // --- END: Added types ---

  // Page data from server
  let { data }: { data: PageData } = $props // TODO: Verify store subscription is correct for Svelte 5();

  // State management
  let caseData = $derived // TODO: Verify store subscription is correct for Svelte 5(data?.case);
  let evidence: Evidence[] = $state // TODO: Verify store subscription is correct for Svelte 5([]); // Use the imported Evidence type
  let loading = $state // TODO: Verify store subscription is correct for Svelte 5(true);
  let showDeleteModal = $state // TODO: Verify store subscription is correct for Svelte 5(false);
  let deleting = $state // TODO: Verify store subscription is correct for Svelte 5(false);

  // Get case ID from URL params
  // let caseId = $derived // TODO: Verify store subscription is correct for Svelte 5($page // TODO: Verify store subscription is correct for Svelte 5.params.id); // REMOVED: Using deprecated $page // TODO: Verify store subscription is correct for Svelte 5 store
  let caseId = $derived // TODO: Verify store subscription is correct for Svelte 5(caseData?.id); // FIXED: Derive caseId from caseData

  // Load case details and evidence
  async function loadCaseData() {
    if (!caseId) return;

    try {
      loading = true;

      // Load case details (already in data.case)
      // Load evidence for this case
      const evidenceResponse = await fetch(`/api/cases/${caseId}/evidence`);
      if (evidenceResponse.ok) {
        evidence = await evidenceResponse.json();
      }
    } catch (error) {
      console.error('Failed to load case data:', error);
    } finally {
      loading = false;
    }
  }

  // Handle back navigation
  function handleBack() {
    goto('/cases');
  }

  // Handle edit case
  function handleEditCase() {
    goto(`/cases/${caseId}/edit`);
  }

  // Handle delete case
  async function handleDeleteCase() {
    if (!caseId) return;

    try {
      deleting = true;
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        goto('/cases');
      } else {
        console.error('Failed to delete case');
      }
    } catch (error) {
      console.error('Error deleting case:', error);
    } finally {
      deleting = false;
      showDeleteModal = false;
    }
  }

  // Handle add evidence
  function handleAddEvidence() {
    goto(`/evidence/upload?caseId=${caseId}`);
  }

  // Handle evidence selection
  function handleEvidenceClick(evidenceId: string) {
    goto(`/evidence/${evidenceId}`);
  }

  // Handle evidence deletion
  async function handleEvidenceDelete(evidenceId: string) {
    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        evidence = evidence.filter(item => item.id !== evidenceId);
      }
    } catch (error) {
      console.error('Failed to delete evidence:', error);
    }
  }

  // Handle evidence download
  function handleEvidenceDownload(evidenceId: string) {
    // This would typically trigger a download
    window.open(`/api/evidence/${evidenceId}/download`, '_blank');
  }

  // Mount effect
  // REMOVED: onMount(() => {
  // REMOVED:   loadCaseData();
  // REMOVED: });

  // Svelte 5: Reactively load case data when caseId is available
  $effect // TODO: Verify store subscription is correct for Svelte 5(() => {
    if (caseId) {
      loadCaseData();
    }
  });
</script>

<svelte:head>
  <title>{caseData?.title || 'Case Details'} - Legal AI Platform</title>
  <meta name="description" content="Case details and evidence management" />
</svelte:head>

<div class="case-details">
  <!-- Header -->
  <header class="case-header">
    <div class="header-nav">
      <button class="btn btn-link" onclick={handleBack}>
        <ArrowLeft size={16} />
        Back to Cases
      </button>
    </div>

    <div class="header-content">
      <div class="case-title-section">
        <h1 class="case-title">{caseData?.title || 'Loading...'}</h1>
        <div class="case-meta">
          <span class="case-number">Case #{caseData?.caseNumber}</span>
          <span class="case-status status-{caseData?.status || 'pending'}">
            {caseData?.status || 'pending'}
          </span>
        </div>
      </div>

      <div class="header-actions">
        <button class="btn btn-secondary" onclick={handleEditCase}>
          <Edit size={16} />
          Edit Case
        </button>
        <button class="btn btn-danger" onclick={() => showDeleteModal = true}>
          <Trash2 size={16} />
          Delete Case
        </button>
      </div>
    </div>
  </header>

  <!-- Case Information -->
  <section class="case-info">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-header">
          <FileText size={20} />
          <h3>Description</h3>
        </div>
        <p class="info-content">{caseData?.description || 'No description provided'}</p>
      </div>

      <div class="info-card">
        <div class="info-header">
          <Calendar size={20} />
          <h3>Timeline</h3>
        </div>
        <div class="info-content">
          <p><strong>Created:</strong> {caseData?.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'Unknown'}</p>
          <p><strong>Last Updated:</strong> {caseData?.updatedAt ? new Date(caseData.updatedAt).toLocaleDateString() : 'Unknown'}</p>
        </div>
      </div>

      <div class="info-card">
        <div class="info-header">
          <User size={20} />
          <h3>Assigned To</h3>
        </div>
        <p class="info-content">{caseData?.assignedTo || 'Unassigned'}</p>
      </div>

      <div class="info-card">
        <div class="info-header">
          <Tag size={20} />
          <h3>Tags</h3>
        </div>
        <div class="info-content">
          {#if caseData?.tags && caseData.tags.length > 0}
            <div class="tags-list">
              {#each caseData.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {:else}
            <p>No tags</p>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- Evidence Section -->
  <section class="evidence-section">
    <div class="section-header">
      <div class="section-title">
        <h2>Evidence ({evidence.length})</h2>
        <p>Documents and files associated with this case</p>
      </div>

      <button class="btn btn-primary" onclick={handleAddEvidence}>
        <Plus size={16} />
        Add Evidence
      </button>
    </div>

    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading evidence...</p>
      </div>
    {:else if evidence.length === 0}
      <div class="empty-state">
        <FileText size={48} />
        <h3>No evidence yet</h3>
        <p>Add evidence to this case to get started with analysis</p>
        <button class="btn btn-primary" onclick={handleAddEvidence}>
          <Upload size={16} />
          Upload Evidence
        </button>
      </div>
    {:else}
      <div class="evidence-grid">
        {#each evidence as item (item.id)}
          <EvidenceCard
            evidence={item}
            onSelect={handleEvidenceClick}
            onDelete={handleEvidenceDelete}
            onDownload={handleEvidenceDownload}
          />
        {/each}
      </div>
    {/if}
  </section>
</div>

<!-- Delete Confirmation Modal -->
<Modal
  bind:open={showDeleteModal}
  title="Delete Case"
  description="Are you sure you want to delete this case? This action cannot be undone and will also delete all associated evidence."
  variant="destructive"
  confirmText="Delete Case"
  cancelText="Cancel"
  loading={deleting}
  onConfirm={handleDeleteCase}
>
  <p class="delete-warning">
    This will permanently delete the case "{caseData?.title}" and all {evidence.length} evidence items.
  </p>
</Modal>

<style>
  .case-details {
    min-height: 100vh;
    background: #f8f9fa;
    padding: 2rem;
  }

  .case-header {
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
  }

  .header-nav {
    margin-bottom: 1.5rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .case-title-section {
    flex: 1;
  }

  .case-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: #212529;
  }

  .case-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .case-number {
    font-weight: 500;
    color: #6c757d;
  }

  .case-status {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-open {
    background: #d4edda;
    color: #155724;
  }

  .status-pending {
    background: #fff3cd;
    color: #856404;
  }

  .status-closed {
    background: #f8d7da;
    color: #721c24;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .case-info {
    margin-bottom: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .info-header h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: #212529;
  }

  .info-header :global(svg) {
    color: #6c757d;
  }

  .info-content {
    color: #495057;
    line-height: 1.5;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    background: #e9ecef;
    color: #495057;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .evidence-section {
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .section-title h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: #212529;
  }

  .section-title p {
    margin: 0;
    color: #6c757d;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #6c757d;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 1rem 0 0.5rem 0;
    color: #495057;
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
  }

  .delete-warning {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid #f5c6cb;
    margin: 1rem 0;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    text-decoration: none;
  }

  .btn-link {
    background: none;
    color: #007bff;
    border: none;
    padding: 0;
    text-decoration: underline;
  }

  .btn-link:hover {
    color: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
  }

  .btn-secondary:hover {
    background: #545b62;
    border-color: #545b62;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
  }

  .btn-danger:hover {
    background: #c82333;
    border-color: #c82333;
  }

  .btn-primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .btn-primary:hover {
    background: #0056b3;
    border-color: #0056b3;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .case-details {
      padding: 1rem;
    }

    .case-header {
      padding: 1.5rem;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
    }

    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .evidence-section {
      padding: 1.5rem;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .evidence-grid {
      grid-template-columns: 1fr;
    }
  }
</style>