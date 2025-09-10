<!--
  Headless Typing Listener Component
  
  Primitive component that tracks user typing behavior without rendering UI.
  Integrates with XState machine and multi-core workers for real-time processing.
  
  Usage:
  <HeadlessTypingListener 
    bind:text={userInput} 
    on:contextualPrompt={handlePrompt}
    on:analyticsUpdate={handleAnalytics}
  />
-->

<script lang="ts">
  import { createActor } from 'xstate';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { userTypingStateMachine, type TypingContext, type TypingState } from '$lib/machines/userTypingStateMachine.js';

  // Props
  interface Props {
    text?: string;
    element?: HTMLElement | HTMLInputElement | HTMLTextAreaElement;
    debounceMs?: number;
    enableAnalytics?: boolean;
    enableContextualPrompts?: boolean;
    mcpEndpoint?: string;
  }

  let {
    text = $bindable(''),
    element = $bindable(),
    debounceMs = 300,
    enableAnalytics = true,
    enableContextualPrompts = true,
    mcpEndpoint = 'http://localhost:3002'
  }: Props = $props();

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    stateChange: { state: TypingState; context: TypingContext };
    contextualPrompt: { prompts: string[]; context: TypingContext };
    analyticsUpdate: { analytics: TypingContext['analytics'] };
    userBehaviorUpdate: { behavior: TypingContext['userBehavior'] };
    mcpWorkerStatus: { status: 'idle' | 'processing' | 'ready' };
  }>();

  // XState actor
  const typingActor = createActor(userTypingStateMachine);

  // Reactive state
  let currentState = $state<TypingState>('idle');
  let currentContext = $state<TypingContext>();
  let isTyping = $state(false);
  let lastTypingTime = $state(0);
  let typingTimeout: number | null = $state(null);

  // Reactive derived values
  const userEngagement = $derived(currentContext?.analytics.userEngagement || 'medium');
  const typingSpeed = $derived(currentContext?.userBehavior.avgTypingSpeed || 0);
  const contextualHints = $derived(currentContext?.userBehavior.contextualHints || []);
  const mcpWorkerStatus = $derived(currentContext?.mcpWorkerStatus || 'idle');

  /**
   * Initialize the typing listener
   */
  onMount(() => {
    // Start the XState machine
    typingActor.start();

    // Subscribe to state changes
    typingActor.subscribe((state) => {
      currentState = state.value as TypingState;
      currentContext = state.context;

      // Dispatch state change event
      dispatch('stateChange', {
        state: currentState,
        context: currentContext
      });

      // Dispatch specific events based on state
      handleStateChange(currentState, currentContext);
    });

    // Set up keyboard event listeners
    setupEventListeners();

    // Set up visibility and focus tracking
    setupVisibilityTracking();

    console.log('[HeadlessTypingListener] Initialized');
  });

  /**
   * Cleanup on destroy
   */
  onDestroy(() => {
    if (typingActor) {
      typingActor.stop();
    }
    cleanup();
    console.log('[HeadlessTypingListener] Destroyed');
  });

  /**
   * Set up keyboard and input event listeners
   */
  function setupEventListeners() {
    // Listen to the bound element or document
    const target = element || document;

    // Input/change events
    target.addEventListener('input', handleInput);
    target.addEventListener('keydown', handleKeyDown);
    target.addEventListener('keyup', handleKeyUp);
    target.addEventListener('paste', handlePaste);

    // Focus events
    if (element) {
      element.addEventListener('focus', handleFocus);
      element.addEventListener('blur', handleBlur);
    }
  }

  /**
   * Set up visibility and user presence tracking
   */
  function setupVisibilityTracking() {
    // Page visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mouse movement for user presence
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
  }

  /**
   * Handle input events
   */
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newText = target.value || text;
    
    // Update bound text
    text = newText;
    
    // Send typing event to machine
    typingActor.send({
      type: 'USER_STARTED_TYPING',
      text: newText,
      timestamp: Date.now()
    });

    isTyping = true;
    lastTypingTime = Date.now();

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set timeout for stopped typing
    typingTimeout = setTimeout(() => {
      handleStoppedTyping(newText);
    }, debounceMs);
  }

  /**
   * Handle key down events
   */
  function handleKeyDown(event: KeyboardEvent) {
    // Track special keys
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      // Ctrl+Enter or Cmd+Enter - submission
      typingActor.send({
        type: 'USER_SUBMITTED',
        text: text,
        timestamp: Date.now()
      });
    } else if (event.key === 'Escape') {
      // Escape - clear
      typingActor.send({
        type: 'USER_CLEARED',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle key up events
   */
  function handleKeyUp(event: KeyboardEvent) {
    // Update last activity time
    lastTypingTime = Date.now();
  }

  /**
   * Handle paste events
   */
  function handlePaste(event: ClipboardEvent) {
    // Track paste as a special typing event
    setTimeout(() => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      const newText = target.value || text;
      
      typingActor.send({
        type: 'USER_STARTED_TYPING',
        text: newText,
        timestamp: Date.now()
      });
    }, 0);
  }

  /**
   * Handle focus events
   */
  function handleFocus() {
    typingActor.send({
      type: 'USER_RETURNED',
      timestamp: Date.now()
    });
  }

  /**
   * Handle blur events
   */
  function handleBlur() {
    if (isTyping) {
      handleStoppedTyping(text);
    }
  }

  /**
   * Handle stopped typing
   */
  function handleStoppedTyping(currentText: string) {
    isTyping = false;
    typingTimeout = null;

    typingActor.send({
      type: 'USER_STOPPED_TYPING',
      text: currentText,
      timestamp: Date.now()
    });

    // Check if we should trigger contextual processing
    if (currentText.length > 50 && enableContextualPrompts) {
      setTimeout(() => {
        typingActor.send({
          type: 'PROCESS_CONTEXT',
          text: currentText
        });
      }, 1000);
    }
  }

  /**
   * Handle visibility changes
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      typingActor.send({
        type: 'USER_INACTIVE',
        timestamp: Date.now()
      });
    } else {
      typingActor.send({
        type: 'USER_RETURNED',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle user activity (mouse, clicks, scrolling)
   */
  function handleUserActivity() {
    if (currentState === 'user_inactive') {
      typingActor.send({
        type: 'USER_RETURNED',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle state changes from the XState machine
   */
  function handleStateChange(state: TypingState, context: TypingContext) {
    // Dispatch contextual prompts
    if (state === 'waiting_user' && context.contextualPrompts.length > 0 && enableContextualPrompts) {
      dispatch('contextualPrompt', {
        prompts: context.contextualPrompts,
        context
      });
    }

    // Dispatch analytics updates
    if (enableAnalytics && context.analytics) {
      dispatch('analyticsUpdate', {
        analytics: context.analytics
      });
    }

    // Dispatch user behavior updates
    if (context.userBehavior) {
      dispatch('userBehaviorUpdate', {
        behavior: context.userBehavior
      });
    }

    // Dispatch MCP worker status
    if (context.mcpWorkerStatus) {
      dispatch('mcpWorkerStatus', {
        status: context.mcpWorkerStatus
      });
    }
  }

  /**
   * Cleanup function
   */
  function cleanup() {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Remove event listeners
    const target = element || document;
    target.removeEventListener('input', handleInput);
    target.removeEventListener('keydown', handleKeyDown);
    target.removeEventListener('keyup', handleKeyUp);
    target.removeEventListener('paste', handlePaste);

    if (element) {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('mousemove', handleUserActivity);
    document.removeEventListener('click', handleUserActivity);
    document.removeEventListener('scroll', handleUserActivity);
  }

  /**
   * Public API - Send custom events to the machine
   */
  export function sendEvent(event: any) {
    typingActor.send(event);
  }

  /**
   * Public API - Get current analytics
   */
  export function getAnalytics() {
    return currentContext?.analytics;
  }

  /**
   * Public API - Get user behavior data
   */
  export function getUserBehavior() {
    return currentContext?.userBehavior;
  }

  /**
   * Public API - Force contextual processing
   */
  export function triggerContextualProcessing() {
    typingActor.send({
      type: 'PROCESS_CONTEXT',
      text: text
    });
  }
</script>

<!-- 
  This component is headless - it renders nothing but provides all the typing behavior tracking
  Use the exported functions and event handlers to integrate with your UI
-->

{#if import.meta.env.DEV}
  <!-- Debug info only in development -->
  <div class="debug-panel" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.75rem; z-index: 9999;">
    <div><strong>Typing State:</strong> {currentState}</div>
    <div><strong>User Engagement:</strong> {userEngagement}</div>
    <div><strong>Typing Speed:</strong> {Math.round(typingSpeed)} CPM</div>
    <div><strong>MCP Worker:</strong> {mcpWorkerStatus}</div>
    <div><strong>Text Length:</strong> {text.length}</div>
    <div><strong>Hints:</strong> {contextualHints.length}</div>
    {#if contextualHints.length > 0}
      <div style="margin-top: 0.5rem; font-size: 0.7rem;">
        {#each contextualHints.slice(0, 2) as hint}
          <div>• {hint}</div>
        {/each}
      </div>
    {/if}
  </div>
{/if}