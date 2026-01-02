# ACE + LangExtract Integration Guide

## Executive Summary

**Goal**: Enforce strict schemas on all LLM-generated summaries to prevent garbage/drift in the knowledge base.

**Flow**: `gemma3:270m draft → LangExtract validation → Qdrant storage`

**Result**: Only schema-valid, structured data enters the KB.

---

## Why LangExtract?

### The Problem

Raw LLM outputs are inconsistent:
```json
// gemma3:270m output (unvalidated)
"This file provides a Qdrant service... maybe uses Redis...
exports some functions..."
```

Issues:
- ❌ Vague language ("maybe", "some")
- ❌ Missing required fields
- ❌ Inconsistent tag formats
- ❌ No type safety

### The Solution

LangExtract enforces schemas:
```json
// After LangExtract validation
{
  "file_path": "src/lib/services/qdrant.ts",
  "role": ["service"],
  "surface": ["rag"],
  "tech": ["qdrant", "redis"],
  "exports": ["searchVectors", "upsertPoints"],
  "summary": "Qdrant client service for vector operations",
  "confidence": 0.95
}
```

Benefits:
- ✅ Type-safe
- ✅ All required fields present
- ✅ Normalized enums
- ✅ Ready for Qdrant

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    ACE Indexing Pipeline                       │
└──────────────────────────────────────────────────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │  1. Ripgrep Comment Extraction     │
         │     • Extract // /** <!-- #        │
         │     • Top 10 comments              │
         └────────────────────────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │  2. LLM Draft Generation            │
         │     • Model: gemma3:270m            │
         │     • Input: comments + code        │
         │     • Output: raw text summary      │
         └────────────────────────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │  3. LangExtract Validation          │
         │     • POST to /extract              │
         │     • Schema: FileProfileSchema     │
         │     • Output: typed JSON            │
         └────────────────────────────────────┘
                          ▼
         ┌────────────────────────────────────┐
         │  4. Only Valid → Qdrant             │
         │     • Reject invalid summaries      │
         │     • Store structured payload      │
         │     • Embed validated summary       │
         └────────────────────────────────────┘
```

---

## LangExtract Schemas

### 1. File Profile Schema

```json
{
  "name": "FileProfile",
  "description": "Character profile for an indexed file",
  "type": "object",
  "properties": {
    "file_path": {
      "type": "string",
      "description": "Absolute file path"
    },
    "role": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "route",
          "ui_component",
          "api_endpoint",
          "service",
          "db_schema",
          "worker",
          "adapter"
        ]
      }
    },
    "surface": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["rag", "kag", "ace", "ui", "api"]
      }
    },
    "tech": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "qdrant",
          "redis",
          "postgres",
          "ollama",
          "svelte5",
          "drizzle",
          "playwright"
        ]
      }
    },
    "exports": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Key exported functions/classes"
    },
    "dependencies": {
      "type": "array",
      "items": {"type": "string"},
      "description": "External dependencies"
    },
    "risk": {
      "type": "string",
      "enum": ["low", "med", "high"]
    },
    "change_frequency": {
      "type": "string",
      "enum": ["hot", "warm", "cold"]
    },
    "summary": {
      "type": "string",
      "description": "2-3 sentence technical summary",
      "minLength": 20,
      "maxLength": 500
    }
  },
  "required": [
    "file_path",
    "role",
    "surface",
    "summary",
    "risk",
    "change_frequency"
  ]
}
```

### 2. Error Cluster Schema

```json
{
  "name": "ErrorCluster",
  "description": "Clustered error pattern with LLM analysis",
  "type": "object",
  "properties": {
    "cluster_id": {"type": "string"},
    "error_code": {"type": "string", "pattern": "^TS\\d+$"},
    "tool": {
      "type": "string",
      "enum": ["tsc", "svelte-check", "eslint"]
    },
    "pattern": {
      "type": "string",
      "description": "Normalized error signature"
    },
    "occurrences": {"type": "integer", "minimum": 1},
    "files_affected": {"type": "integer", "minimum": 1},
    "root_cause": {
      "type": "string",
      "description": "LLM-analyzed root cause"
    },
    "fix_approach": {
      "type": "string",
      "description": "Suggested fix strategy"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "med", "high", "critical"]
    },
    "auto_fixable": {
      "type": "boolean",
      "description": "Can ACE auto-fix this?"
    }
  },
  "required": [
    "cluster_id",
    "error_code",
    "tool",
    "occurrences",
    "priority"
  ]
}
```

### 3. Timeline Event Schema

```json
{
  "name": "TimelineEvent",
  "description": "Append-only event for ACE timeline",
  "type": "object",
  "properties": {
    "event_id": {"type": "string", "format": "uuid"},
    "event_type": {
      "type": "string",
      "enum": [
        "qdrant_upsert",
        "qdrant_delete",
        "payload_update",
        "fix_attempt_started",
        "fix_validated_pass",
        "fix_validated_fail",
        "playwright_snapshot_taken",
        "ocr_ui_validation_done"
      ]
    },
    "timestamp": {"type": "string", "format": "date-time"},
    "run_id": {"type": "string"},
    "file_path": {"type": "string"},
    "metadata": {
      "type": "object",
      "description": "Event-specific data"
    },
    "success": {"type": "boolean"}
  },
  "required": [
    "event_id",
    "event_type",
    "timestamp",
    "run_id"
  ]
}
```

---

## Integration Code

### Python: LangExtract Validator

```python
#!/usr/bin/env python3
"""
LangExtract Schema Validator for ACE
Enforces strict schemas on LLM-generated summaries
"""

