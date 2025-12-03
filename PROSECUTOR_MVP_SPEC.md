# Prosecutor MVP — Case Intake & Auto-Structuring

**Goal:** One prosecutor describes what happened. System auto-creates a case with persons, evidence, and a draft charging memo.

**Routes:** 7 core screens
**APIs:** 3 pipelines (ingest, search, reasoning)
**Timeline:** 2-3 weeks to MVP

---

## 1. Core Screens (7 total)

### Screen 1: Command Center (`/dashboard`)
**What:** Home page. Shows active cases, recent activity, system status.

**Layout:**
- Left nav: Cases, Evidence, POIs, Analysis, Settings
- Center: Case cards (status, defendant, charges, last activity)
- Right: AI chat window (always available)
- Top: Global search bar

**Actions:**
- "New Case" button → `/cases/new`
- Click case card → `/cases/[id]/overview`

---

### Screen 2: Case Intake (`/cases/new`)
**What:** Prosecutor describes incident. System extracts who/what/why/how.

**Flow:**
1. **Narrative box** (big textarea)
   - "Describe what happened in your own words."
   - Drag-and-drop evidence files here

2. **Guided prompts** (side panel)
   - WHO: "Who is involved?"
   - WHAT: "What happened?"
   - WHEN: "When did it happen?"
   - WHERE: "Where did it happen?"
   - WHY: "Why is this conduct criminal?"
   - HOW: "How did the suspect act?"

3. **AI Analyze button**
   - Calls `POST /api/intake/case`
   - Extracts: case title, offenses, persons, timeline
   - Creates case record
   - Redirects to `/cases/[id]/overview`

---

### Screen 3: Case Overview (`/cases/[id]/overview`)
**What:** Case dashboard. Tabs for Evidence, Persons, AI Analysis, Reports.

**Layout:**
- Header: Case title, defendant name, charges, status
- Tabs:
  - **Overview:** Case summary, timeline, key dates
  - **Evidence:** Evidence board (beige grid with nodes)
  - **Persons:** POIs, defendants, witnesses, associates
  - **AI Analysis:** Chat + generated documents
  - **Reports:** Charging memo, discovery list, hearing prep

**Actions:**
- "Upload Evidence" → modal
- "Add Person" → modal
- "Ask AI" → chat panel

---

### Screen 4: Evidence Board (`/cases/[id]/canvas`)
**What:** Your beige grid UI. Evidence items as nodes. Connections between items.

**Features:**
- Drag-and-drop evidence onto canvas
- Draw connections: "This photo shows the weapon used in Count 1"
- Right-click node: "Send to AI for summary", "Mark as critical", "Link to charge"
- Export as image or PDF

---

### Screen 5: Evidence Library (`/evidence`)
**What:** Table/grid of all evidence for the case.

**Columns:**
- Type (document, photo, video, audio)
- Title / Description
- Source (bodycam, surveillance, witness statement, etc.)
- Date uploaded
- Hash (chain of custody)
- Actions (view, analyze, link to case)

**Filters:**
- By case
- By type
- By source
- By date range

---

### Screen 6: Persons of Interest (`/persons`)
**What:** "Fugitivedex but legal." One page per person.

**Per-person view:**
- Demographics: name, aliases, DOB, gender, address
- Risk flags: prior arrests, warrants, violence history
- Prior cases: linked cases where this person appears
- Timeline: interactions with this case (arrest, interview, etc.)
- Known associates: linked persons
- Evidence: photos, statements, etc.

**List view:**
- Filter by role (suspect, victim, witness)
- Filter by case
- Search by name

---

### Screen 7: Reports & Exports (`/cases/[id]/reports`)
**What:** Generate and edit legal documents.

**Report types:**
- Intake Summary (auto-generated from intake form)
- Charging Memo (AI draft + prosecutor edits)
- Discovery Checklist (what must be disclosed)
- Timeline Report (events in chronological order)
- Hearing Prep Notes (key points for court)

**Editor:**
- TipTap rich text editor (default)
- Monaco raw mode (for power users)
- Export: PDF, DOCX, plain text

**Workflow:**
1. Select report type
2. Click "Generate with AI" → `POST /api/reports/generate`
3. Opens in TipTap editor
4. Prosecutor edits
5. Click "Export PDF" → `GET /api/reports/[id]/export/pdf`

---

## 2. Backend Pipelines (3 total)

### Pipeline A: Ingest & Structure Evidence

**Endpoints:**
```
POST /api/intake/case
  Input: narrative, who, what, when, where, why, how, uploadedEvidenceIds
  Output: caseId, persons[], evidence[], offenses[]

POST /api/evidence/upload
  Input: file, caseId, type, source
  Output: evidenceId, hash, status

POST /api/ocr/extract
  Input: evidenceId (document/image)
  Output: text, confidence, pages

POST /api/evidence/hash
  Input: evidenceId
  Output: hash, timestamp, chain_of_custody_log
```

