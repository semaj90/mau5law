/**
 * Redis-Optimized AI Analysis Endpoint
 * Demonstrates Redis orchestrator integration for document/evidence analysis
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import { callOllamaApi } from '$lib/services/ollama-client';

/**
 * Original Analysis Handler
 */
const originalAnalysisHandler: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { 
      content, 
      analysisType = 'general',
      caseId,
      evidenceId,
      model = 'gemma3:legal-latest' 
    } = body;
    
    if (!content) {
      throw error(400, 'Content is required for analysis');
    }
    
    console.log(`🔍 Analyzing content: ${analysisType} (${content.length} chars)`);
    
    const analysisPrompt = generateAnalysisPrompt(analysisType, content);
    
    const response = await callOllamaApi({
      model,
      messages: [{ role: 'user', content: analysisPrompt }],
      options: {
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1500
      }
    });
    
    if (!response?.message?.content) {
      throw error(500, 'Invalid response from AI model');
    }
    
    // Parse analysis results
    const analysis = parseAnalysisResponse(response.message.content, analysisType);
    
    return json({
      analysis,
      analysisType,
      contentLength: content.length,
      caseId,
      evidenceId,
      model,
      processing_time: 3000, // Analysis typically takes longer
      confidence: analysis.confidence || 0.8,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('AI analysis error:', err);
    throw error(500, `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * Redis-Optimized Version with Conservative Caching
 * Analysis results are cached but with moderate TTL since legal interpretation may evolve
 */
export const POST = redisOptimized.aiAnalysis(originalAnalysisHandler);

// Helper functions

function generateAnalysisPrompt(analysisType: string, content: string): string {
  const prompts = {
    general: `Analyze the following legal content and provide key insights, important facts, and potential issues:\n\n${content}`,
    
    contract: `Analyze this contract for key terms, obligations, risks, and missing clauses:\n\n${content}`,
    
    evidence: `Analyze this evidence for relevance, credibility, admissibility, and potential impact on the case:\n\n${content}`,
    
    case_law: `Analyze this legal case for precedential value, key holdings, and applicable legal principles:\n\n${content}`,
    
    document: `Perform a comprehensive legal document analysis focusing on structure, completeness, and legal implications:\n\n${content}`
  };
  
  return prompts[analysisType as keyof typeof prompts] || prompts.general;
}

function parseAnalysisResponse(response: string, analysisType: string): any {
  try {
    // Attempt to parse structured response
    if (response.includes('{') && response.includes('}')) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    // Fallback to structured text parsing
    return {
      summary: extractSummary(response),
      key_points: extractKeyPoints(response),
      risks: extractRisks(response),
      recommendations: extractRecommendations(response),
      confidence: calculateConfidence(response, analysisType),
      raw_analysis: response
    };
  } catch (error) {
    return {
      summary: response.substring(0, 200) + '...',
      raw_analysis: response,
      confidence: 0.7,
      parsing_error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

function extractSummary(text: string): string {
  const summaryMatch = text.match(/(?:summary|overview):\s*([^\n]+)/i);
  return summaryMatch ? summaryMatch[1] : text.substring(0, 150) + '...';
}

function extractKeyPoints(text: string): string[] {
  const keyPointsSection = text.match(/(?:key points?|important items?):\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  if (!keyPointsSection) return [];
  
  return keyPointsSection[1]
    .split(/\n[-*•]\s*/)
    .filter(point => point.trim().length > 0)
    .map(point => point.trim())
    .slice(0, 5); // Top 5 key points
}

function extractRisks(text: string): string[] {
  const risksSection = text.match(/(?:risks?|concerns?|issues?):\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  if (!risksSection) return [];
  
  return risksSection[1]
    .split(/\n[-*•]\s*/)
    .filter(risk => risk.trim().length > 0)
    .map(risk => risk.trim())
    .slice(0, 3); // Top 3 risks
}

function extractRecommendations(text: string): string[] {
  const recommendationsSection = text.match(/(?:recommendations?|suggestions?):\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  if (!recommendationsSection) return [];
  
  return recommendationsSection[1]
    .split(/\n[-*•]\s*/)
    .filter(rec => rec.trim().length > 0)
    .map(rec => rec.trim())
    .slice(0, 3); // Top 3 recommendations
}

function calculateConfidence(response: string, analysisType: string): number {
  let confidence = 0.7; // Base confidence
  
  // Higher confidence for longer, more detailed responses
  if (response.length > 500) confidence += 0.1;
  if (response.length > 1000) confidence += 0.1;
  
  // Higher confidence for structured responses
  if (response.includes('Key points:') || response.includes('Summary:')) confidence += 0.05;
  if (response.includes('Risks:') || response.includes('Recommendations:')) confidence += 0.05;
  
  // Analysis type specific adjustments
  const typeMultipliers = {
    general: 1.0,
    contract: 1.1, // Contract analysis is typically more structured
    evidence: 0.9, // Evidence analysis can be more subjective
    case_law: 1.2, // Case law analysis benefits from precedent
    document: 1.0
  };
  
  confidence *= typeMultipliers[analysisType as keyof typeof typeMultipliers] || 1.0;
  
  return Math.min(0.95, Math.max(0.5, confidence)); // Clamp between 0.5 and 0.95
}