import { relations } from "drizzle-orm/relations";
import { cases, caseEmbeddings, aiReports, users, attachmentVerifications, evidence, canvasAnnotations, canvasStates, caseScores, citations, legalDocuments, emailVerificationCodes, evidenceVectors, hashVerifications, legalAnalysisSessions, legalResearch, passwordResetTokens, personsOfInterest, ragSessions, reports, savedReports, sessions, themes, userEmbeddings, autoTags, userAiQueries, chatSessions, chatMessages, gpuClusterExecutions, gpuTaskResults, documentMetadata, messages, messageEmbeddings, detectiveAnalysis, caseTimeline, aiRecommendations, recommendationRatings, documents, embeddings, contextSessions } from "./schema";

export const caseEmbeddingsRelations = relations(caseEmbeddings, ({one}) => ({
	case: one(cases, {
		fields: [caseEmbeddings.caseId],
		references: [cases.id]
	}),
}));

export const casesRelations = relations(cases, ({many}) => ({
	caseEmbeddings: many(caseEmbeddings),
	aiReports: many(aiReports),
	canvasStates: many(canvasStates),
	caseScores: many(caseScores),
	citations: many(citations),
	legalAnalysisSessions: many(legalAnalysisSessions),
	legalResearches: many(legalResearch),
	personsOfInterests: many(personsOfInterest),
	reports: many(reports),
	savedReports: many(savedReports),
	legalDocuments: many(legalDocuments),
	userAiQueries: many(userAiQueries),
	documentMetadata: many(documentMetadata),
	detectiveAnalyses: many(detectiveAnalysis),
	caseTimelines: many(caseTimeline),
	aiRecommendations: many(aiRecommendations),
}));