**What happens:**
1. Prosecutor submits intake form
2. AI extracts: case_title, primary_offense_codes, persons[], timeline[]
3. System creates:
   - `cases` record
   - `person_of_interest` records (one per identified person)
   - `case_persons` join records (role: suspect/victim/witness)
   - `known_associates` records (cross-check existing persons)
   - `evidence` records (one per uploaded file)
4. Async pipeline: OCR → embed → hash → link to case

---

### Pipeline B: Vector Search & Semantic Tools

**Endpoints:**
```
POST /api/ai/embeddings
  Input: text or evidenceId
  Output: embedding[], metadata

POST /api/legal/vector-search
  Input: query, caseId, filters
  Output: evidence[], persons[], citations[]

GET /api/search/cases
  Input: query, filters
  Output: cases[]

GET /api/search/evidence
  Input: query, caseId, filters
  Output: evidence[]

GET /api/laws/search
  Input: query, jurisdiction
  Output: statutes[], prior_cases[]
```

**What happens:**
1. Prosecutor searches: "weapons used in robbery"
2. System embeds query
3. Vector search finds: photos of weapon, witness statements mentioning weapon, relevant statutes
4. Results ranked by relevance + case context

---

### Pipeline C: Legal Reasoning & Drafting

**Endpoints:**
```
POST /api/legal/analyze
  Input: caseId, evidenceId, query
  Output: analysis, confidence, citations

POST /api/legal/chat
  Input: caseId, message, context
  Output: response, citations, suggestions

POST /api/reports/generate
  Input: caseId, reportType, template
  Output: reportId, content_json (TipTap format)

POST /api/citations/normalize
  Input: caseId, citationsText
  Output: citations[], normalized

GET /api/reports/[id]/export/pdf
  Input: reportId, format
  Output: PDF file
```

**What happens:**
1. Prosecutor clicks "Generate Charging Memo"
2. System calls `POST /api/reports/generate` with:
   - Case record (who/what/why/how)
   - Linked persons & roles
   - Evidence summaries
   - Citations table
3. Gemma3 drafts memo using legal template
4. Returns TipTap JSON (rich text)
5. Prosecutor opens in editor, tweaks, exports PDF

---

## 3. Database Schema (Drizzle)

```typescript
// cases
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  primary_offense_codes: text('primary_offense_codes').array(), // ['PC 211', 'PC 459']
  status: text('status').notNull(), // 'open' | 'charged' | 'closed'
  severity: text('severity'), // 'high' | 'medium' | 'low'
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: uuid('created_by'), // prosecutor user_id
});

// persons_of_interest
export const personsOfInterest = pgTable('persons_of_interest', {
  id: uuid('id').primaryKey().defaultRandom(),
  full_name: text('full_name').notNull(),
  aliases: text('aliases').array(),
  dob: date('dob'),
  gender: text('gender'), // 'M' | 'F' | 'Other'
  address: text('address'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
});

// case_persons (join table)
export const casePersons = pgTable('case_persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  person_id: uuid('person_id').references(() => personsOfInterest.id),
  role: text('role').notNull(), // 'suspect' | 'victim' | 'witness' | 'unknown'
  created_at: timestamp('created_at').defaultNow(),
});

// known_associates
export const knownAssociates = pgTable('known_associates', {
  id: uuid('id').primaryKey().defaultRandom(),
  person_id: uuid('person_id').references(() => personsOfInterest.id),
  associate_id: uuid('associate_id').references(() => personsOfInterest.id),
  relationship_type: text('relationship_type'), // 'friend' | 'family' | 'coworker' | 'criminal_associate'
  confidence: numeric('confidence'), // 0-1
  created_at: timestamp('created_at').defaultNow(),
});

// evidence
export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  type: text('type').notNull(), // 'document' | 'photo' | 'video' | 'audio'
  title: text('title').notNull(),
  description: text('description'),
  source: text('source'), // 'bodycam' | 'surveillance' | 'witness_statement' | 'phone_extraction'
  file_path: text('file_path'),
  hash: text('hash'), // SHA-256 for chain of custody
  hash_timestamp: timestamp('hash_timestamp'),
  ocr_text: text('ocr_text'), // extracted text from documents/images
  embedding: vector('embedding', 1536), // pgvector for semantic search
  created_at: timestamp('created_at').defaultNow(),
});

// citations
export const citations = pgTable('citations', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  raw_text: text('raw_text'), // "US v. Smith, 123 F.3d 456"
  normalized_cite: text('normalized_cite'), // structured format
  jurisdiction: text('jurisdiction'), // 'US' | 'CA' | 'NY' etc.
  type: text('type'), // 'statute' | 'case' | 'rule'
  url: text('url'), // link to full text
  created_at: timestamp('created_at').defaultNow(),
});

// reports
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  kind: text('kind').notNull(), // 'intake_summary' | 'charging_memo' | 'discovery_checklist' | 'timeline' | 'hearing_prep'
  title: text('title').notNull(),
  content_json: jsonb('content_json'), // TipTap/ProseMirror JSON
  content_markdown: text('content_markdown'), // for export
  created_by: uuid('created_by'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ai_analysis (for tracking AI-generated insights)
export const aiAnalysis = pgTable('ai_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id),
  evidence_id: uuid('evidence_id').references(() => evidence.id),
  analysis_type: text('analysis_type'), // 'summary' | 'relevance' | 'weakness' | 'strength'
  content: text('content'),
  confidence: numeric('confidence'), // 0-1
  created_at: timestamp('created_at').defaultNow(),
});
```

