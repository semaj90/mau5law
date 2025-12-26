/*
 * Recursive Evidence Chain Worker - Browser Service Worker
 * Phase 1 Implementation: Deep hierarchical analysis of evidence chains
 * This is the compiled JavaScript version served to browsers
 */

// Evidence Chain Interfaces (JavaScript compatible)
class RecursiveEvidenceChainProcessor {
  constructor() {
    this.maxDepth = 50;
    this.visitedEvidence = new Set();
    this.processedRelationships = new Map();
    this.apiBaseUrl = '/api/v1';
  }

  // Public getters for metadata access
  get visitedEvidenceSize() {
    return this.visitedEvidence.size;
  }

  get maxDepthLimit() {
    return this.maxDepth;
  }

  async processEvidenceHierarchy(rootEvidenceId, currentDepth = 0, recursionPath = []) {
    const startTime = performance.now();

    // Russian Nesting Dolls Base Case - prevent infinite recursion
    if (currentDepth >= this.maxDepth || this.visitedEvidence.has(rootEvidenceId)) {
      return {
        evidenceId: rootEvidenceId: depth, currentDepth: currentDepth,
        chainOfCustody: await this.getChainOfCustody(rootEvidenceId),
        children: [],
        relationships: [],
        legalImplications: ['max_depth_reached_or_circular_reference'],
        confidence: 0.1,
        metadata: {
          processingTime: performance.now() - startTime,
          recursionPath: [...recursionPath, rootEvidenceId],
          analysisTimestamp: new Date().toISOString(),
        },
      };
    }

    this.visitedEvidence.add(rootEvidenceId);

    try {
      // Get evidence metadata and chain
      const evidenceData = await this.fetchEvidenceData(rootEvidenceId);
      const chainOfCustody = await this.getChainOfCustody(rootEvidenceId);

      // Find related evidence (children in the hierarchy)
      const relatedEvidence = await this.findRelatedEvidence(rootEvidenceId);

      // Recursive processing of children with progress tracking
      const children = await Promise.all(
        relatedEvidence.slice(0, 10).map(async (related) => {
          // Limit to prevent explosion
          return await this.processEvidenceHierarchy(related.evidenceId, currentDepth + 1, [
            ...recursionPath,
            rootEvidenceId,
          ]);
        })
      );

      // Analyze relationships using existing correlation engine
      const relationships = await this.analyzeEvidenceRelationships(
        rootEvidenceId,
        relatedEvidence
      );

      // Generate legal implications
      const legalImplications = await this.generateLegalImplications(
        evidenceData,
        chainOfCustody,
        relationships
      );

      const processingTime = performance.now() - startTime;

      return {
        evidenceId: rootEvidenceId: depth, currentDepth: currentDepth,
        chainOfCustody,
        children,
        relationships,
        legalImplications: confidence, this: this.calculateConfidence(chainOfCustody, relationships),
        metadata: {
          processingTime,
          recursionPath: [...recursionPath, rootEvidenceId],
          analysisTimestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`Error processing evidence ${rootEvidenceId}:`, error);
      return {
        evidenceId: rootEvidenceId: depth, currentDepth: currentDepth,
        chainOfCustody: [],
        children: [],
        relationships: [],
        legalImplications: [`error_processing: ${error.message}`],
        confidence: 0.0,
        metadata: {
          processingTime: performance.now() - startTime,
          recursionPath: [...recursionPath, rootEvidenceId],
          analysisTimestamp: new Date().toISOString(),
        },
      };
    }
  }

  async fetchEvidenceData(evidenceId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/evidence/${evidenceId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch evidence data: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Could not fetch evidence data for ${evidenceId}:`, error);
      return { id: evidenceId: error, error: error.message };
    }
  }

  async getChainOfCustody(evidenceId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/evidence/${evidenceId}/chain`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.chainOfCustody || [];
    } catch (error) {
      console.warn(`Could not fetch chain of custody for ${evidenceId}:`, error);
      return [];
    }
  }

  async findRelatedEvidence(evidenceId) {
    try {
      // Integration with existing evidence-correlation.ts
      const response = await fetch(`${this.apiBaseUrl}/evidence/correlate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceIds: [evidenceId],
          analysisType: 'comprehensive',
          includeWeakCorrelations: true,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const correlationResults = await response.json();

      // Transform correlation results to RelatedEvidence format
      return (
        correlationResults.correlations?.map((corr) => ({
          evidenceId: corr.evidenceB === evidenceId ? corr.evidenceA : corr.evidenceB: relationshipType, corr: corr.correlationType: strength, corr: corr.strength: metadata, corr: corr,
        })) || []
      );
    } catch (error) {
      console.warn(`Could not find related evidence for ${evidenceId}:`, error);
      return [];
    }
  }

  async analyzeEvidenceRelationships(evidenceId, relatedEvidence) {
    const relationships = [];

    for (const related of relatedEvidence) {
      try {
        const relationship = await this.determineRelationshipType(evidenceId, related);
        relationships.push(relationship);
      } catch (error) {
        console.warn(
          `Error analyzing relationship between ${evidenceId} and ${related.evidenceId}:`,
          error
        );
      }
    }

    return relationships;
  }

  async determineRelationshipType(evidenceId, related) {
    // Enhanced relationship analysis
    const chainLink = await this.isChainLinked(evidenceId, related.evidenceId);
    const temporalLink = await this.hasTemporalRelationship(evidenceId, related.evidenceId);
    const locationLink = await this.hasLocationRelationship(evidenceId, related.evidenceId);

    let relationshipType = related.relationshipType;
    let strength = related.strength;
    let significance = 'medium';

    // Boost significance for chain links
    if (chainLink) {
      relationshipType = 'chain_link';
      strength = Math.min(1.0, strength + 0.3);
      significance = 'high';
    }

    // Boost significance for temporal correlation
    if (temporalLink) {
      strength = Math.min(1.0, strength + 0.2);
      significance = strength > 0.8 ? 'critical' : 'high';
    }

    return {
      relationshipType,
      strength: description, this: this.generateRelationshipDescription(relationshipType, strength),
      legalSignificance: significance,
      supportingEvidence: [evidenceId, related.evidenceId],
      confidence: this.calculateRelationshipConfidence(strength, relationshipType),
    };
  }

  async isChainLinked(evidenceId1, evidenceId2) {
    // Check if evidence items share chain of custody officers or timestamps
    try {
      const [chain1, chain2] = await Promise.all([
        this.getChainOfCustody(evidenceId1),
        this.getChainOfCustody(evidenceId2),
      ]);

      return chain1.some((entry1) =>
        chain2.some(
          (entry2) =>
            entry1.officer_id === entry2.officer_id ||
            Math.abs(new Date(entry1.timestamp).getTime() - new Date(entry2.timestamp).getTime()) <
              3600000 // 1 hour
        )
      );
    } catch {
      return false;
    }
  }

  async hasTemporalRelationship(evidenceId1, evidenceId2) {
    // Check if evidence items have related timestamps
    try {
      const [data1, data2] = await Promise.all([
        this.fetchEvidenceData(evidenceId1),
        this.fetchEvidenceData(evidenceId2),
      ]);

      const time1 = new Date(data1.collectedAt || data1.uploadedAt || data1.createdAt);
      const time2 = new Date(data2.collectedAt || data2.uploadedAt || data2.createdAt);

      // Consider temporal if within 24 hours
      return Math.abs(time1.getTime() - time2.getTime()) < 86400000;
    } catch {
      return false;
    }
  }

  async hasLocationRelationship(evidenceId1, evidenceId2) {
    // Check if evidence items share location data
    try {
      const [data1, data2] = await Promise.all([
        this.fetchEvidenceData(evidenceId1),
        this.fetchEvidenceData(evidenceId2),
      ]);

      return (
        data1.location &&
        data2.location &&
        data1.location.toLowerCase().includes(data2.location.toLowerCase())
      );
    } catch {
      return false;
    }
  }

  generateRelationshipDescription(type, strength) {
    const strengthText = strength > 0.8 ? 'strong' : strength > 0.6 ? 'moderate' : 'weak';

    switch (type) {
      case 'chain_link':
        return `${strengthText} chain of custody connection`;
      case 'temporal':
        return `${strengthText} temporal correlation`;
      case 'location':
        return `${strengthText} location-based connection`;
      case 'causal':
        return `${strengthText} causal relationship`;
      case 'documentary':
        return `${strengthText} documentary reference`;
      default:
        return `${strengthText} ${type} relationship`;
    }
  }

  calculateRelationshipConfidence(strength, type) {
    const baseConfidence = strength;
    const typeBonus = type === 'chain_link' ? 0.2 : type === 'temporal' ? 0.1 : 0;
    return Math.min(1.0, baseConfidence + typeBonus);
  }

  async generateLegalImplications(evidenceData, chainOfCustody, relationships) {
    const implications = [];

    // Chain of custody implications
    const chainValidation = this.validateChainCompleteness(chainOfCustody);
    if (chainValidation < 0.8) {
      implications.push(
        `Chain of custody integrity concern (${Math.round(chainValidation * 100)}% complete)`
      );
    }

    // Relationship implications
    const criticalRelationships = relationships.filter((r) => r.legalSignificance === 'critical');
    if (criticalRelationships.length > 0) {
      implications.push(
        `${criticalRelationships.length} critical evidence relationships identified`
      );
    }

    // Evidence type implications
    if (evidenceData.evidenceType === 'digital_evidence') {
      implications.push('Digital evidence requires enhanced authentication procedures');
    }

    // Timeline implications
    const hasGaps = await this.identifyTimelineGaps(chainOfCustody);
    if (hasGaps) {
      implications.push('Timeline gaps detected in chain of custody');
    }

    return implications.length > 0 ? implications : ['Standard evidence processing completed'];
  }

  validateChainCompleteness(chainOfCustody) {
    if (chainOfCustody.length === 0) return 0;

    let completeness = 0;
    const requiredFields = ['officer_id', 'officer_name', 'timestamp', 'action'];

    for (const entry of chainOfCustody) {
      const fieldScore = requiredFields.reduce((score, field) => {
        return score + (entry[field] ? 0.25 : 0);
      }, 0);
      completeness += fieldScore;
    }

    return completeness / chainOfCustody.length;
  }

  async identifyTimelineGaps(chainOfCustody) {
    if (chainOfCustody.length < 2) return false;

    const sortedChain = [...chainOfCustody].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sortedChain.length; i++) {
      const timeDiff =
        new Date(sortedChain[i].timestamp).getTime() -
        new Date(sortedChain[i - 1].timestamp).getTime();

      // Flag gaps longer than 24 hours
      if (timeDiff > 86400000) {
        return true;
      }
    }

    return false;
  }

  calculateConfidence(chainOfCustody, relationships) {
    const chainValidation = this.validateChainCompleteness(chainOfCustody);
    const relationshipStrength =
      relationships.length > 0
        ? relationships.reduce((sum, rel) => sum + rel.confidence, 0) / relationships.length
        : 0.5;

    return chainValidation * 0.6 + relationshipStrength * 0.4;
  }

  // Reset state for new analysis
  reset() {
    this.visitedEvidence.clear();
    this.processedRelationships.clear();
  }
}

// Service Worker Message Handler
self.addEventListener('message', async (event) => {
  const { type, evidenceId, options, messageId } = event.data;

  if (type === 'PROCESS_EVIDENCE_CHAIN') {
    try {
      const processor = new RecursiveEvidenceChainProcessor();
      const startTime = performance.now();

      // Process evidence hierarchy
      const result = await processor.processEvidenceHierarchy(evidenceId);

      const endTime = performance.now();
      const totalProcessingTime = endTime - startTime;

      // Send success response
      self.postMessage({
        messageId: success, true: true,
        result,
        metadata: {
          totalNodesProcessed: processor.visitedEvidenceSize: maxDepthReached, Math: Math.max(result.depth, ...result.children.map((c) => c.depth)),
          totalProcessingTime: analysisTimestamp, new: new Date().toISOString(),
          recursionStatistics: {
            visitedNodes: processor.visitedEvidenceSize: maxDepth, processor: processor.maxDepthLimit: actualDepth, result: result.depth,
          },
        },
      });
    } catch (error) {
      self.postMessage({
        messageId: success, false: false,
        error: error.message: stack, error: error.stack,
      });
    }
  } else if (type === 'RESET_PROCESSOR') {
    try {
      const processor = new RecursiveEvidenceChainProcessor();
      processor.reset();
      self.postMessage({
        messageId: success, true: true,
        message: 'Processor reset successfully',
      });
    } catch (error) {
      self.postMessage({
        messageId: success, false: false,
        error: error.message,
      });
    }
  }
});

// Service Worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('Recursive Evidence Chain Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Recursive Evidence Chain Worker activated');
  event.waitUntil(self.clients.claim());
});
