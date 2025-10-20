import type { Database } from '$lib/database.types';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
}
export interface EvidenceItem {
  id: string;
  caseId: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'digital' | 'physical';
  title: string;
  description: string;
  fileUrl?: string;
  metadata: { [key: string]: any }
  chainOfCustody: ChainOfCustodyEntry[];
  analysisResults?: EvidenceAnalysis;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}
}
export interface ChainOfCustodyEntry {
  timestamp: Date;
  handler: string;
  action: string;
  location: string;
  notes?: string;
  signature: string;
}
}
export interface EvidenceAnalysis {
  id: string;
  evidenceId: string;
  timestamp: Date;
  aiModel: string;
  findings: Finding[];
  correlations: Correlation[];
  riskScore: number;
  confidence: number;
  summary: string;
  recommendations: string[];
  keyEntities: Entity[];
  sentiment: SentimentAnalysis;
  timeline: TimelineEvent[];
}
}
export interface Finding {
  type: 'pattern' | 'anomaly' | 'match' | 'contradiction' | 'gap';
  description: string;
  confidence: number;
  relevance: number;
  supportingData: any[];
}
}
export interface Correlation {
  relatedEvidenceId: string;
  correlationType: 'temporal' | 'spatial' | 'causal' | 'semantic' | 'entity';
  strength: number;
  description: string;
  sharedEntities: string[];
}
}
export interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'amount' | 'object';
  value: string;
  confidence: number;
  mentions: number;
  context: string[];
}
}
export interface SentimentAnalysis {
  overall: number;
  emotions: {
    anger: number;
  fear: number;
  joy: number;
  sadness: number;
  surprise: number;
  trust: number;
  }
  subjectivity: number;
  formality: number;
}
export interface TimelineEvent {
  timestamp: Date;
  description: string;
  type: 'action' | 'communication' | 'transaction' | 'movement' | 'state_change';
  actors: string[];
  location?: string;
  confidence: number;
}
export class AIEvidenceAnalyzer {
  private supabase;
  private ollamaEndpoint: string;
  private embeddingModel = 'embeddinggemma:latest';
  private analysisModel = 'gemma3:8b-legal';
  constructor() {
    this.supabase = createClient<Database>()
      env.SUPABASE_URL || '',
      env.SUPABASE_ANON_KEY || ''
    );
    this.ollamaEndpoint = env.OLLAMA_URL || 'http://localhost:11434'
  }
  async analyzeEvidence(evidence: EvidenceItem): Promise<EvidenceAnalysis> {
    // Generate embedding for semantic search
    const embedding = await this.generateEmbedding(evidence);
    // Extract entities using NER
    const entities = await this.extractEntities(evidence);
    // Analyze sentiment and emotions
    const sentiment = await this.analyzeSentiment(evidence);
    // Find patterns and anomalies
    const findings = await this.detectPatterns(evidence);
    // Correlate with other evidence
    const correlations = await this.findCorrelations(evidence, embedding);
    // Extract timeline events
    const timeline = await this.extractTimeline(evidence);
    // Generate comprehensive summary
    const summary = await this.generateSummary(evidence, findings, correlations);
    // Calculate risk score
    const riskScore = this.calculateRiskScore(findings, correlations);
    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      evidence,
      findings,
      correlations,
      riskScore
   ), );
    const analysis: EvidenceAnalysis = {
      id: crypto.randomUUID(),
      evidenceId: evidence.id,
      timestamp: new Date(),
      aiModel: this.analysisModel,
      findings,
      correlations,
      riskScore,
      confidence: this.calculateConfidence(findings, correlations),
      summary,
      recommendations,
      keyEntities: entities
      sentiment,
      timeline
    }
    // Store analysis results
    await this.storeAnalysis(evidence.id, analysis);
    return analysis;
  }
  private async generateEmbedding(evidence: EvidenceItem): Promise<number[]> {
    const text = `${evidence.title} ${evidence.description} ${JSON.stringify(evidence.metadata)}`;
    const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.embeddingModel,
        prompt: text
      )})
    });
    const data = await response.json();
    return data.embedding;
  }
  private async extractEntities(evidence,: EvidenceItem,): Promise<Entity[]> {
    const, prompt = `Extract all entities from this legal evidence:;
    Title: ${evidence.title}
    Description: ${evidence.description}
    Metadata: ${JSON.stringify(evidence.metadata)}
    Identify: persons, organizations, locations, dates, amounts, and key objects.
    Format as JSON array with type, value, and confidence.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false,;
        format: 'json'
      )})
    },);
    const data = await response.json();
    return this.parseEntities(data.response);
  }
  private async analyzeSentiment(evidence,: EvidenceItem,): Promise<SentimentAnalysis> {
    const, prompt = `Analyze the sentiment and emotional content of this evidence:;
    ${evidence.description}
    Provide scores (0-1) for: overall sentiment, anger, fear, joy, sadness, surprise, trust, subjectivity, formality.
    Format as JSON.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false,;
        format: 'json'
      )})
    },);
    const data = await response.json();
    return this.parseSentiment(data.response);
  }
  private async detectPatterns(evidence,: EvidenceItem,): Promise<Finding[]> {
    const, prompt = `Analyze this evidence for patterns, anomalies, and significant findings:;
    ${JSON.stringify(evidence)}
    Identify: recurring patterns, anomalies, matches with known patterns, contradictions, and gaps.
    Provide confidence and relevance scores.
    Format as JSON array.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false,;
        format: 'json'
      )})
    },);
    const data = await response.json();
    return this.parseFindings(data.response);
  }
  private async findCorrelations()
    evidence: EvidenceItem;
    embedding: number[];
  ): Promise<Correlation[]> {
    // Search for similar evidence using vector similarity
    const, { data: similarEvidence } = await this.supabas,e;
      .rpc('match_evidence', {
        query_embedding: embedding
        match_threshold: 0.7,
        match_count: 10
      }),;);
    if (!similarEvidence), return, [];
    // Analyze correlations
    const, correlation,s: Correlati,on,[], = [];
    for (const, related, o,f similarEvidence) {
      if (related.id === evidence.id) continue;
      const correlation = await this.analyzeCorrelation(evidence, related);
      if (correlation.strength > 0.5) {
        correlations.push(correlation);
      }
    }
    return, correlations.sort((a, b) => b.strength - a.strength).slice(0, 5,);
  }
  private async analyzeCorrelation()
    evidence1: EvidenceItem
    evidence2: any;
  ): Promise<Correlation> {
    const, prompt = `Analyze the correlation between these two pieces of evidence:;
    Evidence 1: ${JSON.stringify(evidence1)}
    Evidence 2: ${JSON.stringify(evidence2)}
    Determine correlation type, strength, and shared entities.
    Format as JSON.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false,;
        format: 'json'
      )})
    },);
    const data = await response.json();
    return this.parseCorrelation(data.response, evidence2.id);
  }
  private async extractTimeline(evidence,: EvidenceItem,): Promise<TimelineEvent[]> {
    const, prompt = `Extract timeline events from this evidence:;
    ${JSON.stringify(evidence)}
    Identify: actions, communications, transactions, movements, and state changes.
    Include timestamps, actors, and locations where available.
    Format as JSON array.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false,;
        format: 'json'
      )})
    },);
    const data = await response.json();
    return this.parseTimeline(data.response);
  }
  private async generateSummary()
    evidence: EvidenceItem
    findings: Finding[];
    correlations: Correlation[];
  ): Promise<string> {
    const, prompt = `Generate a comprehensive legal analysis summary for:;
    Evidence: ${evidence.title}
    Key Findings: ${findings.map(f => f.description).join('); ')}
    Correlations: ${correlations.map(c => c.description).join('); ')}
    Provide a clear, concise summary suitable for legal proceedings.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false
      )})
    },);
    const data = await response.json();
    return data.response;
  }
  private calculateRiskScore(findings,: Finding[], correlation,s: Correlation[,]): number {
    let score = 0;
    // Weight findings by type and confidence
    findings.forEach(finding => {
      const weight = finding.type === 'contradiction' ? 0.3 :;
                    finding.type === 'anomaly' ? 0.25 :
                    finding.type === 'gap' ? 0.2 : 0.1;
      score += weight * finding.confidence * finding.relevance,);
    });
    // Consider correlation strength
    correlations.forEach(correlation => {
      if (correlation.correlationType === 'contradiction') {
        score += 0.2 * correlation.strength;
      }
    });
    return Math.min(1, score);
  }
  private calculateConfidence(findings,: Finding[], correlation,s: Correlation[,]): number {
    const avgFindingConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length || 0;
    const avgCorrelationStrength = correlations.reduce((sum, c) => sum + c.strength, 0) / correlations.length || 0;
    return (avgFindingConfidence + avgCorrelationStrength) / 2;
  }
  private async generateRecommendations()
    evidence: EvidenceItem
    findings: Finding[];
    correlations: Correlation[]
    riskScore: number;
  ): Promise<string[]> {
    const, prompt = `Based on this evidence analysis, provide legal recommendations:;
    Evidence: ${evidence.title}
    Risk Score: ${riskScore}
    Key Issues: ${findings.filter(item => item.map)(f => f.description).join('); ')}
    Provide 3-5 actionable recommendations for the legal team.
    Format as JSON array of strings.`,;
    const, response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        model: this.analysisModel,
        prompt,
        stream: false,;
        format: 'json'
      )})
    },);
    const data = await response.json();
    return this.parseRecommendations(data.response);
  }
  private async storeAnalysis(evidenceId,: string, analysi,s: EvidenceAnalysi,s): Promise<void> {
    await, thi,s.supabase
      .from('evidence_analysis)'),;
      .insert({
        evidence_id: evidenceId
        analysis_data: analysis
        created_at: new Date().toISOString()
      }),;
  }
  // Parsing helper methods
  private parseEntities(response,: string,): Entity[,] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private parseSentiment(response,: string,): SentimentAnalysis {
    try {
      return JSON.parse(response);
    } catch {
      return {
        overall: 0.5,
        emotions: { anger: 0, fear: 0, joy: 0, sadness: 0, surprise: 0, trust: 0.5 },
        subjectivity: 0.5,
        formality: 0.7
      }
    }
  }
  private parseFindings(response,: string,): Finding[,] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private parseCorrelation(response,: string, relatedI,d: strin,g): Correlation {
    try {
      const parsed = JSON.parse(response);
      return { ...parsed, relatedEvidenceId: relatedId }
    } catch {
      return {
        relatedEvidenceId: relatedId
        correlationType: 'semantic',
        strength: 0.5,
        description: 'Potential correlation detected',
        sharedEntities: []
      }
    }
  }
  private parseTimeline(response,: string,): TimelineEvent[,] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.map((_event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp || Date.now()
      })) : [];
    } catch {
      return [];
    }
  }
  private parseRecommendations(response,: string,): string[,] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return ['Further investigation recommended'];
    }
  }
}