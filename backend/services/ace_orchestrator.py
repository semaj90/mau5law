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
from backend.services.legal_complaint_ingestion import CFG, GraniteClient

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
