import { relations  } from 'drizzle-orm/relations';
import { cases,
  caseTimeline,
  users,
  aiRecommendations,
  recommendationRatings,
  detectiveAnalysis,
  attachmentVerifications,
  evidence,
  canvasAnnotations,
  canvasStates,
  caseEmbeddings,
  caseScores,
  citations,
  aiReports,
  emailVerificationCodes,
  legalAnalysisSessions,
  legalResearch,
  passwordResetTokens,
  hashVerifications,
  personsOfInterest,
  savedReports,
  sessions,
  themes,
  userEmbeddings,
  ragSessions,
  reports,
  auditLogs,
  notificationPreferences,
  apiRateLimits,
  evidenceConnections,
  chatSessions,
  chatMessages,
  caseEmbeddingsOptimized,
 } from './schema';

export const caseTimelineRelations = relations(caseTimeline, ({ one }) => ({
  case: one(cases, {
    fields: [caseTimeline.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [caseTimeline.createdBy],
    references: [users.id],
  }),
}));

export const casesRelations = relations(cases, ({ many }) => ({
  caseTimelines: many(caseTimeline),
  aiRecommendations: many(aiRecommendations),
  detectiveAnalyses: many(detectiveAnalysis),
  canvasStates: many(canvasStates),
  caseEmbeddings: many(caseEmbeddings),
  caseScores: many(caseScores),
  citations: many(citations),
  aiReports: many(aiReports),
  legalAnalysisSessions: many(legalAnalysisSessions),
  legalResearches: many(legalResearch),
  personsOfInterests: many(personsOfInterest),
  savedReports: many(savedReports),
  reports: many(reports),
  caseEmbeddingsOptimizeds: many(caseEmbeddingsOptimized),
}));

export const usersRelations = relations(users, ({ many }) => ({
  caseTimelines: many(caseTimeline),
  recommendationRatings: many(recommendationRatings),
  detectiveAnalyses: many(detectiveAnalysis),
  attachmentVerifications: many(attachmentVerifications),
  canvasAnnotations: many(canvasAnnotations),
  canvasStates: many(canvasStates),
  caseScores: many(caseScores),
  citations: many(citations),
  aiReports: many(aiReports),
  emailVerificationCodes: many(emailVerificationCodes),
  legalAnalysisSessions: many(legalAnalysisSessions),
  legalResearches: many(legalResearch),
  passwordResetTokens: many(passwordResetTokens),
  hashVerifications: many(hashVerifications),
  personsOfInterests: many(personsOfInterest),
  savedReports: many(savedReports),
  sessions: many(sessions),
  themes: many(themes),
  userEmbeddings: many(userEmbeddings),
  ragSessions: many(ragSessions),
  reports: many(reports),
  auditLogs: many(auditLogs),
  notificationPreferences: many(notificationPreferences),
  apiRateLimits: many(apiRateLimits),
}));

export const aiRecommendationsRelations = relations(aiRecommendations, ({ one, many }) => ({
  case: one(cases, {
    fields: [aiRecommendations.caseId],
    references: [cases.id],
  }),
  recommendationRatings: many(recommendationRatings),
}));

export const recommendationRatingsRelations = relations(recommendationRatings, ({ one }) => ({
  aiRecommendation: one(aiRecommendations, {
    fields: [recommendationRatings.recommendationId],
    references: [aiRecommendations.id],
  }),
  user: one(users, {
    fields: [recommendationRatings.userId],
    references: [users.id],
  }),
}));

export const detectiveAnalysisRelations = relations(detectiveAnalysis, ({ one }) => ({
  case: one(cases, {
    fields: [detectiveAnalysis.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [detectiveAnalysis.createdBy],
    references: [users.id],
  }),
}));

export const attachmentVerificationsRelations = relations(attachmentVerifications, ({ one }) => ({
  user: one(users, {
    fields: [attachmentVerifications.verifiedBy],
    references: [users.id],
  }),
}));

export const canvasAnnotationsRelations = relations(canvasAnnotations, ({ one }) => ({
  evidence: one(evidence, {
    fields: [canvasAnnotations.evidenceId],
    references: [evidence.id],
  }),
  user: one(users, {
    fields: [canvasAnnotations.createdBy],
    references: [users.id],
  }),
}));

export const evidenceRelations = relations(evidence, ({ many }) => ({
  canvasAnnotations: many(canvasAnnotations),
  hashVerifications: many(hashVerifications),
  evidenceConnections_sourceEvidenceId: many(evidenceConnections, {
    relationName: 'evidenceConnections_sourceEvidenceId_evidence_id',
  }),
  evidenceConnections_targetEvidenceId: many(evidenceConnections, {
    relationName: 'evidenceConnections_targetEvidenceId_evidence_id',
  }),
}));

export const canvasStatesRelations = relations(canvasStates, ({ one }) => ({
  case: one(cases, {
    fields: [canvasStates.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [canvasStates.createdBy],
    references: [users.id],
  }),
}));

export const caseEmbeddingsRelations = relations(caseEmbeddings, ({ one }) => ({
  case: one(cases, {
    fields: [caseEmbeddings.caseId],
    references: [cases.id],
  }),
}));

export const caseScoresRelations = relations(caseScores, ({ one }) => ({
  case: one(cases, {
    fields: [caseScores.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [caseScores.calculatedBy],
    references: [users.id],
  }),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  case: one(cases, {
    fields: [citations.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [citations.createdBy],
    references: [users.id],
  }),
}));

export const aiReportsRelations = relations(aiReports, ({ one }) => ({
  case: one(cases, {
    fields: [aiReports.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [aiReports.createdBy],
    references: [users.id],
  }),
}));

export const emailVerificationCodesRelations = relations(emailVerificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationCodes.userId],
    references: [users.id],
  }),
}));

export const legalAnalysisSessionsRelations = relations(legalAnalysisSessions, ({ one }) => ({
  case: one(cases, {
    fields: [legalAnalysisSessions.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [legalAnalysisSessions.userId],
    references: [users.id],
  }),
}));

export const legalResearchRelations = relations(legalResearch, ({ one }) => ({
  case: one(cases, {
    fields: [legalResearch.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [legalResearch.createdBy],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const hashVerificationsRelations = relations(hashVerifications, ({ one }) => ({
  evidence: one(evidence, {
    fields: [hashVerifications.evidenceId],
    references: [evidence.id],
  }),
  user: one(users, {
    fields: [hashVerifications.verifiedBy],
    references: [users.id],
  }),
}));

export const personsOfInterestRelations = relations(personsOfInterest, ({ one }) => ({
  case: one(cases, {
    fields: [personsOfInterest.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [personsOfInterest.createdBy],
    references: [users.id],
  }),
}));

export const savedReportsRelations = relations(savedReports, ({ one }) => ({
  case: one(cases, {
    fields: [savedReports.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [savedReports.createdBy],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const themesRelations = relations(themes, ({ one }) => ({
  user: one(users, {
    fields: [themes.createdBy],
    references: [users.id],
  }),
}));

export const userEmbeddingsRelations = relations(userEmbeddings, ({ one }) => ({
  user: one(users, {
    fields: [userEmbeddings.userId],
    references: [users.id],
  }),
}));

export const ragSessionsRelations = relations(ragSessions, ({ one }) => ({
  user: one(users, {
    fields: [ragSessions.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  case: one(cases, {
    fields: [reports.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const apiRateLimitsRelations = relations(apiRateLimits, ({ one }) => ({
  user: one(users, {
    fields: [apiRateLimits.userId],
    references: [users.id],
  }),
}));

export const evidenceConnectionsRelations = relations(evidenceConnections, ({ one }) => ({
  evidence_sourceEvidenceId: one(evidence, {
    fields: [evidenceConnections.sourceEvidenceId],
    references: [evidence.id],
    relationName: 'evidenceConnections_sourceEvidenceId_evidence_id',
  }),
  evidence_targetEvidenceId: one(evidence, {
    fields: [evidenceConnections.targetEvidenceId],
    references: [evidence.id],
    relationName: 'evidenceConnections_targetEvidenceId_evidence_id',
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chatSession: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  chatMessages: many(chatMessages),
}));

export const caseEmbeddingsOptimizedRelations = relations(caseEmbeddingsOptimized, ({ one }) => ({
  case: one(cases, {
    fields: [caseEmbeddingsOptimized.caseId],
    references: [cases.id],
  }),
}));