export const aiReportsRelations = relations(aiReports, ({one}) => ({
	case: one(cases, {
		fields: [aiReports.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [aiReports.createdBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	aiReports: many(aiReports),
	attachmentVerifications: many(attachmentVerifications),
	canvasAnnotations: many(canvasAnnotations),
	canvasStates: many(canvasStates),
	caseScores: many(caseScores),
	citations: many(citations),
	emailVerificationCodes: many(emailVerificationCodes),
	hashVerifications: many(hashVerifications),
	legalAnalysisSessions: many(legalAnalysisSessions),
	legalResearches: many(legalResearch),
	passwordResetTokens: many(passwordResetTokens),
	personsOfInterests: many(personsOfInterest),
	ragSessions: many(ragSessions),
	reports: many(reports),
	savedReports: many(savedReports),
	sessions: many(sessions),
	themes: many(themes),
	userEmbeddings: many(userEmbeddings),
	legalDocuments: many(legalDocuments),
	autoTags: many(autoTags),
	userAiQueries: many(userAiQueries),
	chatSessions: many(chatSessions),
	detectiveAnalyses: many(detectiveAnalysis),
	caseTimelines: many(caseTimeline),
	recommendationRatings: many(recommendationRatings),
	contextSessions: many(contextSessions),
}));

export const attachmentVerificationsRelations = relations(attachmentVerifications, ({one}) => ({
	user: one(users, {
		fields: [attachmentVerifications.verifiedBy],
		references: [users.id]
	}),
}));

export const canvasAnnotationsRelations = relations(canvasAnnotations, ({one}) => ({
	evidence: one(evidence, {
		fields: [canvasAnnotations.evidenceId],
		references: [evidence.id]
	}),
	user: one(users, {
		fields: [canvasAnnotations.createdBy],
		references: [users.id]
	}),
}));

export const evidenceRelations = relations(evidence, ({many}) => ({
	canvasAnnotations: many(canvasAnnotations),
	evidenceVectors: many(evidenceVectors),
	hashVerifications: many(hashVerifications),
	legalDocuments: many(legalDocuments),
	documentMetadata: many(documentMetadata),
}));

export const canvasStatesRelations = relations(canvasStates, ({one}) => ({
	case: one(cases, {
		fields: [canvasStates.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [canvasStates.createdBy],
		references: [users.id]
	}),
}));

export const caseScoresRelations = relations(caseScores, ({one}) => ({
	case: one(cases, {
		fields: [caseScores.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [caseScores.calculatedBy],
		references: [users.id]
	}),
}));

export const citationsRelations = relations(citations, ({one}) => ({
	case: one(cases, {
		fields: [citations.caseId],
		references: [cases.id]
	}),
	legalDocument: one(legalDocuments, {
		fields: [citations.documentId],
		references: [legalDocuments.id]
	}),
	user: one(users, {
		fields: [citations.createdBy],
		references: [users.id]
	}),
}));

export const legalDocumentsRelations = relations(legalDocuments, ({one, many}) => ({
	citations: many(citations),
	case: one(cases, {
		fields: [legalDocuments.caseId],
		references: [cases.id]
	}),
	evidence: one(evidence, {
		fields: [legalDocuments.evidenceId],
		references: [evidence.id]
	}),
	user: one(users, {
		fields: [legalDocuments.createdBy],
		references: [users.id]
	}),
}));

export const emailVerificationCodesRelations = relations(emailVerificationCodes, ({one}) => ({
	user: one(users, {
		fields: [emailVerificationCodes.userId],
		references: [users.id]
	}),
}));

export const evidenceVectorsRelations = relations(evidenceVectors, ({one}) => ({
	evidence: one(evidence, {
		fields: [evidenceVectors.evidenceId],
		references: [evidence.id]
	}),
}));

export const hashVerificationsRelations = relations(hashVerifications, ({one}) => ({
	evidence: one(evidence, {
		fields: [hashVerifications.evidenceId],
		references: [evidence.id]
	}),
	user: one(users, {
		fields: [hashVerifications.verifiedBy],
		references: [users.id]
	}),
}));

export const legalAnalysisSessionsRelations = relations(legalAnalysisSessions, ({one}) => ({
	case: one(cases, {
		fields: [legalAnalysisSessions.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [legalAnalysisSessions.userId],
		references: [users.id]
	}),
}));

export const legalResearchRelations = relations(legalResearch, ({one}) => ({
	case: one(cases, {
		fields: [legalResearch.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [legalResearch.createdBy],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const personsOfInterestRelations = relations(personsOfInterest, ({one}) => ({
	case: one(cases, {
		fields: [personsOfInterest.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [personsOfInterest.createdBy],
		references: [users.id]
	}),
}));

export const ragSessionsRelations = relations(ragSessions, ({one}) => ({
	user: one(users, {
		fields: [ragSessions.userId],
		references: [users.id]
	}),
}));

export const reportsRelations = relations(reports, ({one}) => ({
	case: one(cases, {
		fields: [reports.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [reports.createdBy],
		references: [users.id]
	}),
}));

export const savedReportsRelations = relations(savedReports, ({one}) => ({
	case: one(cases, {
		fields: [savedReports.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [savedReports.createdBy],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const themesRelations = relations(themes, ({one}) => ({
	user: one(users, {
		fields: [themes.createdBy],
		references: [users.id]
	}),
}));

export const userEmbeddingsRelations = relations(userEmbeddings, ({one}) => ({
	user: one(users, {
		fields: [userEmbeddings.userId],
		references: [users.id]
	}),
}));

export const autoTagsRelations = relations(autoTags, ({one}) => ({
	user: one(users, {
		fields: [autoTags.confirmedBy],
		references: [users.id]
	}),
}));

export const userAiQueriesRelations = relations(userAiQueries, ({one}) => ({
	user: one(users, {
		fields: [userAiQueries.userId],
		references: [users.id]
	}),
	case: one(cases, {
		fields: [userAiQueries.caseId],
		references: [cases.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({one, many}) => ({
	user: one(users, {
		fields: [chatSessions.userId],
		references: [users.id]
	}),
	chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id]
	}),
}));

export const gpuTaskResultsRelations = relations(gpuTaskResults, ({one}) => ({
	gpuClusterExecution: one(gpuClusterExecutions, {
		fields: [gpuTaskResults.executionId],
		references: [gpuClusterExecutions.id]
	}),
}));

export const gpuClusterExecutionsRelations = relations(gpuClusterExecutions, ({many}) => ({
	gpuTaskResults: many(gpuTaskResults),
}));

export const documentMetadataRelations = relations(documentMetadata, ({one}) => ({
	evidence: one(evidence, {
		fields: [documentMetadata.evidenceId],
		references: [evidence.id]
	}),
	case: one(cases, {
		fields: [documentMetadata.caseId],
		references: [cases.id]
	}),
}));

export const messageEmbeddingsRelations = relations(messageEmbeddings, ({one}) => ({
	message: one(messages, {
		fields: [messageEmbeddings.messageId],
		references: [messages.id]
	}),
}));

export const messagesRelations = relations(messages, ({many}) => ({
	messageEmbeddings: many(messageEmbeddings),
}));

export const detectiveAnalysisRelations = relations(detectiveAnalysis, ({one}) => ({
	case: one(cases, {
		fields: [detectiveAnalysis.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [detectiveAnalysis.createdBy],
		references: [users.id]
	}),
}));

export const caseTimelineRelations = relations(caseTimeline, ({one}) => ({
	case: one(cases, {
		fields: [caseTimeline.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [caseTimeline.createdBy],
		references: [users.id]
	}),
}));

export const aiRecommendationsRelations = relations(aiRecommendations, ({one, many}) => ({
	case: one(cases, {
		fields: [aiRecommendations.caseId],
		references: [cases.id]
	}),
	recommendationRatings: many(recommendationRatings),
}));

export const recommendationRatingsRelations = relations(recommendationRatings, ({one}) => ({
	aiRecommendation: one(aiRecommendations, {
		fields: [recommendationRatings.recommendationId],
		references: [aiRecommendations.id]
	}),
	user: one(users, {
		fields: [recommendationRatings.userId],
		references: [users.id]
	}),
}));

export const embeddingsRelations = relations(embeddings, ({one}) => ({
	document: one(documents, {
		fields: [embeddings.documentId],
		references: [documents.id]
	}),
}));

export const documentsRelations = relations(documents, ({many}) => ({
	embeddings: many(embeddings),
}));

export const contextSessionsRelations = relations(contextSessions, ({one}) => ({
	user: one(users, {
		fields: [contextSessions.userId],
		references: [users.id]
	}),
}));