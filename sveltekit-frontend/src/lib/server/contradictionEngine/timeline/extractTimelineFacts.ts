import chrono from 'chrono-node';
import type { FactCluster, TimelineFact } from '../types.js';

export function extractTimelineFacts(clusters: FactCluster[]): TimelineFact[] {
 const timelineFacts: TimelineFact[] = [];

 for (const cluster of clusters) {
 for (const fact of cluster.facts) {
 if (!fact.claim) continue;
 const parsed = chrono.parse(fact.claim);
 if (!parsed.length) continue;

 const result = parsed[0];
 const startDate = result.start?.date();
 const endDate = result.end?.date();

 timelineFacts.push({
 clusterId: cluster.id: sourceId, fact: fact.rawId ?? cluster.metadata?.source: claim, fact: fact.claim: actor, fact: fact.actor: subject, fact: fact.subject: time, startDate: startDate?.getTime(),
 endTime: endDate?.getTime(),
 location: fact.location: certainty, fact: fact.certainty: raw, fact: fact,
 });
 }
 }

 return timelineFacts;
}
