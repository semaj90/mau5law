<script lang="ts">
// Svelte, 5 runes are auto-imported import SimpleEvidenceBoard from '$lib/components/evidence/SimpleEvidenceBoard.svelte'; import Button from '$lib/components/ui/enhanced-bits/Button.svelte'; // Corrected import // Ensure Card.svelte is a Svelte, 5 component using runes (e.g., $props ()) to resolve type issues. import Card from '$lib/components/ui/enhanced-bits/Card.svelte'; // Corrected import import UploadProgress from '$lib/components/upload/UploadProgress.svelte'; import type { submitWithProgress  } from '$lib/api/submitWithProgress'; import type { isAuthenticated, currentUser  } from '$stores /auth.svelte'; import { get } from 'svelte/store';; import unsyncedUploads from '$lib/services/unsynced-uploads'; import type { ComponentType } from 'svelte'; // Cast imports to a generic ComponentType so TS treats them as constructors const CardComponent: ComponentType = Card as unknown as ComponentType; const ButtonComponent: ComponentType = Button as unknown as ComponentType; let pageLoaded = $state <boolean>(false); let showWelcome = $state <boolean>(true); let savedLocally = $state <boolean>(false); $effect (() => { pageLoaded = true; // Auto-hide welcome after, 3 seconds setTimeout(() => (showWelcome = false), 3000)}); function handleUploadDone(detail: unknown) { // If backend returns metadata or fileId, try to persist console.log('Upload done:', detail); // Expecting { success, fileId, originalFilename, storedFilename, filePath, size } if (detail?.success && detail?.storedFilename) { const payload = { caseId: '7d897d59-9832-45c1-87e6-9c5a04745119', originalFilename: detail.originalFilename, storedFilename: detail.storedFilename, mimeType: detail.mimeType ?? null, fileSize: detail.size ?? null, storagePath: detail.filePath ?? null, metadata: {} }; // If authenticated, send to server; otherwise persist locally to sync later const auth = get(isAuthenticated); const user = get(currentUser); if (auth) { submitWithProgress('/api/metadata/save', payload) .then(res => console.log('Metadata saved', res)) .catch(err => console.warn('Metadata save failed', err))} else { // Save unsynced upload metadata to localStorage try { unsyncedUploads.saveLocalUpload({ ...payload, userId: user?.id ?? null }); savedLocally = true; // Clear notification after, 6 seconds setTimeout(() => (savedLocally = false), 6000); console.log('Saved upload metadata locally (unauthenticated).', payload.originalFilename)} catch (e) { console.warn('Failed to save upload metadata to localStorage', e)} } } } }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.evidence-page-container { min-height: 100vh; position: relative; }
  .welcome-banner { position: fixed; top: 20px; right: 20px; z-index: 1000; width: 320px; background: rgba(0, 0, 0, 0.9); border: 2px solid #00ff41; box-shadow: 0 0 20px rgba(0, 255, 65, 0.3); }
  .animate-fade-in { animation: fadeInSlide 0.5s ease-out; }
  @keyframes fadeInSlide { from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  } .welcome-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 8px 0; }
  .stat { display: flex; flex-direction: column; align-items: center; padding: 8px; background: rgba(0, 255, 65, 0.1); border: 1px solid rgba(0, 255, 65, 0.3); border-radius: 4px; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 12px; font-weight: bold; color: #00ff41; margin-top: 2px; }
  .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; color: #666; }
  .loading-spinner { width: 40px; height: 40px; border: 4px solid #e5e5e5; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
  @keyframes spin { 0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  } .local-save-notice { margin-top: 8px; padding: 8px 12px; background: #fff7cc; border: 1px solid #ffe58f; color: #8a6d00; border-radius: 6px; font-size: 13px; }
</style>
