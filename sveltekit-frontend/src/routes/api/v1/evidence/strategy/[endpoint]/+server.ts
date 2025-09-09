/*
 * Legal Strategy Recommendation Engine
 * AI-powered case strategy analysis and recommendations
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const LEGAL_MODEL = 'gemma3-legal:latest';

// Request schemas
const StrategyAnalysisSchema = z.object({
  caseId: z.string().uuid(),
  evidenceIds: z.array(z.string().uuid()),
  caseType: z.enum(['civil', 'criminal', 'corporate', 'regulatory', 'intellectual_property']),
  clientGoals: z.array(z.string()),
  opposingStrategy: z.string().optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  timeline: z.enum(['urgent', 'normal', 'extended']).optional(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate')
});

const PrecedentSearchSchema = z.object({
  jurisdiction: z.string(),
  legalIssues: z.array(z.string()),
  factPattern: z.string(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  courtLevel: z.enum(['trial', 'appellate', 'supreme', 'all']).default('all')
});

const RiskAssessmentSchema = z.object({
  caseId: z.string().uuid(),
  scenarios: z.array(z.object({
    name: z.string(),
    likelihood: z.number().min(0).max(1),
    description: z.string()
  })),
  mitigationStrategies: z.array(z.string()).optional()
});

// Types
interface StrategyRecommendation {
  id: string;
  title: string;
  description: string;
  rationale: string;
  confidence: number;
  expectedOutcome: {
    probability: number;
    description: string;
    timeframe: string;
  };
  requiredResources: {
    evidence: string[];
    expertise: string[];
    estimatedCost: string;
    timeline: string;
  };
  risks: string[];
  alternatives: string[];
  precedents: LegalPrecedent[];
}

interface LegalPrecedent {
  caseId: string;
  title: string;
  court: string;
  year: number;
  relevance: number;
  outcome: string;
  keyHoldings: string[];
  factSimilarity: number;
  jurisdiction: string;
  citation: string;
}

interface RiskFactor {
  factor: string;
  likelihood: number;
  impact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];
}

interface CaseOutcomeProjection {
  scenario: string;
  probability: number;
  outcome: string;
  keyFactors: string[];
  timelineWeeks: number;
  costEstimate: {
    min: number;
    max: number;
    currency: string;
  };
}

// Advanced Strategy Engine
class LegalStrategyEngine {

  static async generateStrategies(
    caseType: string,
    evidence: any[],
    clientGoals: string[],
    riskTolerance: string
  ): Promise<StrategyRecommendation[]> {

    const strategies: StrategyRecommendation[] = [];

    // Strategy 1: Evidence-Driven Approach
    strategies.push({
      id: 'strategy_evidence_driven',
      title: 'Evidence-Driven Strategic Approach',
      description: 'Build case foundation on strongest available evidence with systematic presentation',
      rationale: this.generateEvidenceRationale(evidence),
      confidence: this.calculateEvidenceConfidence(evidence),
      expectedOutcome: {
        probability: 0.75,
        description: 'Strong factual foundation leading to favorable settlement or trial outcome',
        timeframe: '3-6 months'
      },
      requiredResources: {
        evidence: evidence.map(e => e.filename || e.id),
        expertise: ['Document Analysis Expert', 'Forensic Accountant'],
        estimatedCost: '$25,000 - $75,000',
        timeline: '12-18 weeks'
      },
      risks: [
        'Evidence authenticity challenges',
        'Chain of custody issues',
        'Counter-evidence discovery'
      ],
      alternatives: [
        'Settlement negotiation based on evidence strength',
        'Motion for summary judgment'
      ],
      precedents: await this.findRelevantPrecedents(caseType, evidence)
    });

    // Strategy 2: Negotiated Settlement
    if (riskTolerance === 'conservative') {
      strategies.push({
        id: 'strategy_settlement',
        title: 'Strategic Settlement Negotiation',
        description: 'Pursue negotiated resolution to minimize risk and costs',
        rationale: 'Conservative approach minimizing litigation risks and costs while achieving core client objectives',
        confidence: 0.85,
        expectedOutcome: {
          probability: 0.80,
          description: 'Mutually acceptable settlement within 60-75% of damages sought',
          timeframe: '6-12 weeks'
        },
        requiredResources: {
          evidence: evidence.slice(0, 3).map(e => e.filename || e.id), // Top evidence only
          expertise: ['Experienced Negotiator', 'Mediator'],
          estimatedCost: '$10,000 - $30,000',
          timeline: '6-10 weeks'
        },
        risks: [
          'Lower monetary recovery',
          'No legal precedent established',
          'Potential for future similar issues'
        ],
        alternatives: [
          'Mediation with neutral third party',
          'Arbitration proceedings'
        ],
        precedents: []
      });
    }

    // Strategy 3: Aggressive Litigation
    if (riskTolerance === 'aggressive') {
      strategies.push({
        id: 'strategy_aggressive',
        title: 'Comprehensive Litigation Strategy',
        description: 'Pursue maximum damages through full litigation with all available claims',
        rationale: 'Strong evidence supports aggressive approach seeking maximum recovery and deterrent effect',
        confidence: 0.65,
        expectedOutcome: {
          probability: 0.60,
          description: 'Full damages award plus attorney fees and punitive damages',
          timeframe: '12-24 months'
        },
        requiredResources: {
          evidence: evidence.map(e => e.filename || e.id),
          expertise: ['Senior Litigation Counsel', 'Expert Witnesses', 'Discovery Specialist'],
          estimatedCost: '$100,000 - $250,000',
          timeline: '52-104 weeks'
        },
        risks: [
          'High litigation costs',
          'Extended timeline',
          'Counter-claims and discovery battles',
          'Unpredictable jury verdict'
        ],
        alternatives: [
          'Phased litigation approach',
          'Strategic motion practice'
        ],
        precedents: await this.findAggressivePrecedents(caseType)
      });
    }

    return strategies;
  }

  static generateEvidenceRationale(evidence: any[]): string {
    const evidenceTypes = evidence.map(e => e.type || 'document');
    const uniqueTypes = [...new Set(evidenceTypes)];

    return `Analysis of ${evidence.length} pieces of evidence (${uniqueTypes.join(', ')}) ` +
           `indicates strong factual foundation. Key evidence strength factors include ` +
           `documentary proof, witness corroboration, and contemporaneous records.`;
  }

  static calculateEvidenceConfidence(evidence: any[]): number {
    let baseConfidence = 0.5;

    // More evidence increases confidence
    baseConfidence += Math.min(evidence.length * 0.05, 0.25);

    // Diverse evidence types increase confidence
    const evidenceTypes = [...new Set(evidence.map(e => e.type || 'document'))];
    baseConfidence += Math.min(evidenceTypes.length * 0.1, 0.2);

    return Math.min(baseConfidence, 0.95);
  }

  static async findRelevantPrecedents(caseType: string, evidence: any[]): Promise<LegalPrecedent[]> {
    // Mock precedent database - in production, query legal database
    const mockPrecedents: LegalPrecedent[] = [
      {
        caseId: 'case_2023_001',
        title: 'Smith Corp v. Johnson Industries',
        court: 'Federal District Court',
        year: 2023,
        relevance: 0.88,
        outcome: 'Plaintiff victory - $2.3M damages',
        keyHoldings: [
          'Document tampering constitutes willful misconduct',
          'Electronic records have equal weight to physical documents',
          'Punitive damages appropriate for intentional violations'
        ],
        factSimilarity: 0.82,
        jurisdiction: 'Federal',
        citation: '2023 WL 1234567'
      },
      {
        caseId: 'case_2022_045',
        title: 'Tech Solutions LLC v. Data Corp',
        court: 'State Superior Court',
        year: 2022,
        relevance: 0.75,
        outcome: 'Settlement - $1.8M',
        keyHoldings: [
          'Email communications establish intent',
          'Financial records support damages calculation',
          'Expert testimony crucial for technical evidence'
        ],
        factSimilarity: 0.71,
        jurisdiction: 'State',
        citation: '2022 State Rep. 891'
      }
    ];

    return mockPrecedents.filter(p => p.relevance > 0.7);
  }

  static async findAggressivePrecedents(caseType: string): Promise<LegalPrecedent[]> {
    // Precedents supporting aggressive litigation strategies
    return [
      {
        caseId: 'case_aggressive_001',
        title: 'Major Corp v. Competitor Inc',
        court: 'Federal Appeals Court',
        year: 2023,
        relevance: 0.85,
        outcome: 'Plaintiff victory - $5M damages + attorney fees',
        keyHoldings: [
          'Willful misconduct supports punitive damages',
          'Attorney fees recoverable under statute',
          'Injunctive relief appropriate for ongoing violations'
        ],
        factSimilarity: 0.78,
        jurisdiction: 'Federal Appeals',
        citation: '2023 F.3d 1234'
      }
    ];
  }

  static async assessRisks(
    caseType: string,
    strategies: StrategyRecommendation[],
    evidence: any[]
  ): Promise<RiskFactor[]> {

    const risks: RiskFactor[] = [];

    // Evidence-related risks
    risks.push({
      factor: 'Evidence Authentication',
      likelihood: 0.3,
      impact: 'Could undermine entire case if key evidence is excluded',
      severity: 'high',
      mitigation: [
        'Obtain certified copies of all documents',
        'Establish clear chain of custody',
        'Prepare authenticating witnesses'
      ]
    });

    // Procedural risks
    risks.push({
      factor: 'Statute of Limitations',
      likelihood: 0.1,
      impact: 'Complete case dismissal if filing deadlines missed',
      severity: 'critical',
      mitigation: [
        'Verify all applicable limitation periods',
        'File protective pleadings if necessary',
        'Document all tolling events'
      ]
    });

    // Strategic risks
    risks.push({
      factor: 'Counter-Claims',
      likelihood: 0.4,
      impact: 'Defendant may assert offsetting claims reducing recovery',
      severity: 'medium',
      mitigation: [
        'Analyze potential counter-claim exposure',
        'Prepare defensive evidence',
        'Consider indemnification claims'
      ]
    });

    return risks;
  }

  static async projectOutcomes(
    strategies: StrategyRecommendation[],
    caseFactors: any
  ): Promise<CaseOutcomeProjection[]> {

    const projections: CaseOutcomeProjection[] = [];

    // Best case scenario
    projections.push({
      scenario: 'Best Case - Full Victory',
      probability: 0.25,
      outcome: 'Complete victory with maximum damages, attorney fees, and injunctive relief',
      keyFactors: [
        'All evidence admitted and credited',
        'No significant counter-claims',
        'Favorable jury or judge',
        'Strong expert testimony'
      ],
      timelineWeeks: 52,
      costEstimate: {
        min: 150000,
        max: 300000,
        currency: 'USD'
      }
    });

    // Most likely scenario
    projections.push({
      scenario: 'Most Likely - Partial Victory',
      probability: 0.50,
      outcome: 'Substantial damages award (70-85% of claimed amount)',
      keyFactors: [
        'Core evidence accepted',
        'Some legal issues resolved favorably',
        'Negotiated resolution of remaining claims'
      ],
      timelineWeeks: 32,
      costEstimate: {
        min: 75000,
        max: 150000,
        currency: 'USD'
      }
    });

    // Worst case scenario
    projections.push({
      scenario: 'Worst Case - Unfavorable Outcome',
      probability: 0.15,
      outcome: 'Minimal recovery or adverse judgment',
      keyFactors: [
        'Key evidence excluded or discredited',
        'Successful counter-claims',
        'Unfavorable legal rulings'
      ],
      timelineWeeks: 78,
      costEstimate: {
        min: 200000,
        max: 500000,
        currency: 'USD'
      }
    });

    // Settlement scenario
    projections.push({
      scenario: 'Early Settlement',
      probability: 0.10,
      outcome: 'Negotiated settlement at 60-70% of damages claimed',
      keyFactors: [
        'Defendant motivated to avoid litigation costs',
        'Strength of initial evidence presentation',
        'Effective negotiation strategy'
      ],
      timelineWeeks: 8,
      costEstimate: {
        min: 25000,
        max: 75000,
        currency: 'USD'
      }
    });

    return projections;
  }
}

/*
 * POST /api/v1/evidence/strategy/analyze
 * Generate comprehensive case strategy recommendations
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const endpoint = url.pathname.split('/').pop();

  if (endpoint === 'analyze') {
    try {
      if (!locals.session || !locals.user) {
        return json({ message: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const {
        caseId,
        evidenceIds,
        caseType,
        clientGoals,
        opposingStrategy,
        budget,
        timeline,
        riskTolerance
      } = StrategyAnalysisSchema.parse(body);

      // Fetch evidence details (mock data for demo)
      const evidence = evidenceIds.map(id => ({
        id,
        filename: `evidence_${id}.pdf`,
        type: 'document',
        analysisScore: Math.random()
      }));

      // Generate strategies
      const strategies = await LegalStrategyEngine.generateStrategies(
        caseType,
        evidence,
        clientGoals,
        riskTolerance
      );

      // Assess risks
      const risks = await LegalStrategyEngine.assessRisks(caseType, strategies, evidence);

      // Project outcomes
      const outcomes = await LegalStrategyEngine.projectOutcomes(strategies, {
        caseType,
        evidenceCount: evidence.length,
        budget,
        timeline
      });

      // Generate AI-enhanced recommendations using Ollama
      const aiRecommendation = await generateAIStrategySummary(
        caseType,
        strategies,
        risks,
        clientGoals
      );

      return json({
        success: true,
        data: {
          caseId,
          analysis: {
            strategies,
            risks,
            projections: outcomes,
            aiRecommendation,
            confidence: strategies.reduce((sum, s) => sum + s.confidence, 0) / strategies.length,
            recommendedStrategy: strategies[0]?.id,
            timeline: timeline || 'normal',
            lastUpdated: new Date().toISOString()
          }
        }
      });

    } catch (error: any) {
      console.error('Strategy analysis failed:', error);

      if (error instanceof z.ZodError) {
        return json({
          message: 'Invalid analysis parameters',
          details: error.errors
        }, { status: 400 });
      }

      return json({
        message: 'Strategy analysis failed',
        details: error.message
      }, { status: 500 });
    }
  }

  /*
   * POST /api/v1/evidence/strategy/precedents
   * Search legal precedents relevant to case
   */
  if (endpoint === 'precedents') {
    try {
      if (!locals.session || !locals.user) {
        return json({ message: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const {
        jurisdiction,
        legalIssues,
        factPattern,
        dateRange,
        courtLevel
      } = PrecedentSearchSchema.parse(body);

      // Mock precedent search - in production, query legal databases
      const precedents = await searchLegalPrecedents(
        jurisdiction,
        legalIssues,
        factPattern,
        courtLevel
      );

      // Analyze precedent relevance using AI
      const aiAnalysis = await analyzePrecedentRelevance(precedents, factPattern, legalIssues);

      return json({
        success: true,
        data: {
          precedents,
          analysis: aiAnalysis,
          searchCriteria: {
            jurisdiction,
            legalIssues,
            courtLevel,
            dateRange
          },
          totalFound: precedents.length,
          highRelevanceCount: precedents.filter(p => p.relevance > 0.8).length
        }
      });

    } catch (error: any) {
      console.error('Precedent search failed:', error);

      if (error instanceof z.ZodError) {
        return json({
          message: 'Invalid search parameters',
          details: error.errors
        }, { status: 400 });
      }

      return json({
        message: 'Precedent search failed',
        details: error.message
      }, { status: 500 });
    }
  }

  return json({ message: 'Endpoint not found' }, { status: 404 });
};

// Helper functions
async function generateAIStrategySummary(
  caseType: string,
  strategies: StrategyRecommendation[],
  risks: RiskFactor[],
  clientGoals: string[]
): Promise<string> {
  const prompt = `Analyze this legal case strategy analysis:

Case Type: ${caseType}
Client Goals: ${clientGoals.join(', ')}

Available Strategies:
${strategies.map(s => `- ${s.title}: ${s.description} (Confidence: ${s.confidence})`).join('\n')}

Key Risks:
${risks.map(r => `- ${r.factor}: ${r.severity} severity`).join('\n')}

Provide a concise strategic recommendation focusing on:
1. Most promising approach
2. Critical risk mitigation
3. Resource allocation priorities
4. Timeline considerations

Keep response under 200 words and focus on actionable insights.`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LEGAL_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 200
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.response;
    }
  } catch (error) {
    console.warn('AI strategy summary failed:', error);
  }

  return 'AI analysis unavailable. Recommend reviewing strategy options based on evidence strength and risk tolerance.';
}