---

## 4. Intake Flow: Detailed

### Step 1: Prosecutor fills form

```
Narrative: "On March 15, 2024, Officer Smith responded to a robbery at 7-Eleven on Main St.
Suspect, later identified as John Doe, fled the scene with approximately $500 cash.
Witness Jane Roe saw the suspect get into a blue Honda Civic.
Suspect was arrested two hours later at his residence, 123 Oak Ave.
A loaded .38 revolver was recovered from the suspect's bedroom."

WHO: "Suspect: John Doe. Victim: 7-Eleven clerk (unknown name). Witness: Jane Roe."
WHAT: "Armed robbery of convenience store."
WHEN: "March 15, 2024, approximately 11:30 PM."
WHERE: "7-Eleven, 456 Main St, Springfield."
WHY: "Suspect needed money for drug habit (per arrest interview)."
HOW: "Suspect entered store, displayed firearm, demanded cash, fled in vehicle."
```

### Step 2: AI processes intake

**Prompt to Gemma3:**
```
You are a legal case intake assistant. Extract structured information from this narrative.

Narrative: [prosecutor's text]

Extract and return JSON:
{
  "case_title": "string",
  "primary_offense_codes": ["string"],
  "persons": [
    {
      "name": "string",
      "role": "suspect|victim|witness",
      "details": "string"
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "event": "string"
    }
  ],
  "severity": "high|medium|low",
  "key_evidence": ["string"],
  "risk_assessment": "string"
}
```

**AI returns:**
```json
{
  "case_title": "People v. John Doe - Armed Robbery",
  "primary_offense_codes": ["PC 211", "PC 25400"],
  "persons": [
    {
      "name": "John Doe",
      "role": "suspect",
      "details": "Arrested at residence, drug habit mentioned"
    },
    {
      "name": "Jane Roe",
      "role": "witness",
      "details": "Saw suspect flee in blue Honda Civic"
    }
  ],
  "timeline": [
    {
      "date": "2024-03-15",
      "time": "23:30",
      "event": "Robbery at 7-Eleven, 456 Main St"
    },
    {
      "date": "2024-03-16",
      "time": "01:30",
      "event": "Suspect arrested at 123 Oak Ave"
    }
  ],
  "severity": "high",
  "key_evidence": ["Firearm recovered", "Witness identification", "Surveillance footage"],
  "risk_assessment": "High risk: Armed, violent crime. Suspect has drug history."
}
```

### Step 3: System creates case + persons + evidence

**Backend does:**
1. Create `cases` record:
   - title: "People v. John Doe - Armed Robbery"
   - primary_offense_codes: ['PC 211', 'PC 25400']
   - status: 'open'
   - severity: 'high'

2. Create `persons_of_interest` records:
   - John Doe (suspect)
   - Jane Roe (witness)

3. Create `case_persons` join records:
   - (case_id, john_doe_id, 'suspect')
   - (case_id, jane_roe_id, 'witness')

4. Create `evidence` stubs:
   - Firearm (type: 'physical', source: 'arrest')
   - Surveillance footage (type: 'video', source: 'store_camera')
   - Witness statement (type: 'document', source: 'witness_interview')

5. Create `reports` record:
   - kind: 'intake_summary'
   - content_json: TipTap JSON with case overvi Step 4: Redirect to case overview

Prosecutor sees `/cases/[caseId]/overview` with:
- Case title, defendant, charges
- Tabs: Overview, Evidence, Persons, AI Analysis, Reports
- "Intake Summary" report ready to view/edit

---

## 5. Report Generation: Charging Memo Example

### Prosecutor clicks "Generate Charging Memo"

