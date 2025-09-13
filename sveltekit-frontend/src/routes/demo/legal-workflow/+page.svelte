<!--
Legal AI Workflow Demo - Complete End-to-End Demonstration
Shows: Case creation → Evidence upload → Canvas positioning → Timeline → RAG chat
-->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';

  interface WorkflowStep {
    step: number;
    action: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    result?: any;
    duration?: number;
  }

  let workflowSteps = $state<WorkflowStep[]>([
    { step: 1, action: 'create_case', description: 'Create legal case with embeddings', status: 'pending' },
    { step: 2, action: 'upload_evidence', description: 'Upload multimodal evidence files', status: 'pending' },
    { step: 3, action: 'update_canvas_positions', description: 'Position evidence on Fabric.js canvas', status: 'pending' },
    { step: 4, action: 'generate_timeline', description: 'Reconstruct chronological timeline', status: 'pending' },
    { step: 5, action: 'chat_with_case', description: 'RAG chat with case context', status: 'pending' }
  ]);

  let currentStep = $state(0);
  let isRunning = $state(false);
  let caseId = $state<string | null>(null);
  let chatQuery = $state('What evidence supports the prosecution\'s case?');
  let demoResults = $state<any>({});

  // Demo case data
  const demoCase = {
    title: 'State v. Digital Evidence Case #2025-091',
    description: 'Complex criminal case involving digital evidence analysis, surveillance footage, and witness testimony requiring AI-powered investigation tools.',
    userId: 'attorney_demo_user',
    priority: 'high',
    category: 'criminal',
    jurisdiction: 'Superior Court of Technology Crimes'
  };

  const demoEvidence = [
    {
      name: 'crime_scene_photo.jpg',
      type: 'image/jpeg',
      content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      description: 'High-resolution crime scene photograph'
    },
    {
      name: 'witness_statement.pdf',
      type: 'application/pdf',
      content: 'JVBERi0xLjMKJcTl8uXrp/Og0MTGCjPDkmPi4uLi4uGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGho=',
      description: 'Sworn witness statement with OCR-ready text'
    },
    {
      name: 'surveillance_audio.mp3',
      type: 'audio/mpeg',
      content: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAEAAABVgANTU1NTU1VVVVVVVVVVV1dXV1dXV1paWlpaWlpaXV1dXV1dXV1d3d3d3d3d3d7e3t7e3t7e3t9fX19fX19fX9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3//////Lav==',
      description: 'Surveillance audio recording with speech-to-text capability'
    }
  ];

  async function runCompleteWorkflow() {
    if (isRunning) return;

    isRunning = true;
    currentStep = 0;
    demoResults = {};

    try {
      // Step 1: Create Case
      await runStep(1, 'create_case', {
        action: 'create_case',
        data: demoCase
      });

      // Step 2: Upload Evidence
      await runStep(2, 'upload_evidence', {
        action: 'upload_evidence',
        data: {
          caseId: caseId,
          userId: demoCase.userId,
          files: demoEvidence,
          canvasPositions: [
            { x: 150, y: 100 },  // Crime scene photo - top left
            { x: 400, y: 200 },  // Witness statement - center
            { x: 650, y: 300 }   // Audio recording - bottom right
          ]
        }
      });

      // Step 3: Update Canvas Positions (simulate user interaction)
      await runStep(3, 'update_canvas_positions', {
        action: 'update_canvas_positions',
        data: {
          caseId: caseId,
          userId: demoCase.userId,
          evidencePositions: {
            'evidence_1': { x: 200, y: 150 },  // Moved photo
            'evidence_2': { x: 450, y: 250 },  // Repositioned statement
            'evidence_3': { x: 700, y: 350 }   // Adjusted audio
          }
        }
      });

      // Step 4: Generate Timeline
      await runStep(4, 'generate_timeline', {
        action: 'generate_timeline',
        data: {
          caseId: caseId,
          userId: demoCase.userId
        }
      });

      // Step 5: RAG Chat
      await runStep(5, 'chat_with_case', {
        action: 'chat_with_case',
        data: {
          caseId: caseId,
          userId: demoCase.userId,
          query: chatQuery
        }
      });

      console.log('🎉 Complete workflow demo finished successfully!');

    } catch (error) {
      console.error('❌ Workflow demo failed:', error);

      if (currentStep > 0) {
        workflowSteps[currentStep - 1].status = 'error';
        workflowSteps[currentStep - 1].result = { error: String(error) };
      }
    } finally {
      isRunning = false;
    }
  }

  async function runStep(stepNumber: number, action: string, payload: any) {
    currentStep = stepNumber;
    const stepIndex = stepNumber - 1;

    workflowSteps[stepIndex].status = 'running';
    const startTime = Date.now();

    try {
      const response = await fetch('/api/demo/legal-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (result.success) {
        workflowSteps[stepIndex].status = 'completed';
        workflowSteps[stepIndex].result = result;
        workflowSteps[stepIndex].duration = duration;
        demoResults[action] = result;

        // Extract case ID from step 1
        if (action === 'create_case' && result.case?.id) {
          caseId = result.case.id;
        }

        console.log(`✅ Step ${stepNumber} (${action}) completed in ${duration}ms`);
      } else {
        throw new Error(result.error || 'Step failed');
      }

    } catch (error) {
      workflowSteps[stepIndex].status = 'error';
      workflowSteps[stepIndex].result = { error: String(error) };
      workflowSteps[stepIndex].duration = Date.now() - startTime;
      throw error;
    }
  }

  function getStepIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⚡';
      case 'error': return '❌';
      default: return '⏳';
    }
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  onMount(async () => {
    // Load workflow info
    try {
      const response = await fetch('/api/demo/legal-workflow?demo=info');
      const info = await response.json();
      console.log('📚 Workflow demo info loaded:', info);
    } catch (error) {
      console.warn('Failed to load demo info:', error);
    }
  });
