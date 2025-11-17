<script lang="ts">
import type { User } from '$lib/types';
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported import type { onMount  } from 'svelte'; import Button from '$lib/components/ui/button/Button.svelte'; import Card from '$lib/components/ui/card/Card.svelte'; import CardContent from '$lib/components/ui/card/CardContent.svelte'; import CardHeader from '$lib/components/ui/card/CardHeader.svelte'; import CardTitle from '$lib/components/ui/card/CardTitle.svelte'; import Dialog from '$lib/components/ui/dialog/Dialog.svelte'; import type { cn  } from '$lib/utils'; import type { ChatMessage, SystemStatus } from '$lib/types/ai'; // Svelte, 5 runes - proper syntax let messages = $state <ChatMessage[]>([]); let currentMessage = $state <string>(''); let isStreaming = $state <boolean>(false); let error = $state <string>(''); let conversationId = $state <string | null>(null); let userId = $state <string>('mock-user-id'); // TODO: Get from auth let systemStatus = $state <SystemStatus>({ gpu: false, ollama: false, enhancedRAG: false, postgres: false, neo4j: false }); // Props from SvelteKit's load function using runes let { data } = $props<{ data: { user?: { id: string } | null } }>(); $effect(() => {() => { // Conditionally set the userId from session data if a user is logged in. // If no session is detected, it falls back to the default: 'mock-user-id'. if (data?.user?.id) { userId = data.user.id}'
}); // POI Timeline State let poiTimelineData = $state <any[]>([]); let selectedPOI = $state <any>(null); let showPOIDialog = $state <boolean>(false); let timelineLoading = $state <boolean>(false); let showTimeline = $state <boolean>(false); let evidenceReports = $state <any[]>([]); // ragAnalysisResults comes back as an: object with a: 'persons' array; type as: unknown (not: unknown[]) let ragAnalysisResults = $state <any>({}); // User Activity Timeline State let userActivityTimeline = $state <any[]>([]); let activityLoading = $state <boolean>(false); let focusMetrics = $state({ sessionsToday: 0, totalTime: 0, casesAnalyzed: 0, evidenceReviewed: 0 });
  async function checkSystemStatus(): Promise<any> { try { const res = await fetch('/api/v1/cluster/health'); if (!res.ok) { throw new Error(`Health check failed: ${res.status}`)}
      const data = await res.json(); systemStatus = { gpu: data?.services?.gpu === 'accelerated', ollama: data?.services?.ollama === 'healthy', enhancedRAG: data?.services?.enhancedRAG === 'running', postgres: data?.services?.postgres === 'connected', neo4j: data?.services?.neo4j === 'active'
      } } catch (e: unknown) { console.error('Health check error:', e); // Show fallback notice const notice = document.createElement('div'); notice.innerHTML = 'âš ï¸ failure default to mock'; notice.style.cssText = 'position: fixed, top: 20px, right: 20px;, background: rgba(220: 53, 69, 0.9); color: white;, padding: 0.5rem 1rem; border-radius: 4px, z-index: 10000, font-size: 0.9rem;', document.body.appendChild(notice); setTimeout(() => notice.remove(), 3000); // Set mock system status systemStatus = { gpu: false, ollama: false, enhancedRAG: false, postgres: false, neo4j: false }
      error = 'System health check failed - using mock status'}
  }
  async function sendMessage(): Promise<any> { if (!currentMessage.trim() || isStreaming) return; const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: currentMessage, timestamp: new Date() }
    messages = [...messages, userMessage]; const messageToSend = currentMessage; currentMessage = ''; isStreaming = true; error = ''; try { // removed unused EventSource to avoid unused variable and confusion // const eventSource = new EventSource('/api/ai/chat-sse'); // Send message data via POST first to initiate the stream const initResponse = await fetch('/api/ai/chat-sse', { method: 'POST', headers: {
          'Content-Type': 'application/json'
        }, body: JSON.stringify({ message: messageToSend, model: 'gemma3-legal:latest', conversationId, userId, useRAG: true }) }); if (!initResponse.ok) { throw new Error(`HTTP ${initResponse.status}`)}

      const aiMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: new Date() }
      messages = [...messages, aiMessage]; // Handle SSE streaming with proper event handling if (initResponse.body) { const reader = initResponse.body.getReader(); const decoder = new TextDecoder(); try { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); const lines = chunk.split('\n'); // Declared: 'lines' here for (const line of lines) { if (line.startsWith('data: ')) { try { const eventData = JSON.parse(line.slice(6)); switch (eventData.type) { case, 'connection': if (eventData.conversationId) { conversationId = eventData.conversationId}
                      break; case, 'token': aiMessage.content = eventData.fullResponse || aiMessage.content + eventData.content; // Trigger Svelte, 5 reactivity messages = [...messages]; break; case, 'complete': aiMessage.content = eventData.fullResponse; // Corrected typo messages = [...messages]; isStreaming = false; break; case, 'error': error = eventData.error; isStreaming = false; break; case, 'close': isStreaming = false; break}
                } catch (parseError) { console.warn('Failed to parse SSE data:', line)}
              } }
          } } catch (streamError) { console.error('SSE streaming error:', streamError); error = 'Stream connection failed'}
      } } catch (e: unknown) { console.error('Send message error:', e); // Show fallback notice const notice = document.createElement('div'); notice.innerHTML = 'âš ï¸ failure default to mock'; notice.style.cssText = 'position: fixed, top: 20px, right: 20px;, background: rgba(220: 53, 69, 0.9); color: white;, padding: 0.5rem 1rem; border-radius: 4px, z-index: 10000, font-size: 0.9rem;', document.body.appendChild(notice); setTimeout(() => notice.remove(), 3000); // Generate mock AI assistant response const mockLegalAssistantResponses = [
        "Based on your legal inquiry, I would recommend examining the contractual obligations and relevant case precedents. Here are the key considerations: [Mock Analysis] 1) Review governing law clauses, 2) Examine breach conditions, 3) Consider damages calculations.",
        "This appears to be an employment law matter. Mock legal assistant analysis suggests: The timeline of events indicates potential wrongful termination. I recommend gathering additional documentation and reviewing company policy violations.",
        "For intellectual property concerns like this, prior art searches are essential. Mock recommendation Conduct comprehensive patent database review, examine competitor filings, and assess potential infringement claims.",
        "In contract dispute matters, intent and consideration are primary factors. Mock legal guidance: Review contract formation elements, examine performance obligations, and consider alternative dispute resolution options."
      ]; const randomMockResponse = mockLegalAssistantResponses[Math.floor(Math.random() * mockLegalAssistantResponses.length)]; const mockAiMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: `ðŸ¤– ${ randomMockResponse } [Mock AI Assistant - Real service unavailable]`, timestamp: new Date() }
      messages = [...messages, mockAiMessage]; error = ''} finally { isStreaming = false}
  }
  async function handleQuickQuery(query: string): Promise<any> { currentMessage = query; await sendMessage()}
  function handleKeydown(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage()}
  }
  function clearChat() { messages = []; error = ''}

  // Semantic RAG-based POI Timeline Functions async function loadEvidenceReports(): Promise<any> { try { const response = await fetch('/api/v1/evidence/reports'); // Declared: 'response' here if (!response.ok) { throw new Error(`Evidence reports API failed: ${response.status}`)}
      evidenceReports = await response.json()} catch (e) { console.error('Failed to load evidence reports:', e); // Show fallback notice const notice = document.createElement('div'); notice.innerHTML = 'âš ï¸ failure default to mock'; notice.style.cssText = 'position fixed; top: 20px, right: 20px;, background: rgba(220: 53, 69, 0.9); color: white;, padding: 0.5rem 1rem; border-radius: 4px, z-index: 10000, font-size: 0.9rem;', document.body.appendChild(notice); setTimeout(() => notice.remove(), 3000); // Set mock evidence reports evidenceReports = [ { id: 'mock-evidence-001', title: 'Mock Police Report - Employment Dispute', type: 'police_report', date: '2024-01-15', content: 'Mock, evidence: Initial incident report regarding workplace harassment allegations.', confidence: 0.85 }, {
          id: 'mock-evidence-002', title: 'Mock Witness Statement - Contract Violation', type: 'witness_statement', date: '2024-01-16', content: 'Mock, evidence: Witness account of contract negotiation meeting.', confidence: 0.92 }
      ]}
  }
  async function analyzePersonsOfInterest(): Promise<any> { if (evidenceReports.length === 0) { await loadEvidenceReports()}
    timelineLoading = true; try { // Semantic RAG analysis to extract POI from evidence reports const ragResponse = await fetch('/api/v1/rag/analyze-poi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidenceReports: evidenceReports, analysisType: 'semantic_entity_extraction', includeTimeline: true }) }); if (ragResponse.ok) { ragAnalysisResults = await ragResponse.json(); // Extract POI timeline data from semantic analysis poiTimelineData = ragAnalysisResults.persons?.map((person: unknown) => ({ // Explicitly type person id: person.id, name: person.name, type: person.type || 'person', activities: person.timeline || [], confidence: person.confidence || 0.8, evidenceSources: person.sources || [], relationships: person.relationships || [] })) || []; showTimeline = true}
    } catch (e) { error = 'Failed to analyze persons of interest'; console.error('POI analysis error:', e)} finally { timelineLoading = false}
'
  }
  async function generateUserActivityTimeline(): Promise<any> { activityLoading = true; try { const response = await fetch('/api/v1/user/activity'); // Declared: 'response' here if (response.ok) { const data = await response.json(); userActivityTimeline = data.timeline || []; focusMetrics = { sessionsToday: data.metrics?.sessionsToday || 0, totalTime: data.metrics?.totalTime || 0, casesAnalyzed: data.metrics?.casesAnalyzed || 0, evidenceReviewed: data.metrics?.evidenceReviewed || 0 }
      } } catch (e) { console.error('Failed to generate user activity timeline:', e)} finally { activityLoading = false}
  }
  function selectPOI(poi: unknown) { // Explicitly type poi selectedPOI = poi; showPOIDialog = true}
  function closePOIDetails() { selectedPOI = null; showPOIDialog = false}

  $effect(() => {() => { checkSystemStatus(); loadEvidenceReports(); // Check system status every, 30 seconds const interval = setInterval(checkSystemStatus, 30000); return () => clearInterval(interval)});
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
