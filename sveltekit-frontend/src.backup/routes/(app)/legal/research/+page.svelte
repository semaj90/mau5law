<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
import type { Document } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  import { onMount } from 'svelte';;
  import type { nesGPUBridge  } from '$lib/gpu/nes-gpu-memory-bridge';
  import HeadlessDialog from '$lib/headless/HeadlessDialog.svelte';
  import LoadingButton from '$lib/headless/LoadingButton.svelte';
  import FormField from '$lib/headless/FormField.svelte';
  // Icons (import only icons actually used to avoid type errors)
  import { Search } from "lucide-svelte";
  import { BookOpen } from "lucide-svelte";
  import { Brain } from "lucide-svelte";
  import { Filter } from "lucide-svelte";
  import { FileText } from "lucide-svelte";
  import { Bookmark } from "lucide-svelte";
  import { Star } from "lucide-svelte";
  import { Clock } from "lucide-svelte";
  import { Library } from "lucide-svelte";
  import { Gavel } from "lucide-svelte";
  import { Calendar } from "lucide-svelte";
  import { Link } from "lucide-svelte";
  import { ExternalLink } from "lucide-svelte";
  import { Eye } from "lucide-svelte";
  // Svelte, 5 runes

  // --- ADDED: explicit types to avoid `never` / `unknown` inference errors ---
  interface DocumentResult {
    id: string
    title: string
    citation: string
    fullCitation?: string
    court?: string
    jurisdiction?: string
    dateDecided?: string
    documentType?: string
    precedentialValue?: string
    summary?: string
    keyTopics?: string[];
    relevanceScore?: number
    citedBy?: number
    isBookmarked?: boolean
    url?: string}

  type Citation = {
    id: string
    title: string
    citation: string
    savedAt: Date};

  type ResearchQuery = {
    query: string
    filters: {
      jurisdiction?: string
      court?: string
      documentType?: string
      dateRange?: string
      precedentialValue?: string
      [k: string]: unknown};
    timestamp: Date, mode: string};

  type ResearchSession = {
    id: string | null
    startTime: Date, queries: ResearchQuery[];
   , findings: unknown[]};
  // --- END ADDED ---

  let searchQuery = $state <string>('');
  let searchResults = $state <DocumentResult[]>([]);
  let isSearching = $state <boolean>(false);
  let selectedFilters = $state <{
    jurisdiction: string
    court: string
    documentType: string
    dateRange: string
    precedentialValue: string}>({ jurisdiction: '',
    court: '',
    documentType: '',
    dateRange: '',
    precedentialValue: ''
  });
  let sortBy = $state <string>('relevance');
  let currentPage = $state <number>(1);
  let totalResults = $state <number>(0);
  let savedCitations = $state <Citation[]>([]);
  let showCitationDialog = $state <boolean>(false);
  let selectedDocument = $state <DocumentResult | null>(null);
  let researchSession = $state <ResearchSession>({
    id: null,
    startTime: new Date(),
    queries: [],
    findings: []
  });
  // Advanced search options
  let advancedSearch = $state <boolean>(false);
  let searchMode = $state <'semantic' | 'boolean' | 'phrase'>('semantic'); // semantic, boolean, phrase
  let aiSuggestions = $state <string[]>([]);
  let relatedTopics = $state <string[]>([]);
  // Filter options from database
  let filterOptions = $state <{
    jurisdictions: string[],
    courts: string[],
    documentTypes: string[],
    precedentialValues: string[]}>({ jurisdictions: ['Federal', 'State', 'Local', 'International'],
    courts: ['Supreme Court', 'Court of Appeals', 'District Court', 'Bankruptcy Court'],
    documentTypes: ['case', 'statute', 'regulation', 'brief', 'opinion'],
    precedentialValues: ['High', 'Medium', 'Low', 'Informational']
  });

  $effect(() => {() => {
    (async () => {
      await initializeResearchSession();
      await loadSavedCitations();
      await loadAISuggestions()})()});
  async function initializeResearchSession(): Promise<void> {
    researchSession.id = `research_${Date.now()}`;
    console.log('ðŸ” Legal Research Session Started:', researchSession.id)}
  async function performSearch(): Promise<any> {
    if (!searchQuery.trim()) return
    isSearching = true
    // record query with correct property names and commas
    researchSession.queries.push({
      query: searchQuery,
      filters: { ...selectedFilters },
      timestamp: new Date(),
      mode: searchMode
    } as ResearchQuery);
    try {
      const searchPayload = {
        query: searchQuery,
        mode: searchMode,
        filters: selectedFilters,
        sort: sortBy,
        page: currentPage,
        limit: 20
      };
      // Guarded call to nesGPUBridge if available
      try {
        if (nesGPUBridge && typeof (nesGPUBridge, as: unknown).storeCHRROMPattern === 'function') {
          await (nesGPUBridge as: unknown).storeCHRROMPattern(`search_${Date.now()}`, { query: searchQuery })}
      } catch (e) {
        console.warn('nesGPUBridge.storeCHRROMPattern failed or unavailable', e)}
      const response = await fetch('/api/legal/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload)
      });
      if (response.ok) {
        const data = await response.json();
        const results = (data && data.results) || [];
        searchResults = results
        totalResults = data?.total ?? 0
        relatedTopics = data?.relatedTopics ?? [];
        // Generate AI suggestions based on results (guard when results is array)
        await generateAISuggestions(Array.isArray(results) ? results.slice(0, 5) : [])} else {
        // Mock data for demo
        searchResults = generateMockResults(searchQuery);
        totalResults = searchResults.length}
    } catch (error) {
      console.error('Search failed:', error);
      searchResults = generateMockResults(searchQuery);
      totalResults = searchResults.length} finally {
      isSearching = false}
  }
  function generateMockResults(query: string) {
    return [ {
        id: '1',
        title: 'Smith v. Johnson - Contract Dispute Resolution',
        citation: '123 F.3d, 456 (9th Cir. 2019)',
        fullCitation: 'Smith v. Johnson, 123 F.3d, 456 (9th Cir. 2019)',
        court: '9th Circuit Court of Appeals',
        jurisdiction: 'Federal',
        dateDecided: '2019-03-15',
        documentType: 'case',
        precedentialValue: 'High',
        summary: 'Landmark case establishing new standards for contract interpretation in commercial disputes...',
        keyTopics: ['Contract Law', 'Commercial Disputes', 'Interpretation'],
        relevanceScore: 0.94,
        citedBy: 47,
        isBookmarked: false,
        url: '/legal/documents/smith-v-johnson-2019'
      }, {
        id: '2',
        title: 'Federal Rules of Civil Procedure Â§ 26(b)(1)',
        citation: 'Fed. R. Civ. P. 26(b)(1)',
        fullCitation: 'Federal Rules of Civil Procedure Rule 26(b)(1) (2020)',
        court: 'Federal Rules',
        jurisdiction: 'Federal',
        dateDecided: '2020-12-01',
        documentType: 'regulation',
        precedentialValue: 'High',
        summary: 'Discovery scope limitations and proportionality requirements in civil litigation...',
        keyTopics: ['Discovery', 'Civil Procedure', 'Proportionality'],
        relevanceScore: 0.89,
        citedBy: 234,
        isBookmarked: true,
        url: '/legal/documents/frcp-26-b-1'
      }, {
        id: '3',
        title: 'Legal: Brief: Motion for Summary Judgment Template',
        citation: 'Practice Guide Ch. 7',
        fullCitation: 'Federal Practice Guide, Chapter 7: Summary Judgment Motions (2023)',
        court: 'Practice Guide',
        jurisdiction: 'Federal',
        dateDecided: '2023-01-01',
        documentType: 'brief',
        precedentialValue: 'Medium',
        summary: 'Comprehensive template and analysis for drafting effective summary judgment motions...',
        keyTopics: ['Summary Judgment', 'Motion Practice', 'Legal Writing'],
        relevanceScore: 0.82,
        citedBy: 12,
        isBookmarked: false,
        url: '/legal/documents/summary-judgment-template'
      }
    ]}
  async function generateAISuggestions(results: DocumentResult[]): Promise<any> {
    // Extract key terms and generate related search suggestions
    const topics = results.flatMap((r) => r.keyTopics || []);
    const uniqueTopics = [...new Set(topics)];
    aiSuggestions = [
      `Related cases on ${uniqueTopics[0] || 'similar topics'}`,
      `Recent developments in ${uniqueTopics[1] || 'this area'}`,
      `Opposing arguments and counterpoint cases`,
      `Practical applications and precedent analysis`
    ]}
  async function loadSavedCitations(): Promise<any> {
    try {
      const response = await fetch('/api/legal/research/citations');
      if (response.ok) {
        const data = await response.json();
        savedCitations = (data?.citations ?? []) as Citation[]} else {
        // fallback mock
        savedCitations = [
          { id: '1', title: 'Miranda v. Arizona', citation: '384 U.S. 436 (1966)', savedAt: new Date(Date.now() - 86400000) },
          { id: '2', title: 'Brown v. Board of Education', citation: '347 U.S. 483 (1954)', savedAt: new Date(Date.now() - 172800000) }
        ]}
    } catch (error) {
      console.error('Failed to load saved citations:', error);
      savedCitations = [
        { id: '1', title: 'Miranda v. Arizona', citation: '384 U.S. 436 (1966)', savedAt: new Date(Date.now() - 86400000) },
        { id: '2', title: 'Brown v. Board of Education', citation: '347 U.S. 483 (1954)', savedAt: new Date(Date.now() - 172800000) }
      ]}
  }
  async function loadAISuggestions(): Promise<any> {
    aiSuggestions = [
      'Recent Supreme Court decisions on constitutional law',
      'Trending legal issues in technology and privacy',
      'Commercial litigation best practices',
      'Evidence standards in federal court'
    ]}
  async function saveCitation(document: DocumentResult): Promise<void> {
    try {
      const response = await fetch('/api/legal/research/citations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id,
          citation: document.citation,
          title: document.title,
          notes: ''
        })
      });
      if (response.ok) {
        document.isBookmarked = true
        savedCitations = [ {
            id: document.id,
            title: document.title,
            citation: document.citation,
            savedAt: new Date()
          },
          ...savedCitations
        ]} else {
        // optimistic UI fallback
        document.isBookmarked = true}
    } catch (error) {
      console.error('Failed to save citation', error);
      document.isBookmarked = true}
  }
  function openCitationDialog(document: DocumentResult) {
    selectedDocument = document
    showCitationDialog = true}
  function clearFilters() {
    selectedFilters = {
      jurisdiction: '',
      court: '',
      documentType: '',
      dateRange: '',
      precedentialValue: ''
    }}
  function formatDate(dateString: unknown) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })}
  function getRelevanceColor(score: number) {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.8) return 'text-blue-600 bg-blue-100';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100'}
  function getPrecedentialColor(value: string) {
    switch (value) {
      case, 'High': return 'text-red-600 bg-red-100';
      case, 'Medium': return 'text-yellow-600 bg-yellow-100';
      case, 'Low': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100'}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