**Backend calls Gemma3 with:**
```
You are a legal assistant drafting a charging memo.

Case: People v. John Doe - Armed Robbery
Defendant: John Doe, age 34, address 123 Oak Ave
Charges: PC 211 (Armed Robbery), PC 25400 (Carrying Loaded Firearm)
Jurisdiction: California

Evidence:
- Witness statement from Jane Roe (saw suspect flee in blue Honda)
- Firearm recovered from suspect's bedroom (loaded .38 revolver)
- Surveillance footage from 7-Eleven (shows suspect with gun)
- Suspect's statement (admitted to robbery, claimed needed money)

Relevant statutes:
- PC 211: Robbery is taking personal property in possession of another, against their will, by force or fear.
- PC 25400: Carrying a loaded firearm in public is illegal.

Prior cases:
- People v. Smith (2020): Similar armed robbery, conviction upheld.

Draft a charging memo (2-3 pages) with:
1. Facts
2. Legal analysis (elements of each charge)
3. Probable cause determination
4. Recommendation

Format as TipTap JSON (rich text with headings, numbered lists, etc.).
```

**AI returns TipTap JSON:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "CHARGING MEMO" }]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "People v. John Doe" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "FACTS:" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "On March 15, 2024, at approximately 11:30 PM, the defendant entered a 7-Eleven store..." }]
            }
          ]
        }
      ]
    }
  ]
}
```

### Prosecutor opens in TipTap editor

- Sees formatted memo
- Can edit text, add notes, highlight key points
- Can insert "Citation" nodes (links to statutes)
- Can insert "Evidence Reference" nodes (links to evidence items)

### Prosecutor exports PDF

**Backend:**
1. Converts TipTap JSON to HTML
2. Adds header/footer (case number, date, prosecutor name)
3. Renders citations as footnotes
4. Generates PDF
5. Returns file for download

---

## 6. Editor: TipTap vs Monaco

### TipTap (Primary)
**For:** Prosecutors writing reports

**Features:**
- Rich text: headings, bold, italic, lists, tables
- Custom nodes: "Citation" (links to statute), "Evidence Reference" (links to photo/doc)
- Footnotes / endnotes
- Callouts (for important points)
- Stores as JSON (easy to version control, export)

**Implementation:**
```svelte
<script>
  import TipTap from '$lib/components/TipTap.svelte';

  let content = $state(reportData.content_json);

  async function save() {
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content_json: content })
    });
  }
</script>

<TipTap bind:content />
<button onclick={save}>Save</button>
<button onclick={() => exportPDF(content)}>Export PDF</button>
```

### Monaco (Secondary)
**For:** Power users, templates, raw editing

**Features:**
- Syntax highlighting for Markdown / JSON
- Find & replace
- Multi-cursor editing
- Useful for editing templates or raw JSON

**Implementation:**
```svelte
<button onclick={() => showMonacoModal = true}>
  View Raw (Markdown)
</button>

{#if showMonacoModal}
  <Modal>
    <Monaco
      language="markdown"
      value={contentMarkdown}
      on:change={(e) => contentMarkdown = e.detail}
    />
  </Modal>
{/if}
```

---

## 7. Implementation Roadmap

### Week 1: Intake + Case Creation
- [ ] `/cases/new` page (intake form)
- [ ] `POST /api/intake/case` endpoint
- [ ] Gemma3 prompt for extraction
- [ ] Create cases, persons, evidence records

### Week 2: Case Overview + Evidence Board
- [ ] `/cases/[id]/overview` page (tabs)
- [ ] `/cases/[id]/canvas` (evidence board)
- [ ] Evidence upload & OCR
- [ ] Vector search integration

### Week 3: Reports + Editor
- [ ] TipTap editor component
- [ ] `POST /api/reports/generate` endpoint
- [ ] Report templates (charging memo, discovery list, etc.)
- [ ] PDF export

### Week 4+: Polish + Persons + Search
- [ ] `/persons` page (POI profiles)
- [ ] Global search bar
- [ ] Citations normalization
- [ ] Hearing prep notes

---

## 8. Success Criteria

- [ ] Prosecutor can describe incident in plain English
- [ ] System auto-creates case with persons, evidence, charges
- [ ] Prosecutor can view case overview with all tabs
- [ ] Evidence board displays and allows connections
- [ ] AI generates charging memo draft
- [ ] Prosecutor can edit memo in TipTap
- [ ] Prosecutor can export PDF
- [ ] All data persists and is searchable

---

## 9. What NOT to Ship (Yet)

- Org / roles / multi-user (solo prosecutor first)
- Advanced analytics / dashboards
- Integration with court systems
- Mobile app
- All 333 API endpoints (just the 15 core ones)
- All demo routes (keep as internal tools)

---

## 10. Visual Inspiration

- **Command Center:** YoRHa beige + left nav
- **Evidence Board:** Your existing beige grid (perfect as-is)
- **POI Profiles:** Fugitivedex + Pokédex mashup (split screen: profile + timeline)
- **Reports:** Clean, legal-document aesthetic (serif font, proper margins)
- **Chat:** Slack-like panel (always available, right side or bottom)

---

**Next:** Ready to sketch the SvelteKit route tree + TipTap integration?
