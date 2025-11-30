#!/usr/bin/env python3
"""
ACE (Agentic Control Engine) - Wired to Your Existing Services

Orchestrates:
  - AgentContextAnchor (general ACA)
  - Phase72AgentContext (Phase 72 ACA)
  - AgentPlanner (heuristic tool router)
  - AlignmentRouter (search + alignment signals)
  - GraniteClient (LLM)

No new storage. No new schema. Just orchestration.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
import json
import logging

from backend.services.agent_context import AgentContextAnchor
from backend.services.phase72_agent_context import Phase72AgentContext
from backend.services.agent_planner import AgentPlanner
from backend.services.alignment_router import AlignmentRouter
from backend.services.legal_complaint_ingestion import CFG
from backend.services.granite_client import GraniteClient

logger = logging.getLogger(__name__)


class AceOrchestrator:
    """
    ACE = Agentic Control Engine.

    It does three things:
      1) Pulls context from ACA / Phase72 ACA (plan + summaries + timeline).
      2) Pulls signals (alignment, search, error stats, etc).
      3) Asks the LLM which TOOL to use next, with which ARGS, and why.
    """

    def __init__(
        self,
        aca: AgentContextAnchor,
        phase72_ctx: Phase72AgentContext,
        planner: AgentPlanner,
        alignment: AlignmentRouter,
        llm_client: Optional[GraniteClient] = None,
    ) -> None:
        self.aca = aca
        self.phase72_ctx = phase72_ctx
        self.planner = planner
        self.alignment = alignment
        self.llm = llm_client or GraniteClient(CFG)

    # =====================================================================
    # Signal snapshots (stubbed now, easy to extend later)
    # =====================================================================

    def _build_general_signals(self, session_id: str, user_id: Optional[str]) -> Dict[str, Any]:
        """
        Hook point for non-Phase72 sessions.
        Right now we just pull alignment info; later you can add CHR97, RAG stats, etc.
        """
        profile = {}
        if user_id:
            profile = self.alignment.get_user_alignment_profile(user_id)
        return {
            "alignment_profile": profile,
        }

    def _build_phase72_signals(self, session_id: str) -> Dict[str, Any]:
        """
        Phase 72-specific signals: error counts, cluster status, etc.
        For now, stub this; you can wire it to Phase72 services later.
        """
        # TODO: integrate with Phase72 metrics / Neo4j / Qdrant
        return {
            "ts_error_summary": "TODO: wire to Phase72 error metrics",
            "cluster_status": "TODO: wire to Phase72 cluster info",
        }

    # =====================================================================
    # Prompt builders
    # =====================================================================

    def _build_general_prompt(
        self,
        session_id: str,
        role: str,
        user_message: str,
        default_goal: str,
        user_id: Optional[str],
    ) -> str:
        """
        Uses the *general* ACA (AgentContextAnchor) for non-Phase72 sessions.
        """
        ctx = self.aca.ensure_summaries(session_id, user_message)
        marker = ctx.get("latent_marker", f"[[ACA:{session_id}]]")
        summary = ctx.get("summary_text", "")
        spec_summary = ctx.get("spec_text", "")
        plan = self.aca.get_plan(session_id) or {}
        goal = plan.get("goal", default_goal)

        # You already have append_timeline / plan storage; we just build a prompt here.
        signals = self._build_general_signals(session_id, user_id)

        system = f"""You are ACE, the Agentic Control Engine for session {session_id}.

ROLE: {role.upper()}

Agentic Context Anchor: {marker}

HIGH-LEVEL GOAL:
{goal}

CURRENT PROGRESS SUMMARY:
{summary}

SPEC / CONSTRAINT SUMMARY:
{spec_summary}

LIVE SIGNALS:
- Alignment profile: {signals.get('alignment_profile')}

RULES:
- Prefer safe, reversible actions.
- Use tools instead of guessing.
- If context is unclear, ask the user for clarification.
- Output exactly ONE tool to call in this format:
  TOOL: <tool_name>
  ARGS: <JSON object>
  REASON: <short reason>
