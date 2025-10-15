// Compatibility helpers for XState v4/v5 actor APIs
// Provides safe wrappers around actor.start/stop and a readActorSnapshot utility
export function readActorSnapshot(actor: any): any {
  try {
    if (!actor) return undefined;
    if (typeof actor.getSnapshot === 'function') return actor.getSnapshot();
    if (typeof actor.getState === 'function') return actor.getState();
    if (actor.state) return actor.state; // fallback
    return undefined;
  } catch (err) {
    console.warn('readActorSnapshot failed', err);
    return undefined;
  }
}

export function safeStart(actor: any) {
  try {
    if (!actor) return;
    if (typeof actor.start === 'function') actor.start();
    // Some v5 Actors expose start as optional or return a cleanup
    return;
  } catch (err) {
    console.warn('safeStart failed', err);
  }
}

export function safeStop(actor: any) {
  try {
    if (!actor) return;
    if (typeof actor.stop === 'function') actor.stop();
    // v5 Actors may use unsubscribe handles; best-effort only
  } catch (err) {
    console.warn('safeStop failed', err);
  }
}

export default {
  readActorSnapshot,
  safeStart,
  safeStop,
};
