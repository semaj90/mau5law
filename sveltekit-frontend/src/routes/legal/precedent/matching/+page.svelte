<!-- Legal Precedent Matching System -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Button from '$lib/components/ui/button/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Progress } from '$lib/components/ui/progress';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
  import { nesMemoryBridge } from '$lib/gpu/nes-gpu-memory-bridge';
  import { glyphShaderCache } from '$lib/cache/glyph-shader-cache-bridge';
  
  // Svelte 5 Runes
  let activeTab = $state('search');
  let searchQuery = $state('');
  let caseFactPattern = $state('');
  let selectedJurisdiction = $state('');
  let selectedCourtLevel = $state('');
  let selectedPracticeArea = $state('');
  let analysisInProgress = $state(false);
  let analysisProgress = $state(0);
  
  let precedentMatches = $state([]);
  let similarityScores = $state([]);
  let legalReasoningChain = $state([]);
  let citationNetworkMap = $state([]);
  let distinguishingFactors = $state([]);
  let applicabilityAnalysis = $state(null);
  let strengthAssessment = $state(null);

  // Legal AI System State
  let legalSystem = $state({
    status: 'idle',
    processingStage: 'Ready for analysis...',
    vectorSearchActive: false,
    precedentDatabase: {
      totalCases: 2847592,
      indexed: 2847592,
      lastUpdate: '2024-09-10'
    },
    aiConfidence: 0
  });

  // NES-GPU Memory Bridge Integration
  let memoryMetrics = $state({
    vectorCache: { used: 0, total: 16384 },
    precedentPatterns: { cached: 0, total: 10000 },
    glyphCache: { hitRate: 0, entries: 0 },
    gpuUtilization: 0
  });

  interface PrecedentMatch {
    id: string;
    title: string;
    citation: string;
    court: string;
    jurisdiction: string;
    dateDecided: string;
    similarityScore: number;
    factualSimilarity: number;
    legalSimilarity: number;
    precedentialValue: 'BINDING' | 'PERSUASIVE' | 'DISTINGUISHED' | 'OVERRULED';
    keyFacts: string[];
    legalHolding: string;
    reasoningChain: string[];
    citationCount: number;
    recentCitations: number;
    distinguishingFactors: string[];
    applicabilityScore: number;
    strengthIndicators: {
      factualAlignment: number;
      legalPrinciples: number;
      jurisdictionalRelevance: number;
      temporalRelevance: number;
    };
  }

  interface CitationNetwork {
    caseId: string;
    citingCases: string[];
    citedCases: string[];
    authorityScore: number;
    influenceRank: number;
    networkPosition: 'CORE' | 'PERIPHERAL' | 'BRIDGE';
  }

  interface LegalReasoningStep {
    stepNumber: number;
    legalPrinciple: string;
    supportingCases: string[];
    factualBasis: string;
    logicalConnection: string;
    strengthScore: number;
    vulnerabilities: string[];
  }

  onMount(() => {
    initializePrecedentSystem();
    startSystemMonitoring();
  });

  async function initializePrecedentSystem() {
    legalSystem.status = 'initializing';
    legalSystem.processingStage = 'Loading legal precedent databases...';
    
    // Initialize NES-GPU Memory Bridge for vector operations
    await nesMemoryBridge.initialize({
      mode: 'legal-ai',
      optimizeFor: 'vector-similarity',
      cacheRegions: ['case-embeddings', 'precedent-patterns', 'citation-networks']
    });

    // Initialize Glyph Shader Cache for legal pattern recognition
    await glyphShaderCache.loadPatterns([
      'legal-reasoning-chains',
      'citation-network-visualization',
      'fact-pattern-similarity',
      'precedent-strength-indicators'
    ]);

    legalSystem.status = 'ready';
    legalSystem.processingStage = 'Precedent matching system online';
  }

  async function searchPrecedents() {
    if (!searchQuery.trim() && !caseFactPattern.trim()) {
      alert('Please enter either a search query or case fact pattern');
      return;
    }

    analysisInProgress = true;
    analysisProgress = 0;
    legalSystem.status = 'analyzing';
    legalSystem.vectorSearchActive = true;

    const stages = [
      'Analyzing case fact patterns...',
      'Performing vector similarity search...',
      'Ranking precedential value...',
      'Building citation networks...',
      'Evaluating legal reasoning chains...',
      'Assessing applicability and strength...'
    ];

    for (let i = 0; i < stages.length; i++) {
      legalSystem.processingStage = stages[i];
      analysisProgress = ((i + 1) / stages.length) * 100;
      
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      switch (i) {
        case 0:
          break; // Pattern analysis
        case 1:
          precedentMatches = await performVectorSearch();
          break;
        case 2:
          similarityScores = await calculateSimilarityScores();
          break;
        case 3:
          citationNetworkMap = await buildCitationNetworks();
          break;
        case 4:
          legalReasoningChain = await analyzeLegalReasoning();
          break;
        case 5:
          applicabilityAnalysis = await assessApplicability();
          strengthAssessment = await assessStrength();
          break;
      }
    }

    analysisInProgress = false;
    legalSystem.status = 'complete';
    legalSystem.processingStage = 'Precedent analysis complete';
    legalSystem.vectorSearchActive = false;
    legalSystem.aiConfidence = calculateOverallConfidence();
  }

  function startSystemMonitoring() {
    setInterval(() => {
      // Update NES-GPU metrics for legal processing
      memoryMetrics.vectorCache.used = Math.floor(Math.random() * 14000) + 2000;
      memoryMetrics.precedentPatterns.cached = Math.floor(Math.random() * 8000) + 1500;
      memoryMetrics.glyphCache.hitRate = Math.random() * 100;
      memoryMetrics.glyphCache.entries = Math.floor(Math.random() * 800) + 200;
      memoryMetrics.gpuUtilization = legalSystem.vectorSearchActive ? Math.random() * 40 + 60 : Math.random() * 30;
    }, 2000);
  }

  async function performVectorSearch(): Promise<PrecedentMatch[]> {
    // Mock vector search results
    const mockResults: PrecedentMatch[] = [
      {
        id: 'CASE-2023-001',
        title: 'State v. Johnson - Contract Interpretation Under Duress',
        citation: '847 F.3d 234 (5th Cir. 2023)',
        court: '5th Circuit Court of Appeals',
        jurisdiction: 'Federal',
        dateDecided: '2023-08-15',
        similarityScore: 0.94,
        factualSimilarity: 0.92,
        legalSimilarity: 0.96,
        precedentialValue: 'BINDING',
        keyFacts: [
          'Contract signed under financial duress',
          'Unequal bargaining power between parties',
          'Evidence of coercive circumstances',
          'Alternative options were unavailable'
        ],
        legalHolding: 'Contracts entered under economic duress are voidable when the duress was a substantial factor in the decision to contract and no reasonable alternative existed.',
        reasoningChain: [
          'Economic duress requires proof of coercive circumstances',
          'Unequal bargaining power alone is insufficient',
          'Must show lack of reasonable alternatives',
          'Substantial factor test applies to causation'
        ],
        citationCount: 156,
        recentCitations: 23,
        distinguishingFactors: [],
        applicabilityScore: 0.91,
        strengthIndicators: {
          factualAlignment: 92,
          legalPrinciples: 96,
          jurisdictionalRelevance: 85,
          temporalRelevance: 98
        }
      },
      {
        id: 'CASE-2022-087',
        title: 'Martinez v. Global Corp - Unconscionable Contract Terms',
        citation: '623 F.Supp.3d 445 (S.D. Cal. 2022)',
        court: 'U.S. District Court Southern District of California',
        jurisdiction: 'Federal',
        dateDecided: '2022-11-22',
        similarityScore: 0.87,
        factualSimilarity: 0.85,
        legalSimilarity: 0.89,
        precedentialValue: 'PERSUASIVE',
        keyFacts: [
          'Adhesion contract with no negotiation',
          'Complex legal language',
          'Harsh penalty clauses',
          'Consumer protection considerations'
        ],
        legalHolding: 'Contract terms may be unconscionable where there is both procedural and substantive unconscionability, particularly in consumer contexts.',
        reasoningChain: [
          'Procedural unconscionability from lack of meaningful choice',
          'Substantive unconscionability from one-sided terms',
          'Consumer protection principles apply',
          'Court has discretion to refuse enforcement'
        ],
        citationCount: 78,
        recentCitations: 12,
        distinguishingFactors: [
          'Different factual context (consumer vs. commercial)',
          'State law vs. federal law application'
        ],
        applicabilityScore: 0.79,
        strengthIndicators: {
          factualAlignment: 78,
          legalPrinciples: 89,
          jurisdictionalRelevance: 72,
          temporalRelevance: 85
        }
      },
      {
        id: 'CASE-2021-156',
        title: 'Thompson Industries v. Allied Manufacturing - Good Faith Dealing',
        citation: '789 F.3d 567 (9th Cir. 2021)',
        court: '9th Circuit Court of Appeals',
        jurisdiction: 'Federal',
        dateDecided: '2021-03-10',
        similarityScore: 0.82,
        factualSimilarity: 0.80,
        legalSimilarity: 0.84,
        precedentialValue: 'BINDING',
        keyFacts: [
          'Long-term commercial relationship',
          'Implied covenant of good faith and fair dealing',
          'One party acted to frustrate contract purpose',
          'Substantial investment by plaintiff'
        ],
        legalHolding: 'The implied covenant of good faith and fair dealing prohibits parties from acting to frustrate the other party\'s right to receive benefits of the contract.',
        reasoningChain: [
          'Good faith covenant implied in all contracts',
          'Cannot act to frustrate contract purpose',
          'Must consider parties\' reasonable expectations',
          'Damages available for breach of covenant'
        ],
        citationCount: 234,
        recentCitations: 45,
        distinguishingFactors: [
          'Commercial context vs. consumer context',
          'Long-term relationship vs. single transaction'
        ],
        applicabilityScore: 0.75,
        strengthIndicators: {
          factualAlignment: 75,
          legalPrinciples: 84,
          jurisdictionalRelevance: 88,
          temporalRelevance: 76
        }
      }
    ];

    return mockResults;
  }

  async function calculateSimilarityScores() {
    return precedentMatches.map(match => ({
      caseId: match.id,
      overallSimilarity: match.similarityScore,
      factualSimilarity: match.factualSimilarity,
      legalSimilarity: match.legalSimilarity,
      weightedScore: (match.factualSimilarity * 0.4) + (match.legalSimilarity * 0.6),
      confidenceInterval: [match.similarityScore - 0.05, match.similarityScore + 0.03]
    }));
  }

  async function buildCitationNetworks(): Promise<CitationNetwork[]> {
    return precedentMatches.map(match => ({
      caseId: match.id,
      citingCases: generateMockCitingCases(match.citationCount),
      citedCases: generateMockCitedCases(15),
      authorityScore: Math.min(100, match.citationCount * 0.5 + match.recentCitations * 2),
      influenceRank: Math.floor(Math.random() * 1000) + 1,
      networkPosition: match.citationCount > 200 ? 'CORE' : match.citationCount > 50 ? 'BRIDGE' : 'PERIPHERAL'
    }));
  }

  async function analyzeLegalReasoning(): Promise<LegalReasoningStep[]> {
    return [
      {
        stepNumber: 1,
        legalPrinciple: 'Contract Formation Requirements',
        supportingCases: ['CASE-2023-001', 'CASE-2022-087'],
        factualBasis: 'Valid contract requires mutual assent, consideration, and capacity',
        logicalConnection: 'Foundation for analyzing contract validity',
        strengthScore: 0.95,
        vulnerabilities: ['Potential capacity questions', 'Consideration adequacy']
      },
      {
        stepNumber: 2,
        legalPrinciple: 'Duress and Unconscionability Doctrines',
        supportingCases: ['CASE-2023-001', 'CASE-2022-087'],
        factualBasis: 'Evidence of coercive circumstances and unequal bargaining power',
        logicalConnection: 'Duress can void otherwise valid contracts',
        strengthScore: 0.87,
        vulnerabilities: ['Subjective nature of duress', 'Burden of proof issues']
      },
      {
        stepNumber: 3,
        legalPrinciple: 'Good Faith Performance Obligation',
        supportingCases: ['CASE-2021-156'],
        factualBasis: 'Implied covenant exists in all contractual relationships',
        logicalConnection: 'Even valid contracts require good faith performance',
        strengthScore: 0.78,
        vulnerabilities: ['Scope of good faith duty', 'Relationship to express terms']
      },
      {
        stepNumber: 4,
        legalPrinciple: 'Remedial Framework',
        supportingCases: ['CASE-2023-001', 'CASE-2021-156'],
        factualBasis: 'Multiple remedial options available for contract violations',
        logicalConnection: 'Relief available through rescission, restitution, or damages',
        strengthScore: 0.83,
        vulnerabilities: ['Election of remedies', 'Mitigation requirements']
      }
    ];
  }

  async function assessApplicability() {
    return {
      overallApplicability: 'HIGH',
      jurisdictionalAlignment: 'STRONG',
      factualAlignment: 'MODERATE',
      legalPrincipleAlignment: 'STRONG',
      factors: {
        bindingPrecedents: precedentMatches.filter(p => p.precedentialValue === 'BINDING').length,
        persuasivePrecedents: precedentMatches.filter(p => p.precedentialValue === 'PERSUASIVE').length,
        averageSimilarity: precedentMatches.reduce((sum, p) => sum + p.similarityScore, 0) / precedentMatches.length,
        recentAuthority: precedentMatches.filter(p => new Date(p.dateDecided) > new Date('2020-01-01')).length
      },
      recommendations: [
        'Focus on binding precedents from same circuit',
        'Address distinguishing factors proactively',
        'Emphasize factual similarities in briefing',
        'Consider alternative legal theories'
      ]
    };
  }

  async function assessStrength() {
    return {
      overallStrength: 'STRONG',
      bindingAuthorityScore: 85,
      factualSupportScore: 78,
      legalReasoningScore: 91,
      vulnerabilities: [
        'Limited binding authority in exact factual scenario',
        'Potential distinguishing factors in consumer context',
        'Evolving standards in unconscionability doctrine'
      ],
      strengths: [
        'Clear binding precedent on core legal principles',
        'Recent favorable authority',
        'Strong citation network support',
        'Coherent legal reasoning chain'
      ],
      strategicRecommendations: [
        'Lead with strongest binding precedent',
        'Address weaknesses through alternative arguments',
        'Emphasize policy considerations',
        'Prepare distinguishing arguments for adverse cases'
      ]
    };
  }

  function generateMockCitingCases(count: number): string[] {
    const cases = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      cases.push(`CITING-CASE-${String(i + 1).padStart(3, '0')}`);
    }
    return cases;
  }

  function generateMockCitedCases(count: number): string[] {
    const cases = [];
    for (let i = 0; i < count; i++) {
      cases.push(`CITED-CASE-${String(i + 1).padStart(3, '0')}`);
    }
    return cases;
  }

  function calculateOverallConfidence(): number {
    if (precedentMatches.length === 0) return 0;
    const avgScore = precedentMatches.reduce((sum, match) => sum + match.similarityScore, 0) / precedentMatches.length;
    return Math.round(avgScore * 100);
  }

  function getPrecedentColor(value: string) {
    switch (value) {
      case 'BINDING': return 'bg-green-600';
      case 'PERSUASIVE': return 'bg-blue-600';
      case 'DISTINGUISHED': return 'bg-yellow-600';
      case 'OVERRULED': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  }

  function getStrengthColor(score: number) {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
</script>

<div class="container mx-auto p-6 space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold">Legal Precedent Matching System</h1>
      <p class="text-gray-600">AI-powered precedent analysis and legal reasoning chain construction</p>
    </div>
    <div class="flex items-center gap-4">
      <Badge variant="outline">Database: {legalSystem.precedentDatabase.totalCases.toLocaleString()} cases</Badge>
      <Badge class={legalSystem.status === 'ready' ? 'bg-green-600' : legalSystem.status === 'analyzing' ? 'bg-blue-600' : 'bg-gray-600'}>
        {legalSystem.status.toUpperCase()}
      </Badge>
    </div>
  </div>

  <!-- System Status -->
  <Card>
    <CardHeader>
      <CardTitle>Legal AI System Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{legalSystem.precedentDatabase.totalCases.toLocaleString()}</div>
          <div class="text-sm text-gray-600">Total Precedents</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{precedentMatches.length}</div>
          <div class="text-sm text-gray-600">Matches Found</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{legalSystem.aiConfidence}%</div>
          <div class="text-sm text-gray-600">AI Confidence</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-red-600">{legalReasoningChain.length}</div>
          <div class="text-sm text-gray-600">Reasoning Steps</div>
        </div>
      </div>
      
      <div class="bg-gray-100 p-3 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Processing Status</span>
          <span class="text-sm text-gray-600">{legalSystem.processingStage}</span>
        </div>
        {#if analysisInProgress}
          <Progress value={analysisProgress} class="w-full" />
        {/if}
      </div>
    </CardContent>
  </Card>

  <!-- NES-GPU Memory Metrics -->
  <Card>
    <CardHeader>
      <CardTitle>NES-GPU Legal Processing Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div class="text-sm text-gray-600">Vector Cache</div>
          <div class="text-lg font-mono">{memoryMetrics.vectorCache.used}/{memoryMetrics.vectorCache.total} KB</div>
          <Progress value={(memoryMetrics.vectorCache.used / memoryMetrics.vectorCache.total) * 100} class="w-full mt-1" />
        </div>
        <div>
          <div class="text-sm text-gray-600">Precedent Patterns</div>
          <div class="text-lg font-mono">{memoryMetrics.precedentPatterns.cached} cached</div>
          <Progress value={(memoryMetrics.precedentPatterns.cached / memoryMetrics.precedentPatterns.total) * 100} class="w-full mt-1" />
        </div>
        <div>
          <div class="text-sm text-gray-600">Glyph Cache</div>
          <div class="text-lg font-mono">{memoryMetrics.glyphCache.hitRate.toFixed(1)}% hit rate</div>
          <div class="text-xs text-gray-500">{memoryMetrics.glyphCache.entries} entries</div>
        </div>
        <div>
          <div class="text-sm text-gray-600">GPU Utilization</div>
          <div class="text-lg font-mono">{memoryMetrics.gpuUtilization.toFixed(1)}%</div>
          <Progress value={memoryMetrics.gpuUtilization} class="w-full mt-1" />
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Search Interface -->
  <Card>
    <CardHeader>
      <CardTitle>Precedent Search</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Search Query</label>
          <Input 
            bind:value={searchQuery}
            placeholder="Enter legal issue or keywords..."
            class="w-full"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">Jurisdiction</label>
          <Select bind:value={selectedJurisdiction}>
            <SelectTrigger>
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="federal">Federal</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="local">Local</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Court Level</label>
          <Select bind:value={selectedCourtLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select court level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supreme">Supreme Court</SelectItem>
              <SelectItem value="appellate">Appellate</SelectItem>
              <SelectItem value="district">District/Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">Practice Area</label>
          <Select bind:value={selectedPracticeArea}>
            <SelectTrigger>
              <SelectValue placeholder="Select practice area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contracts">Contract Law</SelectItem>
              <SelectItem value="torts">Tort Law</SelectItem>
              <SelectItem value="criminal">Criminal Law</SelectItem>
              <SelectItem value="constitutional">Constitutional Law</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium">Case Fact Pattern (Optional)</label>
        <Textarea 
          bind:value={caseFactPattern}
          placeholder="Describe the key facts of your case for more precise matching..."
          rows={4}
          class="w-full"
        />
      </div>

      <Button 
        onclick={searchPrecedents} 
        disabled={analysisInProgress}
        class="bg-blue-600 hover:bg-blue-700 w-full"
      >
        {analysisInProgress ? 'Analyzing Precedents...' : 'Search Precedents'}
      </Button>
    </CardContent>
  </Card>

  <!-- Results Tabs -->
  {#if precedentMatches.length > 0}
    <Tabs bind:value={activeTab} class="w-full">
      <TabsList class="grid w-full grid-cols-5">
        <TabsTrigger value="matches">Precedent Matches</TabsTrigger>
        <TabsTrigger value="reasoning">Legal Reasoning</TabsTrigger>
        <TabsTrigger value="citations">Citation Networks</TabsTrigger>
        <TabsTrigger value="applicability">Applicability</TabsTrigger>
        <TabsTrigger value="strategy">Strategy</TabsTrigger>
      </TabsList>

      <TabsContent value="matches">
        <div class="space-y-4">
          {#each precedentMatches as match}
            <Card>
              <CardHeader>
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <CardTitle class="text-lg">{match.title}</CardTitle>
                    <p class="text-sm text-gray-600 mt-1">{match.citation}</p>
                    <p class="text-sm text-gray-500">{match.court} • {new Date(match.dateDecided).toLocaleDateString()}</p>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <Badge class={getPrecedentColor(match.precedentialValue) + ' text-white'}>
                      {match.precedentialValue}
                    </Badge>
                    <div class="text-right">
                      <div class="text-sm font-medium">Similarity: {(match.similarityScore * 100).toFixed(1)}%</div>
                      <div class="text-xs text-gray-500">{match.citationCount} citations</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <div class="text-sm font-medium text-gray-700 mb-2">Legal Holding</div>
                  <p class="text-sm bg-blue-50 p-3 rounded">{match.legalHolding}</p>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm font-medium text-gray-700 mb-2">Key Facts</div>
                    <ul class="text-sm space-y-1">
                      {#each match.keyFacts as fact}
                        <li class="flex items-start gap-2">
                          <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          {fact}
                        </li>
                      {/each}
                    </ul>
                  </div>
                  
                  <div>
                    <div class="text-sm font-medium text-gray-700 mb-2">Strength Indicators</div>
                    <div class="space-y-2">
                      <div class="flex justify-between text-sm">
                        <span>Factual Alignment</span>
                        <span class={getStrengthColor(match.strengthIndicators.factualAlignment)}>{match.strengthIndicators.factualAlignment}%</span>
                      </div>
                      <Progress value={match.strengthIndicators.factualAlignment} class="w-full" />
                      
                      <div class="flex justify-between text-sm">
                        <span>Legal Principles</span>
                        <span class={getStrengthColor(match.strengthIndicators.legalPrinciples)}>{match.strengthIndicators.legalPrinciples}%</span>
                      </div>
                      <Progress value={match.strengthIndicators.legalPrinciples} class="w-full" />
                    </div>
                  </div>
                </div>

                {#if match.distinguishingFactors.length > 0}
                  <div>
                    <div class="text-sm font-medium text-orange-700 mb-2">Distinguishing Factors</div>
                    <div class="flex flex-wrap gap-2">
                      {#each match.distinguishingFactors as factor}
                        <Badge variant="outline" class="text-orange-700 border-orange-300">{factor}</Badge>
                      {/each}
                    </div>
                  </div>
                {/if}
              </CardContent>
            </Card>
          {/each}
        </div>
      </TabsContent>

      <TabsContent value="reasoning">
        <div class="space-y-4">
          {#each legalReasoningChain as step}
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between">
                  <CardTitle class="text-lg">Step {step.stepNumber}: {step.legalPrinciple}</CardTitle>
                  <div class="flex items-center gap-2">
                    <span class="text-sm">Strength:</span>
                    <Progress value={step.strengthScore * 100} class="w-20" />
                    <span class="text-sm font-medium">{(step.strengthScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <div class="text-sm font-medium text-blue-700 mb-2">Factual Basis</div>
                  <p class="text-sm bg-blue-50 p-2 rounded">{step.factualBasis}</p>
                </div>

                <div>
                  <div class="text-sm font-medium text-green-700 mb-2">Logical Connection</div>
                  <p class="text-sm bg-green-50 p-2 rounded">{step.logicalConnection}</p>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm font-medium text-gray-700 mb-2">Supporting Cases</div>
                    <div class="flex flex-wrap gap-2">
                      {#each step.supportingCases as caseId}
                        <Badge variant="outline" class="text-blue-700 border-blue-300">{caseId}</Badge>
                      {/each}
                    </div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-red-700 mb-2">Vulnerabilities</div>
                    <ul class="text-sm space-y-1">
                      {#each step.vulnerabilities as vulnerability}
                        <li class="flex items-start gap-2">
                          <div class="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                          {vulnerability}
                        </li>
                      {/each}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          {/each}
        </div>
      </TabsContent>

      <TabsContent value="citations">
        <div class="space-y-4">
          {#each citationNetworkMap as network}
            <Card>
              <CardHeader>
                <CardTitle>Citation Network: {network.caseId}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid md:grid-cols-3 gap-4 mb-4">
                  <div class="text-center p-4 border rounded-lg">
                    <div class="text-lg font-bold text-blue-600">{network.authorityScore.toFixed(0)}</div>
                    <div class="text-sm text-gray-600">Authority Score</div>
                  </div>
                  <div class="text-center p-4 border rounded-lg">
                    <div class="text-lg font-bold text-purple-600">#{network.influenceRank}</div>
                    <div class="text-sm text-gray-600">Influence Rank</div>
                  </div>
                  <div class="text-center p-4 border rounded-lg">
                    <Badge class={network.networkPosition === 'CORE' ? 'bg-green-600' : network.networkPosition === 'BRIDGE' ? 'bg-blue-600' : 'bg-gray-600'}>
                      {network.networkPosition}
                    </Badge>
                    <div class="text-sm text-gray-600 mt-1">Network Position</div>
                  </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm font-medium text-gray-700 mb-2">
                      Citing Cases ({network.citingCases.length})
                    </div>
                    <div class="max-h-40 overflow-y-auto">
                      <div class="flex flex-wrap gap-1">
                        {#each network.citingCases.slice(0, 10) as citingCase}
                          <Badge variant="outline" class="text-xs">{citingCase}</Badge>
                        {/each}
                        {#if network.citingCases.length > 10}
                          <Badge variant="outline" class="text-xs">+{network.citingCases.length - 10} more</Badge>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-gray-700 mb-2">
                      Cited Cases ({network.citedCases.length})
                    </div>
                    <div class="max-h-40 overflow-y-auto">
                      <div class="flex flex-wrap gap-1">
                        {#each network.citedCases.slice(0, 10) as citedCase}
                          <Badge variant="outline" class="text-xs">{citedCase}</Badge>
                        {/each}
                        {#if network.citedCases.length > 10}
                          <Badge variant="outline" class="text-xs">+{network.citedCases.length - 10} more</Badge>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          {/each}
        </div>
      </TabsContent>

      <TabsContent value="applicability">
        {#if applicabilityAnalysis}
          <Card>
            <CardHeader>
              <CardTitle>Applicability Analysis</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid md:grid-cols-4 gap-4">
                <div class="text-center p-4 border rounded-lg">
                  <div class="text-lg font-bold text-green-600">{applicabilityAnalysis.overallApplicability}</div>
                  <div class="text-sm text-gray-600">Overall</div>
                </div>
                <div class="text-center p-4 border rounded-lg">
                  <div class="text-lg font-bold text-blue-600">{applicabilityAnalysis.jurisdictionalAlignment}</div>
                  <div class="text-sm text-gray-600">Jurisdictional</div>
                </div>
                <div class="text-center p-4 border rounded-lg">
                  <div class="text-lg font-bold text-purple-600">{applicabilityAnalysis.factualAlignment}</div>
                  <div class="text-sm text-gray-600">Factual</div>
                </div>
                <div class="text-center p-4 border rounded-lg">
                  <div class="text-lg font-bold text-red-600">{applicabilityAnalysis.legalPrincipleAlignment}</div>
                  <div class="text-sm text-gray-600">Legal Principles</div>
                </div>
              </div>

              <Separator />

              <div>
                <div class="text-sm font-medium text-gray-700 mb-3">Key Factors</div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="flex justify-between text-sm">
                      <span>Binding Precedents</span>
                      <span>{applicabilityAnalysis.factors.bindingPrecedents}</span>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-sm">
                      <span>Persuasive Precedents</span>
                      <span>{applicabilityAnalysis.factors.persuasivePrecedents}</span>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-sm">
                      <span>Average Similarity</span>
                      <span>{(applicabilityAnalysis.factors.averageSimilarity * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-sm">
                      <span>Recent Authority</span>
                      <span>{applicabilityAnalysis.factors.recentAuthority} cases</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div class="text-sm font-medium text-gray-700 mb-2">Recommendations</div>
                <ul class="space-y-1">
                  {#each applicabilityAnalysis.recommendations as recommendation}
                    <li class="flex items-start gap-2 text-sm">
                      <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      {recommendation}
                    </li>
                  {/each}
                </ul>
              </div>
            </CardContent>
          </Card>
        {/if}
      </TabsContent>

      <TabsContent value="strategy">
        {#if strengthAssessment}
          <div class="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Strength Assessment</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="grid md:grid-cols-3 gap-4">
                  <div class="text-center p-4 border rounded-lg">
                    <div class="text-lg font-bold text-green-600">{strengthAssessment.overallStrength}</div>
                    <div class="text-sm text-gray-600">Overall Strength</div>
                  </div>
                  <div class="text-center p-4 border rounded-lg">
                    <div class="text-lg font-bold text-blue-600">{strengthAssessment.bindingAuthorityScore}/100</div>
                    <div class="text-sm text-gray-600">Authority Score</div>
                  </div>
                  <div class="text-center p-4 border rounded-lg">
                    <div class="text-lg font-bold text-purple-600">{strengthAssessment.legalReasoningScore}/100</div>
                    <div class="text-sm text-gray-600">Reasoning Score</div>
                  </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm font-medium text-green-700 mb-2">Strengths</div>
                    <ul class="text-sm space-y-1">
                      {#each strengthAssessment.strengths as strength}
                        <li class="flex items-start gap-2">
                          <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          {strength}
                        </li>
                      {/each}
                    </ul>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-red-700 mb-2">Vulnerabilities</div>
                    <ul class="text-sm space-y-1">
                      {#each strengthAssessment.vulnerabilities as vulnerability}
                        <li class="flex items-start gap-2">
                          <div class="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                          {vulnerability}
                        </li>
                      {/each}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-3">
                  {#each strengthAssessment.strategicRecommendations as recommendation, index}
                    <div class="border-l-4 border-blue-500 pl-4">
                      <div class="font-medium text-blue-700">Strategy {index + 1}</div>
                      <div class="text-sm text-gray-700">{recommendation}</div>
                    </div>
                  {/each}
                </div>
              </CardContent>
            </Card>
          </div>
        {/if}
      </TabsContent>
    </Tabs>
  {/if}
</div>