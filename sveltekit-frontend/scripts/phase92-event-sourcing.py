#!/usr/bin/env python3
"""
Phase 92: Event Sourcing + Timeline Layer
Audit log for all Qdrant edits with semantic timeline search

Architecture:
  Qdrant Edit → Postgres Event Log → LangExtract Metadata → Timeline Search

Timeline Collections:
  - phase92_timeline_events (semantic search over edit history)
  - Postgres phase89_qdrant_events (authoritative truth)

Features:
  - Event sourcing for all Qdrant operations
  - LangExtract metadata extraction from logs
  - Semantic timeline search (768-d embeddinggemma)
  - Provenance tracking (who changed what when)
  - Diff tracking (payload changes)

Usage:
    python scripts/phase92-event-sourcing.py --init-db
    python scripts/phase92-event-sourcing.py --log-event "upsert" "phase89_cache_index" 12345
    python scripts/phase92-event-sourcing.py --search-timeline "runes migration"
    python scripts/phase92-event-sourcing.py --recent-edits --hours 24
"""

import argparse
import asyncio
import hashlib
import json
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent))

try:
    import asyncpg
    import httpx
    import redis.asyncio as aioredis
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
except ImportError:
    print("❌ Missing dependencies. Install:")
    print("   pip install asyncpg httpx redis[asyncio] qdrant-client")
    sys.exit(1)

# Import shared helpers
from phase89_json import loads_bytes, loads_str, dumps, BACKEND
from phase89_codec import decode_blob

# =============================================================================
# Configuration
# =============================================================================
POSTGRES_DSN = "postgresql://user:pass@localhost:5434/legal"
REDIS_URL = "redis://127.0.0.1:6379"
QDRANT_URL = "http://127.0.0.1:6333"
OLLAMA_URL = "http://localhost:11434"
LANGEXTRACT_URL = "http://localhost:8095"

TIMELINE_COLLECTION = "phase92_timeline_events"
EMBEDDING_MODEL = "embeddinggemma:latest"
EMBEDDING_DIM = 768

# =============================================================================
# Postgres Event Schema
# =============================================================================
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS phase89_qdrant_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,  -- script/service name
    op TEXT NOT NULL,  -- upsert | delete | payload_patch | collection_create
    collection TEXT NOT NULL,
    point_id TEXT,
    vector_hash TEXT,  -- sha256(signature_text)
    payload_hash TEXT,  -- sha256(normalized_payload_json)
    redis_key_ref TEXT,  -- optional Redis key that produced this
    diff_json JSONB,  -- optional: what changed
    run_id TEXT,  -- correlation ID
    feature_tags TEXT[],
    error_tags TEXT[],
    codec TEXT,  -- blob codec if decoded
    notes TEXT,
    confidence FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qdrant_events_ts ON phase89_qdrant_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_qdrant_events_collection ON phase89_qdrant_events(collection);
