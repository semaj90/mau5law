/// <reference types="vite/client" />

import type { RequestHandler } from './$types.js';
import { URL } from "url";

export interface BaselineDiff {
  metric: string;
  current_value: number;
  baseline_value: number;
  difference: number;
  percentage_change: number;
  status: 'normal' | 'drift' | 'significant_drift';
  threshold_breach: boolean;
}

export interface BaselineDiffResponse {
  timestamp: string;
  diffs: BaselineDiff[];
  overall_status: 'stable' | 'drift_detected' | 'significant_drift';
  summary: {
    total_metrics: number;
    normal_count: number;
    drift_count: number;
    significant_drift_count: number;
  };
}

// GET /api/v1/observability/baseline-diff - Compare current metrics with baselines
export const GET: RequestHandler = async ({ url }) => {
  try {
    const state = await loadObservabilityState();

    // Get current metrics from query params or mock current values
    const currentP99 = parseFloat(url.searchParams.get('current_p99') || '0');
    const currentErrorRate = parseFloat(url.searchParams.get('current_error_rate') || '0');
    const currentConnections = parseInt(url.searchParams.get('current_connections') || '0');

    // Define drift thresholds (configurable via env vars)
    const DRIFT_THRESHOLD = parseFloat(import.meta.env.BASELINE_DRIFT_THRESHOLD || '20'); // 20% default
    const SIGNIFICANT_THRESHOLD = parseFloat(import.meta.env.BASELINE_SIGNIFICANT_THRESHOLD || '50'); // 50% default

    const diffs: BaselineDiff[] = [];

    // Calculate P99 latency diff
    if (currentP99 > 0) {
      const baseline = state.baselines.p99_latency_ms;
      const difference = currentP99 - baseline;
      const percentageChange = (difference / baseline) * 100;
      const absPctChange = Math.abs(percentageChange);

      diffs.push({
        metric: 'p99_latency_ms',
        current_value: currentP99,
        baseline_value: baseline,
        difference,
        percentage_change: percentageChange,
        status: absPctChange >= SIGNIFICANT_THRESHOLD ? 'significant_drift' :
                absPctChange >= DRIFT_THRESHOLD ? 'drift' : 'normal',
        threshold_breach: currentP99 > baseline * 1.5 // 50% threshold breach
      });
    }

    // Calculate error rate diff
    if (currentErrorRate > 0) {
      const baseline = state.baselines.error_rate_percent;
      const difference = currentErrorRate - baseline;
      const percentageChange = baseline > 0 ? (difference / baseline) * 100 : 0;
      const absPctChange = Math.abs(percentageChange);

      diffs.push({
        metric: 'error_rate_percent',
        current_value: currentErrorRate,
        baseline_value: baseline,
        difference,
        percentage_change: percentageChange,
        status: absPctChange >= SIGNIFICANT_THRESHOLD ? 'significant_drift' :
                absPctChange >= DRIFT_THRESHOLD ? 'drift' : 'normal',
        threshold_breach: currentErrorRate > baseline * 2 // 100% threshold breach for errors
      });
    }

    // Calculate connection count diff
    if (currentConnections > 0) {
      const baseline = state.baselines.connection_count;
      const difference = currentConnections - baseline;
      const percentageChange = baseline > 0 ? (difference / baseline) * 100 : 0;
      const absPctChange = Math.abs(percentageChange);

      diffs.push({
        metric: 'connection_count',
        current_value: currentConnections,
        baseline_value: baseline,
        difference,
        percentage_change: percentageChange,
        status: absPctChange >= SIGNIFICANT_THRESHOLD ? 'significant_drift' :
                absPctChange >= DRIFT_THRESHOLD ? 'drift' : 'normal',
        threshold_breach: Math.abs(difference) > baseline * 0.3 // 30% threshold breach
      });
    }

    // Calculate summary
    const summary = {
      total_metrics: diffs.length,
      normal_count: diffs.filter(d => d.status === 'normal').length,
      drift_count: diffs.filter(d => d.status === 'drift').length,
      significant_drift_count: diffs.filter(d => d.status === 'significant_drift').length
    };

    // Determine overall status
    let overall_status: BaselineDiffResponse['overall_status'] = 'stable';
    if (summary.significant_drift_count > 0) {
      overall_status = 'significant_drift';
    } else if (summary.drift_count > 0) {
      overall_status = 'drift_detected';
    }

    const response: BaselineDiffResponse = {
      timestamp: new Date().toISOString(),
      diffs,
      overall_status,
      summary
    };

    return json(response);
  } catch (error: any) {
    console.error('[baseline-diff] Error:', error);
    return json({ error: 'Failed to calculate baseline diff' }, { status: 500 });
  }
};

// POST /api/v1/observability/baseline-diff - Update baselines with current values
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { metrics } = await request.json();
    const state = await loadObservabilityState();

    // Update baselines with provided metrics
    const updatedBaselines = { ...state.baselines };

    if (metrics.p99_latency_ms !== undefined) {
      updatedBaselines.p99_latency_ms = metrics.p99_latency_ms;
    }
    if (metrics.error_rate_percent !== undefined) {
      updatedBaselines.error_rate_percent = metrics.error_rate_percent;
    }
    if (metrics.connection_count !== undefined) {
      updatedBaselines.connection_count = metrics.connection_count;
    }

    updatedBaselines.last_calculated = new Date().toISOString();

    // Save updated state
    const updatedState = {
      ...state,
      baselines: updatedBaselines
    };

    await saveObservabilityState(updatedState);

    return json({
      success: true,
      updated_baselines: updatedBaselines,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[baseline-diff] Update error:', error);
    return json({ error: 'Failed to update baselines' }, { status: 500 });
  }
};