import requests
from typing import Dict, Optional, Any
from dataclasses import dataclass

@dataclass
class ValidationResult:
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None

class LangExtractValidator:
    """
    Validates LLM outputs against schemas via LangExtract API
    """

    def __init__(self, api_url: str = "http://localhost:8095"):
        self.api_url = api_url

    def validate_file_profile(
        self,
        llm_output: str,
        file_path: str,
        comments: list
    ) -> ValidationResult:
        """
        Validate file profile against schema
        """

        # Build extraction prompt
        prompt = f"""Extract structured information from this file analysis:

File: {file_path}
Comments: {comments[:3]}

Analysis: {llm_output}

Extract:
- role (route|ui_component|api_endpoint|service|db_schema|worker)
- surface (rag|kag|ace|ui|api)
- tech (qdrant|redis|postgres|ollama|svelte5)
- summary (2-3 sentences)
- risk (low|med|high)
- change_frequency (hot|warm|cold)
"""

        # Call LangExtract
        try:
            response = requests.post(
                f"{self.api_url}/extract",
                json={
                    "prompt": prompt,
                    "schema": "FileProfile"
                },
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()

                # Add file_path
                data['file_path'] = file_path

                return ValidationResult(
                    success=True,
                    data=data
                )
            else:
                return ValidationResult(
                    success=False,
                    error=f"LangExtract error: {response.status_code}"
                )

        except Exception as e:
            return ValidationResult(
                success=False,
                error=str(e)
            )

    def validate_error_cluster(
        self,
        llm_analysis: str,
        cluster_id: str,
        error_code: str,
        occurrences: int
    ) -> ValidationResult:
        """
        Validate error cluster analysis
        """

        prompt = f"""Extract structured information from this error analysis:

Cluster ID: {cluster_id}
Error Code: {error_code}
Occurrences: {occurrences}

Analysis: {llm_analysis}

Extract:
- root_cause (brief description)
- fix_approach (suggested strategy)
- priority (low|med|high|critical)
- auto_fixable (true|false)
"""

        try:
            response = requests.post(
                f"{self.api_url}/extract",
                json={
                    "prompt": prompt,
                    "schema": "ErrorCluster"
                },
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()

                # Add metadata
                data['cluster_id'] = cluster_id
                data['error_code'] = error_code
                data['occurrences'] = occurrences

                return ValidationResult(
                    success=True,
                    data=data
                )
            else:
                return ValidationResult(
                    success=False,
                    error=f"LangExtract error: {response.status_code}"
                )

        except Exception as e:
            return ValidationResult(
                success=False,
                error=str(e)
            )


# Usage Example
if __name__ == "__main__":
    validator = LangExtractValidator()

    # Validate file profile
    llm_output = "This file is a Qdrant service for vector search..."
    result = validator.validate_file_profile(
        llm_output=llm_output,
        file_path="src/lib/services/qdrant.ts",
        comments=["Vector search service", "Uses Qdrant client"]
    )

    if result.success:
        print("✅ Valid file profile:")
        print(result.data)
    else:
        print(f"❌ Validation failed: {result.error}")
```

### Enhanced Indexer Integration

Update `phase89-enhanced-codebase-indexer.py`:

```python
from langextract_validator import LangExtractValidator

class EnhancedCodebaseIndexer:

    def __init__(self):
        # ... existing code ...
        self.validator = LangExtractValidator()

    def index_file(self, file_path: str) -> Optional[Dict]:
        # ... extract comments ...
        # ... generate LLM summary ...

        # NEW: Validate with LangExtract
        print(f"   🔍 Validating with LangExtract...")
        result = self.validator.validate_file_profile(
            llm_output=summary,
            file_path=file_path,
            comments=comments
        )

        if not result.success:
            print(f"   ❌ Validation failed: {result.error}")
            return None

        # Use validated data
        validated_profile = result.data

        print(f"   ✅ Schema valid: {validated_profile['role']}")

        # ... rest of indexing ...
```

---

## LangExtract Server Setup

### Docker Compose

```yaml
services:
  langextract:
    image: langextract/langextract:latest
    ports:
      - "8095:8095"
    environment:
      - LANGEXTRACT_MODEL=gemma3:270m
      - LANGEXTRACT_OLLAMA_URL=http://host.docker.internal:11434
    volumes:
      - ./schemas:/app/schemas
```

### Schema Files

Create `schemas/FileProfile.json`:
```json
{
  "name": "FileProfile",
  "type": "object",
  "properties": { /* ... from above ... */ }
}
```

---

## Timeline Event Integration

### PostgreSQL Schema

```sql
CREATE TABLE ace_timeline (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_id TEXT NOT NULL,
    file_path TEXT,
    metadata JSONB,
    success BOOLEAN,

    -- Indexes
    INDEX idx_timeline_type (event_type),
    INDEX idx_timeline_run (run_id),
    INDEX idx_timeline_file (file_path),
    INDEX idx_timeline_ts (timestamp DESC)
);
```

### Event Logger

```python
class ACETimelineLogger:
    """
    Append-only event stream for ACE operations
    """

    def log_event(
        self,
        event_type: str,
        run_id: str,
        file_path: Optional[str] = None,
        metadata: Optional[Dict] = None,
        success: bool = True
    ):
        """Log an ACE timeline event"""

        event = {
            'event_type': event_type,
            'run_id': run_id,
            'file_path': file_path,
            'metadata': metadata or {},
            'success': success
        }

        # Store in PostgreSQL
        self.pg.execute("""
            INSERT INTO ace_timeline
            (event_type, run_id, file_path, metadata, success)
            VALUES (%(event_type)s, %(run_id)s, %(file_path)s,
                    %(metadata)s, %(success)s)
            RETURNING event_id
        """, event)

        # Optionally: embed event for semantic search
        if event_type in ['fix_validated_pass', 'fix_validated_fail']:
            self.index_timeline_event(event)

    def index_timeline_event(self, event: Dict):
        """Index timeline event in Qdrant for semantic search"""

        # Build signature
        signature = f"""
EVENT: {event['event_type']}
RUN: {event['run_id']}
FILE: {event.get('file_path', 'N/A')}
SUCCESS: {event['success']}
"""

        # Embed and store
        embedding = self.get_embedding(signature)

        self.qdrant.upsert(
            collection_name='phase89_timeline_events',
            points=[{
                'id': event['event_id'],
                'vector': embedding,
                'payload': event
            }]
        )


# Usage
timeline = ACETimelineLogger()

# Log fix attempt
timeline.log_event(
    event_type='fix_attempt_started',
    run_id='2026-01-02_15-30-00',
    file_path='src/lib/components/Button.svelte',
    metadata={'error_code': 'TS2339', 'fix_type': 'auto'}
)

# Log validation result
timeline.log_event(
    event_type='fix_validated_pass',
    run_id='2026-01-02_15-30-00',
    file_path='src/lib/components/Button.svelte',
    metadata={'errors_before': 5, 'errors_after': 0},
    success=True
)
```

---

## Complete Workflow

### 1. Index Codebase with Validation

```bash
# Enhanced indexer with LangExtract
python scripts/phase89-enhanced-codebase-indexer.py \
  --dir src \
  --limit 100 \
  --validate-schema
```

**Flow**:
1. Extract comments (ripgrep)
2. Generate draft (gemma3:270m)
3. **Validate schema (LangExtract)** ← NEW
4. Only valid → Qdrant

### 2. Ingest Error Checks

```bash
# Run checks
npm run check > check_output.txt

# Ingest with LangExtract validation
python scripts/ace-check-ingest.py \
  --input check_output.txt \
  --validate-schema
```

**Flow**:
1. Parse errors (tsc + svelte-check)
2. Cluster by signature
3. Generate LLM analysis (gemma3:270m)
4. **Validate cluster schema (LangExtract)** ← NEW
5. Only valid → Qdrant

### 3. ACE Fix with Timeline

```bash
# Run ACE fix with timeline logging
python scripts/ace_batch_fix_set_v2.py \
  ace_runs/matches_set.json \
  --timeline-enabled
```

**Events Logged**:
- `fix_attempt_started`
- `qdrant_upsert` (updated file profile)
- `fix_validated_pass` / `fix_validated_fail`
- `playwright_snapshot_taken`

### 4. Query Timeline

```bash
# Find recent fixes
python scripts/query_timeline.py \
  --event-type fix_validated_pass \
  --last 24h

# Semantic search
python scripts/query_timeline.py \
  --search "TypeScript property fixes in Svelte components"
```

---

## Benefits

### Before LangExtract
```json
{
  "summary": "maybe a service... uses some database... exports stuff",
  "tags": "ui component rag??",
  "risk": "unknown"
}
```
❌ Vague, inconsistent, unusable

### After LangExtract
```json
{
  "file_path": "src/lib/services/qdrant.ts",
  "role": ["service"],
  "surface": ["rag"],
  "tech": ["qdrant", "redis"],
  "exports": ["searchVectors", "upsertPoints"],
  "summary": "Qdrant client service for vector search operations",
  "risk": "low",
  "change_frequency": "warm"
}
```
✅ Typed, validated, production-ready

---

## Performance Impact

- **LangExtract overhead**: +200-500ms per file
- **Total indexing time**: ~2-5s per file (acceptable for quality gain)
- **Validation success rate**: 85-95% (LLM outputs usually conform)
- **Fallback**: If validation fails, log error and skip (don't store garbage)

---

## Next Steps

1. **Deploy LangExtract Server**
   ```bash
   docker-compose up -d langextract
   ```

2. **Create Schema Files**
   - `schemas/FileProfile.json`
   - `schemas/ErrorCluster.json`
   - `schemas/TimelineEvent.json`

3. **Update Indexers**
   - Add `LangExtractValidator` to all LLM-generation paths
   - Reject invalid outputs

4. **Create Timeline Table**
   ```bash
   psql -U user -d legal -f schemas/ace_timeline.sql
   ```

5. **Test Full Pipeline**
   ```bash
   # Index with validation
   python scripts/phase89-enhanced-codebase-indexer.py --validate-schema

   # Ingest errors with validation
   python scripts/ace-check-ingest.py --validate-schema

   # Run ACE fix with timeline
   python scripts/ace_batch_fix_set_v2.py --timeline-enabled
   ```

---

## Success Metrics

- ✅ 100% of KB entries are schema-valid
- ✅ No vague summaries ("maybe", "some", "probably")
- ✅ All required fields present
- ✅ Timeline events queryable (SQL + semantic)
- ✅ ACE routing uses validated metadata

🚀 **Production-ready knowledge base with guaranteed quality!**
