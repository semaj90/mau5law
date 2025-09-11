<!-- @migration-task Error while migrating Svelte code: `</CardContent>` attempted to close an element that was not open -->
<!--
  Integrated Legal Investigation Workspace
  Combines Evidence Canvas, Detective Analysis, Cases Management, and AI Assistant
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import EvidenceCanvas from '$lib/ui/enhanced/EvidenceCanvas.svelte';
  import UnifiedCanvasIntegration from '$lib/components/unified/UnifiedCanvasIntegration.svelte';
  import NierRichTextEditor from '$lib/components/editors/NierRichTextEditor.svelte';
  import EnhancedAIAssistant from '$lib/components/ai/EnhancedAIAssistant.svelte';
  import CitationsManager from '$lib/components/citations/CitationsManager.svelte';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import * as Tabs from '$lib/components/ui/tabs';
  import * as Dialog from '$lib/components/ui/dialog';
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import {
    FileText,
    Search,
    Brain,
    Zap,
    MessageSquare,
    Camera,
    Shield,
    Target,
    Database,
    Cpu,
    Eye,
    Plus,
    Save,
    Upload
  } from 'lucide-svelte';

  interface Case {
    id: string;
    title: string;
    status: 'active' | 'investigating' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    updatedAt: string;
    description?: string;
    assignedTo?: string;
  }

  interface EvidenceItem {
    id: string;
    caseId: string;
    title: string;
    type: 'document' | 'image' | 'video' | 'audio' | 'digital';
    status: 'pending' | 'analyzing' | 'analyzed' | 'tagged';
    confidence?: number;
    aiAnalysis?: string;
    tags: string[];
    uploadedAt: string;
    size: number;
  }

  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    context?: 'evidence' | 'case' | 'citation' | 'analysis';
    relatedId?: string;
  }

  // State management with Svelte 5 runes
  let currentCase = $state<Case | null>(null);
  let cases = $state<Case[]>([]);
  let evidence = $state<EvidenceItem[]>([]);
  let chatMessages = $state<ChatMessage[]>([]);
  let currentChatMessage = $state('');
  let activeTab = $state('evidence');
  let investigationNotes = $state('');
  let citations = $state<string[]>([]);
  let isAIProcessing = $state(false);
  let systemStatus = $state({
    evidenceCanvas: true,
    detectiveAnalysis: true,
    aiAssistant: false,
    webgpuAcceleration: false,
    ollamaConnection: false
  });

  // Create a new case
  async function createCase(title: string, description: string = '') {
    const newCase: Case = {
      id: `case-${Date.now()}`,
      title,
      description,
      status: 'active',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: 'current-user'
    };

    cases = [newCase, ...cases];
    currentCase = newCase;

    // Add system message
    addChatMessage('system', `New case created: ${title}`, 'case', newCase.id);

    return newCase;
  }

  // Evidence handling
  function handleEvidenceUploaded(event: CustomEvent) {
    const { file, position } = event.detail;
    console.log('🔍 Evidence uploaded:', file.name, 'at position:', position);

    const newEvidence: EvidenceItem = {
      id: `evidence-${Date.now()}`,
      caseId: currentCase?.id || 'unknown',
      title: file.name,
      type: getEvidenceType(file.type),
      status: 'analyzing',
      tags: [],
      uploadedAt: new Date().toISOString(),
      size: file.size
    };

    evidence = [newEvidence, ...evidence];
    addChatMessage('system', `Evidence uploaded: ${file.name}. Starting AI analysis...`, 'evidence', newEvidence.id);
  }

  function handleAnalysisComplete(event: CustomEvent) {
    const { fileId, analysis, confidence } = event.detail;
    console.log('🧠 Analysis complete:', analysis);

    // Update evidence with analysis
    evidence = evidence.map(item => {
      if (item.title === fileId || item.id === fileId) {
        return {
          ...item,
          status: 'analyzed',
          aiAnalysis: analysis.summary || 'Analysis completed',
          confidence: confidence || 0.85,
          tags: analysis.tags || ['analyzed']
        };
      }
      return item;
    });

    addChatMessage('assistant', `Analysis completed for ${fileId}: ${analysis.summary || 'Evidence processed successfully'}`, 'evidence', fileId);
  }

  function handleDetectiveInsights(event: CustomEvent) {
    const { patterns, conflicts, relevance } = event.detail;
    console.log('🕵️ Detective insights:', patterns);

    if (conflicts && conflicts.length > 0) {
      addChatMessage('assistant', `⚠️ Potential conflicts detected: ${conflicts.map((c: any) => c.description).join(', ')}`, 'analysis');
    }

    if (patterns && patterns.length > 0) {
      addChatMessage('assistant', `🔍 Patterns identified: ${patterns.map((p: any) => p.type).join(', ')}`, 'analysis');
    }
  }

  // AI Chat functionality
  function addChatMessage(role: 'user' | 'assistant' | 'system', content: string, context?: string, relatedId?: string) {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      context,
      relatedId
    };

    chatMessages = [...chatMessages, message];
  }

  async function sendChatMessage() {
    if (!currentChatMessage.trim()) return;

    const userMessage = currentChatMessage.trim();
    addChatMessage('user', userMessage);
    currentChatMessage = '';
    isAIProcessing = true;

    try {
      // Send to AI assistant with context
      const context = {
        currentCase,
        evidence,
        investigationNotes,
        citations
      };

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          conversationHistory: chatMessages.slice(-10) // Last 10 messages for context
        })
      });

      if (response.ok) {
        const data = await response.json();
        addChatMessage('assistant', data.response || 'I understand. How can I assist with this investigation?');
      } else {
        addChatMessage('assistant', 'I apologize, but I am currently unavailable. Please try again later.');
      }
    } catch (error) {
      console.error('Chat error:', error);
      addChatMessage('assistant', 'There was an error processing your request. Please try again.');
    } finally {
      isAIProcessing = false;
    }
  }

  // Utility functions
  function getEvidenceType(mimeType: string): EvidenceItem['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    return 'digital';
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'analyzing': return 'bg-blue-500';
      case 'analyzed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'tagged': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  }

  // Initialize
  onMount(() => {
    console.log('🚀 Legal Investigation Workspace initialized');

    // Load existing cases and evidence
    loadCases();
    loadSystemStatus();

    // Add welcome message
    addChatMessage('assistant', 'Welcome to the Legal Investigation Workspace. I can help you analyze evidence, manage cases, and provide legal insights. How can I assist you today?');
  });

  async function loadCases() {
    // Mock data - replace with actual API call
    cases = [
      {
        id: 'case-001',
        title: 'Corporate Fraud Investigation',
        status: 'investigating',
        priority: 'high',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        description: 'Investigation into alleged financial irregularities'
      },
      {
        id: 'case-002',
        title: 'Contract Dispute Analysis',
        status: 'active',
        priority: 'medium',
        createdAt: '2024-01-18T09:00:00Z',
        updatedAt: '2024-01-18T09:00:00Z',
        description: 'Breach of contract claim requiring evidence analysis'
      }
    ];

    if (!currentCase && cases.length > 0) {
      currentCase = cases[0];
    }
  }

  async function loadSystemStatus() {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const status = await response.json();
        systemStatus = { ...systemStatus, ...status };
      }
    } catch (error) {
      console.log('Could not load system status:', error);
    }
  }

  // Save investigation progress
  async function saveInvestigation() {
    if (!currentCase) return;

    try {
      const investigationData = {
        caseId: currentCase.id,
        notes: investigationNotes,
        evidence: evidence.filter(e => e.caseId === currentCase.id),
        citations,
        chatHistory: chatMessages,
        updatedAt: new Date().toISOString()
      };

      // Save to backend
      const response = await fetch(`/api/cases/${currentCase.id}/investigation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(investigationData)
      });

      if (response.ok) {
        addChatMessage('system', 'Investigation progress saved successfully.');
      }
    } catch (error) {
      console.error('Save error:', error);
      addChatMessage('system', 'Error saving investigation progress.');
    }
  }
</script>

<svelte:head>
  <title>Legal Investigation Workspace - YoRHa Legal AI</title>
  <meta name="description" content="Integrated workspace for legal investigation with AI-powered evidence analysis" />
</svelte:head>

<div class="investigation-workspace">
  <!-- Header -->
  <div class="workspace-header">
    <div class="header-content">
      <div class="case-info">
        <h1>🔍 Legal Investigation Workspace</h1>
        {#if currentCase}
          <div class="case-details">
            <Badge class={`${getPriorityColor(currentCase.priority)} text-white mr-2`}>
              {currentCase.priority.toUpperCase()}
            </Badge>
            <span class="case-title">{currentCase.title}</span>
            <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{currentCase.status}</span>
          </div>
        {/if}
      </div>

      <div class="workspace-actions">
  <Button class="bits-btn" onclick={saveInvestigation} variant="outline" size="sm">
          <Save class="w-4 h-4 mr-2" />
          Save Progress
        </Button>

        <!-- System Status Indicators -->
        <div class="status-indicators">
          <div class="status-item" class:active={systemStatus.evidenceCanvas} title="Evidence Canvas">
            <Camera class="w-4 h-4" />
          </div>
          <div class="status-item" class:active={systemStatus.detectiveAnalysis} title="Detective Analysis">
            <Shield class="w-4 h-4" />
          </div>
          <div class="status-item" class:active={systemStatus.aiAssistant} title="AI Assistant">
            <Brain class="w-4 h-4" />
          </div>
          <div class="status-item" class:active={systemStatus.webgpuAcceleration} title="WebGPU Acceleration">
            <Zap class="w-4 h-4" />
          </div>
          <div class="status-item" class:active={systemStatus.ollamaConnection} title="Ollama Connection">
            <Cpu class="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="workspace-content">
    <Tabs.Root bind:value={activeTab} class="w-full h-full">
      <Tabs.List class="workspace-tabs">
        <Tabs.Trigger value="evidence" class="tab-trigger">
          <FileText class="w-4 h-4 mr-2" />
          Evidence Analysis
        </Tabs.Trigger>
        <Tabs.Trigger value="investigation" class="tab-trigger">
          <Search class="w-4 h-4 mr-2" />
          Investigation Notes
        </Tabs.Trigger>
        <Tabs.Trigger value="chat" class="tab-trigger">
          <MessageSquare class="w-4 h-4 mr-2" />
          AI Assistant
        </Tabs.Trigger>
        <Tabs.Trigger value="citations" class="tab-trigger">
          <Database class="w-4 h-4 mr-2" />
          Citations & References
        </Tabs.Trigger>
      </Tabs.List>

      <!-- Evidence Analysis Tab -->
      <Tabs.Content value="evidence" class="tab-content">
        <div class="evidence-layout">
          <div class="evidence-canvas-section">
            <Card.Root class="h-full">
              <Card.Header>
                <Card.Title>Enhanced Evidence Canvas</Card.Title>
                <Card.Description>
                  Upload and analyze evidence with AI-powered detection and CUDA acceleration
                </Card.Description>
              </Card.Header>
              <Card.Content class="h-full p-0">
                <UnifiedCanvasIntegration
                  caseId={currentCase?.id || 'demo-case'}
                  enableYoRHaBoard={true}
                  enableEvidenceCanvas={true}
                  splitView={false}
                  syncCanvases={true}
                  initialMode="both"
                  on:evidenceUploaded={handleEvidenceUploaded}
                  on:analysisComplete={handleAnalysisComplete}
                  on:detectiveInsights={handleDetectiveInsights}
                />
              </CardContent>
            </Card>
          </div>

          <div class="evidence-sidebar">
            <Card.Root>
              <Card.Header>
                <Card.Title>Evidence Items</Card.Title>
                <Card.Description>{evidence.length} items</Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="evidence-list">
                  {#each evidence as item}
                    <div class="evidence-item">
                      <div class="evidence-header">
                        <span class="evidence-title">{item.title}</span>
                        <Badge class={`${getStatusColor(item.status)} text-white text-xs`}>
                          {item.status}
                        </Badge>
                      </div>

                      {#if item.confidence}
                        <div class="confidence-meter">
                          <span class="confidence-label">Confidence: {Math.round(item.confidence * 100)}%</span>
                          <div class="confidence-bar">
                            <div
                              class="confidence-fill"
                              style="width: {item.confidence * 100}%"
                            ></div>
                          </div>
                        </div>
                      {/if}

                      {#if item.aiAnalysis}
                        <p class="evidence-analysis">{item.aiAnalysis}</p>
                      {/if}

                      {#if item.tags.length > 0}
                        <div class="evidence-tags">
                          {#each item.tags as tag}
                            <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}

                  {#if evidence.length === 0}
                    <div class="empty-state">
                      <Upload class="w-8 h-8 text-gray-400 mb-2" />
                      <p class="text-gray-500">Upload evidence to begin analysis</p>
                    </div>
                  {/if}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs.Content>

      <!-- Investigation Notes Tab -->
      <Tabs.Content value="investigation" class="tab-content">
        <Card.Root class="h-full">
          <Card.Header>
            <Card.Title>Investigation Notes</Card.Title>
            <Card.Description>
              Document findings, observations, and analysis using the rich text editor
            </Card.Description>
          </Card.Header>
          <Card.Content class="h-full">
            <NierRichTextEditor
              bind:content={investigationNotes}
              placeholder="Document your investigation findings, observations, and analysis..."
            />
          </CardContent>
        </Card>
      </Tabs.Content>

      <!-- AI Assistant Tab -->
      <Tabs.Content value="chat" class="tab-content">
        <Card.Root class="h-full">
          <Card.Header>
            <Card.Title>Unified AI Legal Assistant</Card.Title>
            <Card.Description>
              Advanced AI assistant with Ollama, vLLM, WebGPU acceleration, and Go microservices integration
            </Card.Description>
          </Card.Header>
          <Card.Content class="h-full p-0">
            <EnhancedAIAssistant
              caseId={currentCase?.id || 'demo-case'}
              legalContext="legal-investigation"
              evidenceId={evidence[0]?.id}
              maxHeight="500px"
              placeholder="Ask about evidence, legal precedents, case analysis..."
              showReferences={true}
              onresponse={() => console.log('AI response received')}
              oncitation={() => console.log('Citation requested')}
            />
          </CardContent>
        </Card>
      </Tabs.Content>

            <div class="chat-input">
              <Input
                bind:value={currentChatMessage}
                placeholder="Ask about evidence, legal precedents, case analysis..."
                onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                class="flex-1"
              />
              <Button class="bits-btn" onclick={sendChatMessage} disabled={isAIProcessing || !currentChatMessage.trim()}>
                <MessageSquare class="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Tabs.Content>

      <!-- Citations Tab -->
      <Tabs.Content value="citations" class="tab-content">
        <Card.Root class="h-full">
          <Card.Header>
            <Card.Title>Legal Citations & References</Card.Title>
            <Card.Description>
              Advanced citation management with AI-powered legal research integration
            </Card.Description>
          </Card.Header>
          <Card.Content class="h-full p-0">
            <CitationsManager
              caseId={currentCase?.id || 'demo-case'}
              readonly={false}
            />
          </CardContent>
        </Card>
      </Tabs.Content>

                {#if citations.length === 0}
                  <div class="empty-state">
                    <Database class="w-8 h-8 text-gray-400 mb-2" />
                    <p class="text-gray-500">No citations added yet</p>
                  </div>
                {/if}
              </div>
            </div>
          </CardContent>
        </Card>
      </Tabs.Content>
    </Tabs.Root>
  </div>
</div>

<style>
  .investigation-workspace {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: linear-gradient(135deg, #0a0a0a, #1a1a1a);
    color: #00ff88;
    font-family: 'Courier New', monospace;
  }

  .workspace-header {
    border-bottom: 2px solid #00ff88;
    background: rgba(0, 255, 136, 0.1);
    padding: 1rem 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .case-info h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 0 10px #00ff88;
  }

  .case-details {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .case-title {
    font-weight: 600;
    color: #FFD700;
  }

  .workspace-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status-indicators {
    display: flex;
    gap: 0.5rem;
  }

  .status-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid #666;
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .status-item.active {
    background: rgba(0, 255, 136, 0.2);
    border-color: #00ff88;
    color: #00ff88;
  }

  .workspace-content {
    flex: 1;
    overflow: hidden;
  }

  .workspace-tabs {
    background: rgba(0, 0, 0, 0.8);
    border-bottom: 1px solid #00ff88;
  }

  .tab-trigger {
    color: #cccccc;
    transition: color 0.3s ease;
  }

  .tab-trigger:hover,
  .tab-trigger[data-state="active"] {
    color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  .tab-content {
    height: calc(100vh - 140px);
    padding: 1rem;
    overflow: auto;
  }

  .evidence-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1rem;
    height: 100%;
  }

  .evidence-canvas-section {
    min-height: 0;
  }

  .evidence-sidebar {
    overflow-y: auto;
  }

  .evidence-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .evidence-item {
    padding: 1rem;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
  }

  .evidence-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .evidence-title {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .confidence-meter {
    margin: 0.5rem 0;
  }

  .confidence-label {
    font-size: 0.8rem;
    color: #FFD700;
  }

  .confidence-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 2px;
  }

  .confidence-fill {
    height: 100%;
    background: linear-gradient(to right, #ff4444, #ffaa00, #00ff88);
    transition: width 0.3s ease;
  }

  .evidence-analysis {
    font-size: 0.8rem;
    color: #cccccc;
    margin: 0.5rem 0;
    line-height: 1.4;
  }

  .evidence-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .tag {
    font-size: 0.7rem;
  }

  .chat-container {
    display: flex;
    flex-direction: column;
  }

  .chat-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 1rem;
    padding-right: 0.5rem;
  }

  .message {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
    max-width: 90%;
  }

  .message.user {
    margin-left: auto;
    background: rgba(0, 255, 136, 0.1);
    border-left: 3px solid #00ff88;
  }

  .message.assistant {
    margin-right: auto;
    background: rgba(255, 215, 0, 0.1);
    border-left: 3px solid #FFD700;
  }

  .message.system {
    background: rgba(0, 150, 255, 0.1);
    border-left: 3px solid #0096ff;
    margin: 0 auto;
    max-width: 70%;
    text-align: center;
    font-size: 0.9rem;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .message-role {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .message-time {
    font-size: 0.7rem;
  }

  .message-content {
    line-height: 1.5;
  }

  .thinking-indicator {
    display: flex;
    gap: 0.25rem;
  }

  .thinking-indicator span {
    width: 6px;
    height: 6px;
    background: #FFD700;
    border-radius: 50%;
    animation: thinking 1.5s ease-in-out infinite;
  }

  .thinking-indicator span:nth-child(2) {
    animation-delay: 0.3s;
  }

  .thinking-indicator span:nth-child(3) {
    animation-delay: 0.6s;
  }

  @keyframes thinking {
    0%, 80%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .chat-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(0, 255, 136, 0.3);
  }

  .citations-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .add-citation {
    margin-bottom: 2rem;
  }

  .citations-list {
    flex: 1;
  }

  .citation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
  }

  .citation-text {
    flex: 1;
    font-size: 0.9rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    text-align: center;
    opacity: 0.6;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .evidence-layout {
      grid-template-columns: 1fr;
    }

    .evidence-sidebar {
      max-height: 300px;
    }
  }

  @media (max-width: 768px) {
    .workspace-header {
      padding: 0.5rem 1rem;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .tab-content {
      padding: 0.5rem;
    }
  }
</style>
