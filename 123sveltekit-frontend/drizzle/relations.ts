import { relations } from "drizzle-orm/relations";
import { users, legalCases, neuralModels, tensorProcessingJobs, modelTrainingHistory, chatSessions, shaderCacheEntries, shaderUserPatterns, shaderDependencies, shaderCompilationQueue, chatMessages, shaderPreloadQueue, cases, legalDocuments, evidence, documentSections, sessions } from "./schema";

export const legalCasesRelations = relations(legalCases, ({one}) => ({
	user_assignedTo: one(users, {
		fields: [legalCases.assignedTo],
		references: [users.id],
		relationName: "legalCases_assignedTo_users_id"
	}),
	user_createdBy: one(users, {
		fields: [legalCases.createdBy],
		references: [users.id],
		relationName: "legalCases_createdBy_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	legalCases_assignedTo: many(legalCases, {
		relationName: "legalCases_assignedTo_users_id"
	}),
	legalCases_createdBy: many(legalCases, {
		relationName: "legalCases_createdBy_users_id"
	}),
	neuralModels: many(neuralModels),
	tensorProcessingJobs: many(tensorProcessingJobs),
	chatSessions: many(chatSessions),
	shaderCacheEntries: many(shaderCacheEntries),
	shaderUserPatterns: many(shaderUserPatterns),
	shaderCompilationQueues: many(shaderCompilationQueue),
	chatMessages: many(chatMessages),
	shaderPreloadQueues: many(shaderPreloadQueue),
	cases: many(cases),
	legalDocuments: many(legalDocuments),
	sessions: many(sessions),
}));

export const neuralModelsRelations = relations(neuralModels, ({one, many}) => ({
	neuralModel: one(neuralModels, {
		fields: [neuralModels.parentModelId],
		references: [neuralModels.id],
		relationName: "neuralModels_parentModelId_neuralModels_id"
	}),
	neuralModels: many(neuralModels, {
		relationName: "neuralModels_parentModelId_neuralModels_id"
	}),
	user: one(users, {
		fields: [neuralModels.createdBy],
		references: [users.id]
	}),
	modelTrainingHistories: many(modelTrainingHistory),
}));

export const tensorProcessingJobsRelations = relations(tensorProcessingJobs, ({one}) => ({
	user: one(users, {
		fields: [tensorProcessingJobs.userId],
		references: [users.id]
	}),
}));

export const modelTrainingHistoryRelations = relations(modelTrainingHistory, ({one}) => ({
	neuralModel: one(neuralModels, {
		fields: [modelTrainingHistory.modelId],
		references: [neuralModels.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({one, many}) => ({
	user: one(users, {
		fields: [chatSessions.userId],
		references: [users.id]
	}),
	chatMessages: many(chatMessages),
}));

export const shaderCacheEntriesRelations = relations(shaderCacheEntries, ({one, many}) => ({
	user: one(users, {
		fields: [shaderCacheEntries.createdBy],
		references: [users.id]
	}),
	shaderUserPatterns: many(shaderUserPatterns),
	shaderDependencies_parentShaderId: many(shaderDependencies, {
		relationName: "shaderDependencies_parentShaderId_shaderCacheEntries_id"
	}),
	shaderDependencies_childShaderId: many(shaderDependencies, {
		relationName: "shaderDependencies_childShaderId_shaderCacheEntries_id"
	}),
	shaderPreloadQueues: many(shaderPreloadQueue),
}));

export const shaderUserPatternsRelations = relations(shaderUserPatterns, ({one}) => ({
	user: one(users, {
		fields: [shaderUserPatterns.userId],
		references: [users.id]
	}),
	shaderCacheEntry: one(shaderCacheEntries, {
		fields: [shaderUserPatterns.shaderCacheId],
		references: [shaderCacheEntries.id]
	}),
}));

export const shaderDependenciesRelations = relations(shaderDependencies, ({one}) => ({
	shaderCacheEntry_parentShaderId: one(shaderCacheEntries, {
		fields: [shaderDependencies.parentShaderId],
		references: [shaderCacheEntries.id],
		relationName: "shaderDependencies_parentShaderId_shaderCacheEntries_id"
	}),
	shaderCacheEntry_childShaderId: one(shaderCacheEntries, {
		fields: [shaderDependencies.childShaderId],
		references: [shaderCacheEntries.id],
		relationName: "shaderDependencies_childShaderId_shaderCacheEntries_id"
	}),
}));

export const shaderCompilationQueueRelations = relations(shaderCompilationQueue, ({one}) => ({
	user: one(users, {
		fields: [shaderCompilationQueue.userId],
		references: [users.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id]
	}),
	user: one(users, {
		fields: [chatMessages.userId],
		references: [users.id]
	}),
}));

export const shaderPreloadQueueRelations = relations(shaderPreloadQueue, ({one}) => ({
	user: one(users, {
		fields: [shaderPreloadQueue.userId],
		references: [users.id]
	}),
	shaderCacheEntry: one(shaderCacheEntries, {
		fields: [shaderPreloadQueue.shaderCacheId],
		references: [shaderCacheEntries.id]
	}),
}));

export const casesRelations = relations(cases, ({one}) => ({
	user: one(users, {
		fields: [cases.assignedAttorney],
		references: [users.id]
	}),
}));

export const legalDocumentsRelations = relations(legalDocuments, ({one, many}) => ({
	user: one(users, {
		fields: [legalDocuments.createdBy],
		references: [users.id]
	}),
	evidence: one(evidence, {
		fields: [legalDocuments.evidenceId],
		references: [evidence.id]
	}),
	documentSections: many(documentSections),
}));

export const evidenceRelations = relations(evidence, ({many}) => ({
	legalDocuments: many(legalDocuments),
}));

export const documentSectionsRelations = relations(documentSections, ({one}) => ({
	legalDocument: one(legalDocuments, {
		fields: [documentSections.documentId],
		references: [legalDocuments.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));