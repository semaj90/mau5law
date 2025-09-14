<!-- @migration-task Error while migrating Svelte code: Can only bind to an Identifier or MemberExpression or a `{get, set}` pair
https://svelte.dev/e/bind_invalid_expression -->
<!-- @migration-task Error while migrating Svelte code: Can only bind to an Identifier or MemberExpression -->
<!--
  Enhanced Claude Inline Suggestions Demo
  Demonstrates real-time AI-powered editing with comprehensive suggestion types
-->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';
  import EnhancedInlineEditor from '$lib/components/ai/EnhancedInlineEditor.svelte';
  import { inlineSuggestionService, type SuggestionOptions } from '$lib/services/inlineSuggestionService';
  import NesCard from '$lib/components/ui/nes-card.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import Button from '$lib/components/ui/nes-button.svelte';
  import { Switch } from '$lib/components/ui/switch';
  import { Slider } from '$lib/components/ui/slider';

  // Demo content
  let demoContent = $state(`In the matter of Smith v. Johnson (2024), the court found that the defendant's actions constituted a breach of contractual obligations. The plaintiff sought damages for lost profits and consequential losses arising from the breach.

  The legal precedent established in Williams v. Davis (2019) provides guidance on calculating damages in commercial disputes. The court emphasized the importance of proving causation between the breach and the claimed losses.

  Furthermore, the doctrine of mitigation requires that the injured party take reasonable steps to minimize their damages. This principle was clearly articulated in`);

  // Service configuration
  let serviceOptions = $state<SuggestionOptions>({
    enableAutoComplete: true,
    enableGrammarCheck: true,
    enableLegalTerms: true,
    enableCaseReferences: true,
    enableCitations: true,
    minCharacters: 10,
    maxSuggestions: 5,
    suggestionDelay: 800,
    aiModel: 'gemma3-legal'
  });

  // Demo stats
  let stats = $state({
    totalSuggestions: 0,
    acceptedSuggestions: 0,
    suggestionTypes: {
      completion: 0,
      grammar: 0,
      legal_term: 0,
      case_reference: 0,
      citation: 0
    },
    averageConfidence: 0,
    processingTime: 0
  });

  // Service status
  let serviceStatus = $state({
    initialized: false,
    aiServiceReady: false,
    goServiceReady: false,
    lastError: null as string | null
  });

  // Update service options when they change
  $effect(() => {
    inlineSuggestionService.updateOptions(serviceOptions);
  });

  // Monitor service status
  let statusInterval: NodeJS.Timeout;
  onMount(() => {
    // Check service status periodically
    statusInterval = setInterval(() => {
      serviceStatus.initialized = inlineSuggestionService.isReady();
      // Additional status checks would go here
    }, 2000);

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  });

  // Handle suggestion acceptance (for stats)
  function handleSuggestionAccepted(event: CustomEvent) {
    const { suggestion } = event.detail;
    stats.acceptedSuggestions++;
    stats.suggestionTypes[suggestion.type]++;
    stats.totalSuggestions++;
  }

  // Reset demo content
  function resetDemo() {
    demoContent = `In the matter of Smith v. Johnson (2024), the court found that the defendant's actions constituted a breach of contractual obligations. The plaintiff sought damages for lost profits and consequential losses arising from the breach.

  The legal precedent established in Williams v. Davis (2019) provides guidance on calculating damages in commercial disputes. The court emphasized the importance of proving causation between the breach and the claimed losses.

  Furthermore, the doctrine of mitigation requires that the injured party take reasonable steps to minimize their damages. This principle was clearly articulated in`;
    // Reset stats
    stats = {
      totalSuggestions: 0,
      acceptedSuggestions: 0,
      suggestionTypes: {
        completion: 0,
        grammar: 0,
        legal_term: 0,
        case_reference: 0,
        citation: 0
      },
      averageConfidence: 0,
      processingTime: 0
    };
  }

  // Load example scenarios
  const demoScenarios = [
    {
      title: "Contract Dispute",
      content: "The breach of contract occurred when the defendant failed to deliver the goods as specified in the agreement. Under Section 2-615 of the UCC, a party may be excused from performance if"
    },
    {
      title: "Personal Injury Case",
      content: "The plaintiff sustained injuries in the motor vehicle accident on Highway 101. The defendant was driving at approximately 65 mph in a 45 mph zone. Negligence per se doctrine applies when"
    },
    {
      title: "Employment Law",
      content: "The termination was allegedly discriminatory based on the employee's age. Title VII of the Civil Rights Act of 1964 prohibits employment discrimination. The ADEA provides additional protections for"
    },
    {
      title: "Property Law",
      content: "The easement by necessity doctrine applies when a landlocked parcel requires access through neighboring property. The requirements for establishing an easement include"
    }
  ];

  function loadScenario(scenario: any) {
    demoContent = scenario.content;
  }
