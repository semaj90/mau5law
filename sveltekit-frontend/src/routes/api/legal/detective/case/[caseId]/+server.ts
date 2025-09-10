import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface DetectiveCase {
  id: string;
  title: string;
  status: 'ACTIVE' | 'PENDING' | 'CLOSED' | 'COLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suspects: Suspect[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
  location: string;
  assignedDetective: string;
  openedDate: string;
  lastUpdated: string;
}

interface Suspect {
  id: string;
  name: string;
  relationship: string;
  opportunityScore: number;
  meansScore: number;
  motiveScore: number;
  overallThreatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  psychologicalMarkers: string[];
  behaviorAnalysis: {
    aggression: number;
    deception: number;
    impulsivity: number;
    planning: number;
  };
  timeline: TimelineEvent[];
  contactInfo?: {
    phone?: string;
    address?: string;
    email?: string;
  };
  priorRecord?: {
    arrests: number;
    convictions: number;
    violentOffenses: boolean;
  };
}

interface TimelineEvent {
  timestamp: string;
  event: string;
  significance: 'LOW' | 'MEDIUM' | 'HIGH';
  evidenceIds: string[];
  correlationScore: number;
  location?: string;
  witnesses?: string[];
}

interface Evidence {
  id: string;
  type: 'DIGITAL' | 'PHYSICAL' | 'WITNESS' | 'FINANCIAL' | 'FORENSIC' | 'DOCUMENTARY';
  description: string;
  relevance: 'LOW' | 'MEDIUM' | 'HIGH';
  integrity: 'INTACT' | 'COMPROMISED' | 'PARTIAL';
  collectedDate: string;
  collectedBy: string;
  chainOfCustody: string[];
  analysisStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';
  findings?: string;
}

