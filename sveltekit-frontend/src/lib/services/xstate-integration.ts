import { createActor, type AnyActorRef, type Snapshot } from "xstate";
import { writable, type Writable } from "svelte/store";
import {
  legalAIMachine,
  type LegalAIEvent,
  type LegalAIContext,
} from "$lib/machines/legalAIMachine.v5";

// Create the actor for the legal AI machine
const legalAIActor = createActor(legalAIMachine);

// Create a Svelte store for the reactive state
const legalAIStateStore: Writable<Snapshot<LegalAIContext, LegalAIEvent>> = writable(
  legalAIActor.getSnapshot()
);

// Update the store when the actor's state changes
legalAIActor.subscribe((snapshot) => {
  legalAIStateStore.set(snapshot);
});

// Start the actor
legalAIActor.start();

// Centralized XState integration service
export const xstateIntegration = {
  /**
   * Returns a read-only snapshot of the current global state.
   */
  getGlobalState(): Snapshot<LegalAIContext, LegalAIEvent> {
    return legalAIActor.getSnapshot();
  },

  /**
   * Dispatches an event to the specified machine (currently only legalAIMachine).
   * @param machineId The ID of the machine to send the event to (e.g., 'legalAI').
   * @param event The event to send.
   */
  sendEvent(machineId: string, event: LegalAIEvent): void {
    // In a multi-machine setup, you would route events based on machineId.
    // For now, we assume it's always the legalAIMachine.
    if (machineId === legalAIMachine.id) {
      legalAIActor.send(event);
    } else {
      console.warn(`Event sent to unknown machine ID: ${machineId}`);
    }
  },

  /**
   * Subscribes a listener to state changes.
   * @param listener A function that will be called with the new snapshot whenever the state changes.
   * @returns An unsubscribe function.
   */
  subscribe(listener: (snapshot: Snapshot<LegalAIContext, LegalAIEvent>) => void): () => void {
    return legalAIActor.subscribe(listener).unsubscribe;
  },

  /**
   * The Svelte store for the legal AI machine's state.
   */
  legalAIState: legalAIStateStore,
};

// export default xstateIntegration; // Remove this redundant line
