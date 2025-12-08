# Phase 72–78: XState Machine Integration Guide

## 🎯 Overview

Your `routeErrorAssistantMachine` now has real backend support. This guide shows how to wire it up.

---

## 📋 Machine States & Transitions

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  IDLE                                                 │
│  ├─ EVENT: ANALYZE_ROUTE                             │
│  └─ ACTION: setRoute() + send(GET_SUGGESTION)        │
│                                                       │
│  ANALYZING                                            │
│  ├─ EVENT: GET_SUGGESTION                            │
│  └─ ACTION: fetchSuggestion() via /api/phase78       │
│                                                       │
│  SUGGESTING                                           │
│  ├─ on success → SHOW_MODAL                          │
│  ├─ on error → IDLE (with error message)             │
│  └─ EVENT: APPLY_PATCH or DISMISS                    │
│                                                       │
│  SHOWING_MODAL (bits-ui Dialog visible)              │
│  ├─ USER_APPLY → send(APPLY_PATCH)                   │
│  ├─ USER_DISMISS → send(DISMISS) → IDLE              │
│  └─ USER_COPY → copyToClipboard()                    │
│                                                       │
│  APPLYING_PATCH                                       │
│  ├─ ACTION: applyPatch() via /api/phase78/apply      │
│  ├─ on success → VERIFY                              │
│  ├─ on error → SUGGESTING (show error)               │
│  └─ EVENT: RUN_FIXER                                 │
│                                                       │
│  VERIFYING                                            │
│  ├─ ACTION: runFixerAndCheck()                        │
│  ├─ on success → DONE                                │
│  ├─ on error → SUGGESTING (for retry)                │
│  └─ (auto-transition after 2s)                       │
│                                                       │
│  DONE                                                 │
│  ├─ Show success message                             │
│  └─ EVENT: RESET → IDLE                              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Template

### 1. Update Machine Definition

