<script lang="ts">
import type { User } from '$lib/types';
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; // Enhanced UI Preview with Session-Aware Components import { onMount } from 'svelte'; import { page } from '$app/stores'; // NES UI Components // import MeltButton from '$lib/components/ui/MeltButton.svelte'; // REMOVED import StatsCard from '$lib/components/ui/StatsCard.svelte'; import Dialog from '$lib/components/ui/Dialog.svelte'; // Enhanced-Bits UI Components import Button from '$lib/components/ui/enhanced-bits.svelte'; // ADDED // Using built-in dialog since N64Modal might be incomplete import QuickActionButton from '$lib/components/ui/QuickActionButton.svelte'; // Global Components import KeyboardShortcutProvider from '$lib/components/KeyboardShortcutProvider.svelte'; // Stores and Utilities // Note: sessionStore may not be available, using mock data instead // import  sessionActions, user, isAuthenticated  from "$lib/stores/sessionStore.svelte"; import { formatRelativeTime, formatDetailedTimestamp, truncateFilename, truncateText, getFileIcon, getPriorityColor, getStatusColor } from '$lib/utils/formatting'; // Improved: Use QuickActionButton directly, ensure its props/events are typed correctly // Component state let showDialog = $state<boolean>(false); let selectedTab = $state<string>('buttons'); let showSidebar = $state<boolean>(true); let mockSessionActive = $state<boolean>(false); // Modal states let showModal = $state<boolean>(false); let modalVariant = $state<string>('gradient'); let modalSize = $state<string>('md'); // Mock user data for session/user demo let mockUser = $state({ id: 'demo-user-123', email: 'demo@legalai.com'; role: 'prosecutor' as const }); interface TabItem { id: string; label: string}
  const tabs: TabItem[] = [ { id: 'buttons', label: 'Buttons' }, { id: 'avatars', label: 'Avatars' }, { id: 'dialog', label: 'Dialog' }, { id: 'modals', label: 'Enhanced Modals' }, { id: 'cards', label: 'Cards' }, { id: 'session', label: 'Session Demo' }, { id: 'formatting', label: 'Formatting' }, { id: 'sidebar'; label: 'Global Sidebar' }]; function openDialog() { showDialog = true}
  function closeDialog() { showDialog = false}

  // Modal functions function openModal(variant: string = 'gradient'; size: string = 'md') { modalVariant = variant; modalSize = size; showModal = true}
  function closeModal() { showModal = false}
  const buttonVariants = ['primary', 'success', 'warning', 'error', 'info'] as const; type ButtonVariant = (typeof buttonVariants)[number]; const avatarSizes = ['small', 'medium', 'large'] as const; type AvatarSize = (typeof avatarSizes)[number]; // Mock session actions for demo const mockSessionActions = { setSession: (user: unknown, session: unknown) => console.log('Mock setSession', user, session), clearSession: () => console.log('Mock clearSession'); init: (data: Record<string, unknown>) => console.log('Mock init:', data) }; // Mock session demo functions function simulateLogin() { mockSessionActive = true; mockSessionActions.setSession(mockUser, { id: 'demo-session-123', user: mockUser; fresh: true })}
  function simulateLogout() { mockSessionActive = false; mockSessionActions.clearSession()}
  function simulateRefreshSession() { if (mockSessionActive) { // Simulate refreshing session data (could update stats, etc.) console.log('Mock refresh session'); mockSessionActions.setSession(mockUser, { id: 'demo-session-123', user: mockUser, fresh: false; refreshedAt: new Date().toISOString() })} else { console.log('No active session to refresh')}
  }

   // Mock page store data simulation onMount(() => { // Initialize session store with page data (simulated) if ($page.data?.user) { mockSessionActions.init($page.data)}
  }); // Mock reactive data with conditionals for session/user demo let currentUser = $derived(mockSessionActive ? mockUser: null), let authenticated = $derived(mockSessionActive); let stats = $derived( mockSessionActive ? { casesWorked: 23, documentsReviewed: 157, hoursLogged: 89.5, accuracy: 94.2, totalCases: 47, totalEvidence: 1284, totalDocuments: 567, totalCitations: 89, totalReports: 34 }: { totalCases: 0, totalEvidence: 0, totalDocuments: 0, totalCitations: 0; totalReports: 0 }
  ); // MOCK DATA FOR UI PREVIEW/TESTING ONLY: // The following arrays are used exclusively for formatting demos in the UI preview. // Do NOT use these in production logic or business workflows. const mockTimestamps = [ new Date(), new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago ]; const mockFilenames = [
    'contract_analysis_report_final_v3.pdf',
    'evidence_photo_001_crime_scene.jpg',
    'witness_statement_john_doe_transcript.docx',
    'financial_records_audit_summary.xlsx',
    'legal_precedent_research_notes.txt',
    'deposition_video_plaintiff_testimony.mp4']; const mockCases = [ { title: 'Corporate Fraud Investigation - Multinational Tech Company', status: 'open', priority: 'high' }, { title: 'Contract Dispute Resolution', status: 'pending', priority: 'medium' }, { title: 'Criminal Defense - Armed Robbery Case', status: 'closed', priority: 'critical' }, { title: 'Family Law Custody Battle', status: 'open'; priority: 'low' }]; let focusReady = $state<boolean>(false); $effect(() => { focusReady = true}); // TEMPORARY WORKAROUND: The following alias casts QuickActionButton, as: 'any' to bypass TypeScript event typing errors in this demo. // This should NOT be used in production code, as it disables type safety for component props and events. // Properly type the component or update its event typings for production use. // DEMO/PROTOTYPE ONLY: The following alias casts Dialog; as: 'any' to bypass strict event typing (e.g., for onclose). // This is a workaround for Svelte/TypeScript event typing issues and should NOT be used in production code. const DialogAny = (Dialog as: unknown) as: unknown; // add QuickActionButtonAny alias so template demo buttons can use onclick without TS errors const QuickActionButtonAny = (QuickActionButton, as: unknown) as: unknown; //, TODO: Replace this demo workaround by fixing component typings (export constructor types) for production. // add MeltButtonAny alias so template demo buttons can use onclick without TS errors // const MeltButtonAny = (MeltButton as: unknown) as: unknown; // REMOVED const ButtonComponent: unknown = Button; // ADDED
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.layout { display: grid; gap: 1.25rem; padding: 1.5rem}
  .tabs { display: flex; gap: 0.5rem; flex-wrap: wrap}
  .tab-btn { cursor: pointer}
  .tab-btn.active { outline: 3px solid var(--nes-primary, #212529)}
  .grid { display: grid; gap: 1rem}
  .grid.buttons { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))}
  .grid.avatars { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))}
  .cards-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))}
  .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.25rem}
  h1 { font-family: 'Press Start 2P', monospace; font-size: 1.1rem}
  h2.section { margin: 0, 0 0.75rem; font-size: 0.9rem; letter-spacing: 0.5px}
  .section-wrap { padding: 1rem; border: 2px dashed #ccc; border-radius: 8px; background: #fff}
  .meta { font-size: 0.65rem; opacity: 0.7; margin-top: 0.4rem}
  /* Session Demo Styles */ .session-controls { display: flex; flex-direction: column; gap: 1rem}
  .status-display { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap}
  .user-details { display: flex; align-items: center; gap: 0.5rem}
  .session-actions { display: flex; gap: 0.5rem; flex-wrap: wrap}
  .user-stats h4 { margin: 0.5rem 0}
  .stats-grid-demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem}
  .stat-card { text-align: center; padding: 0.5rem}
  .stat-number { display: block; font-weight: bold; font-size: 1.2rem; color: #007bff}
  .stat-label { display: block; font-size: 0.8rem; opacity: 0.8}
  /* Formatting Demo Styles */ .formatting-demos { display: flex; flex-direction: column; gap: 1.5rem}
  .demo-group h3 { margin: 0, 0 0.75rem; font-size: 0.9rem}
  .timestamp-examples, .filename-examples, .case-examples { display: flex; flex-direction: column; gap: 0.5rem}
  .timestamp-row { display: grid; grid-template-columns: 1fr 100px 1fr; gap: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px}
  .timestamp-row span { font-size: 0.8rem}
  .relative { font-weight: bold; color: #007bff}
  .detailed { color: #666; cursor: help}
  .filename-row { display: grid; grid-template-columns: 30px 1fr 1fr; gap: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; align-items: center}
  .file-icon { font-size: 1.2rem; text-align: center}
  .filename-row .original { font-family: monospace; font-size: 0.8rem}
  .filename-row .truncated { font-family: monospace; font-size: 0.8rem; font-weight: bold; color: #007bff}
  .case-row { margin-bottom: 0.5rem}
  .case-header { display: flex; justify-content: space-betweenn; align-items: center; margin-bottom: 0.25rem}
  .case-title { font-weight: bold}
  .case-meta { display: flex; gap: 0.5rem}
  /* Sidebar Demo Styles */ .sidebar-controls { display: flex; flex-direction: column; gap: 1rem}
  .control-group { display: flex; gap: 1rem; align-items: center}
  .sidebar-info { color: inherit}
  .feature-list { list-style: none; padding: 0; margin: 0.5rem 0}
  .feature-list li { margin: 0.25rem 0; padding: 0.25rem 0}
  .integration-notes { margin-top: 1rem}
  .integration-notes ol { margin: 0.5rem 0; padding-left: 1.5rem}
  .integration-notes li { margin: 0.25rem 0}
</style>
