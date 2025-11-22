/**
 * Graph Service
 * Manages Neo4j operations for case relationships and similar case queries
 */

import neo4j, { type Driver, type Session } from 'neo4j-driver';
import type { SimilarCase } from '$lib/types/case-summary';

export class GraphService {
  private driver: Driver;

  constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  /**
   * Create relationships between case and statutes
   */
  async createCaseStatuteRelationships(caseId: string, statutes: any[]): Promise<void> {
    const session = this.driver.session();

    try {
      for (const statute of statutes) {
        await session.run(
          `
          MERGE (c:Case {id: $caseId})
          MERGE (s:Statute {code: $code, jurisdiction: $jurisdiction})
          SET s.title = $title, s.text = $text
          MERGE (c)-[:CHARGES_WITH]->(s)
          `,
          {
            caseId,
            code: statute.code,
            jurisdiction: statute.jurisdiction,
            title: statute.title,
            text: statute.text,
          }
        );
      }
    } catch (error) {
      console.error('Error creating case-statute relationships:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Find similar cases by charge bundle
   */
  async findSimilarCases(caseId: string, limit: number = 5): Promise<SimilarCase[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (c:Case {id: $caseId})-[:CHARGES_WITH]->(s:Statute)
        MATCH (other:Case)-[:CHARGES_WITH]->(s)
        WHERE other.id <> $caseId
        WITH other, count(s) as commonCharges, collect(s.code) as charges
        RETURN other.id as id, other.title as title, charges, other.outcome as outcome,
               commonCharges as relevanceScore
        ORDER BY relevanceScore DESC
        LIMIT $limit
        `,
        { caseId, limit }
      );

      return result.records.map((record) => ({
        id: record.get('id'),
        title: record.get('title') || 'Unknown',
        charges: record.get('charges') || [],
        outcome: record.get('outcome') || 'Unknown',
        relevanceScore: record.get('relevanceScore') / 100, // Normalize to 0-1
      }));
    } catch (error) {
      console.error('Error finding similar cases:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Rank precedents by relevance score
   */
  async rankCasesByRelevance(caseIds: string[], referenceCharges: string[]): Promise<SimilarCase[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        UNWIND $caseIds as caseId
        MATCH (c:Case {id: caseId})-[:CHARGES_WITH]->(s:Statute)
        WHERE s.code IN $referenceCharges
        WITH c, count(s) as matchingCharges, collect(s.code) as charges
        RETURN c.id as id, c.title as title, charges, c.outcome as outcome,
               matchingCharges as relevanceScore
        ORDER BY relevanceScore DESC
        `,
        { caseIds, referenceCharges }
      );

      return result.records.map((record) => ({
        id: record.get('id'),
        title: record.get('title') || 'Unknown',
        charges: record.get('charges') || [],
        outcome: record.get('outcome') || 'Unknown',
        relevanceScore: record.get('relevanceScore') / 100,
      }));
    } catch (error) {
      console.error('Error ranking cases by relevance:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Create citation relationships
   */
  async createCitationRelationships(fromStatute: string, toStatutes: string[]): Promise<void> {
    const session = this.driver.session();

    try {
      for (const toStatute of toStatutes) {
        await session.run(
          `
          MATCH (s1:Statute {code: $from})
          MATCH (s2:Statute {code: $to})
          MERGE (s1)-[:CITES]->(s2)
          `,
          { from: fromStatute, to: toStatute }
        );
      }
    } catch (error) {
      console.error('Error creating citation relationships:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Close the driver connection
   */
  async close(): Promise<void> {
    await this.driver.close();
  }
}

export const graphService = new GraphService();
