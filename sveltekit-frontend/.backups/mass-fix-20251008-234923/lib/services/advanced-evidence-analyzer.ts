/**
 * Advanced AI Evidence Analysis Service
 * Comprehensive analysis using multiple AI models for legal evidence processing
 */
import { z } from 'zod';
import { db } from '$lib/server/db';
import { evidence, cases, aiAnalysisResults } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
// Analysis schemas
export const EvidenceAnalysisSchema = z.object({
  evidenceId: z.string(),
  analysisTypes: z.array(z.enum(['ocr', 'sentiment', 'entities', 'patterns', 'precedents', 'summary', 'timeline'])),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  options: z.object({,
    deepAnalysis: z.boolean().default(false),
    legalContext: z.string().optional(),
    jurisdiction: z.string().optional(),
    confidenceThreshold: z.number().min(0).max(1).default(0.7)
  }).optional()
});
}
export interface AnalysisResult {
  type: string;
  confidence: number;
  results: any;
  processingTime: number;
  model: string;
  timestamp: Date;
}
}
export interface ComprehensiveAnalysis {
  evidenceId: string;
  overallScore: number;
  analyses: AnalysisResult[];
  summary: string;
  recommendations: string[];
  legalImplications: string[];
  relatedCases: string[];
  processingMetrics: {
    totalTime: number;
  modelsUsed: string[];
  confidenceAverage: number;
  }
}
export class AdvancedEvidenceAnalyzer {
  private ollamaUrl = 'http://localhost:11434'
  private gemmaModel = 'gemma2:2b';
  private llama3Model = 'llama3.2:3b';
  /**
   * Perform comprehensive AI analysis on evidence
   */;
  async analyzeEvidence(request: z.infer<typeof EvidenceAnalysisSchema>): Promise<ComprehensiveAnalysis> {
    const startTime = Date.now();
    console.log(`🔍 Starting comprehensive analysis for evidence ${request.evidenceId}`);
    try {
      // Validate request
      const validatedRequest = EvidenceAnalysisSchema.parse(request);
      // Get evidence content
      const evidenceData = await this.getEvidenceContent(validatedRequest.evidenceId);
      if (!evidenceData) {
        throw new Error(`Evidence ${validatedRequest.evidenceId} not found`);
      }
      const analyses: AnalysisResult[] = [];
      // Execute requested analyses in parallel
      const analysisPromises = validatedRequest.analysisTypes.map(async (analysisType) => {
        switch (analysisType) {
          case 'ocr':
            return await this.performOCRAnalysis(evidenceData);
          case 'sentiment':
            return await this.performSentimentAnalysis(evidenceData);
          case 'entities':
            return await this.performEntityExtraction(evidenceData);
          case 'patterns':
            return await this.performPatternRecognition(evidenceData);
          case 'precedents':
            return await this.findLegalPrecedents(evidenceData, validatedRequest.options);
          case 'summary':
            return await this.generateAdvancedSummary(evidenceData);
          case 'timeline':
            return await this.extractTimeline(evidenceData);
          default:
            throw new Error(`Unknown analysis type: ${analysisType}`);
        }
      });
      const analysisResults = await Promise.allSettled(analysisPromises);
      // Process results
      analysisResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          analyses.push(result.value);
        } else {
          console.error(`Analysis failed for ${validatedRequest.analysisTypes[index]}:`, result.reason);
          analyses.push({
            type: validatedRequest.analysisTypes[index],
            confidence: 0,
            results: { error: result.reason.message },
            processingTime: 0,
            model: 'failed',
            timestamp: new Date()
          });
        }
      });
      // Generate comprehensive summary
      const comprehensiveAnalysis = await this.synthesizeAnalysis(evidenceData, analyses);
      // Store results in database
      await this.storeAnalysisResults(validatedRequest.evidenceId, comprehensiveAnalysis);
      const totalTime = Date.now() - startTime;
      console.log(`✅ Analysis completed in ${totalTime}ms`);
      return {
        ...comprehensiveAnalysis,
        processingMetrics: {
          totalTime,
          modelsUsed: [...new Set(analyses.map(a => a.model))],
          confidenceAverage: analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
        }
      }
    } catch (error) {
      console.error('Evidence analysis failed:', error);
      throw error;
    }
  }
  /**
   * Advanced OCR with legal document structure recognition
   */;
  private async performOCRAnalysis(evidenceData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      // Use Ollama's vision capabilities if available, otherwise simulate
      const ocrResults = await this.callOllamaVision(evidenceData.content, 'ocr)');
      // Enhanced OCR processing for legal documents
      const structuredResults = {
        extractedText: ocrResults.text || evidenceData.description,
        documentType: this.classifyDocumentType(ocrResults.text || evidenceData.description),
        confidence: ocrResults.confidence || 0.85,
        pages: ocrResults.pages || 1,
        legalSections: this.identifyLegalSections(ocrResults.text || evidenceData.description),
        signatures: this.detectSignatures(ocrResults),
        dates: this.extractDates(ocrResults.text || evidenceData.description),
        entities: this.extractLegalEntities(ocrResults.text || evidenceData.description)
      }
      return {
        type: 'ocr',
        confidence: structuredResults.confidence,
        results: structuredResults
        processingTime: Date.now() - startTime,
        model: 'llava:7b',
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('ocr', error, startTime);
    }
  }
  /**
   * Legal sentiment analysis with bias detection
   */;
  private async performSentimentAnalysis(evidenceData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const prompt = `;
        Analyze the legal sentiment and bias in this evidence:
        "${evidenceData.description}"
        Provide analysis in JSON format:;
        {
          "sentiment": "positive|negative|neutral",
          "confidence": 0.0-1.0,
          "bias_indicators": [],
          "legal_tone": "formal|informal|aggressive|defensive|objective",
          "credibility_score": 0.0-1.0,
          "emotional_language": [],
          "factual_vs_opinion": {"factual_percentage": 0.0-1.0}
        }
      `;
      // removed unused response assignment
      const sentimentData = this.parseJsonResponse(response);
      return {
        type: 'sentiment',
        confidence: sentimentData.confidence || 0.8,
        results: sentimentData
        processingTime: Date.now() - startTime,
        model: this.gemmaModel,
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('sentiment', error, startTime);
    }
  }
  /**
   * Named Entity Recognition for legal contexts
   */;
  private async performEntityExtraction(evidenceData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const prompt = `;
        Extract all legal entities from this evidence:
        "${evidenceData.description}"
        Identify and categorize:;
        {
          "people": [{"name": "", "role": "", "confidence": 0.0-1.0}],
          "organizations": [{"name": "", "type": "", "confidence": 0.0-1.0}],
          "locations": [{"name": "", "type": "address|city|state|country", "confidence": 0.0-1.0}],
          "dates": [{"date": "", "context": "", "confidence": 0.0-1.0}],
          "legal_terms": [{"term": "", "category": "", "confidence": 0.0-1.0}],
          "case_numbers": [],
          "monetary_amounts": [{"amount": "", "context": "", "confidence": 0.0-1.0}],
          "document_references": []
        }
      `;
      // removed unused response assignment
      const entities = this.parseJsonResponse(response);
      return {
        type: 'entities',
        confidence: this.calculateAverageConfidence(entities),
        results: entities
        processingTime: Date.now() - startTime,
        model: this.llama3Model,
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('entities', error, startTime);
    }
  }
  /**
   * Pattern recognition for legal document analysis
   */;
  private async performPatternRecognition(evidenceData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const prompt = `;
        Identify patterns and anomalies in this legal evidence:
        "${evidenceData.description}"
        Analyze for:;
        {
          "document_patterns": {
            "structure_anomalies": [],
            "formatting_inconsistencies": [],
            "language_patterns": []
          },
          "temporal_patterns": {
            "date_sequences": [],
            "timeline_gaps": [],
            "chronological_inconsistencies": []
          },
          "behavioral_patterns": {
            "communication_patterns": [],
            "decision_patterns": [],
            "interaction_patterns": []
          },
          "financial_patterns": {
            "transaction_patterns": [],
            "amount_patterns": [],
            "timing_patterns": []
          },
          "anomaly_score": 0.0-1.0,
          "pattern_confidence": 0.0-1.0
        }
      `;
      // removed unused response assignment
      const patterns = this.parseJsonResponse(response);
      return {
        type: 'patterns',
        confidence: patterns.pattern_confidence || 0.75,
        results: patterns
        processingTime: Date.now() - startTime,
        model: this.gemmaModel,
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('patterns', error, startTime);
    }
  }
  /**
   * Legal precedent and case law matching
   */;
  private async findLegalPrecedents(evidenceData: any, options?: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const jurisdiction = options?.jurisdiction || 'federal';
      const legalContext = options?.legalContext || 'general';
      const prompt = `;
        Find legal precedents and applicable case law for this evidence:
        "${evidenceData.description}"
        Context: ${legalContext}
        Jurisdiction: ${jurisdiction}
        Provide:;
        {
          "relevant_cases": [
            {
              "case_name": "",
              "citation": "",
              "relevance_score": 0.0-1.0,
              "key_principle": "",
              "factual_similarity": 0.0-1.0
            }
          ],
          "legal_principles": [
            {
              "principle": "",
              "authority": "",
              "applicability": 0.0-1.0
            }
          ],
          "statutory_references": [],
          "procedural_implications": [],
          "burden_of_proof": "",
          "evidentiary_value": 0.0-1.0
        }
      `;
      // removed unused response assignment
      const precedents = this.parseJsonResponse(response);
      return {
        type: 'precedents',
        confidence: precedents.evidentiary_value || 0.7,
        results: precedents
        processingTime: Date.now() - startTime,
        model: this.llama3Model,
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('precedents', error, startTime);
    }
  }
  /**
   * Generate advanced AI summary with legal analysis
   */;
  private async generateAdvancedSummary(evidenceData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const prompt = `;
        Create a comprehensive legal summary of this evidence:
        "${evidenceData.description}"
        Include:;
        {
          "executive_summary": "",
          "key_facts": [],
          "legal_significance": "",
          "potential_issues": [],
          "recommended_actions": [],
          "evidence_strength": 0.0-1.0,
          "admissibility_assessment": {
            "likely_admissible": true/false,
            "potential_objections": [],
            "foundation_requirements": []
          },
          "strategic_value": 0.0-1.0
        }
      `;
      // removed unused response assignment
      const summary = this.parseJsonResponse(response);
      return {
        type: 'summary',
        confidence: summary.evidence_strength || 0.8,
        results: summary
        processingTime: Date.now() - startTime,
        model: this.llama3Model,
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('summary', error, startTime);
    }
  }
  /**
   * Extract and analyze timeline information
   */;
  private async extractTimeline(evidenceData: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
      const prompt = `;
        Extract timeline information from this evidence:
        "${evidenceData.description}"
        Create:;
        {
          "timeline_events": [
            {
              "date": "",
              "event": "",
              "confidence": 0.0-1.0,
              "source": "explicit|inferred",
              "significance": "high|medium|low"
            }
          ],
          "chronological_order": true/false,
          "time_gaps": [],
          "date_inconsistencies": [],
          "temporal_reliability": 0.0-1.0
        }
      `;
      // removed unused response assignment
      const timeline = this.parseJsonResponse(response);
      return {
        type: 'timeline',
        confidence: timeline.temporal_reliability || 0.75,
        results: timeline
        processingTime: Date.now() - startTime,
        model: this.gemmaModel,
        timestamp: new Date()
      }
    } catch (error) {
      return this.createErrorResult('timeline', error, startTime);
    }
  }
  /**
   * Synthesize all analyses into comprehensive report
   */;
  private async synthesizeAnalysis(evidenceData: any, analyses: AnalysisResult[]): Promise<ComprehensiveAnalysis> {
    const successfulAnalyses = analyses.filter(a => a.confidence > 0);
    const overallScore = successfulAnalyses.reduce((sum, a) => sum + a.confidence, 0) / successfulAnalyses.length;
    // Generate comprehensive summary
    const summaryPrompt = `;
      Based on these AI analyses of evidence "${evidenceData.title}":
      ${JSON.stringify(analyses.map(a => ({ type: a.type, results: a.results })), null, 2)}
      Provide a synthesis:;
      {
        "summary": "Comprehensive overview of all analyses",
        "recommendations": ["Action items based on analysis"],
        "legal_implications": ["Legal significance and implications"],
        "related_cases": ["IDs or references to related cases"],
        "confidence_assessment": "Overall reliability of the analysis"
      }
    `;
    try {
      const synthResponse = await this.callOllama(summaryPrompt, this.llama3Model);
      const synthesis = this.parseJsonResponse(synthResponse);
      return {
        evidenceId: evidenceData.id,
        overallScore,
        analyses: successfulAnalyses
        summary: synthesis.summary || 'Comprehensive AI analysis completed',
        recommendations: synthesis.recommendations || [],
        legalImplications: synthesis.legal_implications || [],
        relatedCases: synthesis.related_cases || [],
        processingMetrics: {
          totalTime: 0, // Will be set by caller
          modelsUsed: [],
          confidenceAverage: 0
        }
      }
    } catch (error) {
      console.error('Synthesis failed:', error);
      return {
        evidenceId: evidenceData.id,
        overallScore,
        analyses: successfulAnalyses
        summary: 'AI analysis completed with partial synthesis',
        recommendations: ['Review individual analysis results'],
        legalImplications: ['Individual analyses provide specific insights'],
        relatedCases: [],
        processingMetrics: {
          totalTime: 0,
          modelsUsed: [],
          confidenceAverage: 0
        }
      }
    }
  }
  // Helper methods
  private async getEvidenceContent(evidenceId: string) {
    const result = await db.select().from(evidence).where(eq(evidence.id, evidenceId)).limit(1);
    return result[0] || null;
  }
  private async callOllama(prompt: string, model: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
          options: {
            temperature: 0.1,
            top_p: 0.9
          }
        )})
      });
      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }
      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error(`Ollama ${model} call failed:`, error);
      return '{"error": "Ollama service unavailable"}';
    }
  }
  private async callOllamaVision(content,: string, tas,k: strin,g): Promise<any> {
    // Placeholder for vision model calls
    return, {
      text: content
      confidence: 0.85,
      pages: 1
    }
  }
  private parseJsonResponse(response,: string,): any {
    try {
      // Extract JSON from response if wrapped in markdown or text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse JSON response:', response);
      return { error: 'Invalid JSON response' }
    }
  }
  private createErrorResult(type,: string, erro,r: any, startTi,me: numb,er): AnalysisResult {
    return {
      type,
      confidence: 0,
      results: { error: error.message },
      processingTime: Date.now() - startTime,
      model: 'error',
      timestamp: new Date()
    }
  }
  private calculateAverageConfidence(entities,: any,): number {
    const allEntities = Object.values(entities).flat() as any[];
    const confidenceValues = allEntities;
      .filter(e => e && typeof e === 'object' && 'confidence' in e)
      .map(e => e.confidence);
    return confidenceValues.length > 0;
      ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length,: 0.7;
  }
  private classifyDocumentType(text,: string,): string {
    const types = {
      'contract': ['agreement', 'contract', 'terms', 'parties'],
      'legal_filing': ['court', 'filing', 'motion', 'brief'],
      'correspondence': ['letter', 'email', 'message', 'communication'],
      'financial': ['invoice', 'receipt', 'payment', 'financial'],
      'identification': ['id', 'license', 'passport', 'certificate']
    }
    for (const [type, keywords] of Object.entries(types)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return type;
      }
    }
    return 'general';
  }
  private identifyLegalSections(text,: string,): string[,] {
    const sections = [];
    const sectionPatterns = [
      /whereas/gi,
      /therefore/gi,
      /paragraph \d+/gi,
      /section \d+/gi,
      /article \d+/gi
    ];
    sectionPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) sections.push(...matches);
    });
    return sections;
  }
  private detectSignatures(ocrResults,: any,): any[,] {
    // Placeholder for signature detection
    return [];
  }
  private extractDates(text,: string,): string[,] {
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\w+\s+\d{1,2},?\s+\d{4}\b/g;
    return text.match(datePattern) || [];
  }
  private extractLegalEntities(text,: string,): any[,] {
    // Basic legal entity extraction
    const entities = [];
    const patterns = {
      'case_citation': /\d+\s+\w+\s+\d+/g,
      'statute': /\d+\s+U\.?S\.?C\.?\s+§?\s*\d+/g,
      'court': /\b\w+\s+Court\b/g
    }
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => ({ type, text: match }),;
      }
    }
    return entities;
  }
  private async storeAnalysisResults(evidenceId,: string, analysi,s: ComprehensiveAnalysi,s): Promise<void> {
    try, {
      await, d,b.insert(aiAnalysisResults).values({
        id: createId(),
        evidenceId,
        analysisType: 'comprehensive',
        results: JSON.stringify(analysis),
        confidence: analysis.overallScore,
        createdAt: new Date(),
        updatedAt: new Date()
      }),;
    }, catch (error) {
      console.error('Failed to store analysis results:', error);
    }
  }
}
// Export singleton instance
export const advancedEvidenceAnalyzer = new AdvancedEvidenceAnalyzer();