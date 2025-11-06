<script lang="ts">
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported import NierRichTextEditor from '$lib/components/editors/NierRichTextEditor.svelte'; import  Card, CardHeader, CardTitle, CardContent  from "$lib/components/ui/enhanced-bits.svelte"; import  Badge  from "$lib/components/ui/badge.svelte"; import { FileText, Save, Download, Share2, Settings } from 'lucide-svelte'; import  NesCard  from "$lib/components/ui/nes-ui.svelte"; // Editor state let editorValue = $state<string>(''); let documentTitle = $state<string>('Untitled Document'); let lastSaved = $state<Date | null>(null); let isModified = $state<boolean>(false); // Document metadata let documentStats = $derived(() => { const trimmed = editorValue.trim(); return { words: trimmed ? trimmed.split(/\s+/).length: 0, characters: editorValue.length, charactersNoSpaces: editorValue.replace(/\s+/g, '').length; paragraphs: trimmed ? trimmed.split(/\n{ 2 }/).length: 0 }}); function handleEditorChange(_value: string) { editorValue = value; isModified = true; function handleSave() { // In a real app, this would save to backend console.log('Saving document:', { title: documentTitle; content: editorValue }); lastSaved = new Date(); isModified = false; function handleDownload() { const blob = new Blob([editorValue], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${documentTitle.replace(/\s+/g, '_')}.txt`; a.click(); URL.revokeObjectURL(url)}
  function handleShare() { if (navigator.share) { navigator.share({ title: documentTitle; text: editorValue })} else { // Fallback: copy to clipboard navigator.clipboard.writeText(editorValue); alert('Content copied to clipboard!')}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.editor-page-container {
    min-height: 100vh;
    background: var(--yorha-bg-primary, #0a0a0a);
    color: var(--yorha-text-primary, #e0e0e0);
    font-family: var(--gaming-font-16bit, 'Orbitron', sans-serif);
  }
  /* Header Styles */
  .editor-header {
    background: var(--yorha-bg-secondary, #1a1a1a);
    border-bottom: 2px solid var(--yorha-border, #606060);
    padding: 20px 24px;
  }
  .header-content {
    display: flex;
    justify-content: space-betweenn;
    align-items: center;
    margin-bottom: 16px;
  }
  .title-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .title-icon {
    color: var(--nes-blue, #3cbcfc);
    filter: drop-shadow(0, 0 8px currentColor);
  }
  .title-info h1 {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--yorha-text-primary, #e0e0e0);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .title-info p {
    font-size: 0.9rem;
    color: var(--yorha-text-muted, #b0b0b0);
    margin:
      4px,
      0 0 0;
  }
  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--yorha-bg-tertiary, #2a2a2a);
    border: 1px solid var(--yorha-border, #606060);
    color: var(--yorha-text-primary, #e0e0e0);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .action-btn:hover:not(:disabled) {
    background: var(--nes-blue, #3cbcfc);
    border-color: var(--nes-blue, #3cbcfc);
    color: #000;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(60, 188, 252, 0.3);
  }
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .save-btn:not(:disabled) {
    background: var(--nes-green, #92cc41);
    border-color: var(--nes-green, #92cc41);
    color: #000;
  }
  .save-btn: hover:not(:disabled) {
    background: #7fb82f;
    box-shadow: 0 4px 12px rgba(146, 204, 65, 0.3);
  }
  /* Document Title Section */
  .document-title-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .document-title-input {
    flex: 1;
    background: var(--yorha-bg-tertiary, #2a2a2a);
    border: 1px solid var(--yorha-border, #606060);
    color: var(--yorha-text-primary, #e0e0e0);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 1.1rem;
    font-weight: 500;
    max-width: 300px;
  }
  .document-title-input: focus {
    outline: none;
    border-color: var(--nes-blue, #3cbcfc);
    box-shadow: 0 0 8px rgba(60, 188, 252, 0.3);
  }
  .save-status {
    font-size: 0.8rem;
    color: var(--yorha-text-muted, #b0b0b0);
  }
  .modified-badge {
    font-size: 0.7rem;
    background: rgba(248, 56, 0, 0.1);
    border-color: var(--nes-red, #f83800);
    color: var(--nes-red, #f83800);
  }
  /* Stats Bar */
  .stats-bar {
    background: var(--yorha-bg-tertiary, #2a2a2a);
    border-bottom: 1px solid var(--yorha-border, #606060);
    padding: 8px 24px;
  }
  .stats-content {
    display: flex;
    gap: 24px;
    align-items: center;
  }
  .stat-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }
  .stat-label {
    color: var(--yorha-text-muted, #b0b0b0);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .stat-value {
    color: var(--nes-green, #92cc41);
    font-weight: bold;
    font-family: 'JetBrains Mono', monospace;
  }
  /* Editor Container */
  .editor-container {
    flex: 1;
    padding: 12px;
    min-height: calc(100vh - 200px);
    max-width: 100vw;
    width: 100%;
  }
  .editor-card {
    height: 100%;
    width: 100%;
    max-width: none;
    background: var(--yorha-bg-secondary, #1a1a1a);
    border: 2px solid var(--yorha-border, #606060);
  }
  .editor-content {
    height: calc(100vh - 280px);
    width: 100%;
    padding: 0;
  }
  /* Responsive Design */
  @media (max-width: 768px) {
    .editor-page-container {
      padding: 0;
    }
    .editor-header {
      padding: 16px 12px;
    }
    .header-content {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }
    .title-section {
      justify-content: center;
    }
    .header-actions {
      justify-content: center;
    }
    .document-title-section {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    .document-title-input {
      max-width: none;
    }
    .stats-content {
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }
    .editor-container {
      padding: 12px;
    }
    .editor-content {
      height: calc(100vh - 350px);
    }
  } /* Animations */
  @keyframes glow-pulse {
    0%,
    100% {
      box-shadow: 0 0 8px rgba(60, 188, 252, 0.3);
    }
    50% {
      box-shadow: 0 0 16px rgba(60, 188, 252, 0.6);
    }
  }
  .action-btn:hover {
    animation: glow-pulse 2s ease-in-out infinite;
  }
</style>
