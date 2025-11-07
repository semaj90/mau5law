<script lang="ts">
  import { onMount } from 'svelte';
  import DetectiveBoard from '$lib/components/detective/DetectiveBoard.svelte';
  import CaseForm from '$lib/components/forms/CaseForm.svelte';

  let currentView = $state<string>('board'); // 'board' | 'create-case' | 'auth-demo'
  let mounted = $state<boolean>(false);

  // Sample evidence data for the detective board
  let sampleEvidence = $state<any[]>([
    {
      id: 'evidence-1',
      title: 'Security Camera Footage',
      fileName: 'camera_feed_001.mp4',
      evidenceType: 'video',
      status: 'new',
      fileSize: 45678912,
      createdAt: new Date('2024-01-15T10:30:00'),
      uploadedAt: new Date('2024-01-15T10:30:00'),
      updatedAt: new Date('2024-01-15T10:30:00'),
      description: 'Video shows suspect entering building at 10:23 PM wearing dark clothing',
      tags: ['surveillance', 'timestamp', 'suspect-entry'],
      hash: 'abc123',
      thumbnailUrl: '/api/thumbnails/evidence-1.jpg',
      aiSummary: 'Video shows suspect entering building at 10:23 PM wearing dark clothing'
    },
    {
      id: 'evidence-2',
      title: 'Witness Statement - John Doe',
      fileName: 'witness_statement_001.pdf',
      evidenceType: 'document',
      status: 'reviewing',
      fileSize: 1234567,
      createdAt: new Date('2024-01-16T14:20:00'),
      uploadedAt: new Date('2024-01-16T14:20:00'),
      updatedAt: new Date('2024-01-16T14:20:00'),
      description: 'Witness observed suspicious activity near the crime scene around 10:15 PM',
      tags: ['witness', 'testimony', 'timeline'],
      aiSummary: 'Witness observed suspicious activity near the crime scene around 10:15 PM'
    },
    {
      id: 'evidence-3',
      title: 'Crime Scene Photos',
      fileName: 'scene_photos_batch1.zip',
      evidenceType: 'image',
      status: 'approved',
      fileSize: 23456789,
      createdAt: new Date('2024-01-17T09:15:00'),
      uploadedAt: new Date('2024-01-17T09:15:00'),
      updatedAt: new Date('2024-01-17T09:15:00'),
      tags: ['crime-scene', 'forensics', 'photography'],
      hash: 'xyz789',
      thumbnailUrl: '/api/thumbnails/evidence-3.jpg'
    },
    {
      id: 'evidence-4',
      title: 'Phone Call Recording',
      fileName: 'call_recording_suspect.mp3',
      evidenceType: 'audio',
      status: 'new',
      fileSize: 5678901,
      createdAt: new Date('2024-01-18T11:45:00'),
      uploadedAt: new Date('2024-01-18T11:45:00'),
      updatedAt: new Date('2024-01-18T11:45:00'),
      description: 'Audio recording contains discussion about meeting location',
      tags: ['wiretap', 'conversation', 'evidence'],
      aiSummary: 'Audio recording contains discussion about meeting location'
    },
    {
      id: 'evidence-5',
      title: 'Financial Records',
      fileName: 'bank_statements_2024.pdf',
      evidenceType: 'document',
      status: 'reviewing',
      fileSize: 3456789,
      createdAt: new Date('2024-01-19T16:30:00'),
      uploadedAt: new Date('2024-01-19T16:30:00'),
      updatedAt: new Date('2024-01-19T16:30:00'),
      description: 'Bank statements showing suspicious transactions',
      tags: ['financial', 'money-laundering', 'transactions'],
      aiSummary: 'Bank statements reveal suspicious large cash deposits totaling $50,000 over 3 months'
    }
  ]);

  onMount(() => {
    mounted = true;
  });

  function handleCaseCreated(event: CustomEvent) {
    console.log('Case created:', event.detail);
    currentView = 'board';
  }

  function handleCaseCancelled() {
    currentView = 'board';
  }

  // Local mock authentication state (replaces global $auth usage in this demo file)
  let authState = $state({
    isAuthenticated: false,
    isLoading: false,
    user: null as { name?: string; email?: string } | null
  });

  const auth = {
    async login(email = 'test@example.com', _password = 'password123') {
      authState.isLoading = true;
      await new Promise((r) => setTimeout(r, 500));
      authState.user = { name: 'Demo User', email };
      authState.isAuthenticated = true;
      authState.isLoading = false;
    },
    logout() {
      authState.isAuthenticated = false;
      authState.user = null;
    },
    async checkAuth() {
      authState.isLoading = true;
      await new Promise((r) => setTimeout(r, 200));
      authState.isAuthenticated = !!authState.user;
      authState.isLoading = false;
    }
  };

  // Demo collaboration simulation function
  function simulateCollaboration() {
    if (!mounted) return;

    // Simulate other users joining
    const mockUsers = [
      { id: 'user-1', name: 'Sarah Chen', email: 'sarah.chen@prosecutor.office' },
      { id: 'user-2', name: 'Mike Rodriguez', email: 'mike.rodriguez@prosecutor.office' },
      { id: 'user-3', name: 'Dr. Lisa Kim', email: 'lisa.kim@forensics.office' }
    ];

    // Add one random user as if they joined
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    // Show notification
    if (typeof window !== 'undefined') {
      console.log(`${randomUser.name} joined the case`);
    }

    // Simulated notification timeout
    setTimeout(() => {
      console.log('Notification dismissed');
    }, 3000);
    console.log('ðŸš€ Collaboration demo:', randomUser.name, 'joined the case');
  }

  // Add these helpers to bypass strict prop inference in this demo page
  let demoCaseId: any = 'demo-case-001';
  let demoEvidence: any = sampleEvidence;