export const GET: RequestHandler = async ({ params }) => {
  try {
    const caseId = params.caseId;
    
    if (!caseId) {
      return json(
        { success: false, error: 'Case ID required' },
        { status: 400 }
      );
    }

    // In production, this would query the database
    const caseData = await getDetectiveCaseData(caseId);
    
    if (!caseData) {
      return json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    return json({
      success: true,
      case: caseData.case,
      suspects: caseData.suspects,
      timeline: caseData.timeline,
      evidence: caseData.evidence,
      analytics: {
        totalSuspects: caseData.suspects.length,
        totalEvidence: caseData.evidence.length,
        timelineSpan: calculateTimelineSpan(caseData.timeline),
        riskLevel: calculateOverallRiskLevel(caseData.suspects)
      }
    });

  } catch (error) {
    console.error('Detective case API error:', error);
    return json(
      { success: false, error: 'Failed to retrieve case data', case: null },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const caseId = params.caseId;
    const updates = await request.json();

    if (!caseId) {
      return json(
        { success: false, error: 'Case ID required' },
        { status: 400 }
      );
    }

    // In production, this would update the database
    const updatedCase = await updateDetectiveCase(caseId, updates);

    return json({
      success: true,
      case: updatedCase,
      message: 'Case updated successfully'
    });

  } catch (error) {
    console.error('Detective case update error:', error);
    return json(
      { success: false, error: 'Failed to update case data' },
      { status: 500 }
    );
  }
};

async function getDetectiveCaseData(caseId: string): Promise<{
  case: DetectiveCase;
  suspects: Suspect[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
} | null> {
  
  // Mock implementation - in production, query database
  if (!caseId.startsWith('CASE-')) {
    return null;
  }

  const mockCase: DetectiveCase = {
    id: caseId,
    title: `Criminal Investigation - Case ${caseId}`,
    status: 'ACTIVE',
    priority: 'HIGH',
    suspects: [],
    timeline: [],
    evidence: [],
    location: 'Downtown District',
    assignedDetective: 'Det. Sarah Martinez',
    openedDate: '2024-01-15T09:00:00Z',
    lastUpdated: new Date().toISOString()
  };

  const mockSuspects: Suspect[] = [
    {
      id: 'SUSPECT-001',
      name: 'John D. Anderson',
      relationship: 'Former Business Partner',
      opportunityScore: 82,
      meansScore: 75,
      motiveScore: 88,
      overallThreatLevel: 'HIGH',
      psychologicalMarkers: [
        'Narcissistic traits',
        'Poor impulse control',
        'Financial stress',
        'History of workplace conflicts',
        'Substance abuse indicators'
      ],
      behaviorAnalysis: {
        aggression: 78,
        deception: 65,
        impulsivity: 89,
        planning: 45
      },
      timeline: [],
      contactInfo: {
        phone: '(555) 123-4567',
        address: '123 Oak Street, Apt 4B',
        email: 'j.anderson.email@domain.com'
      },
      priorRecord: {
        arrests: 3,
        convictions: 1,
        violentOffenses: false
      }
    },
    {
      id: 'SUSPECT-002', 
      name: 'Maria L. Rodriguez',
      relationship: 'Former Employee',
      opportunityScore: 67,
      meansScore: 52,
      motiveScore: 73,
      overallThreatLevel: 'MEDIUM',
      psychologicalMarkers: [
        'Revenge motivation',
        'Social isolation',
        'Financial desperation'
      ],
      behaviorAnalysis: {
        aggression: 45,
        deception: 78,
        impulsivity: 32,
        planning: 84
      },
      timeline: [],
      contactInfo: {
        phone: '(555) 987-6543',
        address: '456 Pine Avenue, Unit 2A'
      },
      priorRecord: {
        arrests: 0,
        convictions: 0,
        violentOffenses: false
      }
    }
  ];

  const mockTimeline: TimelineEvent[] = [
    {
      timestamp: '2024-01-15T10:30:00Z',
      event: 'Threatening email sent to victim from suspect\'s known email account',
      significance: 'HIGH',
      evidenceIds: ['E001', 'E007'],
      correlationScore: 0.92,
      location: 'Digital - Sent from home IP address',
      witnesses: ['IT Administrator - Email server logs']
    },
    {
      timestamp: '2024-01-18T14:15:00Z', 
      event: 'Suspect observed conducting surveillance of victim\'s workplace',
      significance: 'HIGH',
      evidenceIds: ['E003', 'E008'],
      correlationScore: 0.87,
      location: 'Victim workplace parking lot',
      witnesses: ['Security Guard Johnson', 'Receptionist Williams']
    },
    {
      timestamp: '2024-01-20T14:15:00Z',
      event: 'Suspicious financial transactions - large cash withdrawals',
      significance: 'MEDIUM',
      evidenceIds: ['E002'],
      correlationScore: 0.78,
      location: 'First National Bank - Downtown Branch'
    },
    {
      timestamp: '2024-01-25T16:45:00Z',
      event: 'Physical altercation witnessed at victim\'s residence',
      significance: 'HIGH',
      evidenceIds: ['E004', 'E005'],
      correlationScore: 0.94,
      location: '789 Maple Drive - Victim residence',
      witnesses: ['Neighbor Mrs. Thompson', 'Neighbor Mr. Chen']
    },
    {
      timestamp: '2024-02-01T09:00:00Z',
      event: 'Public confrontation witnessed at courthouse',
      significance: 'HIGH',
      evidenceIds: ['E003', 'E006'],
      correlationScore: 0.85,
      location: 'County Courthouse - Main entrance',
      witnesses: ['Court Clerk Davis', 'Attorney Mitchell']
    },
    {
      timestamp: '2024-02-05T11:30:00Z',
      event: 'Suspect purchased items consistent with crime preparation',
      significance: 'MEDIUM',
      evidenceIds: ['E009'],
      correlationScore: 0.71,
      location: 'Hardware store - 5th Avenue',
      witnesses: ['Store Clerk Peterson']
    }
  ];

  const mockEvidence: Evidence[] = [
    {
      id: 'E001',
      type: 'DIGITAL',
      description: 'Threatening email with detailed knowledge of victim\'s schedule and personal information',
      relevance: 'HIGH',
      integrity: 'INTACT',
      collectedDate: '2024-01-15T12:00:00Z',
      collectedBy: 'Digital Forensics Unit - Tech. Anderson',
      chainOfCustody: ['Tech. Anderson', 'Det. Martinez', 'Evidence Locker 247'],
      analysisStatus: 'COMPLETE',
      findings: 'Email headers confirm origin from suspect\'s home IP address. Metadata shows creation time consistent with suspect alibi contradictions.'
    },
    {
      id: 'E002',
      type: 'FINANCIAL',
      description: 'Bank records showing unusual large cash withdrawals totaling $15,000 over 3 days',
      relevance: 'MEDIUM',
      integrity: 'INTACT',
      collectedDate: '2024-01-22T10:30:00Z',
      collectedBy: 'Financial Crimes Unit - Det. Wilson',
      chainOfCustody: ['Det. Wilson', 'Det. Martinez', 'Evidence Locker 248'],
      analysisStatus: 'COMPLETE',
      findings: 'Withdrawals occurred in amounts just below reporting thresholds. Pattern suggests deliberate avoidance of bank reporting requirements.'
    },
    {
      id: 'E003',
      type: 'WITNESS',
      description: 'Multiple witness statements of public confrontations and threatening behavior',
      relevance: 'HIGH',
      integrity: 'INTACT',
      collectedDate: '2024-02-02T14:00:00Z',
      collectedBy: 'Det. Martinez',
      chainOfCustody: ['Det. Martinez', 'Evidence Locker 249'],
      analysisStatus: 'COMPLETE',
      findings: 'Consistent statements from 4 independent witnesses describing escalating aggressive behavior and specific threats made by suspect.'
    },
    {
      id: 'E004',
      type: 'PHYSICAL',
      description: 'Security camera footage from victim\'s residence showing physical altercation',
      relevance: 'HIGH',
      integrity: 'INTACT',
      collectedDate: '2024-01-26T08:00:00Z',
      collectedBy: 'Crime Scene Unit - Off. Rodriguez',
      chainOfCustody: ['Off. Rodriguez', 'Det. Martinez', 'Evidence Locker 250'],
      analysisStatus: 'IN_PROGRESS',
      findings: 'Clear video evidence shows suspect initiating physical contact. Audio analysis reveals specific threats made during altercation.'
    },
    {
      id: 'E005',
      type: 'FORENSIC',
      description: 'DNA evidence collected from victim\'s property after altercation',
      relevance: 'HIGH',
      integrity: 'INTACT',
      collectedDate: '2024-01-26T10:00:00Z',
      collectedBy: 'Crime Scene Unit - Tech. Johnson',
      chainOfCustody: ['Tech. Johnson', 'Forensics Lab', 'Det. Martinez', 'Evidence Locker 251'],
      analysisStatus: 'PENDING',
      findings: null
    },
    {
      id: 'E006',
      type: 'DOCUMENTARY',
      description: 'Court records showing previous legal disputes between suspect and victim',
      relevance: 'MEDIUM',
      integrity: 'INTACT',
      collectedDate: '2024-02-03T09:15:00Z',
      collectedBy: 'Legal Research Unit - Paralegal Davis',
      chainOfCustody: ['Paralegal Davis', 'Det. Martinez', 'Evidence Locker 252'],
      analysisStatus: 'COMPLETE',
      findings: 'Records show 3-year pattern of legal disputes, escalating financial stakes, and suspect\'s consistent pattern of non-compliance with court orders.'
    },
    {
      id: 'E007',
      type: 'DIGITAL',
      description: 'Social media posts showing suspect\'s state of mind and threats',
      relevance: 'MEDIUM',
      integrity: 'PARTIAL',
      collectedDate: '2024-01-16T15:30:00Z',
      collectedBy: 'Digital Forensics Unit - Tech. Lee',
      chainOfCustody: ['Tech. Lee', 'Det. Martinez', 'Evidence Locker 253'],
      analysisStatus: 'COMPLETE',
      findings: 'Screenshots captured before suspect deleted posts. Content shows escalating anger and veiled threats toward victim. Some posts were deleted before capture.'
    },
    {
      id: 'E008',
      type: 'PHYSICAL',
      description: 'Surveillance photos of suspect observing victim\'s workplace',
      relevance: 'HIGH',
      integrity: 'INTACT',
      collectedDate: '2024-01-19T16:00:00Z',
      collectedBy: 'Surveillance Unit - Det. Chen',
      chainOfCustody: ['Det. Chen', 'Det. Martinez', 'Evidence Locker 254'],
      analysisStatus: 'COMPLETE',
      findings: 'High-resolution photos clearly identify suspect conducting surveillance over 3 separate days. Vehicle license plate matches suspect\'s registered vehicle.'
    },
    {
      id: 'E009',
      type: 'DOCUMENTARY',
      description: 'Purchase records for items that could be used in crime (rope, duct tape, etc.)',
      relevance: 'MEDIUM',
      integrity: 'INTACT',
      collectedDate: '2024-02-06T11:00:00Z',
      collectedBy: 'Det. Martinez',
      chainOfCustody: ['Store Manager', 'Det. Martinez', 'Evidence Locker 255'],
      analysisStatus: 'COMPLETE',
      findings: 'Credit card records and store surveillance confirm suspect purchased unusual combination of items consistent with restraint and confinement preparations.'
    }
  ];

  return {
    case: mockCase,
    suspects: mockSuspects,
    timeline: mockTimeline,
    evidence: mockEvidence
  };
}

async function updateDetectiveCase(caseId: string, updates: any): Promise<DetectiveCase | null> {
  // Mock implementation - in production, update database
  const existing = await getDetectiveCaseData(caseId);
  if (!existing) return null;

  return {
    ...existing.case,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
}

function calculateTimelineSpan(timeline: TimelineEvent[]): string {
  if (timeline.length === 0) return 'No events';
  
  const dates = timeline.map(event => new Date(event.timestamp));
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const latest = new Date(Math.max(...dates.map(d => d.getTime())));
  
  const diffMs = latest.getTime() - earliest.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return `${diffDays} days`;
}

function calculateOverallRiskLevel(suspects: Suspect[]): string {
  if (suspects.length === 0) return 'UNKNOWN';
  
  const highRiskCount = suspects.filter(s => s.overallThreatLevel === 'HIGH' || s.overallThreatLevel === 'CRITICAL').length;
  const totalSuspects = suspects.length;
  
  if (highRiskCount / totalSuspects >= 0.5) return 'HIGH';
  if (highRiskCount > 0) return 'MEDIUM';
  return 'LOW';
}