CREATE INDEX IF NOT EXISTS idx_qdrant_events_actor ON phase89_qdrant_events(actor);
CREATE INDEX IF NOT EXISTS idx_qdrant_events_op ON phase89_qdrant_events(op);
CREATE INDEX IF NOT EXISTS idx_qdrant_events_feature_tags ON phase89_qdrant_events USING GIN(feature_tags);
CREATE INDEX IF NOT EXISTS idx_qdrant_events_error_tags ON phase89_qdrant_events USING GIN(error_tags);
CREATE INDEX IF NOT EXISTS idx_qdrant_events_run_id ON phase89_qdrant_events(run_id);
"""

# =============================================================================
# Event Sourcing Engine
# =============================================================================
class EventSourcingEngine:
    """Audit log for all Qdrant edits with semantic timeline."""

    def __init__(
        self,
        postgres_dsn: str = POSTGRES_DSN,
        qdrant_url: str = QDRANT_URL,
        redis_url: str = REDIS_URL,
        langextract_url: str = LANGEXTRACT_URL
    ):
        self.postgres_dsn = postgres_dsn
        self.qdrant_url = qdrant_url
        self.redis_url = redis_url
        self.langextract_url = langextract_url

        self.pg_pool: Optional[asyncpg.Pool] = None
        self.redis: Optional[aioredis.Redis] = None
        self.qdrant = QdrantClient(url=qdrant_url)

    async def init_db(self):
        """Initialize Postgres schema."""
        print("🔧 Initializing Postgres schema...")

        self.pg_pool = await asyncpg.create_pool(
            self.postgres_dsn,
            min_size=2,
            max_size=10
        )

        async with self.pg_pool.acquire() as conn:
            await conn.execute(CREATE_TABLE_SQL)

        print("   ✅ Tables created")

        # Create Qdrant timeline collection
        print(f"🔧 Initializing Qdrant {TIMELINE_COLLECTION}...")

        try:
            self.qdrant.get_collection(TIMELINE_COLLECTION)
            print(f"   ✅ Collection exists")
        except:
            self.qdrant.create_collection(
                collection_name=TIMELINE_COLLECTION,
                vectors_config=models.VectorParams(
                    size=EMBEDDING_DIM,
                    distance=models.Distance.COSINE
                )
            )

            # Create payload indexes
            self.qdrant.create_payload_index(
                collection_name=TIMELINE_COLLECTION,
                field_name="actor",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            self.qdrant.create_payload_index(
                collection_name=TIMELINE_COLLECTION,
                field_name="op",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            self.qdrant.create_payload_index(
                collection_name=TIMELINE_COLLECTION,
                field_name="collection",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            self.qdrant.create_payload_index(
                collection_name=TIMELINE_COLLECTION,
                field_name="feature_tags",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            self.qdrant.create_payload_index(
                collection_name=TIMELINE_COLLECTION,
                field_name="error_tags",
                field_schema=models.PayloadSchemaType.KEYWORD
            )

            print(f"   ✅ Collection created with indexes")

        print()

    async def connect(self):
        """Connect to services."""
        if not self.pg_pool:
            self.pg_pool = await asyncpg.create_pool(
                self.postgres_dsn,
                min_size=2,
                max_size=10
            )

        if not self.redis:
            self.redis = await aioredis.from_url(
                self.redis_url,
                decode_responses=False
            )

    async def close(self):
        """Close connections."""
        if self.pg_pool:
            await self.pg_pool.close()
        if self.redis:
            await self.redis.aclose()

    async def log_event(
        self,
        op: str,
        collection: str,
        point_id: Optional[str] = None,
        actor: str = "manual",
        vector_text: Optional[str] = None,
        payload: Optional[Dict] = None,
        redis_key: Optional[str] = None,
        diff: Optional[Dict] = None,
        run_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> str:
        """
        Log a Qdrant event to Postgres + Timeline collection.

        Returns event_id
        """
        event_id = str(uuid.uuid4())
        ts = datetime.utcnow()

        # Compute hashes
        vector_hash = None
        if vector_text:
            vector_hash = hashlib.sha256(vector_text.encode()).hexdigest()

        payload_hash = None
        if payload:
            normalized = dumps(payload, sort_keys=True)
            payload_hash = hashlib.sha256(normalized.encode()).hexdigest()

        # Extract codec if Redis key
        codec = None
        if redis_key and self.redis:
            try:
                blob = await self.redis.get(redis_key.encode())
                if blob:
                    decoded = decode_blob(blob)
                    codec = decoded.codec
            except:
                pass

        # Extract tags from payload (if available)
        feature_tags = []
        error_tags = []
        confidence = None

        if payload:
            feature_tags = payload.get('feature_tags', []) or payload.get('tags', [])
            error_tags = payload.get('error_tags', [])
            confidence = payload.get('confidence')

        # Build event card text for embedding
        event_card_text = self._build_event_card(
            ts=ts,
            op=op,
            collection=collection,
            actor=actor,
            point_id=point_id,
            redis_key=redis_key,
            feature_tags=feature_tags,
            error_tags=error_tags,
            codec=codec,
            notes=notes
        )

        # Use LangExtract to extract structured metadata (if available)
        langextract_metadata = await self._extract_metadata(event_card_text)

        if langextract_metadata:
            # Override with LangExtract tags if better
            if langextract_metadata.get('feature_tags'):
                feature_tags = langextract_metadata['feature_tags']
            if langextract_metadata.get('error_tags'):
                error_tags = langextract_metadata['error_tags']
            if langextract_metadata.get('confidence') and not confidence:
                confidence = langextract_metadata['confidence']
            if langextract_metadata.get('notes') and not notes:
                notes = langextract_metadata['notes']

        # Write to Postgres
        async with self.pg_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO phase89_qdrant_events (
                    event_id, ts, actor, op, collection, point_id,
                    vector_hash, payload_hash, redis_key_ref, diff_json,
                    run_id, feature_tags, error_tags, codec, notes, confidence
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                """,
                event_id, ts, actor, op, collection, point_id,
                vector_hash, payload_hash, redis_key, diff,
                run_id, feature_tags, error_tags, codec, notes, confidence
            )

        # Embed event card
        embedding = await self._embed_text(event_card_text)

        # Write to Qdrant timeline
        timeline_payload = {
            'event_id': event_id,
            'ts': ts.isoformat(),
            'actor': actor,
            'op': op,
            'collection': collection,
            'point_id': point_id,
            'redis_key_ref': redis_key,
            'feature_tags': feature_tags,
            'error_tags': error_tags,
            'codec': codec,
            'notes': notes or '',
            'confidence': confidence,
            'event_card_text': event_card_text
        }

        self.qdrant.upsert(
            collection_name=TIMELINE_COLLECTION,
            points=[models.PointStruct(
                id=event_id,
                vector=embedding,
                payload=timeline_payload
            )]
        )

        return event_id

    def _build_event_card(
        self,
        ts: datetime,
        op: str,
        collection: str,
        actor: str,
        point_id: Optional[str] = None,
        redis_key: Optional[str] = None,
        feature_tags: List[str] = [],
        error_tags: List[str] = [],
        codec: Optional[str] = None,
        notes: Optional[str] = None
    ) -> str:
        """Build event card text for embedding."""
        lines = [
            f"KIND: qdrant_event",
            f"TS: {ts.isoformat()}",
            f"OP: {op}",
            f"COLLECTION: {collection}",
            f"ACTOR: {actor}"
        ]

        if point_id:
            lines.append(f"POINT_ID: {point_id}")
        if redis_key:
            lines.append(f"KEY: {redis_key}")
        if feature_tags:
            lines.append(f"TAGS: {','.join(feature_tags)}")
        if error_tags:
            lines.append(f"ERROR_TAGS: {','.join(error_tags)}")
        if codec:
            lines.append(f"CODEC: {codec}")
        if notes:
            lines.append(f"NOTES: {notes}")

        return '\n'.join(lines)

    async def _extract_metadata(self, text: str) -> Optional[Dict]:
        """Extract structured metadata using LangExtract."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.langextract_url}/extract",
                    json={
                        'content': text,
                        'document_type': 'timeline_event',
                        'extract_entities': True,
                        'extract_structure': True
                    }
                )

                if response.status_code == 200:
                    result = response.json()

                    # Parse entities for tags
                    entities = result.get('entities', [])
                    feature_tags = []
                    error_tags = []

                    for entity in entities:
                        entity_type = entity.get('type', '').lower()
                        entity_text = entity.get('text', '')

                        if entity_type in ['technology', 'framework', 'library']:
                            feature_tags.append(entity_text.lower())
                        elif entity_type in ['error', 'bug', 'issue']:
                            error_tags.append(entity_text.lower())

                    return {
                        'feature_tags': feature_tags,
                        'error_tags': error_tags,
                        'confidence': result.get('confidence', 0.5),
                        'notes': result.get('summary', '')
                    }
        except:
            pass

        return None

    async def _embed_text(self, text: str) -> List[float]:
        """Get embedding from Ollama."""
        import requests

        response = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={
                'model': EMBEDDING_MODEL,
                'prompt': text
            },
            timeout=30
        )

        if response.status_code != 200:
            raise Exception(f"Ollama error: {response.status_code}")

        return response.json()['embedding']

    async def search_timeline(
        self,
        query: str,
        limit: int = 10,
        hours: Optional[int] = None,
        collection_filter: Optional[str] = None,
        actor_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Semantic search over timeline events.

        Args:
            query: Search query text
            limit: Max results
            hours: Only events in last N hours
            collection_filter: Filter by collection name
            actor_filter: Filter by actor name
        """
        # Embed query
        query_vector = await self._embed_text(query)

        # Build filter
        must_conditions = []

        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            must_conditions.append(
                models.FieldCondition(
                    key="ts",
                    range=models.Range(
                        gte=cutoff.isoformat()
                    )
                )
            )

        if collection_filter:
            must_conditions.append(
                models.FieldCondition(
                    key="collection",
                    match=models.MatchValue(value=collection_filter)
                )
            )

        if actor_filter:
            must_conditions.append(
                models.FieldCondition(
                    key="actor",
                    match=models.MatchValue(value=actor_filter)
                )
            )

        search_filter = None
        if must_conditions:
            search_filter = models.Filter(must=must_conditions)

        # Search
        results = self.qdrant.search(
            collection_name=TIMELINE_COLLECTION,
            query_vector=query_vector,
            query_filter=search_filter,
            limit=limit,
            with_payload=True
        )

        return [
            {
                'event_id': hit.id,
                'score': hit.score,
                **hit.payload
            }
            for hit in results
        ]

    async def recent_edits(
        self,
        hours: int = 24,
        limit: int = 50
    ) -> List[Dict]:
        """Get recent edits from Postgres."""
        async with self.pg_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT event_id, ts, actor, op, collection, point_id,
                       redis_key_ref, feature_tags, error_tags, notes
                FROM phase89_qdrant_events
                WHERE ts >= NOW() - INTERVAL '$1 hours'
                ORDER BY ts DESC
                LIMIT $2
                """,
                hours, limit
            )

            return [dict(row) for row in rows]

# =============================================================================
# CLI
# =============================================================================
async def main():
    parser = argparse.ArgumentParser(
        description='Phase 92: Event Sourcing + Timeline Layer'
    )
    parser.add_argument('--init-db', action='store_true', help='Initialize Postgres schema')
    parser.add_argument('--log-event', nargs=3, metavar=('OP', 'COLLECTION', 'POINT_ID'), help='Log an event')
    parser.add_argument('--actor', default='manual', help='Actor name')
    parser.add_argument('--search-timeline', metavar='QUERY', help='Search timeline semantically')
    parser.add_argument('--recent-edits', action='store_true', help='Show recent edits')
    parser.add_argument('--hours', type=int, default=24, help='Hours lookback')
    parser.add_argument('--limit', type=int, default=10, help='Max results')

    args = parser.parse_args()

    print(f"📦 JSON Backend: {BACKEND}")
    print()

    engine = EventSourcingEngine()

    try:
        await engine.connect()

        if args.init_db:
            await engine.init_db()
            print("✅ Database initialized")

        elif args.log_event:
            op, collection, point_id = args.log_event

            print(f"📝 Logging event...")
            print(f"   Op: {op}")
            print(f"   Collection: {collection}")
            print(f"   Point: {point_id}")
            print()

            event_id = await engine.log_event(
                op=op,
                collection=collection,
                point_id=point_id,
                actor=args.actor
            )

            print(f"✅ Event logged: {event_id}")

        elif args.search_timeline:
            print(f"🔍 Searching timeline: {args.search_timeline}")
            print()

            results = await engine.search_timeline(
                query=args.search_timeline,
                limit=args.limit,
                hours=args.hours
            )

            for i, result in enumerate(results, 1):
                print(f"{i}. [{result['op']}] {result['collection']} (score: {result['score']:.3f})")
                print(f"   Actor: {result['actor']}")
                print(f"   Time: {result['ts']}")
                if result.get('notes'):
                    print(f"   Notes: {result['notes']}")
                print()

        elif args.recent_edits:
            print(f"📊 Recent edits (last {args.hours} hours):")
            print()

            edits = await engine.recent_edits(hours=args.hours, limit=args.limit)

            for edit in edits:
                print(f"• [{edit['op']}] {edit['collection']}")
                print(f"  Actor: {edit['actor']}")
                print(f"  Time: {edit['ts']}")
                if edit.get('notes'):
                    print(f"  Notes: {edit['notes']}")
                print()

        else:
            parser.print_help()

    finally:
        await engine.close()

if __name__ == '__main__':
    asyncio.run(main())