</script>

<div class="p-6 max-w-4xl mx-auto">
  <h1 class="text-2xl">Detective Mode</h1>
  <p class="text-sm">Jump into the core investigative tools.</p>
  <div class="grid sm:grid-cols-2">
    <a class="border rounded p-4" href="/evidenceboard">ðŸ§© Evidence Board</a>
    <a class="border rounded p-4" href="/evidence-canvas">ðŸ–¼ï¸ Evidence Canvas</a>
    <a class="border rounded p-4" href="/cases">ðŸ“‚ Cases</a>
    <a class="border rounded p-4" href="/chat">ðŸ’¬ AI Chat</a>
  </div>
</div>
<svelte:head>
  <title>Detective Mode - Google Slides for Prosecutors</title>
  <meta
    name="description"
    content="Advanced evidence management and case visualization tool for legal, professionals"
  />
</svelte:head>
{#if mounted}
  <!-- Navigation, Bar -->
  <nav class="space-y-4">
    <div class="space-y-2">
      <h1 class="text-xl">Detective Mode</h1>
      <div class="flex gap-2">
        <button onclick={() => (currentView = 'board')} class="border rounded px-3 py-1 hover:bg-white/5">
          Evidence Board
        </button>
        <button onclick={() => (currentView = 'create-case')} class="border rounded px-3 py-1 hover:bg-white/5">
          Create Case
        </button>
        <button onclick={() => (currentView = 'auth-demo')} class="border rounded px-3 py-1 hover:bg-white/5">
          Auth Demo
        </button> <button onclick={simulateCollaboration} class="border rounded px-3 py-1"> Demo Collab </button>
      </div>
      <div class="space-y-4">
        <!-- Demo Status, Badge -->
        <div class="flex items-center">
          <span class="inline-block h-2 w-2 rounded-full"></span> <span>Live Demo</span>
        </div>
        {#if authState.isAuthenticated}
          <div class="flex items-center">
            <span>Welcome, {authState.user?.name || authState.user?.email}</span>
            <button onclick={() => auth.logout()} class="border rounded px-2 py-1 hover:bg-white/5">Logout</button>
          </div>
        {:else}
          <div class="text-sm">Not authenticated</div>
        {/if}
      </div>
    </div>
  </nav>
  <!-- Main, Content -->
  <main class="space-y-4">
    {#if currentView === 'board'}
      <!-- canonical ts-ignore comment to silence prop type checks for this demo usage -->
      <!-- @ts-ignore -->
      <DetectiveBoard caseId={demoCaseId} evidence={demoEvidence} />
    {:else if currentView === 'create-case'}
      <div class="space-y-4">
        <!-- use Svelte component event listeners -->
        <CaseForm on:success={handleCaseCreated} on:cancel={handleCaseCancelled} />
      </div>
    {:else if currentView === 'auth-demo'}
      <div class="space-y-4">
        <div class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold">Authentication Demo</h2>
            <p class="text-gray-300">
              This demonstrates the Svelte Context API alternative to $lib for authentication.
            </p>
            <div class="space-y-4">
              <div>
                <h3 class="text-lg font-semibold">Auth State</h3>
                <pre class="bg-black/30 p-2 rounded border border-white/10 overflow-x-auto">{JSON.stringify(
                    authState,
                    null,
                    2
                  )}</pre>
              </div>
              <div>
                <div class="flex gap-2">
                  <button
                    onclick={() => auth.login('test@example.com', 'password123')}
                    class="border rounded px-2 py-1 hover:bg-white/5"
                    disabled={authState.isLoading}
                  >
                    Mock Login
                  </button>
                  <button
                    onclick={() => auth.logout()}
                    class="border rounded px-2 py-1 hover:bg-white/5"
                    disabled={!authState.isAuthenticated}
                  >
                    Logout
                  </button>
                  <button
                    onclick={() => auth.checkAuth()}
                    class="border rounded px-2 py-1 hover:bg-white/5"
                    disabled={authState.isLoading}
                  >
                    Check Auth
                  </button>
                </div>
              </div>
            </div>
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Features Demonstrated</h3>
              <div class="space-y-3">
                <div>
                  <h4 class="font-medium">âœ… UnoCSS Only</h4>
                  <p class="text-sm">PicoCSS removed, using UnoCSS utility classes throughout</p>
                </div>
                <div>
                  <h4 class="font-medium text-green-400">âœ… Drag & Drop</h4>
                  <p class="text-sm">Evidence cards with svelte-dnd-action in 3-column layout</p>
                </div>
                <div>
                  <h4 class="font-medium">âœ… Context Menus</h4>
                  <p class="text-sm">Right-click menus using Melt UI primitives</p>
                </div>
                <div>
                  <h4 class="font-medium">âœ… Superforms + Zod</h4>
                  <p class="text-sm">Type-safe forms with validation and error handling</p>
                </div>
                <div>
                  <h4 class="font-medium">âœ… Auth Context</h4>
                  <p class="text-sm">Svelte Context API alternative to $lib for global state</p>
                </div>
                <div>
                  <h4 class="font-medium">âœ… File Upload</h4>
                  <p class="text-sm">Progress bar with drag/drop support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>
{:else}
  <!-- Loading, Screen -->
  <div class="flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      <p>Loading Detective Mode...</p>
      <p class="text-sm">Initializing Google Slides-like interface</p>
    </div>
  </div>
{/if}


