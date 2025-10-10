<script lang="ts">
  	import { onMount } from 'svelte';
  	import { page } from '$app/stores';
  	import { get } from 'svelte/store';
  	// Note: ReportEditor uses stores, not props - displays independently
  	import ReportEditor from "$lib/components/editor/ReportEditor.svelte";
  	// Use FabricCanvas as CanvasEditor alternative
  	import FabricCanvas from "$lib/components/canvas/FabricCanvas.svelte";
  	import type { Report, CanvasState } from "$lib/data/types";
  	// Avoid importing namespaces as types here — use lightweight local types to satisfy the component's needs.
  	type LocalEvidence = {
  		id: string;
  		caseId?: string;
  		title: string;
  		evidenceType?: string;
  		// allow additional fields coming from the real type
  		[key: string]: any;
  	};
  	type LocalCitationPoint = {
  		source: string;
  		text: string;
  		[key: string]: any;
  	};
  	let currentReport: Report | null = $state(null);
  	let currentCanvasState: CanvasState | null = $state(null);
  	let evidence = $state<LocalEvidence[]>([]);
  	let citationPoints = $state<LocalCitationPoint[]>([]);
  	let activeTab: 'editor' | 'canvas' = $state('editor');
  	let isLoading = $state(false);
  	let error = $state('');
  	// Demo case ID - in real app this would come from the route (read safely from the page store)
  	const caseId = (get(page).params?.caseId) ?? 'demo-case-123';
  	// Load demo data once on mount
  	onMount(() => {
  		void loadDemoData();
  	});
  	async function loadDemoData() {
  		try {
  			isLoading = true;
  			// Load sample citation points
  			const citationsResponse = await fetch(`/api/citations?caseId=${encodeURIComponent(caseId)}`);
  			if (citationsResponse.ok) {
  				citationPoints = await citationsResponse.json();
  			}
  			// Load sample evidence (mock for now)
  			evidence = [
  				{
  					id: '1',
  					caseId,
  					criminalId: null,
  					title: 'Security Camera Footage',
  					description: 'CCTV footage from main entrance',
  					evidenceType: 'video',
  					fileType: 'video/mp4',
  					subType: null,
  					fileUrl: null,
  					fileName: 'security_footage.mp4',
  					fileSize: null,
  					mimeType: 'video/mp4',
  					hash: 'abc123def456',
  					tags: [],
  					chainOfCustody: [],
  					collectedAt: null,
  					collectedBy: null,
  					location: null,
  					labAnalysis: {},
  					aiAnalysis: {},
  					aiTags: [],
  					aiSummary: null,
  					summary: null,
  					isAdmissible: true,
  					confidentialityLevel: 'standard',
  					canvasPosition: null,
  					uploadedBy: '1',
  					uploadedAt: new Date(),
  					updatedAt: new Date()
  				},
  				{
  					id: '2',
  					caseId,
  					criminalId: null,
  					title: 'Witness Statement - John Doe',
  					description: 'Eyewitness account of the incident',
  					evidenceType: 'document',
  					fileType: 'application/pdf',
  					subType: null,
  					fileUrl: null,
  					fileName: 'witness_statement.pdf',
  					fileSize: null,
  					mimeType: 'application/pdf',
  					hash: 'def456ghi789',
  					tags: [],
  					chainOfCustody: [],
  					collectedAt: null,
  					collectedBy: null,
  					location: null,
  					labAnalysis: {},
  					aiAnalysis: {},
  					aiTags: [],
  					aiSummary: null,
  					summary: null,
  					isAdmissible: true,
  					confidentialityLevel: 'standard',
  					canvasPosition: null,
  					uploadedBy: '1',
  					uploadedAt: new Date(),
  					updatedAt: new Date()
  				},
  				{
  					id: '3',
  					caseId,
  					criminalId: null,
  					title: 'Physical Evidence - Weapon',
  					description: 'Photograph of recovered weapon',
  					evidenceType: 'photo',
  					fileType: 'image/jpeg',
  					subType: null,
  					fileUrl: null,
  					fileName: 'weapon_photo.jpg',
  					fileSize: null,
  					mimeType: 'image/jpeg',
  					hash: 'ghi789jkl012',
  					tags: [],
  					chainOfCustody: [],
  					collectedAt: null,
  					collectedBy: null,
  					location: null,
  					labAnalysis: {},
  					aiAnalysis: {},
  					aiTags: [],
  					aiSummary: null,
  					summary: null,
  					isAdmissible: true,
  					confidentialityLevel: 'standard',
  					canvasPosition: null,
  					uploadedBy: '1',
  					uploadedAt: new Date(),
  					updatedAt: new Date()
  				}
  			];
  		} catch (err) {
  			console.error('Failed to load demo data:', err);
  			error = 'Failed to load demo data';
  		} finally {
  			isLoading = false;
  		}
  	}
  	async function handleReportSave(report: Report) {
  		try {
  			currentReport = report;
  			console.log('Report saved:', report);
  		} catch (err) {
  			console.error('Failed to save report:', err);
  			error = 'Failed to save report';
  		}
  	}
  	async function handleCanvasSave(canvasState: CanvasState) {
  		try {
  			currentCanvasState = canvasState;
  			console.log('Canvas saved:', canvasState);
  		} catch (err) {
  			console.error('Failed to save canvas:', err);
  			error = 'Failed to save canvas';
  		}
  	}
  	function createNewReport() {
  		currentReport = null;
  		activeTab = 'editor';
  	}
  	function createNewCanvas() {
  		currentCanvasState = null;
  		activeTab = 'canvas';
  	}
	// In Svelte 5 (runes mode) components are dynamic by default — use them directly.
	// Safely derive a reportId for the CanvasEditor; Report type may not include 'id'.
	let reportId: string = 'temp-report-id';
	// replace legacy reactive statement with runes-compatible effect & use a safe cast to avoid TS error
	$effect(() => {
		reportId = (currentReport as any)?.id ?? 'temp-report-id';
	});
