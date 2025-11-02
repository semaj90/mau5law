import { writable } from "svelte/store";

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  updatedAt: number;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function createAIAgentStore(initial?: Conversation) {
  const { subscribe, set, update } = writable<Conversation>(
	initial ?? { id: generateId(), messages: [], updatedAt: Date.now() }
  );

  const addMessage = (role: Role, text: string, metadata?: Record<string, any>): ChatMessage => {
	const msg: ChatMessage = {
	  id: generateId(),
	  role,
	  text,
	  createdAt: Date.now(),
	  metadata,
	};
	update((s) => ({ ...s, messages: [...s.messages, msg], updatedAt: Date.now() }));
	return msg;
  };

  const sendMessage = async (
	text: string,
	options?: { sessionId?: string; context?: unknown; stream?: boolean }
  ) => {
	const userMsg = addMessage("user", text);
	try {
	  const res = await fetch("/api/ai/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
		  message: text,
		  sessionId: options?.sessionId,
		  context: options?.context,
		  stream: options?.stream ?? false,
		}),
	  });

	  if (!res.ok) {
		const body = await res.text();
		throw new Error(body || `AI request failed: ${res.status}`);
	  }

	  const data = await res.json();
	  // Expect backend to return { reply: string } or a string
	  const assistantText =
		typeof data === "string" ? data : (data.reply as string) ?? JSON.stringify(data);
	  const assistantMsg = addMessage("assistant", assistantText);
	  return { user: userMsg, assistant: assistantMsg, raw: data };
	} catch (error) {
	  const errMsg = addMessage("assistant", `Error: ${(error as Error).message}`);
	  return { user: userMsg, assistant: errMsg, error };
	}
  };

  const reset = () => set({ id: generateId(), messages: [], updatedAt: Date.now() });

  return {
	subscribe,
	set,
	addMessage,
	sendMessage,
	reset,
  } as const;
}

export const aiAgent = createAIAgentStore();