</script>

<svelte:head>
  <title>Legal AI Workflow Demo - Complete Case Management</title>
</svelte:head>

<div class="workflow-demo">
  <header class="demo-header">
    <h1 class="nes-text is-primary">🏛️ Legal AI Complete Workflow Demo</h1>
    <p class="nes-text">
      End-to-end demonstration: Case Creation → Evidence Upload → Canvas Positioning → Timeline → RAG Chat
    </p>
  </header>

  <div class="demo-controls">
    <button
      class="nes-btn is-primary"
      onclick={runCompleteWorkflow}
      disabled={isRunning}
    >
      {isRunning ? '⚡ Running Demo...' : '🚀 Start Complete Workflow'}
    </button>

    {#if !isRunning && currentStep > 0}
      <button class="nes-btn is-warning" onclick={() => location.reload()}>
        🔄 Reset Demo
      </button>
    {/if}
  </div>

  <div class="workflow-steps">
    {#each workflowSteps as step, i}
      <div class="step-card nes-container with-title" class:active={currentStep === step.step} data-step={step.step}>
        <h3 class="title">
          {getStepIcon(step.status)} Step {step.step}: {step.action}
        </h3>

        <div class="step-content">
          <p><strong>Action:</strong> {step.description}</p>
          <p><strong>Status:</strong>
            <span class:nes-text={true} class:is-success={step.status === 'completed'}
                  class:is-error={step.status === 'error'} class:is-warning={step.status === 'running'}>
              {step.status.toUpperCase()}
            </span>
          </p>

          {#if step.duration}
            <p><strong>Duration:</strong> {formatDuration(step.duration)}</p>
          {/if}

          {#if step.result?.message}
            <div class="step-result">
              <p><strong>Result:</strong> {step.result.message}</p>
              {#if step.result.nextStep}
                <p class="nes-text is-disabled"><em>Next: {step.result.nextStep}</em></p>
              {/if}
            </div>
          {/if}

          {#if step.result?.error}
            <div class="step-error nes-text is-error">
              <strong>Error:</strong> {step.result.error}
            </div>
          {/if}

          <!-- Step-specific result displays -->
          {#if step.action === 'create_case' && step.result?.case}
            <div class="case-details">
              <h4>📁 Case Created:</h4>
              <ul>
                <li><strong>Case #:</strong> {step.result.case.caseNumber}</li>
                <li><strong>Title:</strong> {step.result.case.title}</li>
                <li><strong>Status:</strong> {step.result.case.status}</li>
                <li><strong>Priority:</strong> {step.result.case.priority}</li>
              </ul>
            </div>
          {/if}

          {#if step.action === 'upload_evidence' && step.result?.results}
            <div class="evidence-details">
              <h4>📄 Evidence Uploaded:</h4>
              <ul>
                {#each step.result.results as evidence}
                  <li>
                    <strong>{evidence.filename}</strong>
                    ({evidence.status})
                    at ({evidence.canvasPosition.x}, {evidence.canvasPosition.y})
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if step.action === 'generate_timeline' && step.result?.timeline}
            <div class="timeline-details">
              <h4>⏱️ Timeline Events ({step.result.timeline.length}):</h4>
              <div class="timeline-preview">
                {#each step.result.timeline.slice(-3) as event}
                  <div class="timeline-event">
                    <span class="timestamp">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    <span class="event-type">{event.type}</span>
                    <span class="event-desc">{event.description}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if step.action === 'chat_with_case' && step.result?.response}
            <div class="chat-details">
              <h4>💬 AI Response:</h4>
              <div class="chat-query">
                <strong>Query:</strong> {chatQuery}
              </div>
              <div class="chat-response nes-textarea">
                {step.result.response}
              </div>
              {#if step.result.context}
                <p class="context-info">
                  <em>Used {step.result.context.documentsAnalyzed} documents with embedding search</em>
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if currentStep === 5 && !isRunning}
    <div class="demo-summary nes-container is-rounded">
      <h3>🎉 Workflow Demo Complete!</h3>
      <p>Your Legal AI system successfully demonstrated:</p>
      <ul>
        <li>✅ Case creation with embedded metadata</li>
        <li>✅ Multimodal evidence processing (image, PDF, audio)</li>
        <li>✅ Fabric.js canvas positioning</li>
        <li>✅ Timeline reconstruction from activities</li>
        <li>✅ RAG chat with case context and evidence embeddings</li>
      </ul>
      <p class="nes-text is-success">
        <strong>Production-ready legal case management system!</strong>
      </p>
    </div>
  {/if}

  <div class="demo-query-input">
    <label class="nes-text" for="chat-query">Customize RAG Chat Query:</label>
    <input
      id="chat-query"
      class="nes-input"
      bind:value={chatQuery}
      placeholder="Enter your legal query here..."
      disabled={isRunning}
    />
  </div>
</div>

<style>
  .workflow-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Courier New', monospace;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    margin-bottom: 1rem;
  }

  .demo-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .workflow-steps {
    display: grid;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .step-card {
    transition: all 0.3s ease;
    border: 2px solid #ccc;
  }

  .step-card.active {
    border-color: #0066cc;
    box-shadow: 0 0 10px rgba(0, 102, 204, 0.3);
    transform: scale(1.02);
  }

  .step-content {
    padding: 1rem 0;
  }

  .step-result, .case-details, .evidence-details, .timeline-details, .chat-details {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8f8f8;
    border-radius: 4px;
  }

  .step-error {
    margin-top: 1rem;
    padding: 1rem;
    background: #ffe6e6;
    border-radius: 4px;
  }

  .timeline-preview {
    max-height: 150px;
    overflow-y: auto;
    font-size: 0.9em;
  }

  .timeline-event {
    display: grid;
    grid-template-columns: 80px 120px 1fr;
    gap: 0.5rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid #eee;
  }

  .timestamp {
    font-weight: bold;
    color: #666;
  }

  .event-type {
    background: #e6f3ff;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8em;
  }

  .chat-response {
    max-height: 200px;
    overflow-y: auto;
    margin: 1rem 0;
    font-size: 0.9em;
    white-space: pre-wrap;
  }

  .chat-query {
    margin-bottom: 1rem;
    font-weight: bold;
  }

  .context-info {
    font-size: 0.8em;
    color: #666;
    margin-top: 0.5rem;
  }

  .demo-summary {
    margin-top: 2rem;
    text-align: center;
    background: #e6ffe6;
  }

  .demo-summary ul {
    text-align: left;
    display: inline-block;
  }

  .demo-query-input {
    margin-top: 2rem;
  }

  .demo-query-input label {
    display: block;
    margin-bottom: 0.5rem;
  }

  .demo-query-input input {
    width: 100%;
    max-width: 600px;
  }
</style>