import { db } from "$lib/server/database";
import { chatSessions, chatMessages, type NewChatSession, type NewChatMessage } from "$lib/db/chat-schema";
import { desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export class ChatHistoryService {
  static async getSessionsByUser(userId: string, limit = 20) {
    // Use raw SQL predicate for jsonb userId
    return (db as any)
      .select()
      .from(chatSessions)
      .where(sql`${(chatSessions as any).metadata} ->> 'userId' = ${userId}`)
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit);
  }

  static async getMessages(sessionId: string) {
    return db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: [desc(chatMessages.timestamp)]
    });
  }

  static async createSession(userId: string, model = "gemma3-legal") {
  const id = randomUUID();
    const session: NewChatSession = {
      id,
      model,
      metadata: { userId },
      messageCount: 0
    } as any;
  await db.insert(chatSessions).values(session);
    return id;
  }

  static async addMessage(params: { sessionId: string; role: 'user' | 'assistant' | 'system'; content: string; model?: string; metadata?: any; }) {
  const id = randomUUID();
    const msg: NewChatMessage = {
      id,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      model: params.model,
      metadata: params.metadata
    } as any;
    await db.insert(chatMessages).values(msg);
    await db
      .update(chatSessions)
      .set({ messageCount: sql`${chatSessions.messageCount} + 1`, updatedAt: new Date() })
      .where(eq(chatSessions.id, params.sessionId));
    return id;
  }
}
