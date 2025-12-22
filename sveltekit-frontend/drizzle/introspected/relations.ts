import { relations } from "drizzle-orm/relations";
import { legalTopics, documentTopics, documents, documentChunks, errorClusters, errorEvents, users, cases, sessions, legalQueries, queryFeedback, legalDocuments, yorhaCases, yorhaEvidenceNodes, aiRecommendations, recommendationRatings, yorhaEvidenceConnections, yorhaChatSessions, testRagDocuments, testRagEmbeddings, chatSessions, chatMessages, yorhaChatMessages, routeErrorPatches, errorSuggestions, errorFeedback, canvasStates, canvasAutosaves, phase72Cluster, phase72ClusterSummary, evidence, evidenceRelationships, phase72Error, phase72ErrorVector, graphNodes, graphEdges, chatTurns, evidenceFiles, legalEntities, documentEntities, chatUploads, chatTurnEvidence, evidenceChunks, evidenceTags, citationTags, ragIndexMetadata, chunkCitations, ragChunkIndex, errorPatterns, fixAttempts, errorResolutionHistory, evidenceTagLinks, chunkTagLinks } from "./schema";

export const documentTopicsRelations = relations(documentTopics, ({one}) => ({
	legalTopic: one(legalTopics, {
		fields: [documentTopics.topicId],
		references: [legalTopics.id]
	}),
}));

export const legalTopicsRelations = relations(legalTopics, ({one, many}) => ({
	documentTopics: many(documentTopics),
	legalTopic: one(legalTopics, {
		fields: [legalTopics.parentTopicId],
		references: [legalTopics.id],
		relationName: "legalTopics_parentTopicId_legalTopics_id"
	}),
	legalTopics: many(legalTopics, {
		relationName: "legalTopics_parentTopicId_legalTopics_id"
	}),
}));

export const documentChunksRelations = relations(documentChunks, ({one}) => ({
	document: one(documents, {
		fields: [documentChunks.documentId],
		references: [documents.id]
	}),
}));

export const documentsRelations = relations(documents, ({many}) => ({
	documentChunks: many(documentChunks),
}));

export const errorEventsRelations = relations(errorEvents, ({one}) => ({
	errorCluster: one(errorClusters, {
		fields: [errorEvents.clusterId],
		references: [errorClusters.id]
	}),
}));

export const errorClustersRelations = relations(errorClusters, ({many}) => ({
	errorEvents: many(errorEvents),
}));

export const casesRelations = relations(cases, ({one, many}) => ({
	user: one(users, {
		fields: [cases.assignedAttorney],
		references: [users.id]
	}),
	legalDocuments: many(legalDocuments),
	evidenceRelationships: many(evidenceRelationships),
	chatUploads: many(chatUploads),
}));

