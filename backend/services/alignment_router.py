"""
Agentic Alignment Router for Legal Search System.

Reads user signals (negativity, legal relevance, on-task-ness), consults KAG (Neo4j),
and intelligently routes searches to optimal backends (RAG-only, RAG+KAG, general web).

Maintains per-user alignment metrics in Redis and learns "angry words" from chat history.
"""

from __future__ import annotations

import math
import re
import time
from typing import Any, Dict, Optional, Set

from neo4j import GraphDatabase


# Seed lexicons (immutable base)
SEED_NEGATIVE_KEYWORDS: Set[str] = {
    "stupid",
    "useless",
    "angry",
    "hate",
    "wtf",
    "trash",
    "garbage",
    "broken",
    "buggy",
    "annoying",
    "fuck",
    "fucking",
    "shit",
}

SEED_LEGAL_KEYWORDS: Set[str] = {
    "supremacy clause",
    "preemption",
    "intergovernmental immunity",
    "statute",
    "usc",
    "u.s.c.",
    "code",
    "regulation",
    "bill",
    "complaint",
    "indictment",
    "pleading",
    "jurisdiction",
    "detention",
    "ab 32",
    "constitutional",
    "federal",
    "state",
    "4th amendment",
    "fifth amendment",
    "due process",
    "eighth amendment",
}


