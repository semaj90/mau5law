# Phase 2: Citation Intelligence Expansion

## Overview

Expand the Case Reporter Summarizer into a cross-case legal research engine by adding citation management, statute search, and case linking capabilities. This phase builds on the completed Phase 1 infrastructure without duplication.

---

## Phase 1 Status: ✅ COMPLETE

### Infrastructure Confirmed Ready

**Database & Storage:**
- ✅ PostgreSQL with pgvector (active)
- ✅ Redis caching layers
- ✅ Neo4j relationships (statute + citation extraction seeded)
- ✅ Audit logging (all writes tracked)

**AI & Processing:**
- ✅ Gemma3-Legal local inference
- ✅ RabbitMQ workers (OCR, summarizer, citation extractor)
- ✅ Background job queue system
- ✅ Citation extraction worker (extracts statutes from summaries)

**Authentication & Security:**
- ✅ Lucia v3 auth (prosecutor, warden roles)
- ✅ Role-based access control
- ✅ Complete audit trail

**Frontend & UX:**
- ✅ Legal AI UX system (3-column golden ratio layout)
- ✅ Command Center dashboard
- ✅ Laws Search page with filters
- ✅ Case Chat interface
- ✅ Responsive design (desktop, tablet, mobile)

---

## Phase 2 Architecture

### Layer 1: Citation Management (S-A)

**Feature**: Save & Search Citations

**Components:**
- Manual citation highlighting in summaries
- Auto-save from summary generation
- Citation metadata (statute code, jurisdiction, severity, year)
- Full-text search across saved citations

**Database Schema:**
```sql
CREATE TABLE saved_citations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  case_id UUID REFERENCES cases(id),
  statute_code VARCHAR NOT NULL,
  statute_title VARCHAR,
  jurisdiction VARCHAR,
  severity VARCHAR,
  year INT,
  source_type VARCHAR, -- 'manual' | 'auto_extracted'
  highlighted_text TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_saved_citations_user ON saved_citations(user_id);
CREATE INDEX idx_saved_citations_case ON saved_citations(case_id);
CREATE INDEX idx_saved_citations_statute ON saved_citations(statute_code);
```

**API Endpoints:**
- `POST /api/citations/save` - Save citation manually
- `GET /api/citations` - List user's saved citations
- `GET /api/citations/search` - Search citations
- `DELETE /api/citations/:id` - Delete citation
- `PUT /api/citations/:id` - Update citation notes

### Layer 2: Statute Search (S-B)

**Feature**: Guest + Auth Statute Search with RAG + KAG

**Components:**
- Public statute search (guest access)
- Authenticated statute search (with user history)
- RAG (Retrieval-Augmented Generation) for statute context
- KAG (Knowledge-Augmented Generation) for related cases
- Search history tracking (auth only)

**Database Schema:**
```sql
CREATE TABLE statute_search_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  query VARCHAR NOT NULL,
  statute_code VARCHAR,
  results_count INT,
  searched_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_search_history_user ON statute_search_history(user_id);
CREATE INDEX idx_search_history_statute ON statute_search_history(statute_code);
```

**API Endpoints:**
- `GET /api/laws/search` - Search statutes (guest + auth)
- `GET /api/laws/search/history` - Get search history (auth only)
- `GET /api/laws/:code` - Get statute details with RAG context
- `GET /api/laws/:code/related-cases` - Get related cases (KAG)

**Search Features:**
- Full-text search (statute code, title, text)
- Jurisdiction filter
- Severity filter
- Category filter
- Relevance ranking (pgvector similarity)
- Related cases sidebar (Neo4j)

### Layer 3: Citation → Case Linking (S-C)

**Feature**: Click Statute → Attach to Case

