import { relations } from "drizzle-orm/relations";
import { cases, aiReports, users, attachmentVerifications, evidence, canvasAnnotations, canvasStates, caseEmbeddings, caseScores, citations, legalDocuments, emailVerificationCodes, evidenceVectors, hashVerifications, legalAnalysisSessions, legalResearch, passwordResetTokens, personsOfInterest, ragSessions, reports, savedReports, sessions, themes, userEmbeddings, autoTags, userAiQueries } from "./schema";

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

export const casesRelations = relations(cases, ({many}) => ({
	aiReports: many(aiReports),
	canvasStates: many(canvasStates),
	caseEmbeddings: many(caseEmbeddings),
	caseScores: many(caseScores),
	citations: many(citations),
	legalAnalysisSessions: many(legalAnalysisSessions),
	legalResearches: many(legalResearch),
	personsOfInterests: many(personsOfInterest),
	reports: many(reports),
	savedReports: many(savedReports),
	legalDocuments: many(legalDocuments),
	userAiQueries: many(userAiQueries),
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

export const caseEmbeddingsRelations = relations(caseEmbeddings, ({one}) => ({
	case: one(cases, {
		fields: [caseEmbeddings.caseId],
		references: [cases.id]
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