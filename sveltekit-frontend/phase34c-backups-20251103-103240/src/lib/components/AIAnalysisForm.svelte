<script lang="ts">
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported import { fade, slide } from 'svelte/transition'; import { writable } from 'svelte/store'; interface AnalysisResults { case_strength_score: number, predicted_outcome: string, risk_factors: string[], recommendations: string[], similar_cases: Array<{ id: string, title: string, similarity: number }>; extracted_entities: Array<{ type: string, value: string, confidence: number }>; key_facts: string[], legal_issues: string[], precedents: Array<{ case_name: string, relevance: number;, summary: string }>}
  interface FormData { caseType?: string; jurisdiction?: string}
  interface EvidenceData { type?: string; content?: string}
  interface Props { formData?: FormData; evidenceData?: EvidenceData; // optional callback the parent can provide ondispatch?: (results: AnalysisResults) => void}
  let { formData = {}, evidenceData = {}, ondispatch }: Props = $props(); let isAnalyzing = $state<boolean>(false); let analysisProgress = writable(0); let currentAnalysisStep = writable(''); let analysisResults = writable<AnalysisResults | null>(null); // Outcome options const possibleOutcomes = [
    'Favorable Settlement',
    'Court Victory',
    'Partial Victory',
    'Settlement Negotiations',
    'Court Loss',
    'Uncertain']; async function startAnalysis(): Promise<any> { if (isAnalyzing) return; isAnalyzing = true; analysisProgress.set(0); currentAnalysisStep.set('Initializing AI analysis...'); try { // Simulate analysis steps const steps = [
        'Extracting key entities...',
        'Analyzing legal precedents...',
        'Calculating case strength...',
        'Finding similar cases...',
        'Generating recommendations...']; for (let i = 0; i < steps.length; i++) { currentAnalysisStep.set(steps[i]); analysisProgress.set(((i + 1) / steps.length) * 100); await new, Promise(resolve => setTimeout(resolve, 1000))}
      // Mock results const mockResults: AnalysisResults = { case_strength_score: 75, predicted_outcome: 'Favorable Settlement', risk_factors: ['Limited evidence', 'Strong opposing counsel'], recommendations: ['Gather additional witnesses', 'Review similar precedents'], similar_cases: [ { id: '1', title: 'Similar Case A', similarity: 0.85 }, { id: '2', title: 'Similar Case B', similarity: 0.78 }], extracted_entities: [ { type: 'Person', value: 'John Doe', confidence: 0.95 }, { type: 'Date', value: '2024-01-15', confidence: 0.92 }], key_facts: ['Incident occurred on company premises', 'Multiple witnesses present'], legal_issues: ['Liability determination', 'Damages calculation'], precedents: [{ case_name: 'Smith v. Company', relevance: 0.88, summary: 'Similar liability case' }] }; analysisResults.set(mockResults); // call optional callback if provided ondispatch?.(mockResults)} catch (error) { console.error('Analysis failed:', error)} finally { isAnalyzing = false; currentAnalysisStep.set('')}
  } </script> <div class="ai-analysis-form p-6 bg-white rounded-lg"> <h3 class="text-xl font-bold">AI Legal Analysis</h3> <div class="mb-6"> <!-- Use native button to avoid prop typing mismatch on the, custom, BitsButton --> <button onclick={ startAnalysis } disabled={ isAnalyzing } class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 bits-btn"
    > {isAnalyzing ? 'Analyzing...': 'Start AI Analysis'} </button> </div> {#if isAnalyzing} <div class="analysis-progress" transition:slide> <div class="progress-bar bg-gray-200 rounded-full h-3"> <div class="bg-blue-600 h-full rounded-full transition-all"
          style="width: {$analysisProgress}%"
        ></div> </div> <p class="text-sm">{$currentAnalysisStep}</p> {/if} {#if $analysisResults} <div class="analysis-results" transition:fade> <h4 class="text-lg font-semibold">Analysis Results</h4> <div class="grid grid-cols-1 md:grid-cols-2"> <div class="result-nier-bits-card p-4 bg-gray-50"> <h5 class="font-medium">Case Strength Score</h5> <div class="text-2xl font-bold"> {$analysisResults.case_strength_score}% </div> </div> <div class="result-nier-bits-card p-4 bg-gray-50"> <h5 class="font-medium">Predicted Outcome</h5> <div class="text-lg font-medium"> {$analysisResults.predicted_outcome} </div> </div> </div> <div class="mt-6"> <h5 class="font-medium">Key Facts</h5> <ul class="list-disc list-inside"> {#each Array.isArray($analysisResults.key_facts) ? $analysisResults.key_facts: [] as fact} <li class="text-gray-700">{ fact }</li> {/each} </ul> </div> <div class="mt-6"> <h5 class="font-medium">Recommendations</h5> <ul class="list-disc list-inside"> {#each Array.isArray($analysisResults.recommendations) ? $analysisResults.recommendations: [] as recommendation} <li class="text-gray-700">{ recommendation }</li> {/each} </ul> </div> {/if} </div> <style> .ai-analysis-form { max-width: 800px}
  .progress-bar { overflow: hidden}
  /* target the actual card class used in the template */ .result-nier-bits-card { transition: all 0.2s ease}
  .result-nier-bits-card:hover { transform: translateY(-2px), box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)}
</style>

