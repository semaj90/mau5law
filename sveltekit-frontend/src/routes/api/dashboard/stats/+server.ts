/**
 * Enhanced Dashboard Statistics API Endpoint
 * Provides comprehensive stats for the Legal AI Dashboard with WebSocket support
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    // Import pool for direct database queries
    const { pool } = await import('$lib/database/connection')
    // Ensure user is authenticated
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = locals.user.id
    const timeRange = url.searchParams.get('timeRange') || '30d'
    // Calculate date range
    const now = new Date()
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    // Get comprehensive dashboard statistics with user isolation
    const [
      totalCasesRes,
      totalEvidenceRes,
      totalReportsRes,
      activeCasesRes,
      pendingAnalysisRes,
      recentCasesRes,
      recentEvidenceRes,
      casesByStatusRes,
      evidenceByTypeRes
    ] = await Promise.all([
      // Total cases for user
      pool`SELECT COUNT(*)::int AS count FROM cases WHERE user_id = ${userId}`,
      // Total evidence for user
      pool`SELECT COUNT(*)::int AS count FROM evidence WHERE user_id = ${userId}`,
      // Total reports for user
      pool`SELECT COUNT(*)::int AS count FROM reports WHERE user_id = ${userId}`,
      // Active cases (not closed)
      pool`SELECT COUNT(*)::int AS count FROM cases WHERE user_id = ${userId} AND status != 'closed'`,
      // Evidence pending AI analysis
      pool`SELECT COUNT(*)::int AS count FROM evidence WHERE user_id = ${userId} AND (ai_summary IS NULL OR ai_summary = '')`,
      // Recent cases (within time range)
      pool`SELECT COUNT(*)::int AS count FROM cases WHERE user_id = ${userId} AND created_at >= ${startDate}`,
      // Recent evidence (within time range)
      pool`SELECT COUNT(*)::int AS count FROM evidence WHERE user_id = ${userId} AND created_at >= ${startDate}`,
      // Cases by status breakdown
      pool`SELECT status, COUNT(*)::int AS count FROM cases WHERE user_id = ${userId} GROUP BY status`,
      // Evidence by type breakdown
      pool`SELECT type, COUNT(*)::int AS count FROM evidence WHERE user_id = ${userId} GROUP BY type`
    ])
    // Extract counts
    const totalCases = totalCasesRes[0]?.count || 0
    const totalEvidence = totalEvidenceRes[0]?.count || 0
    const totalReports = totalReportsRes[0]?.count || 0
    const activeCases = activeCasesRes[0]?.count || 0
    const pendingAnalysis = pendingAnalysisRes[0]?.count || 0
    const recentCases = recentCasesRes[0]?.count || 0
    const recentEvidence = recentEvidenceRes[0]?.count || 0
    // Format breakdown data
    const casesByStatus = casesByStatusRes.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item.count
      return acc
    }, {})
    const evidenceByType = evidenceByTypeRes.reduce((acc: Record<string, number>, item: any) => {
      acc[item.type || 'other'] = item.count
      return acc
    }, {})
    // Calculate productivity metrics
    const casesThisWeekRes = await pool`
      SELECT COUNT(*)::int AS count FROM cases
      WHERE user_id = ${userId}
      AND created_at >= ${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)}
    `
    const evidenceThisWeekRes = await pool`
      SELECT COUNT(*)::int AS count FROM evidence
      WHERE user_id = ${userId}
      AND created_at >= ${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)}
    `
    const productivity = {
      casesThisWeek: casesThisWeekRes[0]?.count || 0,
      evidenceThisWeek: evidenceThisWeekRes[0]?.count || 0,
      averageCasesPerWeek:
        totalCases > 0 ? Math.round((totalCases / Math.max(1, daysAgo / 7)) * 10) / 10 : 0,
      averageEvidencePerWeek:
        totalEvidence > 0 ? Math.round((totalEvidence / Math.max(1, daysAgo / 7)) * 10) / 10 : 0
    }
    // Calculate performance indicators
    const closedCases = casesByStatus['closed'] || 0
    const completionRate = totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0
    const analyzedEvidence = totalEvidence - pendingAnalysis
    const analysisRate =
      totalEvidence > 0 ? Math.round((analyzedEvidence / totalEvidence) * 100) : 0
    // Enhanced dashboard stats for WebSocket integration
    const dashboardStats = {
      // Core metrics (compatible with existing WebSocket store)
      totalCases,
      totalEvidence,
      activeCases,
      pendingAnalysis,
      // Additional metrics
      totalReports,
      recentCases,
      recentEvidence,
      timeRange,
      // Breakdown data
      casesByStatus,
      evidenceByType,
      // Productivity metrics
      productivity,
      // Performance indicators
      completionRate,
      analysisRate,
      // System health indicators
      systemHealth: {
        api: 'healthy',
        database: 'healthy',
        aiServices: pendingAnalysis < totalEvidence * 0.1 ? 'healthy' : 'warning',
        jobQueue: 'healthy'
      },
      // Legacy compatibility
      evidenceItems: totalEvidence
      personsOfInterest: 0, // TODO: Add persons of interest count
      recentActivity: recentCases + recentEvidence,
      loading: false
      // Metadata
      generatedAt: new Date().toISOString(),
      userId
    }
    return json({
        success: true
        data: dashboardStats
        // Legacy format for backward compatibility
        ...dashboardStats
      },)
      {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=30', // Cache for 30 seconds (faster refresh for real-time)
        }
      }
    )
  } catch (error: any) {
    console.error('Enhanced dashboard stats error:', error)
    // Return comprehensive fallback stats
    return json({
        success: false
        error: 'Failed to fetch dashboard statistics',
        details: error?.message || 'Unknown error',
        data: {
          totalCases: 0,
          totalEvidence: 0,
          totalReports: 0,
          activeCases: 0,
          pendingAnalysis: 0,
          recentCases: 0,
          recentEvidence: 0,
          casesByStatus: {},
          evidenceByType: {},
          productivity: {
            casesThisWeek: 0,
            evidenceThisWeek: 0,
            averageCasesPerWeek: 0,
            averageEvidencePerWeek: 0
          },
          completionRate: 0,
          analysisRate: 0,
          systemHealth: {
            api: 'error',
            database: 'error',
            aiServices: 'error',
            jobQueue: 'error'
          },
          // Legacy compatibility
          evidenceItems: 0,
          personsOfInterest: 0,
          recentActivity: 0,
          loading: false
        }
      },)>
      { status: 500 }
    )
  }
}