```typescript
// src/routes/(app)/all-routes/routeErrorAssistantMachine.ts

import { createMachine, assign } from 'xstate';
import type {
  RouteMeta,
  RouteErrorCluster,
  PatchSuggestion,
  ErrorAssistantState
} from '$lib/phase78/route-types';

export const routeErrorAssistantMachine = createMachine(
  {
    id: 'routeErrorAssistant',
    initial: 'idle',
    context: {
      route: undefined as RouteMeta | undefined,
      cluster: undefined as RouteErrorCluster | undefined,
      suggestion: undefined as PatchSuggestion | undefined,
      error: undefined as string | undefined,
      retryCount: 0
    },
    states: {
      // ─────────────────────────────────────────────────
      // IDLE: Waiting for user to select a route
      // ─────────────────────────────────────────────────
      idle: {
        on: {
          ANALYZE_ROUTE: {
            target: 'analyzing',
            actions: 'setRoute'
          }
        }
      },

      // ─────────────────────────────────────────────────
      // ANALYZING: Extract route metadata
      // ─────────────────────────────────────────────────
      analyzing: {
        after: {
          0: {
            target: 'gettingSuggestion'
          }
        }
      },

      // ─────────────────────────────────────────────────
      // GETTING_SUGGESTION: Call /api/phase78/route-patch
      // ─────────────────────────────────────────────────
      gettingSuggestion: {
        invoke: {
          id: 'fetchSuggestion',
          src: 'fetchSuggestion',
          onDone: {
            target: 'showingModal',
            actions: 'setSuggestion'
          },
          onError: {
            target: 'idle',
            actions: 'setError'
          }
        }
      },

      // ─────────────────────────────────────────────────
      // SHOWING_MODAL: Display bits-ui Dialog
      // ─────────────────────────────────────────────────
      showingModal: {
        on: {
          APPLY_PATCH: {
            target: 'applyingPatch'
          },
          DISMISS: {
            target: 'idle',
            actions: 'clearSuggestion'
          }
        }
      },

      // ─────────────────────────────────────────────────
      // APPLYING_PATCH: Call /api/phase78/apply-patch
      // ─────────────────────────────────────────────────
      applyingPatch: {
        invoke: {
          id: 'applyPatch',
          src: 'applyPatch',
          onDone: {
            target: 'verifying',
            actions: assign({ retryCount: 0 })
          },
          onError: {
            target: 'showingModal',
            actions: 'setError'
          }
        }
      },

      // ─────────────────────────────────────────────────
      // VERIFYING: Run fixer and svelte-check
      // ─────────────────────────────────────────────────
      verifying: {
        invoke: {
          id: 'verify',
          src: 'verify',
          onDone: {
            target: 'done'
          },
          onError: {
            target: 'showingModal',
            actions: assign({ retryCount: (ctx) => ctx.retryCount + 1 })
          }
        }
      },

      // ─────────────────────────────────────────────────
      // DONE: Success!
      // ─────────────────────────────────────────────────
      done: {
        after: {
          2000: {
            target: 'idle',
            actions: 'clearState'
          }
        },
        on: {
          RESET: {
            target: 'idle',
            actions: 'clearState'
          }
        }
      }
    }
  },

  {
    // ─────────────────────────────────────────────────
    // ACTIONS
    // ─────────────────────────────────────────────────
    actions: {
      setRoute: assign({
        route: (_, event: any) => event.route,
        cluster: (_, event: any) => event.cluster,
        error: undefined,
        retryCount: 0
      }),

      setSuggestion: assign({
        suggestion: (_, event: any) => event.data
      }),

      setError: assign({
        error: (_, event: any) => event.data?.message || 'Unknown error'
      }),

      clearSuggestion: assign({
        suggestion: undefined,
        error: undefined
      }),

      clearState: assign({
        route: undefined,
        cluster: undefined,
        suggestion: undefined,
        error: undefined,
        retryCount: 0
      })
    },

    // ─────────────────────────────────────────────────
    // SERVICES (API calls)
    // ─────────────────────────────────────────────────
    services: {
      fetchSuggestion: async (context) => {
        if (!context.route) throw new Error('No route selected');

        const response = await fetch('/api/phase78/route-patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route: context.route,
            cluster: context.cluster
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        return response.json() as Promise<PatchSuggestion>;
      },

      applyPatch: async (context) => {
        if (!context.route || !context.suggestion) {
          throw new Error('Route or suggestion missing');
        }

        const response = await fetch('/api/phase78/apply-patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route: context.route,
            patch: context.suggestion.patch
          })
        });

        if (!response.ok) {
          throw new Error(`Apply error: ${response.statusText}`);
        }

        return response.json();
      },

      verify: async () => {
        // This would ideally run npm run fix:routes in the terminal
        // For now, we'll just simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // TODO: In production, integrate with:
        // 1. Run fix-sveltekit-routes.mts via CLI
        // 2. Run svelte-check
        // 3. Stream output to frontend
        // 4. Report success/failure

        return { success: true };
      }
    }
  }
);
```

### 2. Update Component

```svelte
<!-- src/routes/(app)/all-routes/+page.svelte -->

<script lang="ts">
  import { useMachine } from 'xstate-svelte';
  import { routeErrorAssistantMachine } from './routeErrorAssistantMachine';
  import ErrorBrainModal from '$lib/components/phase78/ErrorBrainModal.svelte';
  import type { RouteMeta, RouteErrorCluster } from '$lib/phase78/route-types';

  const { state, send } = useMachine(routeErrorAssistantMachine);

  let selectedRoute: RouteMeta | undefined;

  function onRouteClick(route: RouteMeta, cluster?: RouteErrorCluster) {
    selectedRoute = route;
    send({
      type: 'ANALYZE_ROUTE',
      route,
      cluster
    });
  }

  function onApplyPatch() {
    send({ type: 'APPLY_PATCH' });
  }

  function onDismiss() {
    send({ type: 'DISMISS' });
  }

  function onReset() {
    send({ type: 'RESET' });
  }
</script>

<!-- Route list with click handlers -->
{#each routes as route (route.id)}
  <button
    class="route-item"
    on:click={() => onRouteClick(route, getErrorCluster(route))}
  >
    <span class="route-path">{route.path}</span>
    {#if getHealthStatus(route) === 'error'}
      <button
        class="brain-button"
        aria-label="Ask Error Brain for help"
        on:click|stopPropagation={() => onRouteClick(route, getErrorCluster(route))}
      >
        🧠
      </button>
    {/if}
  </button>
{/each}

<!-- Modal: shown when in showingModal state -->
{#if $state.matches('showingModal') && $state.context.suggestion}
  <ErrorBrainModal
    suggestion={$state.context.suggestion}
    isLoading={$state.matches('applyingPatch')}
    isVerifying={$state.matches('verifying')}
    error={$state.context.error}
    retryCount={$state.context.retryCount}
    onApply={onApplyPatch}
    onDismiss={onDismiss}
  />
{/if}

<!-- Status message: shown when done -->
{#if $state.matches('done')}
  <div class="success-message">
    ✅ Patch applied successfully! Routes verified.
    <button on:click={onReset}>Dismiss</button>
  </div>
{/if}

<!-- Error message -->
{#if $state.context.error && !$state.matches('showingModal')}
  <div class="error-message">
    ❌ {$state.context.error}
  </div>
{/if}
```

