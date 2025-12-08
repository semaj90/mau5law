import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import {
  evidence,
  evidenceRelationships,
  timelineEvents,
  graphNodes,
  graphEdges,
  evidenceTypeEnum,
  relationshipStrengthEnum,
  nodeTypeEnum,
  timelineEventTypeEnum
} from '../src/lib/db/schema/evidence.js';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db';

console.log(`🔌 Connecting to database...`);
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  const CASE_ID = '3f9e8756-4c22-4d56-b092-233918076634'; // Consistent demo case ID

  console.log('🗑️  Cleaning up old evidence data...');
  // Note: Cascading deletes should handle relations, but we'll be explicit
  // We won't delete the case itself (assuming it exists or we don't strictly reference it for this demo)
  // If you have foreign key constraints to a 'cases' table, you might need to create the case first.
  // For this standalone demo, we assume the case ID is valid or constraints aren't strict yet.

  try {
    await db.delete(evidenceRelationships);
    await db.delete(graphEdges);
    await db.delete(graphNodes);
    await db.delete(timelineEvents);
    await db.delete(evidence);
    console.log('✅ Cleanup complete.');
  } catch (e) {
    console.warn('⚠️  Cleanup warning (tables might not exist yet):', e.message);
  }

  console.log('📝 Seeding evidence...');

  // 1. Evidence Items
  const ev1 = await db.insert(evidence).values({
    caseId: CASE_ID,
    evidenceNumber: 'EV-001',
    title: 'Security Camera – Lobby',
    type: 'video',
    summary: 'Footage from 21:34–21:52 showing suspect entering the lobby.',
    posX: 80,
    posY: 120,
    collectedBy: 'Ofc. 2B',
    collectedAt: new Date('2024-12-05T22:00:00')
  }).returning();

  const ev2 = await db.insert(evidence).values({
    caseId: CASE_ID,
    evidenceNumber: 'EV-002',
    title: 'Witness Statement – K. Ito',
    type: 'document',
    summary: 'Witness describes verbal threat in parking garage, level B2.',
    posX: 380,
    posY: 220,
    collectedBy: 'Det. 9S',
    collectedAt: new Date('2024-12-06T09:00:00')
  }).returning();

  const ev3 = await db.insert(evidence).values({
    caseId: CASE_ID,
    evidenceNumber: 'EV-003',
    title: 'Access Badge Log',
    type: 'document',
    summary: 'Server room swipes between 20:00 and 22:00.',
    posX: 220,
    posY: 390,
    collectedBy: 'SysAdmin',
    collectedAt: new Date('2024-12-06T08:30:00')
  }).returning();

  const ev4 = await db.insert(evidence).values({
    caseId: CASE_ID,
    evidenceNumber: 'EV-004',
    title: 'Forensic Photo – Scene',
    type: 'photo',
    summary: 'Server room cabinet showing forced entry marks.',
    posX: 520,
    posY: 100,
    collectedBy: 'CSI Unit',
    collectedAt: new Date('2024-12-05T23:15:00')
  }).returning();

  console.log(`✅ Created ${ev1.length + ev2.length + ev3.length + ev4.length} evidence items.`);

  // 2. Evidence Relationships
  await db.insert(evidenceRelationships).values([
    {
      fromEvidenceId: ev1[0].id,
      toEvidenceId: ev2[0].id,
      label: 'Timeline Match',
      strength: 'strong',
      notes: 'Video timestamp matches witness account'
    },
    {
      fromEvidenceId: ev1[0].id,
      toEvidenceId: ev3[0].id,
      label: 'Suspect ID',
      strength: 'medium',
      notes: 'Person in video matches badge owner'
    },
    {
      fromEvidenceId: ev3[0].id,
      toEvidenceId: ev4[0].id,
      label: 'Access Time',
      strength: 'strong',
      notes: 'Badge swipe occurred just before damage'
    }
  ]);

  console.log('✅ Created 3 evidence relationships.');

  // 3. Timeline Events
  await db.insert(timelineEvents).values([
    {
      caseId: CASE_ID,
      timestamp: new Date('2025-12-05T20:00:00'),
      title: 'Suspect Arrives',
      description: 'Security footage captures suspect entering the main lobby.',
      type: 'evidence',
      evidenceIds: ['EV-001']
    },
    {
      caseId: CASE_ID,
      timestamp: new Date('2025-12-05T21:15:00'),
      title: 'Server Room Access',
      description: 'Unauthorized badge swipe detected at server room door.',
      type: 'action',
      evidenceIds: ['EV-003']
    },
    {
      caseId: CASE_ID,
      timestamp: new Date('2025-12-05T21:45:00'),
      title: 'Witness Observation',
      description: 'K. Ito reports hearing loud noises from B2 parking level.',
      type: 'person',
      personIds: ['POI-002']
    }
  ]);

  console.log('✅ Created 3 timeline events.');

  // 4. Graph Nodes & Edges (Visualization)
  const node1 = await db.insert(graphNodes).values({
    caseId: CASE_ID,
    nodeId: 'POI-001',
    label: 'Marcus Chen',
    type: 'person',
    posX: 200,
    posY: 150
  }).returning();

  const node2 = await db.insert(graphNodes).values({
    caseId: CASE_ID,
    nodeId: 'EV-001',
    label: 'Lobby Footage',
    type: 'evidence',
    posX: 550,
    posY: 320,
    entityId: ev1[0].id
  }).returning();

  const node3 = await db.insert(graphNodes).values({
    caseId: CASE_ID,
    nodeId: 'LOC-001',
    label: 'Server Room',
    type: 'location',
    posX: 320,
    posY: 80
  }).returning();

  await db.insert(graphEdges).values([
    {
      caseId: CASE_ID,
      fromNodeId: node1[0].id,
      toNodeId: node2[0].id,
      label: 'Captured On',
      strength: 'strong'
    },
    {
      caseId: CASE_ID,
      fromNodeId: node1[0].id,
      toNodeId: node3[0].id,
      label: 'Access To',
      strength: 'weak'
    }
  ]);

  console.log('✅ Created 3 graph nodes and 2 edges.');
  console.log('🎉 Seed complete!');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
