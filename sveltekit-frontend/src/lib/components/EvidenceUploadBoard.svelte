<!-- Evidence Upload Board Component with AI Analysis -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  // import Button from '$lib/components/ui/enhanced-bits'; // Temporarily disabled due to SSR issues
  // import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/enhanced-bits'; // Temporarily disabled due to SSR issues
  // import { Textarea } from '$lib/components/ui/textarea'; // Replaced with native HTML textarea
  import { AIAnalysisService } from '$lib/services/ai-analysis';
  let files = $state<File[]>([]);
  let analysis = $state('');
  let isAnalyzing = $state(false);
  const aiService = new AIAnalysisService();
  async function handleFileUpload(_event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      files = Array.from(input.files);
      await analyzeEvidence();
    }
  }
  async function analyzeEvidence() {
    if (!files.length) return;
    isAnalyzing = true;
    try {
      const content = await files[0].text();
      analysis = await aiService.analyzeEvidence(content, 'current-case');
    } catch (error) {
      analysis = 'Analysis failed: ' + error.messag;
    } finally {
      isAnalyzing = false;
    }
  }
</script>

<div class="p-6 space-y-6">
  <div class="nes-container is-dark">
    <div class="yorha-panel-header">
      <h3 class="nes-text is-primary">Evidence Upload & AI Analysis</h3>
    </div>
    <div class="yorha-panel-content space-y-4">
      <input type="file" onchange={handleFileUpload} accept=".txt,.pdf,.doc,.docx" class="block w-full text-sm" />
      {#if files.length > 0}
        <div class="text-sm text-gray-600">
          Uploaded: {files[0].name}
        </div>
      {/if}
      {#if isAnalyzing}
        <div class="text-center p-4">
          <div class="animate-spin h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2">AI analyzing evidence...</p>
        </div>
      {/if}
      {#if analysis}
        <div class="nes-container is-rounded">
          <h4 class="nes-text is-success">AI Analysis:</h4>
          <textarea readonly class="nes-textarea" rows={10}>{analysis}</textarea>
        </div>
      {/if}
    </div>
  </div>
</div>