### 3. ErrorBrainModal Component

```svelte
<!-- src/lib/components/phase78/ErrorBrainModal.svelte -->

<script lang="ts">
  import * as Dialog from 'bits-ui/dialog';
  import type { PatchSuggestion } from '$lib/phase78/route-types';

  export let suggestion: PatchSuggestion;
  export let isLoading = false;
  export let isVerifying = false;
  export let error: string | undefined = undefined;
  export let retryCount = 0;
  export let onApply: () => void;
  export let onDismiss: () => void;

  let copied = false;

  function copyToClipboard() {
    navigator.clipboard.writeText(suggestion.patch);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<Dialog.Root open={true}>
  <Dialog.Content class="error-brain-modal">
    <Dialog.Header>
      <Dialog.Title>
        🧠 Error Brain Assistant
      </Dialog.Title>
      <Dialog.Close on:click={onDismiss} />
    </Dialog.Header>

    <div class="modal-body">
      <!-- Title -->
      <div class="suggestion-title">
        {suggestion.title}
      </div>

      <!-- Severity badge -->
      <div class="severity {suggestion.severity}">
        {#if suggestion.severity === 'error'}
          🔴 Error
        {:else if suggestion.severity === 'warning'}
          🟡 Warning
        {:else}
          ℹ️ Info
        {/if}
      </div>

      <!-- Explanation -->
      <div class="explanation">
        {suggestion.explanation}
      </div>

      <!-- Patch content -->
      <div class="patch-section">
        <div class="patch-header">
          <span>Suggested Fix</span>
          <button
            class="copy-btn"
            on:click={copyToClipboard}
            disabled={isLoading || isVerifying}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <pre class="patch-content">{suggestion.patch}</pre>
      </div>

      <!-- Confidence -->
      <div class="confidence-meter">
        <span class="label">Confidence:</span>
        <div class="meter">
          <div
            class="bar"
            style="width: {suggestion.confidence * 100}%"
          />
        </div>
        <span class="value">{(suggestion.confidence * 100).toFixed(0)}%</span>
      </div>

      <!-- Hints -->
      {#if suggestion.hints?.length}
        <div class="hints">
          <h4>💡 Tips:</h4>
          <ul>
            {#each suggestion.hints as hint}
              <li>{hint}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Error message -->
      {#if error}
        <div class="error-message">
          ❌ {error}
          {#if retryCount > 0}
            <span class="retry-count">(Retry {retryCount})</span>
          {/if}
        </div>
      {/if}

      <!-- Status -->
      {#if isLoading}
        <div class="status loading">
          ⏳ Applying patch...
        </div>
      {:else if isVerifying}
        <div class="status verifying">
          🔍 Verifying with svelte-check...
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <button
        class="btn btn-secondary"
        on:click={onDismiss}
        disabled={isLoading || isVerifying}
      >
        Dismiss
      </button>
      <button
        class="btn btn-primary"
        on:click={onApply}
        disabled={isLoading || isVerifying}
      >
        {#if isLoading}
          ⏳ Applying...
        {:else if isVerifying}
          🔍 Verifying...
        {:else}
          ✅ Apply Patch
        {/if}
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .error-brain-modal {
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .suggestion-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .severity {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-block;
    width: fit-content;
  }

  .severity.error {
    background-color: #fee;
    color: #c33;
  }

  .severity.warning {
    background-color: #ffc;
    color: #880;
  }

  .severity.info {
    background-color: #eef;
    color: #338;
  }

  .explanation {
    line-height: 1.6;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .patch-section {
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
  }

  .patch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    font-weight: 500;
  }

  .copy-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    border: 1px solid var(--border-color);
    border-radius: 3px;
    background: white;
    cursor: pointer;
  }

  .copy-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .patch-content {
    padding: 0.75rem;
    background-color: var(--bg-code);
    color: var(--text-code);
    font-size: 0.85rem;
    overflow-x: auto;
    margin: 0;
  }

  .confidence-meter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .meter {
    flex: 1;
    height: 6px;
    background-color: var(--bg-secondary);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #45a049);
  }

  .hints {
    background-color: var(--bg-secondary);
    padding: 0.75rem;
    border-radius: 4px;
  }

  .hints h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
  }

  .hints ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .hints li {
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .error-message {
    background-color: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .retry-count {
    opacity: 0.7;
    font-size: 0.85rem;
  }

  .status {
    padding: 0.75rem;
    border-radius: 4px;
    text-align: center;
    font-weight: 500;
  }

  .status.loading {
    background-color: #e8f5e9;
    color: #2e7d32;
  }

  .status.verifying {
    background-color: #fff3e0;
    color: #e65100;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #4caf50;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #45a049;
  }

  .btn-secondary {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
  }
</style>
```

