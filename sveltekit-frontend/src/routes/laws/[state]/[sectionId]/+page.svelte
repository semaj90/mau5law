<script lang="ts">
  import StatuteActionPanel from '$lib/components/legal/StatuteActionPanel.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="statute-detail-page">
  {#if data.error}
    <div class="error-message">
      <p>{data.error}</p>
      <a href="/laws" class="back-link">← Back to Laws</a>
    </div>
  {:else if data.section}
    <header class="page-header">
      <a href="/laws" class="back-link">← Back to Laws</a>
      <h1>{data.section.fullCitation}</h1>
      {#if data.section.heading}
        <h2 class="statute-heading">{data.section.heading}</h2>
      {/if}
    </header>

    <div class="statute-content">
      <section class="statute-text">
        <h3>Statute Text</h3>
        <div class="text-content">
          {data.section.text}
        </div>
      </section>

      <StatuteActionPanel
        statute={{
          titleNumber: data.section.titleNumber,
          section: data.section.section,
          id: data.section.id,
          fullCitation: data.section.fullCitation,
          text: data.section.text,
          heading: data.section.heading,
        }}
        relatedCases={data.relatedCases}
      />

      <WorkspacePanel workspaceId={data.section.id} />

      {#if data.relatedCases && data.relatedCases.length > 0}
        <section class="related-cases">
          <h3>Related Cases ({data.relatedCases.length})</h3>
          <div class="cases-list">
            {#each data.relatedCases as caseChunk (caseChunk.chunk_id)}
              <div class="case-item">
                <h4>{caseChunk.case_name}</h4>
                <p class="case-meta">
                  <span class="badge">{caseChunk.crime_code}</span>
                  <span class="badge">{caseChunk.crime_category}</span>
                </p>
                <p class="case-text">
                  {caseChunk.text.substring(0, 300)}...
                </p>
                <p class="case-score">
                  Relevance: {(caseChunk.score * 100).toFixed(0)}%
                </p>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .statute-detail-page {
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: #0066cc;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #0052a3;
  }

  .page-header h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #1a1a1a;
    font-family: monospace;
  }

  .statute-heading {
    font-size: 1.25rem;
    margin: 0;
    color: #666;
    font-weight: 500;
  }

  .statute-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  section {
    background: white;
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  section h3 {
    margin: 0 0 1rem 0;
    color: #1a1a1a;
    font-size: 1.1rem;
  }

  .text-content {
    line-height: 1.6;
    color: #333;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .cases-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .case-item {
    padding: 1rem;
    background: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
  }

  .case-item h4 {
    margin: 0 0 0.5rem 0;
    color: #1a1a1a;
  }

  .case-meta {
    margin: 0.5rem 0;
    display: flex;
    gap: 0.5rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: #e8f0ff;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #0066cc;
  }

  .case-text {
    margin: 0.5rem 0;
    color: #666;
    font-size: 0.9rem;
  }

  .case-score {
    margin: 0.5rem 0 0 0;
    color: #999;
    font-size: 0.875rem;
  }

  .error-message {
    padding: 1.5rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    color: #856404;
  }
</style>
