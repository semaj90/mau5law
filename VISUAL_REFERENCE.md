# Visual Reference - Phase 5 Complete

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🎮 YoRHa Terminal UI                         │
│                  (Retro Detective Interface)                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ YORHA COMMAND TERMINAL                    9S AI Active  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  DETECTIVE: Summarize CPS removal issues              │   │
│  │                                                         │   │
│  │  9S: When CPS removes a child from the home,          │   │
│  │      several key legal issues arise...                │   │
│  │                                                         │   │
│  │      #CPS  #removal  #due-process  #family-law        │   │
│  │                                                         │   │
│  │      [What are implications of "CPS"?]                │   │
│  │      [Can you elaborate on "parental rights"?]        │   │
│  │      [How do CPS and removal interact?]               │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Ask about evidence, CPS removal, statutes...    │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                      [TRANSMIT →]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              📡 Terminal Server (Form Actions)                  │
│                                                                 │
│  1. Validate input                                              │
│  2. Process uploaded files with Docling                         │
│  3. Extract keywords from files                                 │
│  4. Store images in MinIO                                       │
│  5. Call contextual LLM                                         │
│  6. Save to database                                            │
│  7. Return enriched response                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌──────────────────────┐              ┌──────────────────────┐
│  📄 Docling Bridge   │              │  🔍 Keyword Extract  │
│                      │              │                      │
│  • OCR text          │              │  • Ollama API        │
│  • Layout analysis   │              │  • Fallback heuristics
│  • Block metadata    │              │  • Entity extraction │
│  • Page count        │              │  • Phrase detection  │
│                      │              │                      │
│  Input: PDF/Image    │              │  Input: Text         │
│  Output: Blocks      │              │  Output: Keywords    │
└──────────────────────┘              └──────────────────────┘
        ↓                                           ↓
        └─────────────────────┬─────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│           🧠 Contextual Chat LLM (Gemma-3-Legal)               │