---

## 🔌 Data Flow Example

### User clicks 🧠 button on broken route

```
Frontend component:
  onRouteClick(route: RouteMeta)
    ↓
  send({type: 'ANALYZE_ROUTE', route, cluster})
    ↓
  Machine transitions: idle → analyzing → gettingSuggestion
    ↓
  fetchSuggestion service invoked:
    POST /api/phase78/route-patch
    body: {route, cluster}
    ↓
  Backend /api/phase78/route-patch:
    ├─ Check route_error_patches for cached suggestion
    ├─ If not cached: generatePatchSuggestion()
    ├─ Insert into route_error_patches
    └─ Return PatchSuggestion
    ↓
  Machine receives response:
    ├─ Set context.suggestion
    └─ Transition: gettingSuggestion → showingModal
    ↓
  Component renders:
    ErrorBrainModal(suggestion, onApply, onDismiss)
    ↓
  User clicks "Apply Patch":
    ├─ send({type: 'APPLY_PATCH'})
    ├─ Transition: showingModal → applyingPatch
    ├─ applyPatch service invoked:
    │  POST /api/phase78/apply-patch
    │  body: {route, patch}
    ├─ Backend marks patch as applied in DB
    └─ Transition: applyingPatch → verifying
    ↓
  Verify service:
    ├─ TODO: Run npm run fix:routes
    ├─ TODO: Run svelte-check
    └─ On success: verifying → done
    ↓
  Component shows success message
  Auto-transitions to idle after 2s
```

---

## 🧪 Testing

### Test in Chrome DevTools

```javascript
// In console, after machine is initialized:

// Simulate route click
send({
  type: 'ANALYZE_ROUTE',
  route: {
    id: 'route:app:evidence:page',
    path: '/evidence',
    file: 'src/routes/(app)/evidence/+page.svelte',
    kind: 'page',
    group: '(app)'
  },
  cluster: {
    routeId: 'route:app:evidence:page',
    errorCode: 'SVELTE_ROUTE_CONFLICT',
    message: 'Conflict with (yorha)',
    tool: 'svelte-check',
    lastSeen: new Date().toISOString()
  }
});

// Watch state transitions
machine.onTransition((state) => {
  console.log('State:', state.value);
  console.log('Context:', state.context);
});
```

---

## ✅ Checklist

- [ ] Create `routeErrorAssistantMachine.ts` with state definitions
- [ ] Implement `fetchSuggestion` service (calls /api/phase78/route-patch)
- [ ] Implement `applyPatch` service (calls /api/phase78/apply-patch)
- [ ] Implement `verify` service (runs npm run fix:routes, svelte-check)
- [ ] Create `ErrorBrainModal.svelte` component
- [ ] Wire modal into `/all-routes/+page.svelte`
- [ ] Test state transitions
- [ ] Test API calls
- [ ] Test database logging
- [ ] Test bits-ui Dialog appearance

---

**Ready to build the Error Brain! 🧠✨**
