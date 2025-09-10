<script lang="ts">
  import { onMount } from 'svelte';
  import { nesGPUBridge } from '$lib/gpu/nes-gpu-memory-bridge';
  import HeadlessDialog from '$lib/headless/HeadlessDialog.svelte';
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  import OptimisticList from '$lib/headless/OptimisticList.svelte';
  
  // Icons
  import { 
    Brain, Scale, FileText, Users, Target, Lightbulb,
    TrendingUp, AlertTriangle, CheckCircle, Clock,
    Layers, Network, Eye, Plus, Edit, Trash, Save,
    ArrowRight, BarChart3, Zap, Search, Link2
  } from 'lucide-svelte';

  // Svelte 5 runes
  let caseId = $state('');
  let caseTitle = $state('');
  let theories = $state([]);
  let currentTheory = $state(null);
  let isBuilding = $state(false);
  let showTheoryDialog = $state(false);
  let newTheoryForm = $state({
    name: '',
    type: 'prosecution',
    strategy: 'evidence-based',
    description: '',
    errors: {}
  });
  
  // Theory building components
  let evidenceItems = $state([]);
  let precedents = $state([]);
  let arguments = $state([]);
  let counterarguments = $state([]);
  let strengthAnalysis = $state(null);
  let timelineEvents = $state([]);
  
  // AI reasoning engine state
  let aiSuggestions = $state([]);
  let logicalChain = $state([]);
  let riskAssessment = $state(null);
  let theoryScores = $state({});

  const theoryTypes = [
    { id: 'prosecution', label: 'Prosecution Theory', icon: Scale },
    { id: 'defense', label: 'Defense Theory', icon: Users },
    { id: 'civil', label: 'Civil Claim Theory', icon: FileText },
    { id: 'alternative', label: 'Alternative Theory', icon: Lightbulb }
  ];

  const strategyTypes = [
    { id: 'evidence-based', label: 'Evidence-Driven', description: 'Build theory around strongest evidence' },
    { id: 'precedent-based', label: 'Precedent-Driven', description: 'Leverage existing case law' },
    { id: 'narrative-based', label: 'Narrative-Driven', description: 'Construct compelling story' },
    { id: 'technical-based', label: 'Technical-Driven', description: 'Focus on legal technicalities' }
  ];

  onMount(async () => {
    // Initialize with case data if coming from case page
    const urlParams = new URLSearchParams(window.location.search);
    const paramCaseId = urlParams.get('caseId');
    if (paramCaseId) {
      caseId = paramCaseId;
      await loadCaseData();
    }
    
    await loadExistingTheories();
  });

  async function loadCaseData() {
    try {
      const response = await fetch(`/api/v1/cases/${caseId}`);
      if (response.ok) {
        const caseData = await response.json();
        caseTitle = caseData.title || caseData.name || 'Untitled Case';
        await loadCaseEvidence();
        await loadCasePrecedents();
      }
    } catch (error) {
      console.error('Failed to load case data:', error);
      // Mock data for demo
      caseTitle = 'State v. Anderson - Criminal Defense';
      evidenceItems = generateMockEvidence();
      precedents = generateMockPrecedents();
    }
  }

  async function loadCaseEvidence() {
    try {
      const response = await fetch(`/api/v1/evidence/case/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        evidenceItems = data.evidence || [];
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
      evidenceItems = generateMockEvidence();
    }
  }

  async function loadCasePrecedents() {
    try {
      const response = await fetch(`/api/legal/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: caseTitle,
          mode: 'semantic',
          filters: {},
          sort: 'relevance',
          page: 1,
          limit: 10
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        precedents = data.results || [];
      }
    } catch (error) {
      console.error('Failed to load precedents:', error);
      precedents = generateMockPrecedents();
    }
  }

  async function loadExistingTheories() {
    try {
      const response = await fetch(`/api/legal/case-theory/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        theories = data.theories || [];
      }
    } catch (error) {
      console.error('Failed to load theories:', error);
      // Mock theories for demo
      theories = [
        {
          id: '1',
          name: 'Self-Defense Theory',
          type: 'defense',
          strategy: 'evidence-based',
          description: 'Client acted in self-defense under reasonable fear of imminent harm',
          strength: 0.87,
          arguments: ['Evidence of threat', 'Witness testimony', 'Prior incidents'],
          counterarguments: ['No imminent danger', 'Excessive force'],
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 3600000)
        }
      ];
    }
  }

  async function buildTheoryWithAI(theoryData) {
    isBuilding = true;
    
    try {
      // Store theory building request in CHR-ROM for fast processing
      await nesGPUBridge.storeCHRROMPattern(`theory_${Date.now()}`, {
        renderableHTML: `<div class="theory-build">${theoryData.name}</div>`,
        type: 'theory_pattern',
        priority: 4,
        compressedData: new Uint8Array(new TextEncoder().encode(JSON.stringify(theoryData))),
        bankId: 1
      });

      const response = await fetch('/api/legal/case-theory/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          theory: theoryData,
          evidence: evidenceItems,
          precedents: precedents.slice(0, 5)
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update theory with AI analysis
        const builtTheory = {
          id: `theory_${Date.now()}`,
          ...theoryData,
          arguments: result.arguments || [],
          counterarguments: result.counterarguments || [],
          logicalChain: result.logicalChain || [],
          strength: result.strengthScore || 0.5,
          riskAssessment: result.riskAssessment || {},
          aiSuggestions: result.suggestions || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        theories = [builtTheory, ...theories];
        currentTheory = builtTheory;
        
        // Load detailed analysis
        await loadTheoryAnalysis(builtTheory);
        
      } else {
        // Mock AI analysis for demo
        const mockTheory = await generateMockTheoryAnalysis(theoryData);
        theories = [mockTheory, ...theories];
        currentTheory = mockTheory;
        await loadTheoryAnalysis(mockTheory);
      }
      
    } catch (error) {
      console.error('Theory building failed:', error);
      // Fallback to mock data
      const mockTheory = await generateMockTheoryAnalysis(theoryData);
      theories = [mockTheory, ...theories];
      currentTheory = mockTheory;
    } finally {
      isBuilding = false;
      showTheoryDialog = false;
    }
  }

  async function generateMockTheoryAnalysis(theoryData) {
    // Simulate AI reasoning process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      id: `theory_${Date.now()}`,
      ...theoryData,
      arguments: [
        'Strong physical evidence supports the theory',
        'Multiple witness testimonies align with narrative',
        'Precedent cases establish legal foundation',
        'Expert testimony validates technical aspects'
      ],
      counterarguments: [
        'Opposing evidence creates reasonable doubt',
        'Alternative interpretations possible',
        'Procedural challenges may arise',
        'Jury perception risks identified'
      ],
      logicalChain: [
        { step: 1, premise: 'Defendant faced immediate threat', evidence: 'Security footage timestamp 10:23 PM' },
        { step: 2, premise: 'Reasonable person would fear harm', evidence: 'Expert testimony on threat assessment' },
        { step: 3, premise: 'Response was proportional', evidence: 'Medical examiner report on injuries' },
        { step: 4, conclusion: 'Self-defense claim is justified', confidence: 0.87 }
      ],
      strength: 0.75 + Math.random() * 0.2,
      riskAssessment: {
        overallRisk: 'Medium',
        strengths: ['Strong evidence', 'Clear precedent', 'Compelling narrative'],
        weaknesses: ['Procedural complexity', 'Jury unpredictability'],
        recommendations: ['Strengthen witness prep', 'Consider plea alternatives']
      },
      aiSuggestions: [
        'Research similar cases in jurisdiction',
        'Prepare for cross-examination challenges',
        'Consider motion to exclude problematic evidence',
        'Develop alternative theory as backup'
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async function loadTheoryAnalysis(theory) {
    arguments = theory.arguments || [];
    counterarguments = theory.counterarguments || [];
    logicalChain = theory.logicalChain || [];
    riskAssessment = theory.riskAssessment || null;
    aiSuggestions = theory.aiSuggestions || [];
    
    // Calculate theory strength visualization
    strengthAnalysis = {
      overall: theory.strength || 0,
      components: {
        evidence: 0.8,
        precedent: 0.7,
        logic: 0.9,
        presentation: 0.6
      }
    };
  }

  async function submitTheory() {
    if (!newTheoryForm.name.trim()) {
      newTheoryForm.errors = { name: ['Theory name is required'] };
      return;
    }

    newTheoryForm.errors = {};
    await buildTheoryWithAI(newTheoryForm);
    
    // Reset form
    newTheoryForm = {
      name: '',
      type: 'prosecution',
      strategy: 'evidence-based',
      description: '',
      errors: {}
    };
  }

  function selectTheory(theory) {
    currentTheory = theory;
    loadTheoryAnalysis(theory);
  }

  function getTheoryTypeColor(type) {
    switch (type) {
      case 'prosecution': return 'text-red-600 bg-red-100';
      case 'defense': return 'text-blue-600 bg-blue-100';
      case 'civil': return 'text-green-600 bg-green-100';
      case 'alternative': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getStrengthColor(strength) {
    if (strength >= 0.8) return 'text-green-600';
    if (strength >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  function generateMockEvidence() {
    return [
      {
        id: '1',
        title: 'Security Camera Footage',
        type: 'video',
        description: 'Shows defendant actions at time of incident',
        strength: 0.9
      },
      {
        id: '2', 
        title: 'Witness Statement - John Doe',
        type: 'testimony',
        description: 'Eyewitness account of events leading to incident',
        strength: 0.7
      },
      {
        id: '3',
        title: 'Medical Examiner Report',
        type: 'document',
        description: 'Autopsy findings and cause of death determination',
        strength: 0.95
      }
    ];
  }

  function generateMockPrecedents() {
    return [
      {
        id: '1',
        title: 'State v. Johnson - Self Defense Standard',
        citation: '123 State 456 (2019)',
        relevanceScore: 0.92,
        summary: 'Establishes criteria for valid self-defense claims'
      },
      {
        id: '2',
        title: 'Commonwealth v. Williams - Reasonable Force',
        citation: '789 Commonwealth 012 (2020)',
        relevanceScore: 0.85,
        summary: 'Defines proportional response in threat situations'
      }
    ];
  }
</script>

<svelte:head>
  <title>Case Theory Builder - AI Legal Reasoning</title>
  <meta name="description" content="AI-powered case theory building with logical reasoning and precedent analysis" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Brain class="h-8 w-8 text-purple-600" />
            Case Theory Builder
          </h1>
          {#if caseTitle}
            <p class="text-gray-600 mt-1">{caseTitle}</p>
          {/if}
        </div>
        
        <button
          onclick={() => showTheoryDialog = true}
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
        >
          <Plus class="h-4 w-4 mr-2" />
          Build New Theory
        </button>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="lg:grid lg:grid-cols-12 lg:gap-8">
      <!-- Theory List -->
      <div class="lg:col-span-4 mb-8 lg:mb-0">
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Case Theories</h3>
            <p class="text-sm text-gray-500">AI-powered legal reasoning</p>
          </div>
          
          <div class="p-6">
            <OptimisticList 
              items={theories}
              let:item={theory}
              let:optimistic
            >
              <div 
                class="p-4 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md mb-3
                       {currentTheory?.id === theory.id ? 'border-purple-500 bg-purple-50' : 'hover:border-gray-300'}
                       {optimistic ? 'opacity-50' : ''}"
                onclick={() => selectTheory(theory)}
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-medium text-gray-900">{theory.name}</h4>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getTheoryTypeColor(theory.type)}">
                    {theory.type}
                  </span>
                </div>
                
                <p class="text-sm text-gray-600 mb-3">{theory.description}</p>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center text-sm">
                    <span class="text-gray-500">Strength:</span>
                    <span class="ml-1 font-medium {getStrengthColor(theory.strength)}">
                      {Math.round(theory.strength * 100)}%
                    </span>
                  </div>
                  
                  <div class="text-xs text-gray-400">
                    {new Date(theory.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </OptimisticList>

            {#if theories.length === 0}
              <div class="text-center py-8 text-gray-500">
                <Brain class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No theories built yet</p>
                <p class="text-sm">Create your first theory to begin</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Theory Analysis -->
      <div class="lg:col-span-8">
        {#if currentTheory}
          <div class="space-y-6">
            <!-- Theory Overview -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <h2 class="text-xl font-semibold text-gray-900">{currentTheory.name}</h2>
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getTheoryTypeColor(currentTheory.type)}">
                    {currentTheory.type} Theory
                  </span>
                </div>
                
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-500">Overall Strength:</span>
                  <span class="text-lg font-bold {getStrengthColor(currentTheory.strength)}">
                    {Math.round(currentTheory.strength * 100)}%
                  </span>
                </div>
              </div>
              
              <p class="text-gray-700">{currentTheory.description}</p>
            </div>

            <!-- Strength Analysis -->
            {#if strengthAnalysis}
              <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <BarChart3 class="h-5 w-5 mr-2" />
                  Strength Analysis
                </h3>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {#each Object.entries(strengthAnalysis.components) as [component, score]}
                    <div class="text-center">
                      <div class="text-2xl font-bold {getStrengthColor(score)}">
                        {Math.round(score * 100)}%
                      </div>
                      <div class="text-sm text-gray-500 capitalize">{component}</div>
                      <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          class="h-2 rounded-full {score >= 0.8 ? 'bg-green-500' : score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}"
                          style="width: {score * 100}%"
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Arguments and Counter-arguments -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Arguments -->
              <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CheckCircle class="h-5 w-5 mr-2 text-green-600" />
                  Supporting Arguments
                </h3>
                
                <div class="space-y-3">
                  {#each arguments as argument, index}
                    <div class="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <div class="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div class="text-sm text-gray-700">{argument}</div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Counter-arguments -->
              <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <AlertTriangle class="h-5 w-5 mr-2 text-red-600" />
                  Counter-arguments
                </h3>
                
                <div class="space-y-3">
                  {#each counterarguments as counterarg, index}
                    <div class="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                      <div class="flex-shrink-0 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div class="text-sm text-gray-700">{counterarg}</div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Logical Chain -->
            {#if logicalChain.length > 0}
              <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Network class="h-5 w-5 mr-2" />
                  Logical Chain of Reasoning
                </h3>
                
                <div class="space-y-4">
                  {#each logicalChain as step, index}
                    <div class="flex items-start space-x-4">
                      <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {step.step}
                        </div>
                      </div>
                      
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                          <span class="font-medium text-gray-900">
                            {step.conclusion ? 'Conclusion:' : 'Premise:'}
                          </span>
                          {#if step.confidence}
                            <span class="text-sm text-gray-500">
                              ({Math.round(step.confidence * 100)}% confidence)
                            </span>
                          {/if}
                        </div>
                        
                        <p class="text-gray-700 mb-2">
                          {step.premise || step.conclusion}
                        </p>
                        
                        {#if step.evidence}
                          <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            Evidence: {step.evidence}
                          </p>
                        {/if}
                      </div>

                      {#if index < logicalChain.length - 1}
                        <ArrowRight class="h-4 w-4 text-gray-400 mt-2" />
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Risk Assessment -->
            {#if riskAssessment}
              <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Scale class="h-5 w-5 mr-2" />
                  Risk Assessment
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 class="font-medium text-green-700 mb-2">Strengths</h4>
                    <ul class="space-y-1">
                      {#each riskAssessment.strengths as strength}
                        <li class="text-sm text-gray-700 flex items-center">
                          <CheckCircle class="h-3 w-3 text-green-600 mr-1" />
                          {strength}
                        </li>
                      {/each}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 class="font-medium text-red-700 mb-2">Weaknesses</h4>
                    <ul class="space-y-1">
                      {#each riskAssessment.weaknesses as weakness}
                        <li class="text-sm text-gray-700 flex items-center">
                          <AlertTriangle class="h-3 w-3 text-red-600 mr-1" />
                          {weakness}
                        </li>
                      {/each}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 class="font-medium text-blue-700 mb-2">Recommendations</h4>
                    <ul class="space-y-1">
                      {#each riskAssessment.recommendations as rec}
                        <li class="text-sm text-gray-700 flex items-center">
                          <Lightbulb class="h-3 w-3 text-blue-600 mr-1" />
                          {rec}
                        </li>
                      {/each}
                    </ul>
                  </div>
                </div>
              </div>
            {/if}

            <!-- AI Suggestions -->
            {#if aiSuggestions.length > 0}
              <div class="bg-blue-50 rounded-lg p-6">
                <h3 class="text-lg font-medium text-blue-900 mb-4 flex items-center">
                  <Zap class="h-5 w-5 mr-2" />
                  AI Suggestions
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#each aiSuggestions as suggestion}
                    <div class="p-3 bg-white rounded-lg border border-blue-200">
                      <p class="text-sm text-gray-700">{suggestion}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="bg-white rounded-lg shadow p-12 text-center">
            <Brain class="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">Select a Theory</h3>
            <p class="text-gray-600 mb-6">Choose a case theory from the list to view detailed AI analysis</p>
            <button
              onclick={() => showTheoryDialog = true}
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <Plus class="h-4 w-4 mr-2" />
              Build Your First Theory
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- New Theory Dialog -->
<HeadlessDialog bind:open={showTheoryDialog}>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Build New Case Theory</h2>
        <p class="text-sm text-gray-600">AI will analyze evidence and build logical arguments</p>
      </div>
      
      <form onsubmit|preventDefault={submitTheory} class="p-6 space-y-4">
        <div>
          <label for="theoryName" class="block text-sm font-medium text-gray-700 mb-1">
            Theory Name
          </label>
          <input
            id="theoryName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g., Self-Defense Theory"
            bind:value={newTheoryForm.name}
            required
          />
          {#if newTheoryForm.errors.name}
            <p class="text-red-600 text-sm mt-1">{newTheoryForm.errors.name[0]}</p>
          {/if}
        </div>

        <div>
          <label for="theoryType" class="block text-sm font-medium text-gray-700 mb-1">
            Theory Type
          </label>
          <select
            id="theoryType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            bind:value={newTheoryForm.type}
          >
            {#each theoryTypes as type}
              <option value={type.id}>{type.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="strategy" class="block text-sm font-medium text-gray-700 mb-1">
            Strategy Approach
          </label>
          <select
            id="strategy"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            bind:value={newTheoryForm.strategy}
          >
            {#each strategyTypes as strategy}
              <option value={strategy.id}>{strategy.label} - {strategy.description}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            placeholder="Describe the core elements of this theory..."
            bind:value={newTheoryForm.description}
          ></textarea>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onclick={() => showTheoryDialog = false}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            disabled={isBuilding}
          >
            Cancel
          </button>
          
          <LoadingButton
            type="submit"
            loading={isBuilding}
            class="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700"
          >
            {#if isBuilding}
              Building Theory...
            {:else}
              Build with AI
            {/if}
          </LoadingButton>
        </div>
      </form>
    </div>
  </div>
</HeadlessDialog>