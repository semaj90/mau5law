import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface NarrativeSection {
  id: string;
  title: string;
  content: string;
  sectionType: 'OPENING' | 'FACTS' | 'EVIDENCE' | 'ARGUMENT' | 'CONCLUSION' | 'TIMELINE' | 'WITNESS' | 'EXPERT';
  order: number;
  wordCount: number;
  confidence: number;
  lastUpdated: string;
  aiGenerated: boolean;
  sources: string[];
  tags: string[];
  legalReferences: string[];
  evidenceReferences: string[];
  metadata: {
    tone: 'FORMAL' | 'PERSUASIVE' | 'NEUTRAL' | 'AGGRESSIVE' | 'DEFENSIVE';
    audience: 'JUDGE' | 'JURY' | 'OPPOSING_COUNSEL' | 'CLIENT' | 'GENERAL';
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'EXPERT';
    style: 'NARRATIVE' | 'ANALYTICAL' | 'CHRONOLOGICAL' | 'THEMATIC';
  };
  suggestions: Array<{
    type: 'IMPROVEMENT' | 'ADDITION' | 'REVISION' | 'CITATION';
    text: string;
    rationale: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  revisionHistory: Array<{
    timestamp: string;
    author: string;
    changes: string;
    reason: string;
    version: number;
  }>;
}

interface CaseNarrative {
  id: string;
  caseId: string;
  title: string;
  narrativeType: 'OPENING_STATEMENT' | 'CLOSING_ARGUMENT' | 'CASE_SUMMARY' | 'BRIEF' | 'MOTION' | 'INVESTIGATION_REPORT';
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'FINAL';
  sections: NarrativeSection[];
  totalWordCount: number;
  estimatedReadingTime: number;
  overallConfidence: number;
  createdAt: string;
  lastModified: string;
  author: string;
  reviewers: string[];
  template?: string;
  aiAssistanceLevel: 'NONE' | 'SUGGESTIONS' | 'COLLABORATIVE' | 'FULLY_GENERATED';
  qualityMetrics: {
    clarity: number;
    persuasiveness: number;
    factualAccuracy: number;
    legalSoundness: number;
    coherence: number;
  };
}

interface NarrativeRequest {
  narrativeType?: CaseNarrative['narrativeType'];
  sections?: string[];
  tone?: NarrativeSection['metadata']['tone'];
  audience?: NarrativeSection['metadata']['audience'];
  includeEvidence?: boolean;
  includeTimeline?: boolean;
  includeWitnesses?: boolean;
  aiAssistance?: boolean;
  template?: string;
  maxWordCount?: number;
  focusAreas?: string[];
}

interface AIWritingAssistance {
  suggestions: Array<{
    section: string;
    type: 'CONTENT' | 'STRUCTURE' | 'STYLE' | 'LEGAL' | 'FACTUAL';
    suggestion: string;
    explanation: string;
    confidence: number;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  alternativePhrasings: Array<{
    original: string;
    alternatives: string[];
    context: string;
  }>;
  factChecking: Array<{
    claim: string;
    verification: 'VERIFIED' | 'DISPUTED' | 'UNVERIFIED';
    sources: string[];
    notes: string;
  }>;
  legalReferences: Array<{
    concept: string;
    suggestedCitations: string[];
    relevance: number;
  }>;
  strengthWeaknessAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const caseId = params.caseId;
    
    if (!caseId) {
      return json(
        { success: false, error: 'Case ID required' },
        { status: 400 }
      );
    }

    const narrativeId = url.searchParams.get('narrativeId');
    const includeAI = url.searchParams.get('includeAI') === 'true';
    const includeRevisions = url.searchParams.get('includeRevisions') === 'true';

    if (narrativeId) {
      // Get specific narrative
      const narrative = await getCaseNarrative(caseId, narrativeId, includeRevisions);
      let aiAssistance = null;
      
      if (includeAI && narrative) {
        aiAssistance = await generateAIWritingAssistance(narrative);
      }

      return json({
        success: true,
        narrative,
        aiAssistance
      });
    } else {
      // Get all narratives for case
      const narratives = await getAllCaseNarratives(caseId);
      
      return json({
        success: true,
        narratives,
        totalCount: narratives.length
      });
    }

  } catch (error) {
    console.error('Narrative API error:', error);
    return json(
      { success: false, error: 'Failed to retrieve narrative data' },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const caseId = params.caseId;
    const narrativeRequest: NarrativeRequest = await request.json();

    if (!caseId) {
      return json(
        { success: false, error: 'Case ID required' },
        { status: 400 }
      );
    }

    // Generate new narrative
    const narrative = await generateCaseNarrative(caseId, narrativeRequest);
    
    // Generate AI assistance if requested
    let aiAssistance = null;
    if (narrativeRequest.aiAssistance) {
      aiAssistance = await generateAIWritingAssistance(narrative);
    }

    return json({
      success: true,
      narrative,
      aiAssistance,
      message: 'Case narrative generated successfully'
    });

  } catch (error) {
    console.error('Narrative generation error:', error);
    return json(
      { success: false, error: 'Failed to generate narrative' },
      { status: 500 }
    );
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const caseId = params.caseId;
    const updates = await request.json();

    if (!caseId) {
      return json(
        { success: false, error: 'Case ID required' },
        { status: 400 }
      );
    }

    const narrativeId = updates.narrativeId;
    if (!narrativeId) {
      return json(
        { success: false, error: 'Narrative ID required for updates' },
        { status: 400 }
      );
    }

    // Update narrative
    const updatedNarrative = await updateCaseNarrative(caseId, narrativeId, updates);
    
    // Generate fresh AI assistance
    const aiAssistance = await generateAIWritingAssistance(updatedNarrative);

    return json({
      success: true,
      narrative: updatedNarrative,
      aiAssistance,
      message: 'Narrative updated successfully'
    });

  } catch (error) {
    console.error('Narrative update error:', error);
    return json(
      { success: false, error: 'Failed to update narrative' },
      { status: 500 }
    );
  }
};

async function getCaseNarrative(caseId: string, narrativeId: string, includeRevisions: boolean = false): Promise<CaseNarrative | null> {
  // In production, query database
  // For now, generate mock narrative
  
  return generateMockNarrative(caseId, narrativeId, includeRevisions);
}

async function getAllCaseNarratives(caseId: string): Promise<CaseNarrative[]> {
  // Mock implementation - return multiple narratives
  return [
    generateMockNarrative(caseId, 'NARRATIVE-001', false),
    generateMockNarrative(caseId, 'NARRATIVE-002', false),
    generateMockNarrative(caseId, 'NARRATIVE-003', false)
  ].filter(Boolean) as CaseNarrative[];
}

async function generateCaseNarrative(caseId: string, request: NarrativeRequest): Promise<CaseNarrative> {
  // Mock AI-generated narrative based on request
  const narrativeId = `NARRATIVE-${Date.now()}`;
  
  const sections: NarrativeSection[] = [
    {
      id: 'SECTION-001',
      title: 'Case Overview',
      content: generateNarrativeContent('OPENING', request),
      sectionType: 'OPENING',
      order: 1,
      wordCount: 250,
      confidence: 0.88,
      lastUpdated: new Date().toISOString(),
      aiGenerated: true,
      sources: ['Case File', 'Evidence Report'],
      tags: ['overview', 'introduction'],
      legalReferences: [],
      evidenceReferences: ['EVIDENCE-001', 'EVIDENCE-002'],
      metadata: {
        tone: request.tone || 'FORMAL',
        audience: request.audience || 'JUDGE',
        complexity: 'MODERATE',
        style: 'NARRATIVE'
      },
      suggestions: [],
      revisionHistory: [{
        timestamp: new Date().toISOString(),
        author: 'AI Assistant',
        changes: 'Initial generation',
        reason: 'Narrative creation',
        version: 1
      }]
    },
    {
      id: 'SECTION-002',
      title: 'Factual Background',
      content: generateNarrativeContent('FACTS', request),
      sectionType: 'FACTS',
      order: 2,
      wordCount: 500,
      confidence: 0.92,
      lastUpdated: new Date().toISOString(),
      aiGenerated: true,
      sources: ['Witness Statements', 'Police Report', 'Evidence Analysis'],
      tags: ['facts', 'background', 'chronology'],
      legalReferences: [],
      evidenceReferences: ['EVIDENCE-003', 'EVIDENCE-004', 'EVIDENCE-005'],
      metadata: {
        tone: request.tone || 'NEUTRAL',
        audience: request.audience || 'JUDGE',
        complexity: 'MODERATE',
        style: 'CHRONOLOGICAL'
      },
      suggestions: [],
      revisionHistory: [{
        timestamp: new Date().toISOString(),
        author: 'AI Assistant',
        changes: 'Initial generation',
        reason: 'Narrative creation',
        version: 1
      }]
    },
    {
      id: 'SECTION-003',
      title: 'Evidence Analysis',
      content: generateNarrativeContent('EVIDENCE', request),
      sectionType: 'EVIDENCE',
      order: 3,
      wordCount: 750,
      confidence: 0.85,
      lastUpdated: new Date().toISOString(),
      aiGenerated: true,
      sources: ['Forensic Reports', 'Expert Analysis', 'Chain of Custody'],
      tags: ['evidence', 'analysis', 'forensics'],
      legalReferences: ['Evidence Act Section 45', 'Criminal Code 123'],
      evidenceReferences: ['EVIDENCE-001', 'EVIDENCE-002', 'EVIDENCE-003', 'EVIDENCE-006'],
      metadata: {
        tone: request.tone || 'FORMAL',
        audience: request.audience || 'JUDGE',
        complexity: 'COMPLEX',
        style: 'ANALYTICAL'
      },
      suggestions: [],
      revisionHistory: [{
        timestamp: new Date().toISOString(),
        author: 'AI Assistant',
        changes: 'Initial generation',
        reason: 'Narrative creation',
        version: 1
      }]
    }
  ];

  const totalWordCount = sections.reduce((sum, section) => sum + section.wordCount, 0);

  return {
    id: narrativeId,
    caseId,
    title: `${request.narrativeType || 'Case Summary'} - ${caseId}`,
    narrativeType: request.narrativeType || 'CASE_SUMMARY',
    status: 'DRAFT',
    sections,
    totalWordCount,
    estimatedReadingTime: Math.ceil(totalWordCount / 250), // Assume 250 words per minute
    overallConfidence: sections.reduce((sum, section) => sum + section.confidence, 0) / sections.length,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    author: 'AI Assistant',
    reviewers: [],
    template: request.template,
    aiAssistanceLevel: request.aiAssistance ? 'FULLY_GENERATED' : 'NONE',
    qualityMetrics: {
      clarity: 0.87,
      persuasiveness: 0.82,
      factualAccuracy: 0.94,
      legalSoundness: 0.89,
      coherence: 0.91
    }
  };
}

async function updateCaseNarrative(caseId: string, narrativeId: string, updates: any): Promise<CaseNarrative> {
  // Mock update implementation
  const existing = await getCaseNarrative(caseId, narrativeId) || generateMockNarrative(caseId, narrativeId);
  
  if (!existing) {
    throw new Error('Narrative not found');
  }

  // Apply updates
  const updatedNarrative: CaseNarrative = {
    ...existing,
    ...updates,
    lastModified: new Date().toISOString(),
    sections: updates.sections ? updates.sections.map((section: any, index: number) => ({
      ...section,
      lastUpdated: new Date().toISOString(),
      revisionHistory: [
        ...section.revisionHistory,
        {
          timestamp: new Date().toISOString(),
          author: 'User',
          changes: 'Section updated',
          reason: 'Manual revision',
          version: section.revisionHistory.length + 1
        }
      ]
    })) : existing.sections
  };

  // Recalculate metrics
  updatedNarrative.totalWordCount = updatedNarrative.sections.reduce((sum, section) => sum + section.wordCount, 0);
  updatedNarrative.estimatedReadingTime = Math.ceil(updatedNarrative.totalWordCount / 250);
  updatedNarrative.overallConfidence = updatedNarrative.sections.reduce((sum, section) => sum + section.confidence, 0) / updatedNarrative.sections.length;

  return updatedNarrative;
}

async function generateAIWritingAssistance(narrative: CaseNarrative): Promise<AIWritingAssistance> {
  // Mock AI writing assistance
  return {
    suggestions: [
      {
        section: 'SECTION-001',
        type: 'CONTENT',
        suggestion: 'Consider adding more specific details about the timeline of events',
        explanation: 'Specific temporal markers help establish a clearer chronological framework',
        confidence: 0.82,
        impact: 'MEDIUM'
      },
      {
        section: 'SECTION-002',
        type: 'STRUCTURE',
        suggestion: 'Reorganize paragraphs to follow chronological order more clearly',
        explanation: 'Chronological organization improves readability and logical flow',
        confidence: 0.75,
        impact: 'HIGH'
      },
      {
        section: 'SECTION-003',
        type: 'LEGAL',
        suggestion: 'Include citation to relevant case law supporting evidence admissibility',
        explanation: 'Legal precedent strengthens evidentiary arguments',
        confidence: 0.91,
        impact: 'HIGH'
      },
      {
        section: 'SECTION-001',
        type: 'STYLE',
        suggestion: 'Use more active voice to improve clarity and impact',
        explanation: 'Active voice creates stronger, more direct statements',
        confidence: 0.69,
        impact: 'MEDIUM'
      },
      {
        section: 'SECTION-003',
        type: 'FACTUAL',
        suggestion: 'Verify forensic analysis timeline against evidence collection dates',
        explanation: 'Ensuring chronological consistency prevents credibility challenges',
        confidence: 0.88,
        impact: 'HIGH'
      }
    ],
    alternativePhrasings: [
      {
        original: 'The evidence clearly shows',
        alternatives: [
          'The evidence demonstrates',
          'The evidence establishes',
          'The evidence conclusively proves',
          'The evidence indicates'
        ],
        context: 'Opening statement emphasis'
      },
      {
        original: 'Based on the facts presented',
        alternatives: [
          'Given the established facts',
          'In light of the evidence',
          'Considering the documented facts',
          'Based on the record'
        ],
        context: 'Factual analysis introduction'
      }
    ],
    factChecking: [
      {
        claim: 'Incident occurred on January 15, 2024',
        verification: 'VERIFIED',
        sources: ['Police Report PR-2024-001', 'Witness Statement WS-001'],
        notes: 'Multiple independent sources confirm this date'
      },
      {
        claim: 'Evidence was collected within 24 hours',
        verification: 'DISPUTED',
        sources: ['Evidence Log EL-2024-001'],
        notes: 'Some evidence items show collection dates beyond 24-hour window'
      },
      {
        claim: 'All witnesses provided consistent testimony',
        verification: 'UNVERIFIED',
        sources: ['Witness Statements WS-001, WS-002, WS-003'],
        notes: 'Minor inconsistencies noted in witness accounts requiring clarification'
      }
    ],
    legalReferences: [
      {
        concept: 'Chain of custody',
        suggestedCitations: [
          'State v. Johnson, 567 U.S. 123 (2023)',
          'Evidence Code Section 1401',
          'Federal Rules of Evidence 901'
        ],
        relevance: 0.94
      },
      {
        concept: 'Expert testimony admissibility',
        suggestedCitations: [
          'Daubert v. Merrell Dow Pharmaceuticals, 509 U.S. 579 (1993)',
          'Federal Rules of Evidence 702',
          'State Evidence Code Section 801'
        ],
        relevance: 0.87
      },
      {
        concept: 'Hearsay exceptions',
        suggestedCitations: [
          'Federal Rules of Evidence 803',
          'Crawford v. Washington, 541 U.S. 36 (2004)',
          'State v. Martinez, 789 F.3d 456 (2022)'
        ],
        relevance: 0.72
      }
    ],
    strengthWeaknessAnalysis: {
      strengths: [
        'Strong chronological organization improves readability',
        'Comprehensive evidence analysis demonstrates thoroughness',
        'Clear factual presentation supports legal arguments',
        'Appropriate tone and style for intended audience'
      ],
      weaknesses: [
        'Some sections lack specific supporting citations',
        'Potential timeline inconsistencies need clarification',
        'Limited discussion of opposing arguments',
        'Missing analysis of evidence authentication challenges'
      ],
      recommendations: [
        'Add legal citations to strengthen evidentiary arguments',
        'Include section addressing potential counterarguments',
        'Verify and resolve any chronological inconsistencies',
        'Consider adding expert testimony to support technical claims',
        'Expand discussion of evidence chain of custody procedures'
      ]
    }
  };
}

function generateMockNarrative(caseId: string, narrativeId: string, includeRevisions: boolean = false): CaseNarrative {
  const narrativeTypes: CaseNarrative['narrativeType'][] = ['OPENING_STATEMENT', 'CLOSING_ARGUMENT', 'CASE_SUMMARY', 'BRIEF', 'MOTION', 'INVESTIGATION_REPORT'];
  const selectedType = narrativeTypes[Math.floor(Math.random() * narrativeTypes.length)];
  
  const sections = generateMockSections(selectedType, includeRevisions);
  const totalWordCount = sections.reduce((sum, section) => sum + section.wordCount, 0);

  return {
    id: narrativeId,
    caseId,
    title: `${selectedType.replace('_', ' ')} - ${caseId}`,
    narrativeType: selectedType,
    status: ['DRAFT', 'REVIEW', 'APPROVED', 'FINAL'][Math.floor(Math.random() * 4)] as CaseNarrative['status'],
    sections,
    totalWordCount,
    estimatedReadingTime: Math.ceil(totalWordCount / 250),
    overallConfidence: Math.random() * 0.3 + 0.7,
    createdAt: new Date(2024, 0, 15 + Math.floor(Math.random() * 30)).toISOString(),
    lastModified: new Date().toISOString(),
    author: ['Legal AI', 'Attorney Smith', 'Paralegal Johnson'][Math.floor(Math.random() * 3)],
    reviewers: ['Senior Partner', 'Associate Attorney'],
    template: Math.random() > 0.5 ? 'Standard Case Brief Template' : undefined,
    aiAssistanceLevel: ['SUGGESTIONS', 'COLLABORATIVE', 'FULLY_GENERATED'][Math.floor(Math.random() * 3)] as CaseNarrative['aiAssistanceLevel'],
    qualityMetrics: {
      clarity: Math.random() * 0.3 + 0.7,
      persuasiveness: Math.random() * 0.3 + 0.7,
      factualAccuracy: Math.random() * 0.2 + 0.8,
      legalSoundness: Math.random() * 0.3 + 0.7,
      coherence: Math.random() * 0.3 + 0.7
    }
  };
}

function generateMockSections(narrativeType: CaseNarrative['narrativeType'], includeRevisions: boolean): NarrativeSection[] {
  const sectionConfigs = {
    'OPENING_STATEMENT': [
      { type: 'OPENING', title: 'Introduction' },
      { type: 'FACTS', title: 'Key Facts' },
      { type: 'ARGUMENT', title: 'Legal Arguments' }
    ],
    'CLOSING_ARGUMENT': [
      { type: 'OPENING', title: 'Summary' },
      { type: 'EVIDENCE', title: 'Evidence Review' },
      { type: 'ARGUMENT', title: 'Final Arguments' },
      { type: 'CONCLUSION', title: 'Conclusion' }
    ],
    'CASE_SUMMARY': [
      { type: 'OPENING', title: 'Case Overview' },
      { type: 'FACTS', title: 'Factual Background' },
      { type: 'EVIDENCE', title: 'Evidence Analysis' },
      { type: 'CONCLUSION', title: 'Summary' }
    ],
    'BRIEF': [
      { type: 'OPENING', title: 'Statement of Issues' },
      { type: 'FACTS', title: 'Statement of Facts' },
      { type: 'ARGUMENT', title: 'Argument' },
      { type: 'CONCLUSION', title: 'Conclusion' }
    ],
    'MOTION': [
      { type: 'OPENING', title: 'Motion Introduction' },
      { type: 'FACTS', title: 'Relevant Facts' },
      { type: 'ARGUMENT', title: 'Legal Basis' }
    ],
    'INVESTIGATION_REPORT': [
      { type: 'OPENING', title: 'Investigation Summary' },
      { type: 'FACTS', title: 'Findings' },
      { type: 'EVIDENCE', title: 'Evidence Summary' },
      { type: 'CONCLUSION', title: 'Recommendations' }
    ]
  };

  const configs = sectionConfigs[narrativeType] || sectionConfigs['CASE_SUMMARY'];

  return configs.map((config, index) => ({
    id: `SECTION-${String(index + 1).padStart(3, '0')}`,
    title: config.title,
    content: generateNarrativeContent(config.type as NarrativeSection['sectionType']),
    sectionType: config.type as NarrativeSection['sectionType'],
    order: index + 1,
    wordCount: Math.floor(Math.random() * 500) + 200,
    confidence: Math.random() * 0.3 + 0.7,
    lastUpdated: new Date().toISOString(),
    aiGenerated: Math.random() > 0.3,
    sources: generateMockSources(),
    tags: generateMockTags(config.type),
    legalReferences: Math.random() > 0.5 ? generateMockLegalReferences() : [],
    evidenceReferences: Math.random() > 0.4 ? generateMockEvidenceReferences() : [],
    metadata: {
      tone: ['FORMAL', 'PERSUASIVE', 'NEUTRAL'][Math.floor(Math.random() * 3)] as NarrativeSection['metadata']['tone'],
      audience: ['JUDGE', 'JURY', 'OPPOSING_COUNSEL'][Math.floor(Math.random() * 3)] as NarrativeSection['metadata']['audience'],
      complexity: ['MODERATE', 'COMPLEX'][Math.floor(Math.random() * 2)] as NarrativeSection['metadata']['complexity'],
      style: ['NARRATIVE', 'ANALYTICAL', 'CHRONOLOGICAL'][Math.floor(Math.random() * 3)] as NarrativeSection['metadata']['style']
    },
    suggestions: Math.random() > 0.6 ? generateMockSuggestions() : [],
    revisionHistory: includeRevisions ? generateMockRevisionHistory() : [{
      timestamp: new Date().toISOString(),
      author: 'AI Assistant',
      changes: 'Initial creation',
      reason: 'Section generation',
      version: 1
    }]
  }));
}

function generateNarrativeContent(sectionType: NarrativeSection['sectionType'], request?: NarrativeRequest): string {
  const contentTemplates = {
    'OPENING': 'This case involves [key legal issue] that occurred on [date]. The evidence will show [main argument]. The central question before this court is [legal question].',
    'FACTS': 'On [date], at approximately [time], the following events occurred: [chronological facts]. These facts are supported by [evidence sources] and witness testimony.',
    'EVIDENCE': 'The evidence in this case includes [evidence list]. Each piece of evidence demonstrates [relevance to case]. The chain of custody has been properly maintained.',
    'ARGUMENT': 'Based on the facts presented and applicable law, [legal argument]. The precedent established in [case citation] supports this position.',
    'CONCLUSION': 'In conclusion, the evidence clearly establishes [findings]. Therefore, we respectfully request that the court [requested relief].',
    'TIMELINE': 'The relevant timeline of events is as follows: [chronological events]. This sequence demonstrates [pattern or causation].',
    'WITNESS': 'Witness testimony will establish [key points]. The credibility of these witnesses is supported by [corroborating evidence].',
    'EXPERT': 'Expert analysis reveals [technical findings]. The methodology used meets the standards established in [legal standard].'
  };

  let baseContent = contentTemplates[sectionType] || contentTemplates['FACTS'];
  
  // Customize based on request parameters
  if (request?.tone === 'AGGRESSIVE') {
    baseContent = baseContent.replace('respectfully request', 'demand').replace('demonstrates', 'clearly proves');
  } else if (request?.tone === 'DEFENSIVE') {
    baseContent = baseContent.replace('clearly establishes', 'suggests').replace('proves', 'indicates');
  }

  return `${baseContent}\n\n[This is a mock narrative section generated for demonstration purposes. In a production system, this would contain actual case-specific content generated by AI based on case facts, evidence, and legal research.]`;
}

function generateMockSources(): string[] {
  const sources = ['Police Report', 'Witness Statement', 'Expert Analysis', 'Forensic Report', 'Case Law', 'Medical Records', 'Financial Documents'];
  return sources.slice(0, Math.floor(Math.random() * 3) + 1);
}

function generateMockTags(sectionType: string): string[] {
  const tagMap = {
    'OPENING': ['introduction', 'overview', 'key-issues'],
    'FACTS': ['chronology', 'background', 'events'],
    'EVIDENCE': ['forensics', 'analysis', 'proof'],
    'ARGUMENT': ['legal-theory', 'precedent', 'reasoning'],
    'CONCLUSION': ['summary', 'recommendations', 'relief']
  };
  
  return tagMap[sectionType as keyof typeof tagMap] || ['general'];
}

function generateMockLegalReferences(): string[] {
  return [
    'Federal Rules of Evidence 401',
    'State v. Johnson, 567 U.S. 123 (2023)',
    'Criminal Procedure Code Section 45',
    'Constitutional Amendment IV'
  ].slice(0, Math.floor(Math.random() * 2) + 1);
}

function generateMockEvidenceReferences(): string[] {
  return Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => `EVIDENCE-${String(i + 1).padStart(3, '0')}`);
}

function generateMockSuggestions(): NarrativeSection['suggestions'] {
  return [
    {
      type: 'IMPROVEMENT',
      text: 'Consider strengthening this argument with additional case law',
      rationale: 'More legal precedent would enhance persuasiveness',
      priority: 'MEDIUM'
    },
    {
      type: 'CITATION',
      text: 'Add citation to support factual claim',
      rationale: 'Unsupported claims reduce credibility',
      priority: 'HIGH'
    }
  ].slice(0, Math.floor(Math.random() * 2) + 1);
}

function generateMockRevisionHistory(): NarrativeSection['revisionHistory'] {
  return [
    {
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      author: 'AI Assistant',
      changes: 'Initial creation',
      reason: 'Section generation',
      version: 1
    },
    {
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      author: 'Attorney Smith',
      changes: 'Added legal citations and refined argument structure',
      reason: 'Legal review and enhancement',
      version: 2
    },
    {
      timestamp: new Date().toISOString(),
      author: 'Senior Partner',
      changes: 'Final review and approval',
      reason: 'Quality control',
      version: 3
    }
  ];
}