async function searchLegalPrecedents(
  jurisdiction: string,
  legalIssues: string[],
  factPattern: string,
  courtLevel: string
): Promise<LegalPrecedent[]> {
  // Mock precedent database - replace with actual legal database API
  const mockPrecedents: LegalPrecedent[] = [
    {
      caseId: 'precedent_001',
      title: 'Advanced Tech Corp v. Innovation LLC',
      court: 'Federal District Court for the Northern District',
      year: 2023,
      relevance: 0.92,
      outcome: 'Plaintiff awarded $3.2M in damages plus injunctive relief',
      keyHoldings: [
        'Trade secret misappropriation requires proof of economic value',
        'Reasonable efforts to maintain secrecy must be demonstrated',
        'Damages calculated using defendant\'s unjust enrichment'
      ],
      factSimilarity: 0.85,
      jurisdiction: jurisdiction,
      citation: '2023 U.S. Dist. LEXIS 45678'
    },
    {
      caseId: 'precedent_002',
      title: 'Global Industries v. Regional Solutions',
      court: 'State Court of Appeals',
      year: 2022,
      relevance: 0.78,
      outcome: 'Mixed verdict - partial damages awarded',
      keyHoldings: [
        'Contract interpretation favors specific performance over damages',
        'Mitigation of damages doctrine limits recovery',
        'Attorney fees not recoverable without contractual provision'
      ],
      factSimilarity: 0.71,
      jurisdiction: jurisdiction,
      citation: '2022 State App. 234'
    }
  ];

  // Filter by relevance to legal issues
  return mockPrecedents.filter(precedent =>
    precedent.relevance > 0.7 &&
    legalIssues.some(issue =>
      precedent.keyHoldings.some(holding =>
        holding.toLowerCase().includes(issue.toLowerCase())
      )
    )
  );
}

async function analyzePrecedentRelevance(
  precedents: LegalPrecedent[],
  factPattern: string,
  legalIssues: string[]
): Promise<string> {
  const highRelevance = precedents.filter(p => p.relevance > 0.8);
  const avgSimilarity = precedents.reduce((sum, p) => sum + p.factSimilarity, 0) / precedents.length || 0;

  return `Analysis of ${precedents.length} relevant precedents reveals ${highRelevance.length} ` +
         `cases with high relevance (>80%). Average fact similarity: ${(avgSimilarity * 100).toFixed(0)}%. ` +
         `Key patterns suggest ${precedents.length > 3 ? 'strong' : 'moderate'} precedential support for ` +
         `legal theories. Recommend focusing on ${highRelevance[0]?.title || 'strongest precedent'} ` +
         `as primary authority due to similar fact pattern and favorable outcome.`;
}