</script>

<svelte:head>
  <title>Enhanced Claude Inline Suggestions Demo</title>
  <meta name="description" content="Real-time AI-powered editing with comprehensive legal suggestions" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    
    <!-- Header -->
    <div class="text-center space-y-4">
      <h1 class="text-4xl font-bold text-slate-900">Enhanced Claude Inline Suggestions</h1>
      <p class="text-xl text-slate-600 max-w-3xl mx-auto">
        Experience real-time AI-powered editing with intelligent suggestions for legal documents
      </p>
      
      <!-- Service Status Indicators -->
      <div class="flex justify-center gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full {serviceStatus.initialized ? 'bg-green-500' : 'bg-red-500'}"></div>
          <span>Service Ready</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full {serviceStatus.aiServiceReady ? 'bg-green-500' : 'bg-yellow-500'}"></div>
          <span>AI Processing</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full {serviceStatus.goServiceReady ? 'bg-green-500' : 'bg-yellow-500'}"></div>
          <span>Go Microservice</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Main Editor -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Demo Scenarios -->
        <NesCard>
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">Demo Scenarios</h3>
            <p class="nes-text">Try these pre-built legal scenarios</p>
          </div>
          <div class="yorha-panel-content">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each demoScenarios as scenario}
                <button class="nes-btn"
                  variant="outline"
                  size="sm"
                  onclick={() => loadScenario(scenario)}
                  class="justify-start text-left"
                >
                  {scenario.title}
                </button>
              {/each}
            </div>
          </div>
        </NesCard>

        <!-- Enhanced Editor -->
        <NesCard>
          <div class="yorha-panel-header">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="nes-text is-primary">AI-Enhanced Legal Editor</h3>
                <p class="nes-text">Start typing to see intelligent suggestions appear</p>
              </div>
              <button class="nes-btn" onclick={resetDemo} variant="outline" size="sm">
                Reset Demo
              </button>
            </div>
          </div>
          <div class="yorha-panel-content">
            <EnhancedInlineEditor
              bind:value={demoContent}
              placeholder="Start typing your legal document..."
              aiModel={serviceOptions.aiModel}
              enableAutoComplete={serviceOptions.enableAutoComplete}
              enableGrammarCheck={serviceOptions.enableGrammarCheck}
              enableSemanticSuggestions={serviceOptions.enableLegalTerms}
              minCharactersForSuggestion={serviceOptions.minCharacters}
              suggestionDelay={serviceOptions.suggestionDelay}
              maxSuggestions={serviceOptions.maxSuggestions}
              className="w-full"
              onsuggestionaccepted={handleSuggestionAccepted}
            />
          </div>
        </NesCard>
        
        <!-- Live Stats -->
        <NesCard>
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">Live Statistics</h3>
            <p class="nes-text">Real-time metrics from your editing session</p>
          </div>
          <div class="yorha-panel-content">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{stats.totalSuggestions}</div>
                <div class="text-sm text-slate-600">Total Suggestions</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{stats.acceptedSuggestions}</div>
                <div class="text-sm text-slate-600">Accepted</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">
                  {stats.totalSuggestions > 0 ? Math.round((stats.acceptedSuggestions / stats.totalSuggestions) * 100) : 0}%
                </div>
                <div class="text-sm text-slate-600">Success Rate</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">{stats.averageConfidence}%</div>
                <div class="text-sm text-slate-600">Avg Confidence</div>
              </div>
            </div>
            
            <!-- Suggestion Types Breakdown -->
            <div class="mt-6">
              <h4 class="font-semibold mb-3">Suggestion Types</h4>
              <div class="flex flex-wrap gap-2">
                {#each Object.entries(stats.suggestionTypes) as [type, count]}
                  <Badge variant="secondary" class="capitalize">
                    {type.replace('_', ' ')}: {count}
                  </Badge>
                {/each}
              </div>
            </div>
          </div>
        </NesCard>
      </div>

      <!-- Configuration Panel -->
      <div class="space-y-6">
        
        <!-- AI Configuration -->
        <NesCard>
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">AI Configuration</h3>
            <p class="nes-text">Customize the suggestion engine</p>
          </div>
          <div class="yorha-panel-content" class="space-y-6">
            
            <!-- AI Model Selection -->
            <div>
              <label class="text-sm font-medium mb-2 block">AI Model</label>
              <select 
                bind:value={serviceOptions.aiModel}
                class="w-full p-2 border rounded-md bg-white"
              >
                <option value="gemma3-legal">Gemma3 Legal</option>
                <option value="llama3.2">Llama 3.2</option>
                <option value="claude-legal">Claude Legal</option>
                <option value="gpt-4-legal">GPT-4 Legal</option>
              </select>
            </div>

            <!-- Suggestion Types -->
            <div class="space-y-3">
              <label class="text-sm font-medium">Suggestion Types</label>
              
              <div class="flex items-center justify-between">
                <span class="text-sm">Auto-completion</span>
                <Switch bind:checked={serviceOptions.enableAutoComplete} />
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm">Grammar Check</span>
                <Switch bind:checked={serviceOptions.enableGrammarCheck} />
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm">Legal Terms</span>
                <Switch bind:checked={serviceOptions.enableLegalTerms} />
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm">Case References</span>
                <Switch bind:checked={serviceOptions.enableCaseReferences} />
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm">Citations</span>
                <Switch bind:checked={serviceOptions.enableCitations} />
              </div>
            </div>

            <!-- Performance Settings -->
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium mb-2 block">
                  Min Characters ({serviceOptions.minCharacters})
                </label>
                <Slider
                  bind:value={[serviceOptions.minCharacters]}
                  min={5}
                  max={50}
                  step={5}
                  class="w-full"
                />
              </div>
              
              <div>
                <label class="text-sm font-medium mb-2 block">
                  Max Suggestions ({serviceOptions.maxSuggestions})
                </label>
                <Slider
                  bind:value={[serviceOptions.maxSuggestions]}
                  min={1}
                  max={10}
                  step={1}
                  class="w-full"
                />
              </div>
              
              <div>
                <label class="text-sm font-medium mb-2 block">
                  Delay (ms) ({serviceOptions.suggestionDelay})
                </label>
                <Slider
                  bind:value={[serviceOptions.suggestionDelay]}
                  min={200}
                  max={2000}
                  step={100}
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </NesCard>

        <!-- Features Overview -->
        <NesCard>
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">Key Features</h3>
          </div>
          <div class="yorha-panel-content">
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <div class="font-medium">Real-time AI Analysis</div>
                  <div class="text-slate-600">Continuous analysis as you type</div>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="font-medium">Legal Term Recognition</div>
                  <div class="text-slate-600">Context-aware legal vocabulary</div>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <div class="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <div class="font-medium">Case Reference Matching</div>
                  <div class="text-slate-600">Find relevant precedents</div>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <div class="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <div class="font-medium">Citation Suggestions</div>
                  <div class="text-slate-600">Proper legal citation format</div>
                </div>
              </div>
              
              <div class="flex items-start gap-2">
                <div class="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <div class="font-medium">Grammar & Style</div>
                  <div class="text-slate-600">Professional writing assistance</div>
                </div>
              </div>
            </div>
          </div>
        </NesCard>

        <!-- Usage Instructions -->
        <NesCard>
          <div class="yorha-panel-header">
            <h3 class="nes-text is-primary">How to Use</h3>
          </div>
          <div class="yorha-panel-content">
            <div class="space-y-3 text-sm">
              <div class="flex gap-2">
                <Badge variant="outline" size="sm">1</Badge>
                <span>Start typing in the editor above</span>
              </div>
              <div class="flex gap-2">
                <Badge variant="outline" size="sm">2</Badge>
                <span>Wait for AI suggestions to appear</span>
              </div>
              <div class="flex gap-2">
                <Badge variant="outline" size="sm">3</Badge>
                <span>Use ↑↓ arrows to navigate suggestions</span>
              </div>
              <div class="flex gap-2">
                <Badge variant="outline" size="sm">4</Badge>
                <span>Press Tab or Enter to accept</span>
              </div>
              <div class="flex gap-2">
                <Badge variant="outline" size="sm">5</Badge>
                <span>Press Esc to dismiss suggestions</span>
              </div>
            </div>
          </div>
        </NesCard>
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for better UX */
  :global(.enhanced-inline-editor .editor-content) {
    scrollbar-width: thin
    scrollbar-color: rgb(203 213 225) transparent;
  }
  
  :global(.enhanced-inline-editor .editor-content::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(.enhanced-inline-editor .editor-content::-webkit-scrollbar-track) {
    background: transparent
  }
  
  :global(.enhanced-inline-editor .editor-content::-webkit-scrollbar-thumb) {
    background: rgb(203 213 225);
    border-radius: 4px;
  }
  
  :global(.enhanced-inline-editor .editor-content::-webkit-scrollbar-thumb:hover) {
    background: rgb(148 163 184);
  }
</style>
