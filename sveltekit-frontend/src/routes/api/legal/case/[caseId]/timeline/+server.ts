import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface TimelineEvent {
  id: string;
  caseId: string;
  title: string;
  description: string;
  eventType: 'INCIDENT' | 'EVIDENCE_COLLECTION' | 'LEGAL_FILING' | 'COURT_HEARING' | 'INVESTIGATION' | 'COMMUNICATION' | 'DECISION';
  category: string;
  subcategory?: string;
  timestamp: string;
  endTimestamp?: string; // For events with duration
  location?: string;
  participants: string[];
  evidenceIds: string[];
  documentIds: string[];
  significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  verified: boolean;
  source: string;
  sourceType: 'WITNESS' | 'DOCUMENT' | 'PHYSICAL_EVIDENCE' | 'DIGITAL_EVIDENCE' | 'OFFICIAL_RECORD' | 'EXPERT_ANALYSIS';
  confidence: number; // 0-1
  metadata: {
    weather?: string;
    lighting?: string;
    witnesses?: string[];
    recordingDevice?: string;
    chain_of_custody?: string[];
    tags: string[];
  };
  correlations: {
    before: string[]; // Event IDs that occurred before and may be related
    after: string[]; // Event IDs that occurred after and may be related
    concurrent: string[]; // Events that occurred at the same time
    causal: string[]; // Events that this event may have caused
  };
  legalImplications: {
    relevantLaws: string[];
    potentialCharges?: string[];
    evidentialValue: number; // 0-100
    admissibilityIssues: string[];
  };
  analysisNotes?: string;
  updates: Array<{
    timestamp: string;
    updatedBy: string;
    changes: string;
    reason: string;
  }>;
}

