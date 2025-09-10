<script lang="ts">
  import type { Evidence } from "$lib/data/types";
  import { onMount } from "svelte";

  interface Props {
    caseId: string;
    onEvidenceDrop?: (evidence: Evidence) => void;
  }

  let {
    caseId,
    onEvidenceDrop = () => {}
  }: Props = $props();

  // State using Svelte 5 runes
  let evidenceList = $state<Evidence[]>([]);
  let isUploading = $state(false);

  async function fetchEvidence() {
    try {
      const res = await fetch(`/api/evidence?caseId=${caseId}`);
      if (res.ok) {
        evidenceList = await res.json();
      } else {
        console.error('Failed to fetch evidence:', res.status);
      }
    } catch (error) {
      console.error('Error fetching evidence:', error);
    }
  }
  async function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    isUploading = true;
    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId);
    
    try {
      const res = await fetch("/api/evidence/upload", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        console.log("Evidence uploaded!");
        await fetchEvidence();
      } else {
        console.error("Upload failed:", res.status);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      isUploading = false;
      input.value = "";
    }
  }
  function handleDragStart(ev: DragEvent, evd: Evidence) {
    ev.dataTransfer?.setData("application/json", JSON.stringify(evd));
    ev.dataTransfer!.effectAllowed = "copy";
  }
  onMount(fetchEvidence);
</script>

<section class="evidence-panel">
  <h2 class="evidence-title">Evidence</h2>
  
  <div class="evidence-upload">
    <label class="evidence-upload-btn">
      <input
        type="file"
        accept="*/*"
        onchange={handleUpload}
        style="display:none"
      />
      📁 Upload Evidence
    </label>
    {#if isUploading}
      <span class="uploading">Uploading...</span>
    {/if}
  </div>
  
  <div class="evidence-list">
    {#each evidenceList as evd (evd.id)}
      <div
        class="evidence-card"
        draggable={true}
        ondragstart={(e) => handleDragStart(e, evd)}
        role="button"
        tabindex={0}
        aria-label="Drag evidence item: {evd.title}"
      >
        <div class="evidence-meta">
          <span class="file-type">{evd.fileType}</span>
          {#if Array.isArray(evd.tags) && evd.tags.length > 0}
            <span class="evidence-tags">{evd.tags.join(", ")}</span>
          {/if}
        </div>
        <div class="evidence-item-title">{evd.title}</div>
        {#if evd.description}
          <div class="evidence-desc">{evd.description}</div>
        {/if}
      </div>
    {/each}
    
    {#if evidenceList.length === 0 && !isUploading}
      <div class="empty-state">
        <p>No evidence uploaded yet.</p>
        <p class="empty-hint">Click "Upload Evidence" to add files to this case.</p>
      </div>
    {/if}
  </div>
</section>

<style>
  /* @unocss-include */
  .evidence-panel {
    background: var(--pico-background, #fff);
    border-radius: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  .evidence-title {
    font-size: 1.3rem;
    margin-bottom: 1rem;
    font-weight: 600;
    color: #374151;
  }
  .evidence-upload {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .evidence-upload-btn {
    display: inline-block;
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    border: none;
  }
  .evidence-upload-btn:hover {
    background: #2563eb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .uploading {
    color: var(--pico-primary, #007bff);
  }
  .evidence-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .evidence-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: grab;
    transition: all 0.2s ease;
    min-width: 180px;
    max-width: 220px;
    user-select: none;
  }
  .evidence-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  .evidence-card:active {
    cursor: grabbing;
  }
  .evidence-meta {
    font-size: 0.85em;
    color: #888;
    margin-bottom: 0.5em;
    display: flex;
    gap: 0.5em;
  }
  .evidence-tags {
    font-size: 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
  }
  .file-type {
    font-size: 0.75rem;
    background: #e5e7eb;
    color: #4b5563;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }
  .evidence-item-title {
    font-weight: 600;
    color: #374151;
    font-size: 0.95em;
    margin: 0.5em 0;
  }
  .evidence-desc {
    color: #6b7280;
    font-size: 0.85em;
    margin-top: 0.5em;
    line-height: 1.4;
  }
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }
  .empty-hint {
    font-size: 0.875rem;
    margin-top: 0.5rem;
    opacity: 0.8;
  }
</style>

