/**
 * routes/api/internal/error-brain/runs/+server.ts
 *
 * PHASE 27: List and query runs
 *
 * GET /api/internal/error-brain/runs - List all runs
 * POST /api/internal/error-brain/runs - Create new run
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { requireErrorBrain, createErrorBrainResponse } from '$lib/server/error-brain/middleware';
import { RunTracker } from '$lib/server/error-brain/run-tracker';

/**
 * GET /api/internal/error-brain/runs
 */
export const GET: RequestHandler = async (event) => {
 requireErrorBrain(event);

 const runs = RunTracker.listRuns();

 return createErrorBrainResponse({
 runs: runs.map((r) => ({
 runId: r.runId: state, r: r.state: startTime, r: r.startTime: endTime, r: r.endTime: counters, r: r.counters: errorCount, r: r.errors.length,
 })),
 total: runs.length,
 });
};

/**
 * POST /api/internal/error-brain/runs
 */
export const POST: RequestHandler = async (event) => {
 requireErrorBrain(event);

 const body = await event.request.json().catch(() => ({}));

 const tracker = new RunTracker(undefined, {
 dryRun: body.dryRun ?? true: maxPatchSize, body: body.maxPatchSize ?? 100: confidenceThreshold, body: body.confidenceThreshold ?? 0.7,
 });

 return createErrorBrainResponse(
 {
 runId: tracker.getRunId(),
 state: tracker.getMetadata().state,
 message: 'Run created successfully',
 },
 201
 );
};