"""

        user = f"""USER MESSAGE:
{user_message}
"""

        return system + "\n" + user

    def _build_phase72_prompt(
        self,
        session_id: str,
        role: str,
        user_message: str,
        default_goal: str,
    ) -> str:
        """
        Uses Phase72AgentContext.build_phase72_prompt so you reuse the logic you already wrote.
        """
        # Your Phase72AgentContext API:
        #   build_phase72_prompt(session_id, default_goal, user_message) -> Tuple[system, user]
        system, user = self.phase72_ctx.build_phase72_prompt(
            session_id=session_id,
            default_goal=default_goal,
            user_message=user_message,
        )

        # If you later want to inject extra signals (error metrics, CHR97 heat),
        # you can extend build_phase72_prompt or post-process the prompt here.

        # For now, we just tag the marker at the top for clarity.
        return system + "\n" + user

    # =====================================================================
    # LLM call + TOOL/ARGS/REASON parsing
    # =====================================================================

    def _call_llm_for_plan(self, prompt: str) -> Dict[str, Any]:
        """
        Call your LLM (Granite / Gemma3) and parse out TOOL / ARGS / REASON.
        """
        # You can replace this with whatever method you actually exposed.
        llm_output: str = self.llm.generate(prompt, max_tokens=500)

        tool = "none"
        args: Dict[str, Any] = {}
        reason = llm_output.strip()

        for line in llm_output.splitlines():
            up = line.strip().upper()
            if up.startswith("TOOL:"):
                tool = line.split(":", 1)[1].strip()
            elif up.startswith("ARGS:"):
                raw = line.split(":", 1)[1].strip()
                try:
                    args = json.loads(raw)
                except Exception:
                    args = {}
            elif up.startswith("REASON:"):
                reason = line.split(":", 1)[1].strip()

        return {
            "tool": tool,
            "args": args,
            "reason": reason,
            "raw_llm_output": llm_output,
        }

    # =====================================================================
    # Public methods: general session vs Phase72 session
    # =====================================================================

    def plan_general_next_action(
        self,
        session_id: str,
        user_message: str,
        role: str = "user",
        default_goal: str = "Assist with legal search and analysis.",
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        High-level planner for generic sessions (chat, legal search, etc.).
        Uses AgentContextAnchor + AlignmentRouter.
        """
        prompt = self._build_general_prompt(
            session_id=session_id,
            role=role,
            user_message=user_message,
            default_goal=default_goal,
            user_id=user_id,
        )
        plan = self._call_llm_for_plan(prompt)

        # Also ask the non-LLM AgentPlanner for a deterministic suggestion if needed:
        # For example, treat it as a "fallback tool".
        heuristic = self.planner.next_step(session_id, user_message)

        self.aca.append_timeline(
            session_id=session_id,
            kind="ace-plan",
            payload={
                "role": role,
                "message": user_message,
                "tool": plan["tool"],
                "args": plan["args"],
                "reason": plan["reason"],
                "raw_llm_output": plan["raw_llm_output"],
                "heuristic_next_step": heuristic,
            },
            description="ACE general planning decision",
        )

        return plan

    def plan_phase72_next_action(
        self,
        session_id: str,
        user_message: str,
        role: str = "prosecutor",
        default_goal: str = "Reduce TypeScript errors and stabilize the codebase.",
    ) -> Dict[str, Any]:
        """
        Phase 72-specific planner (AST/TS error reduction).
        Uses Phase72AgentContext + AgentPlanner under the hood.
        """
        prompt = self._build_phase72_prompt(
            session_id=session_id,
            role=role,
            user_message=user_message,
            default_goal=default_goal,
        )
        plan = self._call_llm_for_plan(prompt)

        analysis = self.planner.next_step(session_id, user_message)

        self.phase72_ctx.append_timeline(
            session_id=session_id,
            kind="ace-phase72-plan",
            payload={
                "role": role,
                "message": user_message,
                "tool": plan["tool"],
                "args": plan["args"],
                "reason": plan["reason"],
                "raw_llm_output": plan["raw_llm_output"],
                "heuristic_phase72_next_step": analysis,
            },
            description="ACE Phase72 planning decision",
        )

        return plan


    # =====================================================================
    # NEW: LLM Style Adaptation & Engagement Ranking
    # =====================================================================

    def adapt_llm_style(
        self,
        mood: str,
        base_prompt: str,
        confidence: float
    ) -> str:
        """
        Adapt LLM generation style based on user mood and confidence.

        Args:
            mood: User mood (angry, neutral, hopeful, confused)
            base_prompt: Base prompt
            confidence: Confidence score (0-1)

        Returns:
            Adapted prompt with style instructions
        """
        style_instructions = {
            "angry": """
        The user seems frustrated. Be empathetic and careful.
        - Acknowledge their frustration
        - Provide clear, step-by-step guidance
        - Avoid jargon
        - Offer alternatives
        """,

            "neutral": """
        The user is neutral. Be professional and clear.
        - Provide factual information
        - Use standard terminology
        - Be concise
        """,

            "hopeful": """
        The user seems optimistic. Be encouraging and positive.
        - Highlight opportunities
        - Be supportive
        - Suggest next steps
        """,

            "confused": """
        The user seems confused. Be extra clear and helpful.
        - Explain concepts simply
        - Provide examples
        - Offer clarification
        - Ask if they need more help
        """
        }

        style = style_instructions.get(mood, style_instructions["neutral"])

        # Add confidence-based instructions
        if confidence < 0.5:
            style += "\n\nNote: Confidence is low. Suggest verifying information."

        return base_prompt + "\n\nStyle Instructions:\n" + style

    def rank_results_by_engagement(
        self,
        results: list,
        mood: str,
        user_id: str
    ) -> list:
        """
        Rank results based on user mood and engagement history.

        Args:
            results: Search results
            mood: User mood
            user_id: User ID

        Returns:
            Ranked results
        """
        # Get user engagement history
        engagement_history = self.aca.redis.get_json(f"engagement:{user_id}") or {}

        # Score each result
        scored_results = []
        for result in results:
            score = self._compute_engagement_score(
                result,
                mood,
                engagement_history
            )
            scored_results.append((score, result))

        # Sort by score (descending)
        scored_results.sort(key=lambda x: x[0], reverse=True)

        return [result for _, result in scored_results]

    def _compute_engagement_score(
        self,
        result: dict,
        mood: str,
        engagement_history: dict
    ) -> float:
        """Compute engagement score for a result"""
        score = 0.0

        # Base relevance
        score += result.get("relevance_score", 0.5)

        # Mood-based adjustments
        if mood == "angry":
            # Prefer clear, actionable results
            score += 0.2 if result.get("is_actionable") else 0.0

        elif mood == "hopeful":
            # Prefer positive, forward-looking results
            score += 0.2 if result.get("is_positive") else 0.0

        elif mood == "confused":
            # Prefer simple, well-explained results
            score += 0.2 if result.get("is_simple") else 0.0

        # User history
        if result.get("source") in engagement_history:
            score += 0.1  # Boost familiar sources

        return score

    def _analyze_sentiment(self, message: str) -> str:
        """
        Analyze user sentiment from message.

        Returns: "angry", "neutral", "hopeful", or "confused"
        """
        try:
            if self.llm:
                prompt = f"""Analyze the sentiment of this message and respond with ONLY one word: angry, neutral, hopeful, or confused.

Message: {message}

Sentiment:"""
                response = self.llm.generate(prompt, max_tokens=10)
                sentiment = response.strip().lower()

                if sentiment in ["angry", "neutral", "hopeful", "confused"]:
                    return sentiment
        except Exception:
            pass

        # Fallback heuristic
        msg_lower = message.lower()
        if any(word in msg_lower for word in ["angry", "frustrated", "hate", "stupid", "useless"]):
            return "angry"
        elif any(word in msg_lower for word in ["hope", "great", "excellent", "perfect"]):
            return "hopeful"
        elif any(word in msg_lower for word in ["confused", "unclear", "help", "explain", "?"]):
            return "confused"

        return "neutral"

    def _compute_confidence(self, plan: dict) -> float:
        """
        Compute confidence score for a plan.

        Args:
            plan: Plan dict from LLM

        Returns:
            Confidence score (0-1)
        """
        confidence = 0.5  # Base confidence

        # Boost if tool is present
        if plan.get("tool") and plan["tool"] != "none":
            confidence += 0.3

        # Boost if args are present
        if plan.get("args") and len(plan["args"]) > 0:
            confidence += 0.1

        # Boost if reason is present
        if plan.get("reason") and len(plan["reason"]) > 10:
            confidence += 0.1

        return min(1.0, confidence)

    def plan_phase72_next_action_with_restart(
        self,
        session_id: str,
        user_message: str,
        role: str = "prosecutor",
        default_goal: str = "Reduce TypeScript errors and stabilize the codebase.",
    ) -> dict:
        """
        Phase 72 planning with full "3 Routes + Restart" strategy.

        Includes:
        1. Sentiment analysis (mood)
        2. Initial plan
        3. Confidence check
        4. Low confidence restart
        5. Fallback routes
        6. LLM style adaptation
        """
        # 1. Analyze sentiment (mood)
        mood = self._analyze_sentiment(user_message)

        # 2. Get initial plan
        plan = self._call_llm_for_plan(
            self._build_phase72_prompt(session_id, role, user_message, default_goal)
        )

        # 3. Get confidence
        confidence = self._compute_confidence(plan)

        # 4. Check if we need to restart
        if confidence < 0.5:
            restart_result = self.alignment.handle_low_confidence(
                query=user_message,
                confidence=confidence,
                session_id=session_id
            )

            if restart_result["status"] == "restarted":
                # Re-plan with fresh context
                plan = self._call_llm_for_plan(
                    self._build_phase72_prompt(session_id, role, user_message, default_goal)
                )

        # 5. Try fallback if needed
        if not plan.get("tool"):
            fallback_result = self.alignment.matrix_transform_fallback(
                query=user_message,
                primary_route="legal_rag_plus_kag",
                session_id=session_id
            )

            if fallback_result["status"] == "success":
                plan["fallback_route"] = fallback_result["route"]

        # 6. Adapt LLM style based on mood
        adapted_prompt = self.adapt_llm_style(
            mood=mood,
            base_prompt=plan.get("raw_llm_output", ""),
            confidence=confidence
        )

        # 7. Log everything
        self.phase72_ctx.append_timeline(
            session_id=session_id,
            kind="ace-phase72-plan-with-restart",
            payload={
                "role": role,
                "message": user_message,
                "mood": mood,
                "confidence": confidence,
                "tool": plan["tool"],
                "args": plan["args"],
                "reason": plan["reason"],
                "adapted_style": adapted_prompt
            },
            description="ACE Phase72 planning with 3-routes + restart strategy"
        )

        return plan