│                                                                 │
│  • Build RAG context from evidence                              │
│  • Inject keywords from documents                               │
│  • Generate answer using LLM                                    │
│  • Create follow-up suggestions                                 │
│  • Return enriched response                                     │
│                                                                 │
│  Output: {                                                      │
│    answer: "...",                                               │
│    keywords: ["CPS", "removal", ...],                           │
│    keyPhrases: ["child protective services", ...],              │
│    suggestions: [{query: "...", reason: "...", score: 0.9}]    │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│        🌐 API Endpoint (/api/ai/yorha/context-chat)            │
│                                                                 │
│  • Validate request                                             │
│  • Extract keywords from message                                │
│  • Call context orchestrator (with fallback)                    │
│  • Save chat turn to database                                   │
│  • Link evidence to chat turn                                   │
│  • Record analytics                                             │
│  • Return complete response                                     │
│                                                                 │
│  Response: {                                                    │
│    turnId: "uuid",                                              │
│    answer: "...",                                               │
│    keywords: [...],                                             │
│    keyPhrases: [...],                                           │
│    suggestions: [...],                                          │
│    citations: [...],                                            │
│    latencyMs: 1234                                              │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│           💾 PostgreSQL Database (Persistence)                  │
│                                                                 │
│  chat_turns:                                                    │
│  ├─ id (uuid)                                                   │
│  ├─ case_id (uuid)                                              │
│  ├─ user_id (uuid)                                              │
│  ├─ message (text)                                              │
│  ├─ llm_output (jsonb)                                          │
│  ├─ extracted_keywords (text[]) ← NEW                           │
│  ├─ key_phrases (text[]) ← NEW                                  │
│  ├─ suggestions (jsonb[]) ← NEW                                 │
│  ├─ image_urls (text[]) ← NEW                                   │
│  └─ created_at (timestamp)                                      │
│                                                                 │
│  Indices:                                                       │
│  ├─ GIN on extracted_keywords                                   │
│  └─ GIN on key_phrases                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Input
    ↓
┌─────────────────────────────────────────┐
│ Terminal UI                             │
│ - Message text                          │
│ - Optional file upload                  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Terminal Server (Form Action)           │
│ - Validate input                        │
│ - Process files with Docling            │
│ - Extract keywords                      │
│ - Store in MinIO                        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Contextual Chat LLM                     │
│ - Build RAG context                     │
│ - Generate answer                       │
│ - Create suggestions                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ API Response                            │
│ - answer (string)                       │
│ - keywords (array)                      │
│ - keyPhrases (array)                    │
│ - suggestions (array)                   │
│ - citations (array)                     │
│ - latencyMs (number)                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Database Persistence                    │
│ - Save chat turn                        │
│ - Save keywords                         │
│ - Save suggestions                      │
│ - Record analytics                      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Terminal UI Update                      │
│ - Display answer                        │
│ - Show keyword chips                    │
│ - Show suggestion buttons               │
└─────────────────────────────────────────┘
    ↓
User sees response with interactive elements
```

---

## UI Component Hierarchy

```
Terminal Page (+page.svelte)
│
├─ Terminal Header
│  ├─ Status Bar
│  │  ├─ Status Indicator (pulse animation)
│  │  ├─ Terminal Title
│  │  └─ Model Info
│  └─ Styling (cyan/slate colors)
│
├─ Chat Log
│  ├─ Welcome Message (ASCII art)
│  └─ Message List
│     └─ Message (repeating)
│        ├─ Message Header
│        │  ├─ Sender (DETECTIVE / 9S)
│        │  ├─ Turn ID
│        │  └─ Timestamp
│        ├─ Message Content
│        │  └─ Pre-formatted text
│        ├─ Keyword Chips (if assistant)
│        │  └─ Chip (repeating, clickable)
│        │     └─ on:click → populate input
│        └─ Suggestion Buttons (if assistant)
│           └─ Button (repeating, clickable)
│              └─ on:click → populate input
│
└─ Chat Input Form
   ├─ Message Textarea
   │  └─ bind:value={message}
   ├─ Meta Row
   │  ├─ Case ID Input
   │  └─ File Upload
   │     ├─ File Input (multiple)
   │     └─ File List
   │        └─ File Item (repeating)
   │           ├─ Image Preview (if image)
   │           │  ├─ Image
   │           │  └─ Remove Button
   │           └─ File Tag (if not image)
   │              └─ Remove Button
   └─ Send Button
      └─ on:click → sendMessage()
```

---

## Keyword Chip Interaction

```
Assistant Message
│
├─ Answer Text
│  └─ "When CPS removes a child from the home..."
│
├─ Keyword Chips
│  ├─ #CPS
│  │  └─ on:click → message = "Show me more evidence about: CPS"
│  ├─ #removal
│  │  └─ on:click → message = "Show me more evidence about: removal"
│  └─ #due-process
│     └─ on:click → message = "Show me more evidence about: due-process"
│
└─ Suggestion Buttons
   ├─ "What are the implications of \"CPS\" in this case?"
   │  └─ on:click → message = "What are the implications of \"CPS\" in this case?"
   ├─ "Can you elaborate on \"parental rights\"?"
   │  └─ on:click → message = "Can you elaborate on \"parental rights\"?"
   └─ "How do CPS and removal interact in this context?"
      └─ on:click → message = "How do CPS and removal interact in this context?"
```

---

## API Response Structure

```json
{
  "turnId": "550e8400-e29b-41d4-a716-446655440000",
  "answer": "When CPS removes a child from the home, several key legal issues arise including due process rights, parental rights, and family law considerations...",
  "keywords": [
    "CPS",
    "removal",
    "due process",
    "family law",
    "parental rights"
  ],
  "keyPhrases": [
    "child protective services",
    "parental rights",
    "due process",
    "family law"
  ],
  "suggestions": [
    {
      "query": "What are the implications of \"CPS\" in this case?",
      "reason": "Explore the key term \"CPS\" further",
      "score": 0.9
    },
    {
      "query": "Can you elaborate on \"parental rights\"?",
      "reason": "Dive deeper into the key phrase",
      "score": 0.85
    },
    {
      "query": "How do CPS and removal interact in this context?",
      "reason": "Explore relationships between key terms",
      "score": 0.8
    }
  ],
  "didYouMean": [
    {
      "query": "What are the implications of \"CPS\" in this case?",
      "score": 0.9
    }
  ],
  "citations": [],
  "latencyMs": 1234
}
```

---

## Database Schema (New Columns)

```sql
ALTER TABLE chat_turns ADD COLUMN image_urls text[];
ALTER TABLE chat_turns ADD COLUMN extracted_keywords text[];
ALTER TABLE chat_turns ADD COLUMN key_phrases text[];
ALTER TABLE chat_turns ADD COLUMN suggestions jsonb[];

CREATE INDEX idx_chat_turns_keywords ON chat_turns USING GIN (extracted_keywords);
CREATE INDEX idx_chat_turns_phrases ON chat_turns USING GIN (key_phrases);
```

---

## File Structure

```
sveltekit-frontend/
├─ src/
│  ├─ routes/
│  │  ├─ terminal/
│  │  │  ├─ +page.svelte ✅ (UI component)
│  │  │  └─ +page.server.ts ✅ (Form actions)
│  │  └─ api/
│  │     └─ ai/
│  │        └─ yorha/
│  │           └─ context-chat/
│  │              └─ +server.ts ✅ (API endpoint)
│  └─ lib/
│     └─ server/
│        ├─ docling.ts ✅ (Docling wrapper)
│        ├─ keyword-extractor.ts ✅ (Keyword extraction)
│        └─ llm/
│           └─ contextual-chat.ts ✅ (LLM orchestration)
│
├─ drizzle/
│  └─ 20251208_add_keywords_to_chat_turns.sql ✅ (Migration)
│
└─ python/
   └─ docling_analyze.py ✅ (Python bridge)
```

---

## Testing Workflow

```
1. Start Dev Server
   npm run dev
   ↓
   Wait for: "Local: http://localhost:5173/"

2. Test Backend API
   curl -X POST http://localhost:5173/api/ai/yorha/context-chat ...
   ↓
   Verify: Response has keywords, suggestions

3. Test UI
   Open: http://localhost:5173/terminal
   ↓
   Send message
   ↓
   Verify: Keyword chips appear
   ↓
   Click chip
   ↓
   Verify: Input populates
   ↓
   Send follow-up
   ↓
   Verify: New response

4. Test Docling (Optional)
   Upload PDF/image
   ↓
   Ask about document
   ↓
   Verify: Keywords from document appear
```

---

## Performance Timeline

```
User sends message
│
├─ Terminal Server processes (0-2s)
│  ├─ Validate input (10ms)
│  ├─ Process files with Docling (2-5s if file)
│  └─ Extract keywords (0.5-1s)
│
├─ Contextual Chat LLM (2-5s)
│  ├─ Build RAG context (0.5s)
│  ├─ Call Ollama (2-5s)
│  └─ Generate suggestions (0.5s)
│
├─ API Response (0.5s)
│  ├─ Save to database (0.2s)
│  ├─ Record analytics (0.1s)
│  └─ Format response (0.2s)
│
└─ Total: 5-12 seconds
   UI renders response: <100ms
```

---

## Success Indicators

✅ **Backend Works**
- API returns 200 status
- Response has `keywords` array
- Response has `suggestions` array
- Database has new chat_turn row

✅ **UI Works**
- Keyword chips render
- Suggestion buttons render
- Clicking chips populates input
- Clicking buttons populates input
- New messages send successfully

✅ **Docling Works**
- File upload succeeds
- Docling processes file
- Keywords from document appear
- Answer references document

---

## Color Scheme (Terminal Aesthetic)

```
Primary Colors:
├─ Cyan (#22d3ee) - Main accent, keywords
├─ Slate (#0f172a) - Background
├─ Slate-900 (#0f172a) - Dark background
└─ Slate-700 (#334155) - Borders

Secondary Colors:
├─ Green (#10b981) - Status indicator, suggestions
├─ Red (#ef4444) - Errors, remove buttons
└─ Slate-600 (#475569) - Secondary text

Text Colors:
├─ Slate-50 (#f8fafc) - Primary text
├─ Slate-100 (#f1f5f9) - Secondary text
└─ Slate-400 (#94a3b8) - Tertiary text
```

---

**Visual Reference Complete**