class AlignmentRouter:
    """
    Agentic alignment + routing brain.

    - Scores negativity (base lexicon + per-user learned tokens).
    - Scores legal-ness + KAG alignment.
    - Chooses a route (legal_rag_plus_kag, legal_rag_safe, general_web).
    - Logs per-user metrics to Redis (avg latency, avg negativity).
    - Learns new "angry" tokens from chat via Granite sentiment (optional).
    """

    def __init__(
        self,
        redis_cache: Any,
        neo4j_uri: str,
        neo4j_user: str,
        neo4j_password: str,
        granite_client: Optional[Any] = None,
    ) -> None:
        self.redis = redis_cache
        self.neo_driver = GraphDatabase.driver(
            neo4j_uri,
            auth=(neo4j_user, neo4j_password),
        )
        self.granite = granite_client

    # ---------- helpers: redis JSON ----------

    def _redis_get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """Safely get JSON from Redis."""
        try:
            return self.redis.get_json(key)
        except Exception:
            return None

    def _redis_set_json(self, key: str, value: Dict[str, Any], ttl: int) -> None:
        """Safely set JSON in Redis."""
        try:
            self.redis.set_json(key, value, ttl=ttl)
        except Exception:
            pass

    # ---------- negativity & legal scores ----------

    def _load_user_neg_lexicon(self, user_id: Optional[str]) -> Set[str]:
        """Load user-specific negative lexicon from Redis."""
        if not user_id:
            return set()
        key = f"neg-lexicon:user:{user_id}"
        data = self._redis_get_json(key) or {}
        return set(data.get("tokens", []))

    def _negativity_score(self, text: str, user_id: Optional[str]) -> float:
        """
        Compute negativity score (0.0-1.0) using seed + user lexicons.

        Counts occurrences of negative keywords and applies log-scaling.
        """
        t = text.lower()
        if not t.strip():
            return 0.0

        user_tokens = self._load_user_neg_lexicon(user_id)
        lexicon = SEED_NEGATIVE_KEYWORDS.union(user_tokens)

        hits = sum(1 for w in lexicon if w in t)
        return min(1.0, hits / 4.0)

    def _legal_score(self, text: str) -> float:
        """
        Compute legal relevance score (0.0-1.0) from keyword matching.

        Counts occurrences of legal keywords and normalizes to [0, 1].
        """
        t = text.lower()
        hits = sum(1 for w in SEED_LEGAL_KEYWORDS if w in t)
        return min(1.0, hits / 4.0)

    # ---------- KAG alignment ----------

    def _kag_match_score(self, text: str) -> float:
        """
        Query Neo4j for node name/cite matches; return alignment score.

        Tokenizes query and searches for matching nodes in the legal graph.
        """
        tokens = [tok for tok in re.split(r"\W+", text.lower()) if tok]
        tokens = tokens[:8]  # cheap heuristic

        if not tokens:
            return 0.0

        query_fragment = " ".join(tokens)

        try:
            with self.neo_driver.session() as session:
                result = session.run(
                    """
                    MATCH (e)
                    WHERE toLower(e.name) CONTAINS $q
                       OR coalesce(toLower(e.cite), '') CONTAINS $q
                    RETURN count(e) AS c
                    """,
                    q=query_fragment,
                )
                c = result.single()["c"] or 0
        except Exception:
            c = 0

        return 1.0 - math.exp(-c / 3.0)

    # ---------- intent + route ----------

    def _intent_label(self, legal_score: float, kag_score: float) -> str:
        """
        Classify intent: legal_rag or general.

        If legal_score > 0.4 or kag_score > 0.3, classify as legal_rag.
        """
        if legal_score > 0.4 or kag_score > 0.3:
            return "legal_rag"
        return "general"

    def _route_decision(self, intent: str, negativity: float) -> str:
        """
        Map intent + negativity to route.

        - legal_rag + low negativity  -> legal_rag_plus_kag
        - legal_rag + high negativity -> legal_rag_safe
        - general                     -> general_web
        """
        if intent == "legal_rag":
            if negativity > 0.6:
                return "legal_rag_safe"
            return "legal_rag_plus_kag"
        return "general_web"

    # ---------- user metrics (alignment memory) ----------

    def _update_user_metrics(
        self, user_id: str, latency_ms: float, negativity: float
    ) -> None:
        """
        Update rolling averages in Redis.

        Maintains search_count, avg_latency_ms, avg_negativity per user.
        """
        if not user_id:
            return

        key = f"user-metrics:{user_id}"
        existing = self._redis_get_json(key) or {
            "search_count": 0,
            "avg_latency_ms": 0.0,
            "avg_negativity": 0.0,
        }

        count = existing["search_count"] + 1
        avg_latency = (
            existing["avg_latency_ms"] * existing["search_count"] + latency_ms
        ) / count
        avg_neg = (
            existing["avg_negativity"] * existing["search_count"] + negativity
        ) / count

        existing.update(
            {
                "search_count": count,
                "avg_latency_ms": avg_latency,
                "avg_negativity": avg_neg,
            }
        )

        self._redis_set_json(key, existing, ttl=7 * 24 * 3600)

    def get_user_metrics(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user metrics from Redis."""
        if not user_id:
            return {}
        return self._redis_get_json(f"user-metrics:{user_id}") or {}

    # ---------- public: plan for /api/search ----------

    def plan(
        self,
        user_id: Optional[str],
        query: str,
        latency_ms: float,
    ) -> Dict[str, Any]:
        """
        Main entry point: extract signals, classify intent, decide route.

        Returns AlignmentSignals dict with all computed values.
        """
        neg = self._negativity_score(query, user_id)
        legal_score = self._legal_score(query)
        kag_score = self._kag_match_score(query)

        intent = self._intent_label(legal_score, kag_score)
        route = self._route_decision(intent, neg)
        web_search_suggested = route == "general_web"

        on_task = 0.5 * legal_score + 0.5 * kag_score

        if user_id:
            self._update_user_metrics(user_id, latency_ms, neg)

        return {
            "user_id": user_id,
            "latency_ms": latency_ms,
            "query_length": len(query),
            "negativity_score": neg,
            "on_task_score": on_task,
            "intent": intent,
            "route_decision": route,
            "web_search_suggested": web_search_suggested,
        }

    # ---------- optional: learn from chat ----------

    def learn_from_chat(self, user_id: Optional[str], message: str) -> None:
        """
        Called by chat pipeline to learn user's "angry words".

        Uses Granite (if configured) to classify sentiment and extract negative tokens,
        then updates per-user negative lexicon in Redis.
        """
        if not user_id or not message.strip():
            return

        tokens: Set[str] = set()

        if self.granite is not None:
            try:
                analysis = self.granite.analyze_sentiment(message)
                # expected shape: {"sentiment": "negative"/"neutral"/"positive",
                #                  "negative_tokens": ["...", "..."]}
                if analysis.get("sentiment") == "negative":
                    tokens.update(
                        t.lower() for t in analysis.get("negative_tokens", [])
                    )
            except Exception:
                # fail-soft, fall back to heuristics
                pass

        # crude fallback if Granite not configured or fails
        if not tokens:
            for w in SEED_NEGATIVE_KEYWORDS:
                if w in message.lower():
                    tokens.add(w)

        if not tokens:
            return

        key = f"neg-lexicon:user:{user_id}"
        existing = self._redis_get_json(key) or {"tokens": []}
        merged = set(existing.get("tokens", [])) | tokens
        self._redis_set_json(
            key, {"tokens": sorted(list(merged))}, ttl=30 * 24 * 3600
        )
