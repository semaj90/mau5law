import { getSustainedP99Info } from "$lib/services/alert-center";
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';


// GET /api/v1/observability/state - Get current observability state with enhanced persistence
export const GET: RequestHandler = async () => {
  try {
    // Load enhanced persistent state
    const persistedState = await loadObservabilityState();

    // Get legacy runtime data
    const runtimeDir = path.resolve(process.cwd(), '.runtime');
    const file = path.join(runtimeDir, 'observability-state.json');
    let legacyPersisted: any = null;
    if(fs.existsSync(file)){
      try { legacyPersisted = JSON.parse(fs.readFileSync(file,'utf8')); } catch {}
    }

    return json({
      ok: true,
      // Enhanced structured state
      state: persistedState,
      // Legacy compatibility
      budgets: getBudgetCounters(),
      sustained: getSustainedP99Info(),
      persisted: legacyPersisted,
      // Additional metadata
      timestamp: new Date().toISOString()
    });
  } catch(error: any){
    console.error('[observability-state] GET error:', error);
    return json({ ok: false, error: error.message }, { status: 500 });
  }
};

// POST /api/v1/observability/state - Update observability state
export const POST: RequestHandler = async ({ request }) => {
  try {
    const updates = await request.json();
    const currentState = await loadObservabilityState();

    // Merge updates with current state
    const newState = {
      ...currentState,
      ...updates,
      baselines: { ...currentState.baselines, ...updates.baselines },
      sustained_counters: { ...currentState.sustained_counters, ...updates.sustained_counters },
      daily_budgets: { ...currentState.daily_budgets, ...updates.daily_budgets },
      metadata: {
        ...currentState.metadata,
        last_updated: new Date().toISOString()
      }
    };

    await saveObservabilityState(newState);

    return json({
      success: true,
      state: newState,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[observability-state] POST error:', error);
    return json({ error: 'Failed to update observability state' }, { status: 500 });
  }
};
