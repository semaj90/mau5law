<!--
Custody Timeline Component
Displays the chronological chain of custody events with detailed audit trail
-->
<script lang="ts">
  interface Props {
    events: any[];
    signature?: string;
    currentStage?: string;
  }

  // read props (Svelte 5 runtime helper)
  let { events = [], signature, currentStage } = $props<Props>();

  // use simple emoji/icon fallbacks to avoid external icon import issues
  function getEventIcon(eventType: string) {
    switch (eventType) {
      case 'intake':
        return '🛡️';
      case 'transfer':
        return '🔁';
      case 'verification':
        return '🔍';
      case 'analysis':
        return '🧠';
      case 'approval':
        return '✅';
      case 'finalization':
        return '🏁';
      default: return '⏱️';
    }
  }

  function getEventColor(eventType: string) {
    switch (eventType) {
      case 'intake':
        return 'bg-blue-100 text-blue-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      case 'verification':
        return 'bg-green-100 text-green-800';
      case 'analysis':
        return 'bg-indigo-100 text-indigo-800';
      case 'approval':
        return 'bg-emerald-100 text-emerald-800';
      case 'finalization':
        return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatEventTitle(eventType: string) {
    // support snake_case, kebab-case and space separated
    return eventType
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function formatTimestamp(timestamp?: string | number | Date) {
    if (!timestamp) return '-';
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString();
  }

  function getEventDetails(evt: any) {
    const details = evt?.details ?? {};
    switch (evt?.eventType) {
      case 'intake':
        return {
          primary: `Evidence taken into custody`,
          secondary: `Hash verified: ${details.hashMatch ? 'Yes' : 'No'}`,
          extra: details.originalHash ? `Hash: ${String(details.originalHash).substring(0, 8)}...` : ''
        };
      case 'transfer':
        return {
          primary: `Custody transferred`,
          secondary: `from ${details.fromCustodian ?? 'Unknown'} → To: ${details.toCustodian ?? 'Unknown'}`,
          extra: details.transferReason ? `Reason: ${details.transferReason}` : ''
        };
      case 'verification':
        return {
          primary: `Integrity verification completed`,
          secondary: `Status: ${details.integrityStatus ?? 'Unknown'}`,
          extra: details.verificationResults?.aiAnalysisScore
            ? `AI Score: ${(details.verificationResults.aiAnalysisScore * 100).toFixed(0)}%`
            : ''
        };
      case 'analysis':
        return {
          primary: `AI analysis completed`,
          secondary: `Risk Level: ${details.aiAnalysis?.riskLevel ?? 'Unknown'}`,
          extra: details.models ? `Models: ${details.models.join(', ')}` : ''
        };
      case 'approval':
        return {
          primary: `Custody approved`,
          secondary: `Approval status: ${details.approvalStatus ?? 'Unknown'}`,
          extra: details.finalIntegrityStatus ? `Final status: ${details.finalIntegrityStatus}` : ''
        };
      case 'finalization':
        return {
          primary: `Custody workflow finalized`,
          secondary: `Total events: ${details.custodyReport?.totalEvents ?? 0}`,
          extra: details.custodyReport?.totalProcessingTime
            ? `Duration ${Math.round(details.custodyReport.totalProcessingTime / 1000)}s`
            : ''
        };
      default: return {
          primary: formatEventTitle(evt?.eventType ?? 'event'),
          secondary: 'Event processed',
          extra: ''
        };
    }
  }
</script>

<div class="custody-timeline space-y-4">
  {#if events.length === 0}
    <div class="text-center py-8 text-gray-500">
      <div class="w-12 h-12 mx-auto mb-4 opacity-50 text-4xl">⏱️</div>
      <p>No custody events recorded yet</p>
    </div>
  {:else}
    <div class="relative">
      <!-- Timeline line -->
      <div class="absolute left-6 top-0 bottom-0 w-px bg-gray-200"></div>

      {#each events as event, index}
        {@const details = getEventDetails(event)}
        {@const isLast = index === events.length - 1}

        <div class="relative flex items-start space-x-4 pb-6">
          <!-- Timeline dot -->
          <div
            class={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-lg ${getEventColor(event.eventType)}`}
          >
            <span class="text-xl">{getEventIcon(event.eventType)}</span>
          </div>

          <!-- Event content -->
          <div class="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <h4 class="font-semibold text-gray-900 mb-1">
                  {details.primary}
                </h4>
                <p class="text-sm text-gray-600 mb-2">
                  {details.secondary}
                </p>
                {#if details.extra}
                  <p class="text-xs text-gray-500">
                    {details.extra}
                  </p>
                {/if}
              </div>

              <!-- Event badge -->
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                {formatEventTitle(event.eventType)}
              </span>
            </div>

            <!-- Event metadata -->
            <div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>User: {event.userId ?? 'system'}</span>
              <span>{formatTimestamp(event.timestamp)}</span>
            </div>

            <!-- Digital signature indicator -->
            {#if event.signature}
              <div class="mt-2 pt-2 border-t border-gray-100">
                <div class="flex items-center text-xs text-green-600">
                  <span class="mr-1">🔒</span>
                  Digitally signed: {String(event.signature).substring(0, 16)}...
                </div>
              </div>
            {/if}

            <!-- Detailed information (expandable) -->
            {#if event.details && Object.keys(event.details).length > 0}
              <details class="mt-2 pt-2 border-t border-gray-100">
                <summary class="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                  View detailed information
                </summary>
                <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <pre class="whitespace-pre-wrap text-gray-700 font-mono text-xs overflow-auto max-h-32">
{JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
              </details>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Current stage indicator (if workflow is active) -->
      {#if currentStage && !['completed', 'failed', 'cancelled'].includes(currentStage)}
        <div class="relative flex items-start space-x-4">
          <!-- Active stage dot -->
          <div class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-lg bg-blue-100 text-blue-800 animate-pulse">
            <div class="text-xl">⏱️</div>
          </div>

          <!-- Active stage content -->
          <div class="flex-1 min-w-0 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-blue-900">Currently: {formatEventTitle(currentStage)}</h4>
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">In Progress</span>
            </div>
            <p class="text-sm text-blue-700">This stage is currently being processed...</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .custody-timeline {
    max-height: 600px;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  .custody-timeline::-webkit-scrollbar {
    width: 6px;
  }
  .custody-timeline::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .custody-timeline::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .custody-timeline::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>