</script>

<svelte:head>
  <title>Report Builder - Prosecutor's Case Management</title>
  <meta name="description" content="AI-powered report builder for legal case analysis" />
</svelte:head>
<div class="space-y-4">
  <!-- Header -->
  <header>
    <div class="space-y-4">
      <h1>📝 Report Builder</h1>
      <p>AI-powered case analysis and report generation</p>
      <div class="space-y-4">
        <!-- changed: use onclick instead of deprecated on:click -->
        <button onclick={() => createNewReport()}> 📄 New Report </button>
        <button onclick={() => createNewCanvas()}> 🎨 New Canvas </button>
      </div>
    </div>
  </header>
  <!-- Error Message -->
  {#if error}
    <div class="space-y-4">
      ❌ {error}
      <!-- changed: use onclick instead of deprecated on:click -->
      <button onclick={() => (error = '')}>×</button>
    </div>
  {/if}
  <!-- Loading State -->
  {#if isLoading}
    <div class="space-y-4">
      <div>⏳</div>
      <p>Loading demo data...</p>
    </div>
  {:else}
    <!-- Tab Navigation -->
    <div class="space-y-4">
      <button class:active={activeTab === 'editor'} onclick={() => (activeTab = 'editor')}>
        📝 Report Editor
      </button>
      <button class:active={activeTab === 'canvas'} onclick={() => (activeTab = 'canvas')}>
        🎨 Interactive Canvas
      </button>
    </div>
    <!-- Main Content -->
    <main class="space-y-4">
      {#if activeTab === 'editor'}
        <!-- Report Editor Tab -->
        <div class="space-y-4">
          <div class="space-y-4">
            <h2>Prosecutor's Report</h2>
            <p>Write, edit, and analyze case reports with AI assistance</p>
          </div>
		  <!-- ReportEditor uses internal stores, not props -->
		  <ReportEditor />
        </div>
      {:else if activeTab === 'canvas'}
        <div class="space-y-4">
          <div class="space-y-4">
            <h2>Interactive Canvas</h2>
            <p>Visualize and annotate case evidence</p>
          </div>
          <!-- Use FabricCanvas for interactive canvas -->
          <FabricCanvas
            width={1200}
            height={800}
            caseId={caseId}
            readOnly={false}
            gridEnabled={true}
            snapToGrid={true}
            onSave={handleCanvasSave}
          />
        </div>
      {/if}
    </main>
    <!-- Sidebar with Features Overview -->
    <aside class="space-y-4">
      <div class="space-y-4">
        <h3>🤖 AI Features</h3>
        <ul class="space-y-4">
          <li>✨ Auto-complete suggestions</li>
          <li>📊 Case analysis insights</li>
          <li>🔍 Citation recommendations</li>
          <li>📝 Content summarization</li>
        </ul>
      </div>
      <div class="space-y-4">
        <h3>📚 Citation Library</h3>
        <p>{citationPoints.length} citations available</p>
        <div class="space-y-4">
          {#each citationPoints.slice(0, 3) as citation}
            <div class="space-y-4">
              <div>{citation.source}</div>
              <div>{citation.text.substring(0, 60)}...</div>
            </div>
          {/each}
        </div>
      </div>
      <div class="space-y-4">
        <h3>📋 Evidence Repository</h3>
        <p>{evidence.length} pieces of evidence</p>
        <div class="space-y-4">
          {#each evidence as item}
            <div class="space-y-4">
              <div>{item.title}</div>
              <div>{item.evidenceType || 'unknown'}</div>
            </div>
          {/each}
        </div>
      </div>
      <div class="space-y-4">
        <h3>⚡ Quick Actions</h3>
        <div class="space-y-4">
          <button>📤 Export PDF</button>
          <button>💾 Save Template</button>
          <button>🔄 Sync Offline</button>
        </div>
      </div>
    </aside>
  {/if}
</div>

<style>
  /* @unocss-include */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>

