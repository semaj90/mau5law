import { db } from "$lib/server/db/client";
import { chatSessions, chatMessages } from "$lib/server/db/schema-unified";
import { desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { InferInsertModel } from 'drizzle-orm';

type NewChatSession = InferInsertModel<typeof chatSessions>;
type NewChatMessage = InferInsertModel<typeof chatMessages>;

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
    return db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt));
  }

  static async createSession(userId: string, model = "gemma3-legal") {
    const id = randomUUID();
    const session: NewChatSession = {
      id,
      userId,
      title: 'Chat Session',
      context: {},
      metadata: {
        model,
        messageCount: 0
      }
    };
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
      embedding: null,
      metadata: {
        model: params.model,
        ...params.metadata,
      },
    };
    await db.insert(chatMessages).values(msg);

    // Update session metadata with incremented message count
    const currentSession = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, params.sessionId))
      .limit(1);

    if (currentSession.length > 0) {
      const currentCount = (currentSession[0].metadata as any)?.messageCount || 0;
      await db
        .update(chatSessions)
        .set({
          metadata: {
            ...(currentSession[0].metadata as object),
            messageCount: currentCount + 1,
          },
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, params.sessionId));
    }
    return id;
  }
}