export const usersRelations = relations(users, ({many}) => ({
	cases: many(cases),
	sessions: many(sessions),
	legalDocuments_createdBy: many(legalDocuments, {
		relationName: "legalDocuments_createdBy_users_id"
	}),
	legalDocuments_userId: many(legalDocuments, {
		relationName: "legalDocuments_userId_users_id"
	}),
	routeErrorPatches: many(routeErrorPatches),
	canvasAutosaves: many(canvasAutosaves),
	chatUploads: many(chatUploads),
	evidences: many(evidence),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const queryFeedbackRelations = relations(queryFeedback, ({one}) => ({
	legalQuery: one(legalQueries, {
		fields: [queryFeedback.queryId],
		references: [legalQueries.id]
	}),
}));

export const legalQueriesRelations = relations(legalQueries, ({many}) => ({
	queryFeedbacks: many(queryFeedback),
}));

export const legalDocumentsRelations = relations(legalDocuments, ({one}) => ({
	user_createdBy: one(users, {
		fields: [legalDocuments.createdBy],
		references: [users.id],
		relationName: "legalDocuments_createdBy_users_id"
	}),
	user_userId: one(users, {
		fields: [legalDocuments.userId],
		references: [users.id],
		relationName: "legalDocuments_userId_users_id"
	}),
	case: one(cases, {
		fields: [legalDocuments.caseId],
		references: [cases.id]
	}),
}));

export const yorhaEvidenceNodesRelations = relations(yorhaEvidenceNodes, ({one, many}) => ({
	yorhaCase: one(yorhaCases, {
		fields: [yorhaEvidenceNodes.caseId],
		references: [yorhaCases.id]
	}),
	yorhaEvidenceConnections_sourceNodeId: many(yorhaEvidenceConnections, {
		relationName: "yorhaEvidenceConnections_sourceNodeId_yorhaEvidenceNodes_id"
	}),
	yorhaEvidenceConnections_targetNodeId: many(yorhaEvidenceConnections, {
		relationName: "yorhaEvidenceConnections_targetNodeId_yorhaEvidenceNodes_id"
	}),
}));

export const yorhaCasesRelations = relations(yorhaCases, ({many}) => ({
	yorhaEvidenceNodes: many(yorhaEvidenceNodes),
	yorhaEvidenceConnections: many(yorhaEvidenceConnections),
	yorhaChatSessions: many(yorhaChatSessions),
}));

export const recommendationRatingsRelations = relations(recommendationRatings, ({one}) => ({
	aiRecommendation: one(aiRecommendations, {
		fields: [recommendationRatings.recommendationId],
		references: [aiRecommendations.id]
	}),
}));

export const aiRecommendationsRelations = relations(aiRecommendations, ({many}) => ({
	recommendationRatings: many(recommendationRatings),
}));

export const yorhaEvidenceConnectionsRelations = relations(yorhaEvidenceConnections, ({one}) => ({
	yorhaCase: one(yorhaCases, {
		fields: [yorhaEvidenceConnections.caseId],
		references: [yorhaCases.id]
	}),
	yorhaEvidenceNode_sourceNodeId: one(yorhaEvidenceNodes, {
		fields: [yorhaEvidenceConnections.sourceNodeId],
		references: [yorhaEvidenceNodes.id],
		relationName: "yorhaEvidenceConnections_sourceNodeId_yorhaEvidenceNodes_id"
	}),
	yorhaEvidenceNode_targetNodeId: one(yorhaEvidenceNodes, {
		fields: [yorhaEvidenceConnections.targetNodeId],
		references: [yorhaEvidenceNodes.id],
		relationName: "yorhaEvidenceConnections_targetNodeId_yorhaEvidenceNodes_id"
	}),
}));

export const yorhaChatSessionsRelations = relations(yorhaChatSessions, ({one, many}) => ({
	yorhaCase: one(yorhaCases, {
		fields: [yorhaChatSessions.caseId],
		references: [yorhaCases.id]
	}),
	yorhaChatMessages: many(yorhaChatMessages),
}));

export const testRagEmbeddingsRelations = relations(testRagEmbeddings, ({one}) => ({
	testRagDocument: one(testRagDocuments, {
		fields: [testRagEmbeddings.documentId],
		references: [testRagDocuments.id]
	}),
}));

export const testRagDocumentsRelations = relations(testRagDocuments, ({many}) => ({
	testRagEmbeddings: many(testRagEmbeddings),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({many}) => ({
	chatMessages: many(chatMessages),
}));

export const yorhaChatMessagesRelations = relations(yorhaChatMessages, ({one}) => ({
	yorhaChatSession: one(yorhaChatSessions, {
		fields: [yorhaChatMessages.sessionId],
		references: [yorhaChatSessions.id]
	}),
}));

export const routeErrorPatchesRelations = relations(routeErrorPatches, ({one}) => ({
	user: one(users, {
		fields: [routeErrorPatches.createdBy],
		references: [users.id]
	}),
}));

export const errorFeedbackRelations = relations(errorFeedback, ({one}) => ({
	errorSuggestion: one(errorSuggestions, {
		fields: [errorFeedback.suggestionId],
		references: [errorSuggestions.id]
	}),
}));

export const errorSuggestionsRelations = relations(errorSuggestions, ({many}) => ({
	errorFeedbacks: many(errorFeedback),
}));

export const canvasAutosavesRelations = relations(canvasAutosaves, ({one}) => ({
	canvasState: one(canvasStates, {
		fields: [canvasAutosaves.canvasId],
		references: [canvasStates.id]
	}),
	user: one(users, {
		fields: [canvasAutosaves.userId],
		references: [users.id]
	}),
}));

export const canvasStatesRelations = relations(canvasStates, ({many}) => ({
	canvasAutosaves: many(canvasAutosaves),
}));

export const phase72ClusterSummaryRelations = relations(phase72ClusterSummary, ({one}) => ({
	phase72Cluster: one(phase72Cluster, {
		fields: [phase72ClusterSummary.clusterId],
		references: [phase72Cluster.id]
	}),
}));

export const phase72ClusterRelations = relations(phase72Cluster, ({many}) => ({
	phase72ClusterSummaries: many(phase72ClusterSummary),
}));

export const evidenceRelationshipsRelations = relations(evidenceRelationships, ({one}) => ({
	evidence_fromEvidenceId: one(evidence, {
		fields: [evidenceRelationships.fromEvidenceId],
		references: [evidence.id],
		relationName: "evidenceRelationships_fromEvidenceId_evidence_id"
	}),
	evidence_toEvidenceId: one(evidence, {
		fields: [evidenceRelationships.toEvidenceId],
		references: [evidence.id],
		relationName: "evidenceRelationships_toEvidenceId_evidence_id"
	}),
	case: one(cases, {
		fields: [evidenceRelationships.caseId],
		references: [cases.id]
	}),
}));

export const evidenceRelations = relations(evidence, ({one, many}) => ({
	evidenceRelationships_fromEvidenceId: many(evidenceRelationships, {
		relationName: "evidenceRelationships_fromEvidenceId_evidence_id"
	}),
	evidenceRelationships_toEvidenceId: many(evidenceRelationships, {
		relationName: "evidenceRelationships_toEvidenceId_evidence_id"
	}),
	chatTurnEvidences: many(chatTurnEvidence),
	user: one(users, {
		fields: [evidence.uploadedBy],
		references: [users.id]
	}),
}));

export const phase72ErrorVectorRelations = relations(phase72ErrorVector, ({one}) => ({
	phase72Error: one(phase72Error, {
		fields: [phase72ErrorVector.errorId],
		references: [phase72Error.id]
	}),
}));

export const phase72ErrorRelations = relations(phase72Error, ({many}) => ({
	phase72ErrorVectors: many(phase72ErrorVector),
}));

export const graphEdgesRelations = relations(graphEdges, ({one}) => ({
	graphNode_fromNodeId: one(graphNodes, {
		fields: [graphEdges.fromNodeId],
		references: [graphNodes.id],
		relationName: "graphEdges_fromNodeId_graphNodes_id"
	}),
	graphNode_toNodeId: one(graphNodes, {
		fields: [graphEdges.toNodeId],
		references: [graphNodes.id],
		relationName: "graphEdges_toNodeId_graphNodes_id"
	}),
}));

export const graphNodesRelations = relations(graphNodes, ({many}) => ({
	graphEdges_fromNodeId: many(graphEdges, {
		relationName: "graphEdges_fromNodeId_graphNodes_id"
	}),
	graphEdges_toNodeId: many(graphEdges, {
		relationName: "graphEdges_toNodeId_graphNodes_id"
	}),
}));

export const evidenceFilesRelations = relations(evidenceFiles, ({one, many}) => ({
	chatTurn: one(chatTurns, {
		fields: [evidenceFiles.chatTurnId],
		references: [chatTurns.id]
	}),
	evidenceChunks: many(evidenceChunks),
	evidenceTags: many(evidenceTags),
	ragIndexMetadata: many(ragIndexMetadata),
	evidenceTagLinks: many(evidenceTagLinks),
}));

export const chatTurnsRelations = relations(chatTurns, ({many}) => ({
	evidenceFiles: many(evidenceFiles),
	chatTurnEvidences: many(chatTurnEvidence),
}));

export const documentEntitiesRelations = relations(documentEntities, ({one}) => ({
	legalEntity: one(legalEntities, {
		fields: [documentEntities.entityId],
		references: [legalEntities.id]
	}),
}));

export const legalEntitiesRelations = relations(legalEntities, ({many}) => ({
	documentEntities: many(documentEntities),
}));

export const chatUploadsRelations = relations(chatUploads, ({one}) => ({
	user: one(users, {
		fields: [chatUploads.userId],
		references: [users.id]
	}),
	case: one(cases, {
		fields: [chatUploads.caseId],
		references: [cases.id]
	}),
}));

export const chatTurnEvidenceRelations = relations(chatTurnEvidence, ({one}) => ({
	chatTurn: one(chatTurns, {
		fields: [chatTurnEvidence.chatTurnId],
		references: [chatTurns.id]
	}),
	evidence: one(evidence, {
		fields: [chatTurnEvidence.evidenceId],
		references: [evidence.id]
	}),
}));

export const evidenceChunksRelations = relations(evidenceChunks, ({one, many}) => ({
	evidenceFile: one(evidenceFiles, {
		fields: [evidenceChunks.evidenceId],
		references: [evidenceFiles.id]
	}),
	chunkCitations: many(chunkCitations),
	ragChunkIndices: many(ragChunkIndex),
	chunkTagLinks: many(chunkTagLinks),
}));

export const evidenceTagsRelations = relations(evidenceTags, ({one}) => ({
	evidenceFile: one(evidenceFiles, {
		fields: [evidenceTags.evidenceId],
		references: [evidenceFiles.id]
	}),
	citationTag: one(citationTags, {
		fields: [evidenceTags.tagId],
		references: [citationTags.id]
	}),
}));

export const citationTagsRelations = relations(citationTags, ({many}) => ({
	evidenceTags: many(evidenceTags),
	evidenceTagLinks: many(evidenceTagLinks),
	chunkTagLinks: many(chunkTagLinks),
}));

export const ragIndexMetadataRelations = relations(ragIndexMetadata, ({one}) => ({
	evidenceFile: one(evidenceFiles, {
		fields: [ragIndexMetadata.evidenceId],
		references: [evidenceFiles.id]
	}),
}));

export const chunkCitationsRelations = relations(chunkCitations, ({one}) => ({
	evidenceChunk: one(evidenceChunks, {
		fields: [chunkCitations.chunkId],
		references: [evidenceChunks.id]
	}),
}));

export const ragChunkIndexRelations = relations(ragChunkIndex, ({one}) => ({
	evidenceChunk: one(evidenceChunks, {
		fields: [ragChunkIndex.chunkId],
		references: [evidenceChunks.id]
	}),
}));

export const fixAttemptsRelations = relations(fixAttempts, ({one}) => ({
	errorPattern: one(errorPatterns, {
		fields: [fixAttempts.patternFingerprint],
		references: [errorPatterns.fingerprint]
	}),
}));

export const errorPatternsRelations = relations(errorPatterns, ({many}) => ({
	fixAttempts: many(fixAttempts),
	errorResolutionHistories: many(errorResolutionHistory),
}));

export const errorResolutionHistoryRelations = relations(errorResolutionHistory, ({one}) => ({
	errorPattern: one(errorPatterns, {
		fields: [errorResolutionHistory.patternFingerprint],
		references: [errorPatterns.fingerprint]
	}),
}));

export const evidenceTagLinksRelations = relations(evidenceTagLinks, ({one}) => ({
	evidenceFile: one(evidenceFiles, {
		fields: [evidenceTagLinks.evidenceId],
		references: [evidenceFiles.id]
	}),
	citationTag: one(citationTags, {
		fields: [evidenceTagLinks.tagId],
		references: [citationTags.id]
	}),
}));

export const chunkTagLinksRelations = relations(chunkTagLinks, ({one}) => ({
	evidenceChunk: one(evidenceChunks, {
		fields: [chunkTagLinks.chunkId],
		references: [evidenceChunks.id]
	}),
	citationTag: one(citationTags, {
		fields: [chunkTagLinks.tagId],
		references: [citationTags.id]
	}),
}));