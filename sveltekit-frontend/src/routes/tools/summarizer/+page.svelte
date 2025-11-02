<script lang="ts">
  import { onMount } from 'svelte';
  import LegalDocumentSummarizer from '$lib/components/ai/LegalDocumentSummarizer.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/enhanced-bits.svelte';
  let summarizerRef: any;
  function handleSummaryGenerated(summary: any) {
    console.log('Summary generated:', summary);
    // Additional handling if needed
  }

  onMount(() => {
    if (summarizerRef?.$on) {
      summarizerRef.$on('summaryGenerated', (e: CustomEvent) => {
        handleSummaryGenerated(e.detail);
      });
    }
  });
</script>

<svelte:head>
  <title>Legal Document Summarizer - AI-Powered Analysis</title>
  <meta name="description" content="Convert lengthy legal documents into concise summaries using Gemma3 AI" />
</svelte:head>
<div class="container mx-auto p-6 max-w-7xl">
  <!-- Page Header -->
  <div class="mb-8">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl">🤖 Legal Document Summarizer</CardTitle>
        <p class="text-muted-foreground">
          Transform lengthy legal documents into concise, actionable summaries using advanced Gemma3 AI. Perfect for
          contracts, judgments, briefs, and legal statutes.
        </p>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="flex items-center space-x-2">
            <span class="text-green-600">✅</span>
            <span>AI-powered analysis with legal context understanding</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-blue-600">⚡</span>
            <span>90% compression ratio while preserving key information</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-purple-600">🎯</span>
            <span>Multiple summary formats: executive, detailed, analysis</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  <!-- Main Summarizer Component -->
  <LegalDocumentSummarizer bind:this={summarizerRef} />
  <!-- Usage Guide -->
  <div class="mt-8">
    <Card>
      <CardHeader>
        <CardTitle>📖 How to Use the Legal Document Summarizer</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="space-y-2">
            <div class="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
              <h4 class="font-medium text-blue-900">1. Document Setup</h4>
              <p class="text-sm text-blue-700">
                Provide a descriptive title and select the appropriate document type for optimal AI analysis.
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
              <h4 class="font-medium text-green-900">2. Content Input</h4>
              <p class="text-sm text-green-700">
                Paste your legal document content. The AI can handle documents up to 200 pages effectively.
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-500">
              <h4 class="font-medium text-purple-900">3. Configure Focus</h4>
              <p class="text-sm text-purple-700">
                Select focus areas and summary type to tailor the output to your specific needs.
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
              <h4 class="font-medium text-orange-900">4. AI Processing</h4>
              <p class="text-sm text-orange-700">
                Review the generated summary, quality metrics, and key insights from Gemma3 AI analysis.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-6 p-4 bg-muted rounded-lg">
          <h4 class="font-medium mb-2">💡 Pro Tips</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• Use descriptive document titles to improve AI context understanding</li>
            <li>• Select multiple focus areas for comprehensive analysis</li>
            <li>• Executive summaries are ideal for quick decision-making</li>
            <li>• Legal analysis mode provides deeper statutory and precedent insights</li>
            <li>• Quality scores help assess the reliability of generated summaries</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