interface TimelineAnalysis {
  totalEvents: number;
  timeRange: {
    start: string;
    end: string;
    duration: string;
  };
  eventsByType: Record<string, number>;
  eventsBySignificance: Record<string, number>;
  correlationClusters: Array<{
    id: string;
    events: string[];
    theme: string;
    significance: string;
  }>;
  gaps: Array<{
    start: string;
    end: string;
    duration: string;
    potentialMissingEvents: string[];
  }>;
  inconsistencies: Array<{
    events: string[];
    issue: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

interface TimelineRequest {
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
  significance?: string[];
  includeEvidence?: boolean;
  includeAnalysis?: boolean;
  groupBy?: 'none' | 'type' | 'significance' | 'date' | 'participant';
  sortBy?: 'chronological' | 'significance' | 'type';
  sortOrder?: 'asc' | 'desc';
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

    // Parse query parameters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const eventTypes = url.searchParams.get('eventTypes')?.split(',');
    const significance = url.searchParams.get('significance')?.split(',');
    const includeEvidence = url.searchParams.get('includeEvidence') === 'true';
    const includeAnalysis = url.searchParams.get('includeAnalysis') === 'true';
    const groupBy = url.searchParams.get('groupBy') || 'none';
    const sortBy = url.searchParams.get('sortBy') || 'chronological';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    const request: TimelineRequest = {
      startDate,
      endDate,
      eventTypes,
      significance,
      includeEvidence,
      includeAnalysis,
      groupBy: groupBy as TimelineRequest['groupBy'],
      sortBy: sortBy as TimelineRequest['sortBy'],
      sortOrder: sortOrder as TimelineRequest['sortOrder']
    };

    // Get timeline events
    const timelineData = await getTimelineEvents(caseId, request);
    
    // Get analysis if requested
    let analysis = null;
    if (includeAnalysis) {
      analysis = await generateTimelineAnalysis(timelineData.events);
    }

    return json({
      success: true,
      caseId,
      timeline: timelineData.events,
      analysis,
      metadata: {
        totalEvents: timelineData.events.length,
        dateRange: {
          start: timelineData.events.length > 0 ? timelineData.events[0].timestamp : null,
          end: timelineData.events.length > 0 ? timelineData.events[timelineData.events.length - 1].timestamp : null
        },
        filters: request,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Timeline API error:', error);
    return json(
      { success: false, error: 'Failed to retrieve timeline data' },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const caseId = params.caseId;
    const eventData = await request.json();

    if (!caseId) {
      return json(
        { success: false, error: 'Case ID required' },
        { status: 400 }
      );
    }

    // Validate event data
    if (!eventData.title || !eventData.timestamp) {
      return json(
        { success: false, error: 'Event title and timestamp are required' },
        { status: 400 }
      );
    }

    // Create new timeline event
    const newEvent = await createTimelineEvent(caseId, eventData);
    
    // Generate correlations with existing events
    const updatedCorrelations = await updateEventCorrelations(newEvent);

    return json({
      success: true,
      event: newEvent,
      correlations: updatedCorrelations,
      message: 'Timeline event created successfully'
    });

  } catch (error) {
    console.error('Timeline creation error:', error);
    return json(
      { success: false, error: 'Failed to create timeline event' },
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

    // Update timeline events
    const updatedEvents = await updateTimelineEvents(caseId, updates);
    
    // Regenerate analysis
    const analysis = await generateTimelineAnalysis(updatedEvents);

    return json({
      success: true,
      updatedEvents,
      analysis,
      message: 'Timeline updated successfully'
    });

  } catch (error) {
    console.error('Timeline update error:', error);
    return json(
      { success: false, error: 'Failed to update timeline' },
      { status: 500 }
    );
  }
};

async function getTimelineEvents(caseId: string, request: TimelineRequest): Promise<{ events: TimelineEvent[] }> {
  // In production, this would query the database
  // For now, generate comprehensive mock timeline events

  let mockEvents = generateMockTimelineEvents(caseId);

  // Apply filters
  if (request.startDate) {
    mockEvents = mockEvents.filter(event => event.timestamp >= request.startDate!);
  }

  if (request.endDate) {
    mockEvents = mockEvents.filter(event => event.timestamp <= request.endDate!);
  }

  if (request.eventTypes && request.eventTypes.length > 0) {
    mockEvents = mockEvents.filter(event => request.eventTypes!.includes(event.eventType));
  }

  if (request.significance && request.significance.length > 0) {
    mockEvents = mockEvents.filter(event => request.significance!.includes(event.significance));
  }

  // Apply sorting
  switch (request.sortBy) {
    case 'chronological':
      mockEvents.sort((a, b) => {
        const comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        return request.sortOrder === 'desc' ? -comparison : comparison;
      });
      break;
    case 'significance':
      const significanceOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      mockEvents.sort((a, b) => {
        const comparison = significanceOrder[a.significance] - significanceOrder[b.significance];
        return request.sortOrder === 'desc' ? -comparison : comparison;
      });
      break;
    case 'type':
      mockEvents.sort((a, b) => {
        const comparison = a.eventType.localeCompare(b.eventType);
        return request.sortOrder === 'desc' ? -comparison : comparison;
      });
      break;
  }

  return { events: mockEvents };
}

async function generateTimelineAnalysis(events: TimelineEvent[]): Promise<TimelineAnalysis> {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      timeRange: { start: '', end: '', duration: '' },
      eventsByType: {},
      eventsBySignificance: {},
      correlationClusters: [],
      gaps: [],
      inconsistencies: []
    };
  }

  // Calculate time range
  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const start = sortedEvents[0].timestamp;
  const end = sortedEvents[sortedEvents.length - 1].timestamp;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // Count events by type
  const eventsByType: Record<string, number> = {};
  events.forEach(event => {
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
  });

  // Count events by significance
  const eventsBySignificance: Record<string, number> = {};
  events.forEach(event => {
    eventsBySignificance[event.significance] = (eventsBySignificance[event.significance] || 0) + 1;
  });

  // Generate correlation clusters
  const correlationClusters = generateCorrelationClusters(events);

  // Identify gaps
  const gaps = identifyTimelineGaps(sortedEvents);

  // Find inconsistencies
  const inconsistencies = findTimelineInconsistencies(events);

  return {
    totalEvents: events.length,
    timeRange: {
      start,
      end,
      duration: `${durationDays} days`
    },
    eventsByType,
    eventsBySignificance,
    correlationClusters,
    gaps,
    inconsistencies
  };
}

async function createTimelineEvent(caseId: string, eventData: any): Promise<TimelineEvent> {
  // In production, this would create in database
  const newEvent: TimelineEvent = {
    id: `EVENT-${Date.now()}`,
    caseId,
    title: eventData.title,
    description: eventData.description || '',
    eventType: eventData.eventType || 'INVESTIGATION',
    category: eventData.category || 'General',
    subcategory: eventData.subcategory,
    timestamp: eventData.timestamp,
    endTimestamp: eventData.endTimestamp,
    location: eventData.location,
    participants: eventData.participants || [],
    evidenceIds: eventData.evidenceIds || [],
    documentIds: eventData.documentIds || [],
    significance: eventData.significance || 'MEDIUM',
    verified: eventData.verified || false,
    source: eventData.source || 'Manual Entry',
    sourceType: eventData.sourceType || 'OFFICIAL_RECORD',
    confidence: eventData.confidence || 0.8,
    metadata: {
      ...eventData.metadata,
      tags: eventData.metadata?.tags || []
    },
    correlations: {
      before: [],
      after: [],
      concurrent: [],
      causal: []
    },
    legalImplications: {
      relevantLaws: eventData.legalImplications?.relevantLaws || [],
      potentialCharges: eventData.legalImplications?.potentialCharges,
      evidentialValue: eventData.legalImplications?.evidentialValue || 50,
      admissibilityIssues: eventData.legalImplications?.admissibilityIssues || []
    },
    analysisNotes: eventData.analysisNotes,
    updates: [{
      timestamp: new Date().toISOString(),
      updatedBy: 'System',
      changes: 'Event created',
      reason: 'Initial creation'
    }]
  };

  return newEvent;
}

async function updateEventCorrelations(newEvent: TimelineEvent): Promise<any> {
  // Mock correlation analysis
  return {
    correlationsFound: Math.floor(Math.random() * 5) + 1,
    strongCorrelations: Math.floor(Math.random() * 2),
    weakCorrelations: Math.floor(Math.random() * 3) + 1
  };
}

async function updateTimelineEvents(caseId: string, updates: any): Promise<TimelineEvent[]> {
  // Mock update implementation
  const mockEvents = generateMockTimelineEvents(caseId);
  
  // Apply updates (mock implementation)
  return mockEvents.map(event => ({
    ...event,
    updates: [...event.updates, {
      timestamp: new Date().toISOString(),
      updatedBy: 'User',
      changes: 'Batch update applied',
      reason: 'Timeline reconstruction'
    }]
  }));
}

function generateMockTimelineEvents(caseId: string): TimelineEvent[] {
  const eventTypes: TimelineEvent['eventType'][] = ['INCIDENT', 'EVIDENCE_COLLECTION', 'LEGAL_FILING', 'COURT_HEARING', 'INVESTIGATION', 'COMMUNICATION', 'DECISION'];
  const categories = ['Crime Scene', 'Investigation', 'Legal Process', 'Evidence Handling', 'Witness Activity', 'Court Proceedings'];
  const significanceLevels: TimelineEvent['significance'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const sourceTypes: TimelineEvent['sourceType'][] = ['WITNESS', 'DOCUMENT', 'PHYSICAL_EVIDENCE', 'DIGITAL_EVIDENCE', 'OFFICIAL_RECORD', 'EXPERT_ANALYSIS'];
  
  const baseDate = new Date('2024-01-15');
  
  return Array.from({ length: 20 }, (_, i) => {
    const eventDate = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000) + (Math.random() * 12 * 60 * 60 * 1000));
    
    return {
      id: `EVENT-${String(i + 1).padStart(3, '0')}`,
      caseId,
      title: `${categories[i % categories.length]} Event ${i + 1}`,
      description: `Detailed description of timeline event ${i + 1} with comprehensive information about what occurred, who was involved, and the significance to the case.`,
      eventType: eventTypes[i % eventTypes.length],
      category: categories[i % categories.length],
      subcategory: i % 3 === 0 ? 'Primary' : 'Secondary',
      timestamp: eventDate.toISOString(),
      endTimestamp: Math.random() > 0.7 ? new Date(eventDate.getTime() + (Math.random() * 4 * 60 * 60 * 1000)).toISOString() : undefined,
      location: ['Crime Scene Alpha', 'Police Station', 'Court House', 'Evidence Facility', 'Witness Location'][Math.floor(Math.random() * 5)],
      participants: generateRandomParticipants(),
      evidenceIds: [`EVIDENCE-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`, `EVIDENCE-${String(Math.floor(Math.random() * 10) + 11).padStart(3, '0')}`],
      documentIds: [`DOC-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`],
      significance: significanceLevels[Math.floor(Math.random() * significanceLevels.length)],
      verified: Math.random() > 0.2,
      source: ['Officer Martinez', 'Detective Johnson', 'CSI Team', 'Witness Statement', 'Court Record'][Math.floor(Math.random() * 5)],
      sourceType: sourceTypes[Math.floor(Math.random() * sourceTypes.length)],
      confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
      metadata: {
        weather: ['Clear', 'Rainy', 'Overcast', 'Sunny'][Math.floor(Math.random() * 4)],
        lighting: ['Daylight', 'Artificial', 'Low Light', 'Dark'][Math.floor(Math.random() * 4)],
        witnesses: generateRandomWitnesses(),
        recordingDevice: Math.random() > 0.5 ? ['Body Camera', 'Security Camera', 'Phone', 'Dashboard Cam'][Math.floor(Math.random() * 4)] : undefined,
        chain_of_custody: ['Collected', 'Logged', 'Analyzed', 'Stored'],
        tags: generateRandomTags()
      },
      correlations: {
        before: i > 0 ? [`EVENT-${String(Math.max(1, i)).padStart(3, '0')}`] : [],
        after: i < 19 ? [`EVENT-${String(i + 2).padStart(3, '0')}`] : [],
        concurrent: Math.random() > 0.8 ? [`EVENT-${String(Math.max(1, i + Math.floor(Math.random() * 3) - 1)).padStart(3, '0')}`] : [],
        causal: Math.random() > 0.7 ? [`EVENT-${String(Math.min(20, i + Math.floor(Math.random() * 3) + 1)).padStart(3, '0')}`] : []
      },
      legalImplications: {
        relevantLaws: ['Criminal Code Section 123', 'Evidence Act Section 45', 'Procedure Rule 67'].slice(0, Math.floor(Math.random() * 3) + 1),
        potentialCharges: Math.random() > 0.6 ? ['Assault', 'Theft', 'Fraud'].slice(0, Math.floor(Math.random() * 2) + 1) : undefined,
        evidentialValue: Math.floor(Math.random() * 40) + 60, // 60-100
        admissibilityIssues: Math.random() > 0.8 ? ['Chain of custody concerns', 'Authentication required'] : []
      },
      analysisNotes: Math.random() > 0.5 ? `Analysis notes for event ${i + 1} including investigative observations and preliminary conclusions.` : undefined,
      updates: [{
        timestamp: eventDate.toISOString(),
        updatedBy: 'System',
        changes: 'Initial event creation',
        reason: 'Timeline construction'
      }]
    };
  });
}

function generateRandomParticipants(): string[] {
  const participants = ['John Doe', 'Jane Smith', 'Officer Martinez', 'Detective Johnson', 'Witness Alpha', 'Expert Beta'];
  return participants.slice(0, Math.floor(Math.random() * 3) + 1);
}

function generateRandomWitnesses(): string[] {
  const witnesses = ['Witness A', 'Witness B', 'Bystander C', 'Employee D'];
  return witnesses.slice(0, Math.floor(Math.random() * 2) + 1);
}

function generateRandomTags(): string[] {
  const tags = ['important', 'verified', 'disputed', 'key-evidence', 'witness-account', 'expert-analysis'];
  return tags.slice(0, Math.floor(Math.random() * 3) + 1);
}

function generateCorrelationClusters(events: TimelineEvent[]): TimelineAnalysis['correlationClusters'] {
  // Mock correlation cluster generation
  return [
    {
      id: 'CLUSTER-001',
      events: events.slice(0, 3).map(e => e.id),
      theme: 'Initial Investigation Phase',
      significance: 'HIGH'
    },
    {
      id: 'CLUSTER-002',
      events: events.slice(5, 8).map(e => e.id),
      theme: 'Evidence Collection Period',
      significance: 'CRITICAL'
    },
    {
      id: 'CLUSTER-003',
      events: events.slice(10, 13).map(e => e.id),
      theme: 'Legal Proceedings',
      significance: 'MEDIUM'
    }
  ];
}

function identifyTimelineGaps(sortedEvents: TimelineEvent[]): TimelineAnalysis['gaps'] {
  const gaps: TimelineAnalysis['gaps'] = [];
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const current = new Date(sortedEvents[i].timestamp);
    const next = new Date(sortedEvents[i + 1].timestamp);
    const gapMs = next.getTime() - current.getTime();
    const gapDays = gapMs / (1000 * 60 * 60 * 24);
    
    // Identify gaps larger than 2 days
    if (gapDays > 2) {
      gaps.push({
        start: sortedEvents[i].timestamp,
        end: sortedEvents[i + 1].timestamp,
        duration: `${Math.round(gapDays)} days`,
        potentialMissingEvents: [
          'Follow-up investigation activities',
          'Evidence processing',
          'Witness interviews',
          'Administrative processing'
        ]
      });
    }
  }
  
  return gaps;
}

function findTimelineInconsistencies(events: TimelineEvent[]): TimelineAnalysis['inconsistencies'] {
  // Mock inconsistency detection
  return [
    {
      events: [events[2]?.id, events[5]?.id].filter(Boolean),
      issue: 'Conflicting witness statements about timing',
      severity: 'MEDIUM'
    },
    {
      events: [events[8]?.id, events[12]?.id].filter(Boolean),
      issue: 'Evidence collection dates do not align with incident reports',
      severity: 'HIGH'
    }
  ];
}