**Components:**
- Citation detail view
- "Attach to Case" modal
- Case selector (user's active cases)
- Relationship creation in Neo4j
- Audit logging

**Database Schema:**
```sql
CREATE TABLE case_statute_links (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id),
  statute_code VARCHAR NOT NULL,
  linked_by UUID NOT NULL REFERENCES users(id),
  link_type VARCHAR, -- 'charge' | 'precedent' | 'reference'
  notes TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id),
  FOREIGN KEY (linked_by) REFERENCES users(id)
);

CREATE INDEX idx_case_statute_links_case ON case_statute_links(case_id);
CREATE INDEX idx_case_statute_links_statute ON case_statute_links(statute_code);
```

**Neo4j Relationships:**
```
(Case) -[CHARGED_UNDER]-> (Statute)
(Case) -[REFERENCES]-> (Statute)
(Case) -[PRECEDENT]-> (Case)
```

**API Endpoints:**
- `POST /api/cases/:id/laws` - Link statute to case
- `GET /api/cases/:id/laws` - Get case's linked statutes
- `DELETE /api/cases/:id/laws/:statute_code` - Unlink statute
- `PUT /api/cases/:id/laws/:statute_code` - Update link metadata

### Layer 4: Citation Library (S-D)

**Feature**: Per-User Citation Workspace

**Components:**
- Citation dashboard (`/citations`)
- Citation collections (user-created folders)
- Citation tagging system
- Export functionality (PDF, JSON, CSV)
- Sharing (with other prosecutors)

**Database Schema:**
```sql
CREATE TABLE citation_collections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE citation_tags (
  id UUID PRIMARY KEY,
  citation_id UUID NOT NULL REFERENCES saved_citations(id),
  tag VARCHAR NOT NULL,
  created_at TIMESTAMP,
  FOREIGN KEY (citation_id) REFERENCES saved_citations(id)
);

CREATE TABLE collection_citations (
  id UUID PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES citation_collections(id),
  citation_id UUID NOT NULL REFERENCES saved_citations(id),
  added_at TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES citation_collections(id),
  FOREIGN KEY (citation_id) REFERENCES saved_citations(id)
);
```

**API Endpoints:**
- `GET /api/citations` - List user's citations
- `POST /api/citations/collections` - Create collection
- `GET /api/citations/collections` - List collections
- `POST /api/citations/collections/:id/citations` - Add citation to collection
- `POST /api/citations/:id/tags` - Add tag to citation
- `POST /api/citations/export` - Export citations

---

## Implementation Roadmap

### Sprint S-A: Citation Management (Week 1-2)

**Tasks:**
1. Create `saved_citations` table
2. Implement citation save API
3. Implement citation search API
4. Create citation detail component
5. Add citation highlighting in SummaryEditor
6. Integrate with summary generation (auto-save)
7. Create citation list view
8. Add audit logging

**Deliverables:**
- Citation save/search functionality
- Citation detail view
- Integration with existing summarizer
- API documentation

### Sprint S-B: Statute Search (Week 3-4)

**Tasks:**
1. Create `statute_search_history` table
2. Implement statute search API (guest + auth)
3. Implement RAG context retrieval
4. Implement KAG related cases retrieval
5. Create statute search page (`/laws/search`)
6. Add search history tracking
7. Implement search filters
8. Add relevance ranking

**Deliverables:**
- Statute search page
- RAG + KAG integration
- Search history tracking
- API documentation

### Sprint S-C: Citation → Case Linking (Week 5-6)

**Tasks:**
1. Create `case_statute_links` table
2. Implement link creation API
3. Implement link retrieval API
4. Create "Attach to Case" modal
5. Create case statute links view
6. Implement Neo4j relationship creation
7. Add audit logging
8. Create unlink functionality

**Deliverables:**
- Citation → case linking
- Case statute links view
- Neo4j relationship management
- API documentation

### Sprint S-D: Citation Library (Week 7-8)

**Tasks:**
1. Create `citation_collections` table
2. Create `citation_tags` table
3. Implement collection management API
4. Implement tagging API
5. Create citation library page (`/citations`)
6. Implement export functionality
7. Implement sharing functionality
8. Create collection management UI

**Deliverables:**
- Citation library dashboard
- Collection management
- Export functionality
- Sharing functionality

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Case Reporter Summarizer                 │
│                    (Phase 1 - Complete)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Citation Extraction       │
        │  (RabbitMQ Worker)         │
        │  Extracts statutes from    │
        │  summary text              │
        └────────────┬───────────────┘
                     │
        ┌────────────▼───────────────┐
        │  Save Citations (S-A)      │
        │  ├─ Manual save            │
        │  ├─ Auto-save from summary │
        │  └─ Metadata extraction    │
        └────────────┬───────────────┘
                     │
        ┌────────────▼───────────────┐
        │  Statute Search (S-B)      │
        │  ├─ RAG retrieval          │
        │  ├─ KAG related cases      │
        │  └─ Search history         │
        └────────────┬───────────────┘
                     │
        ┌────────────▼───────────────┐
        │  Citation → Case (S-C)     │
        │  ├─ Link creation          │
        │  ├─ Neo4j relationships    │
        │  └─ Audit logging          │
        └────────────┬───────────────┘
                     │
        ┌────────────▼───────────────┐
        │  Citation Library (S-D)    │
        │  ├─ Collections            │
        │  ├─ Tags                   │
        │  └─ Export/Share           │
        └────────────────────────────┘
```

---

## Component Architecture

### S-A: Citation Management

**Components:**
- `CitationHighlighter.svelte` - Highlight text in summary
- `CitationSaveModal.svelte` - Save citation dialog
- `CitationList.svelte` - List of saved citations
- `CitationDetail.svelte` - Citation detail view
- `CitationSearch.svelte` - Search citations

**Services:**
- `citationService.ts` - Citation CRUD operations
- `citationSearchService.ts` - Citation search

### S-B: Statute Search

**Components:**
- `StatuteSearchPage.svelte` - Main search page
- `StatuteSearchBar.svelte` - Search input with filters
- `StatuteResultsList.svelte` - Search results
- `StatuteDetail.svelte` - Statute detail view
- `RelatedCasesPanel.svelte` - Related cases sidebar

**Services:**
- `statuteSearchService.ts` - Statute search
- `ragService.ts` - RAG context retrieval (existing, extend)
- `kagService.ts` - KAG related cases retrieval

### S-C: Citation → Case Linking

**Components:**
- `AttachToCaseModal.svelte` - Case selector modal
- `CaseStatuteLinks.svelte` - List of linked statutes
- `LinkMetadataForm.svelte` - Link metadata editor

**Services:**
- `caseLinkService.ts` - Link management

### S-D: Citation Library

**Components:**
- `CitationLibraryPage.svelte` - Main library page
- `CitationCollections.svelte` - Collections list
- `CollectionDetail.svelte` - Collection detail view
- `CitationTags.svelte` - Tag management
- `ExportModal.svelte` - Export dialog

**Services:**
- `citationLibraryService.ts` - Library management
- `exportService.ts` - Export functionality

---

## API Specification

### S-A: Citation Management

```typescript
// Save citation
POST /api/citations/save
{
  statute_code: string;
  statute_title: string;
  jurisdiction: string;
  severity: string;
  year?: number;
  highlighted_text?: string;
  notes?: string;
  case_id?: string;
  source_type: 'manual' | 'auto_extracted';
}

// Search citations
GET /api/citations/search?q=query&jurisdiction=CA&severity=felony

// List citations
GET /api/citations?case_id=xxx&limit=20&offset=0

// Get citation detail
GET /api/citations/:id

// Update citation
PUT /api/citations/:id
{
  notes?: string;
  tags?: string[];
}

// Delete citation
DELETE /api/citations/:id
```

### S-B: Statute Search

```typescript
// Search statutes
GET /api/laws/search?q=query&jurisdiction=CA&severity=felony&limit=20

// Get statute detail with RAG
GET /api/laws/:code

// Get related cases (KAG)
GET /api/laws/:code/related-cases?limit=5

// Get search history
GET /api/citations/search-history?limit=20
```

### S-C: Citation → Case Linking

```typescript
// Link statute to case
POST /api/cases/:id/laws
{
  statute_code: string;
  link_type: 'charge' | 'precedent' | 'reference';
  notes?: string;
}

// Get case's linked statutes
GET /api/cases/:id/laws

// Unlink statute
DELETE /api/cases/:id/laws/:statute_code

// Update link metadata
PUT /api/cases/:id/laws/:statute_code
{
  link_type?: string;
  notes?: string;
}
```

### S-D: Citation Library

```typescript
// Create collection
POST /api/citations/collections
{
  name: string;
  description?: string;
  is_public?: boolean;
}

// List collections
GET /api/citations/collections

// Get collection detail
GET /api/citations/collections/:id

// Add citation to collection
POST /api/citations/collections/:id/citations
{
  citation_id: string;
}

// Add tag to citation
POST /api/citations/:id/tags
{
  tag: string;
}

// Export citations
POST /api/citations/export
{
  format: 'pdf' | 'json' | 'csv';
  collection_id?: string;
  citation_ids?: string[];
}
```

---

## Database Schema Summary

### New Tables

```sql
-- S-A: Citation Management
saved_citations
statute_search_history

-- S-C: Citation → Case Linking
case_statute_links

-- S-D: Citation Library
citation_collections
citation_tags
collection_citations
```

### Indexes

```sql
-- Performance optimization
CREATE INDEX idx_saved_citations_user ON saved_citations(user_id);
CREATE INDEX idx_saved_citations_case ON saved_citations(case_id);
CREATE INDEX idx_saved_citations_statute ON saved_citations(statute_code);
CREATE INDEX idx_search_history_user ON statute_search_history(user_id);
CREATE INDEX idx_search_history_statute ON statute_search_history(statute_code);
CREATE INDEX idx_case_statute_links_case ON case_statute_links(case_id);
CREATE INDEX idx_case_statute_links_statute ON case_statute_links(statute_code);
```

---

## Integration Points with Phase 1

### Existing Services to Extend

**CaseSummaryService:**
- Add `getSummaryWithCitations()` method
- Add `extractCitationsFromSummary()` method

**CitationExtractionWorker:**
- Already extracts citations
- Extend to auto-save to `saved_citations` table

**RAGService:**
- Extend for statute search context retrieval
- Add `retrieveStatuteContext()` method

**GraphService:**
- Extend for case-statute relationships
- Add `createCaseStatuteRelationship()` method

### Existing Components to Extend

**SummaryEditor.svelte:**
- Add citation highlighting
- Add "Save Citation" button
- Add citation list sidebar

**CaseDetailPage.svelte:**
- Add "Linked Statutes" tab
- Add "Attach Statute" button

**LawsSearchPage.svelte:**
- Extend with "Attach to Case" button
- Add related cases sidebar

---

## Security & Permissions

### Role-Based Access

**Prosecutor:**
- Can save citations
- Can search statutes
- Can link statutes to cases
- Can create collections
- Can share collections with other prosecutors

**Warden:**
- Can view citations (read-only)
- Can search statutes
- Can view case-statute links

**Guest:**
- Can search statutes (public only)
- Cannot save citations
- Cannot link statutes

### Audit Logging

All operations logged:
- Citation save/delete
- Statute search
- Case-statute linking
- Collection management
- Export operations

---

## Performance Considerations

### Caching Strategy

**Redis Cache:**
- Statute search results (24h TTL)
- Related cases (24h TTL)
- Search history (7d TTL)
- Citation metadata (24h TTL)

**Database Indexes:**
- `saved_citations(user_id, statute_code)`
- `case_statute_links(case_id, statute_code)`
- `statute_search_history(user_id, statute_code)`

### Query Optimization

- Use pgvector for statute similarity search
- Use Neo4j for relationship queries
- Batch citation saves
- Lazy-load related cases

---

## Testing Strategy

### Unit Tests

- Citation CRUD operations
- Statute search filtering
- Case-statute linking
- Collection management

### Integration Tests

- End-to-end citation save → search → link
- RAG context retrieval
- KAG related cases retrieval
- Export functionality

### Performance Tests

- Statute search latency (<2s)
- Citation save latency (<500ms)
- Related cases query (<3s)

---

## Deployment Checklist

- [ ] Create database tables
- [ ] Create indexes
- [ ] Deploy API endpoints
- [ ] Deploy components
- [ ] Update documentation
- [ ] Run tests
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Citation Save Latency | <500ms | API response time |
| Statute Search Latency | <2s | Query + RAG time |
| Related Cases Query | <3s | Neo4j query time |
| Cache Hit Rate | >80% | Redis metrics |
| User Adoption | >70% | Usage analytics |

---

## Timeline

| Sprint | Duration | Features | Status |
|--------|----------|----------|--------|
| S-A | Week 1-2 | Citation Management | 🚧 NEXT |
| S-B | Week 3-4 | Statute Search | 🚧 NEXT |
| S-C | Week 5-6 | Citation → Case Linking | 🚧 NEXT |
| S-D | Week 7-8 | Citation Library | 🚧 NEXT |

**Total Duration**: 8 weeks
**Start Date**: Ready to begin
**Status**: Planning complete, ready for implementation

---

## Next Steps

1. ✅ Review Phase 2 roadmap
2. ⏳ Create database schema (S-A)
3. ⏳ Implement citation management API (S-A)
4. ⏳ Build citation components (S-A)
5. ⏳ Continue with S-B, S-C, S-D

---

**Phase 2 Roadmap Version**: 1.0
**Created**: November 22, 2025
**Status**: Ready for Implementation
**Builds On**: Phase 1 (Case Reporter Summarizer) ✅ COMPLETE
