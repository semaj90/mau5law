<script lang="ts">
import type { Case } from '$lib/types';
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { nesGPUBridge } from '$lib/gpu/nes-gpu-memory-bridge';
  import * as Dialog from '$lib/components/ui/Dialog.svelte';
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  import OptimisticList from '$lib/headless/OptimisticList.svelte';
  // Icons
  import {
    Brain, Scale, FileText, Users, Target, Lightbulb,
    TrendingUp, AlertTriangle, CheckCircle, Clock,
    Layers, Network, Eye, Plus, Edit, Trash, Save,
    ArrowRight, BarChart3, Zap, Search, Link2
  } from 'lucide-svelte';

  // Type Definitions
  interface Theory {
    id: string;
    name: string;
    type: 'prosecution' | 'defense' | 'civil' | 'alternative';
    strategy: 'evidence-based' | 'precedent-based' | 'narrative-based' | 'technical-based';
    description: string;
    strength: number;
    legalArguments: string[];
    counterarguments: string[];
    createdAt: Date;
    updatedAt: Date;
    logicalChain?: LogicalStep[];
    riskAssessment?: RiskAssessment | null;
    aiSuggestions?: string[];
  }

  interface EvidenceItem {
    id: string;
    title: string;
    type: string;
    description: string;
    strength: number;
  }

  interface Precedent {
    id: string;
    title: string;
    citation: string;
    relevanceScore: number;
    summary: string;
  }

  interface LogicalStep {
    step: number;
    premise: string;
    evidence: string;
    conclusion?: string;
    confidence?: number;
  }

  interface RiskAssessment {
    overallRisk: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }

  interface StrengthAnalysis {
    overall: number;
    components: Record<string, number>;
  }

  interface NewTheoryForm {
    name: string;
    type: 'prosecution' | 'defense' | 'civil' | 'alternative';
    strategy: 'evidence-based' | 'precedent-based' | 'narrative-based' | 'technical-based';
    description: string;
    errors: Partial<Record<keyof Omit<NewTheoryForm, 'errors'>, string[]>>;
  }

  // Svelte 5 runes
  let caseId = $state<string>('');
  let caseTitle = $state<string>('');
  let theories = $state<Theory[]>([]);
  let currentTheory = $state<Theory | null>(null);
  let isBuilding = $state<boolean>(false);
  let showTheoryDialog = $state<boolean>(false);
  let newTheoryForm = $state<NewTheoryForm>({
    name: '',
    type: 'prosecution',
    strategy: 'evidence-based',
    description: '',
    errors: {}
  });
  // Theory building components
  let evidenceItems = $state<EvidenceItem[]>([]);
  let precedents = $state<Precedent[]>([]);
  let legalArguments = $state<string[]>([]);
  let counterarguments = $state<string[]>([]);
  let strengthAnalysis = $state<StrengthAnalysis | null>(null);
  let timelineEvents = $state<any[]>([]);
  // AI reasoning engine state
  let aiSuggestions = $state<string[]>([]);
  let logicalChain = $state<LogicalStep[]>([]);
  let riskAssessment = $state<RiskAssessment | null>(null);
  let theoryScores = $state<Record<string, any>>({});
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
  $effect(() => {
    (async () => {
      // Initialize with case data if coming from case page
      const paramCaseId = $page.url.searchParams.get('caseId');
      if (paramCaseId) {
        caseId = paramCaseId;
        await loadCaseData();
      }
      await loadExistingTheories();
    })();
  });
  async function loadCaseData(): Promise<any> {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
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
  async function loadCaseEvidence(): Promise<any> {
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence`);
      if (response.ok) {
        const data = await response.json();
        evidenceItems = data.evidence || [];
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
      evidenceItems = generateMockEvidence();
    }
  }
  async function loadCasePrecedents(): Promise<any> {
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
  async function loadExistingTheories(): Promise<any> {
    try {
      const response = await fetch(`/api/cases/${caseId}/theories`);
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
          legalArguments: ['Evidence of threat', 'Witness testimony', 'Prior incidents'],
          counterarguments: ['No imminent danger', 'Excessive force'],
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 3600000)
        }
      ];
    }
  }
  async function buildTheoryWithAI(theoryData: Omit<NewTheoryForm, 'errors'>): Promise<any> {
    isBuilding = true;
    try {
      // Store theory building request in CHR-ROM for fast processing
      await nesGPUBridge.storeCHRROMPattern(`theory_${Date.now()}`, {});
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
        const builtTheory: Theory = {
          id: `theory_${Date.now()}`,
          ...theoryData,
          legalArguments: result.legalArguments || [],
          counterarguments: result.counterarguments || [],
          logicalChain: result.logicalChain || [],
          strength: result.strengthScore || 0.5,
          riskAssessment: result.riskAssessment || null,
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
  async function generateMockTheoryAnalysis(
    theoryData: Omit<NewTheoryForm, 'errors'>
  ): Promise<Theory> {
    // Simulate AI reasoning process
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      id: `theory_${Date.now()}`,
      ...theoryData,
      legalArguments: [
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
  async function loadTheoryAnalysis(theory: Theory): Promise<any> {
    legalArguments = theory.legalArguments || [];
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
  async function submitTheory(event: SubmitEvent): Promise<any> {
    event.preventDefault();
    if (!newTheoryForm.name.trim()) {
      newTheoryForm.errors = { name: ['Theory name is required'] };
      return;
    }
    newTheoryForm.errors = {};
    await buildTheoryWithAI({
      name: newTheoryForm.name,
      type: newTheoryForm.type,
      strategy: newTheoryForm.strategy,
      description: newTheoryForm.description
    });
    // Reset form
    newTheoryForm = {
      name: '',
      type: 'prosecution',
      strategy: 'evidence-based',
      description: '',
      errors: {}
    };
  }
  function selectTheory(theory: Theory) {
    currentTheory = theory;
    loadTheoryAnalysis(theory);
  }
  function getTheoryTypeColor(type: Theory['type']) {
    switch (type) {
      case 'prosecution':
        return 'text-red-600 bg-red-100';
      case 'defense':
        return 'text-blue-600 bg-blue-100';
      case 'civil':
        return 'text-green-600 bg-green-100';
      case 'alternative':
        return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
  function getStrengthColor(strength: number) {
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
       <script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { nesGPUBridge } from '$lib/gpu/nes-gpu-memory-bridge';
  import * as Dialog from '$lib/components/ui/Dialog.svelte';
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  import OptimisticList from '$lib/headless/OptimisticList.svelte';
  // Icons
  import {
    Brain, Scale, FileText, Users, Target, Lightbulb,
    TrendingUp, AlertTriangle, CheckCircle, Clock,
    Layers, Network, Eye, Plus, Edit, Trash, Save,
    ArrowRight, BarChart3, Zap, Search, Link2
  } from 'lucide-svelte';

  // Type Definitions
  interface Theory {
    id: string;
    name: string;
    type: 'prosecution' | 'defense' | 'civil' | 'alternative';
    strategy: 'evidence-based' | 'precedent-based' | 'narrative-based' | 'technical-based';
    description: string;
    strength: number;
    legalArguments: string[];
    counterarguments: string[];
    createdAt: Date;
    updatedAt: Date;
    logicalChain?: LogicalStep[];
    riskAssessment?: RiskAssessment | null;
    aiSuggestions?: string[];
  }

  interface EvidenceItem {
    id: string;
    title: string;
    type: string;
    description: string;
    strength: number;
  }

  interface Precedent {
    id: string;
    title: string;
    citation: string;
    relevanceScore: number;
    summary: string;
  }

  interface LogicalStep {
    step: number;
    premise: string;
    evidence: string;
    conclusion?: string;
    confidence?: number;
  }

  interface RiskAssessment {
    overallRisk: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }

  interface StrengthAnalysis {
    overall: number;
    components: Record<string, number>;
  }

  interface NewTheoryForm {
    name: string;
    type: 'prosecution' | 'defense' | 'civil' | 'alternative';
    strategy: 'evidence-based' | 'precedent-based' | 'narrative-based' | 'technical-based';
    description: string;
    errors: Partial<Record<keyof Omit<NewTheoryForm, 'errors'>, string[]>>;
  }

  // Svelte 5 runes
  let caseId = $state<string>('');
  let caseTitle = $state<string>('');
  let theories = $state<Theory[]>([]);
  let currentTheory = $state<Theory | null>(null);
  let isBuilding = $state<boolean>(false);
  let showTheoryDialog = $state<boolean>(false);
  let newTheoryForm = $state<NewTheoryForm>({
    name: '',
    type: 'prosecution',
    strategy: 'evidence-based',
    description: '',
    errors: {}
  });
  // Theory building components
  let evidenceItems = $state<EvidenceItem[]>([]);
  let precedents = $state<Precedent[]>([]);
  let legalArguments = $state<string[]>([]);
  let counterarguments = $state<string[]>([]);
  let strengthAnalysis = $state<StrengthAnalysis | null>(null);
  let timelineEvents = $state<any[]>([]);
  // AI reasoning engine state
  let aiSuggestions = $state<string[]>([]);
  let logicalChain = $state<LogicalStep[]>([]);
  let riskAssessment = $state<RiskAssessment | null>(null);
  let theoryScores = $state<Record<string, any>>({});
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
  $effect(() => {
    (async () => {
      // Initialize with case data if coming from case page
      const paramCaseId = $page.url.searchParams.get('caseId');
      if (paramCaseId) {
        caseId = paramCaseId;
        await loadCaseData();
      }
      await loadExistingTheories();
    })();
  });
  async function loadCaseData(): Promise<any> {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
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
  async function loadCaseEvidence(): Promise<any> {
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence`);
      if (response.ok) {
        const data = await response.json();
        evidenceItems = data.evidence || [];
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
      evidenceItems = generateMockEvidence();
    }
  }
  async function loadCasePrecedents(): Promise<any> {
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
  async function loadExistingTheories(): Promise<any> {
    try {
      const response = await fetch(`/api/cases/${caseId}/theories`);
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
          legalArguments: ['Evidence of threat', 'Witness testimony', 'Prior incidents'],
          counterarguments: ['No imminent danger', 'Excessive force'],
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 3600000)
        }
      ];
    }
  }
  async function buildTheoryWithAI(theoryData: Omit<NewTheoryForm, 'errors'>): Promise<any> {
    isBuilding = true;
    try {
      // Store theory building request in CHR-ROM for fast processing
      await nesGPUBridge.storeCHRROMPattern(`theory_${Date.now()}`, {});
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
        const builtTheory: Theory = {
          id: `theory_${Date.now()}`,
          ...theoryData,
          legalArguments: result.legalArguments || [],
          counterarguments: result.counterarguments || [],
          logicalChain: result.logicalChain || [],
          strength: result.strengthScore || 0.5,
          riskAssessment: result.riskAssessment || null,
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
  async function generateMockTheoryAnalysis(
    theoryData: Omit<NewTheoryForm, 'errors'>
  ): Promise<Theory> {
    // Simulate AI reasoning process
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      id: `theory_${Date.now()}`,
      ...theoryData,
      legalArguments: [
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
  async function loadTheoryAnalysis(theory: Theory): Promise<any> {
    legalArguments = theory.legalArguments || [];
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
  async function submitTheory(event: SubmitEvent): Promise<any> {
    event.preventDefault();
    if (!newTheoryForm.name.trim()) {
      newTheoryForm.errors = { name: ['Theory name is required'] };
      return;
    }
    newTheoryForm.errors = {};
    await buildTheoryWithAI({
      name: newTheoryForm.name,
      type: newTheoryForm.type,
      strategy: newTheoryForm.strategy,
      description: newTheoryForm.description
    });
    // Reset form
    newTheoryForm = {
      name: '',
      type: 'prosecution',
      strategy: 'evidence-based',
      description: '',
      errors: {}
    };
  }
  function selectTheory(theory: Theory) {
    currentTheory = theory;
    loadTheoryAnalysis(theory);
  }
  function getTheoryTypeColor(type: Theory['type']) {
    switch (type) {
      case 'prosecution':
        return 'text-red-600 bg-red-100';
      case 'defense':
        return 'text-blue-600 bg-blue-100';
      case 'civil':
        return 'text-green-600 bg-green-100';
      case 'alternative':
        return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
  function getStrengthColor(strength: number) {
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
