"""
Agent Orchestrator - Model-Agnostic Tool Execution
Works with Ollama tool calling OR Triton structured outputs
"""
import os
import json
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib

class AgentOrchestrator:
    """
    Orchestrates LLM calls + tool execution
    Supports: Ollama, Triton/TRT-LLM, or any function-calling LLM
    """

    def __init__(self, backend: str = 'ollama'):
        """
        Args:
            backend: 'ollama' or 'triton'
        """
        self.backend = backend
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.triton_url = os.getenv('TRITON_URL', 'http://localhost:8000')
        self.mcp_url = os.getenv('MCP_URL', 'http://localhost:3003')
        self.conversation_state = []
        self.tool_call_log = []

    async def chat(
        self,
        user_message: str,
        system_prompt: Optional[str] = None,
        max_tool_iterations: int = 5
    ) -> Dict[str, Any]:
        """
        Execute agent conversation with tool calling

        Args:
            user_message: User's input
            system_prompt: System instructions
            max_tool_iterations: Max tool calling loops

        Returns:
            {
                "response": "...",
                "tool_calls": [...],
                "conversation_state": [...],
                "metadata": {...}
            }
        """
        # Initialize conversation
        if system_prompt:
            self.conversation_state.append({
                'role': 'system',
                'content': system_prompt
            })

        self.conversation_state.append({
            'role': 'user',
            'content': user_message
        })

        # Tool calling loop
        for iteration in range(max_tool_iterations):
            # Call LLM
            llm_response = await self._call_llm(self.conversation_state)

            # Check for tool calls
            tool_calls = self._extract_tool_calls(llm_response)

            if not tool_calls:
                # No more tools needed - return final response
                assistant_message = llm_response.get('message', {}).get('content', '')
                self.conversation_state.append({
                    'role': 'assistant',
                    'content': assistant_message
                })

                return {
                    'response': assistant_message,
                    'tool_calls': self.tool_call_log,
                    'conversation_state': self.conversation_state,
                    'metadata': {
                        'iterations': iteration + 1,
                        'backend': self.backend,
                        'timestamp': datetime.now().isoformat()
                    }
                }

            # Execute tool calls
            tool_results = await self._execute_tools(tool_calls)

            # Add tool results to conversation
            for result in tool_results:
                self.conversation_state.append({
                    'role': 'tool',
                    'content': json.dumps(result['result']),
                    'tool_call_id': result['tool_call_id']
                })

        # Max iterations reached
        return {
            'response': 'Max tool iterations reached',
            'tool_calls': self.tool_call_log,
            'conversation_state': self.conversation_state,
            'metadata': {
                'iterations': max_tool_iterations,
                'backend': self.backend,
                'status': 'max_iterations',
                'timestamp': datetime.now().isoformat()
            }
        }

    async def _call_llm(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Call LLM (Ollama or Triton)"""
        if self.backend == 'ollama':
            return await self._call_ollama(messages)
        elif self.backend == 'triton':
            return await self._call_triton(messages)
        else:
            raise ValueError(f"Unknown backend: {self.backend}")

    async def _call_ollama(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Call Ollama with tool calling support"""
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "web_search",
                    "description": "Search the web for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "recency_days": {"type": "integer"},
                            "max_results": {"type": "integer"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "kb_vector_search",
                    "description": "Search knowledge base",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "collection": {"type": "string"},
                            "limit": {"type": "integer"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "graph_cypher_query",
                    "description": "Query knowledge graph with Cypher",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cypher": {"type": "string"},
                            "params": {"type": "object"}
                        },
                        "required": ["cypher"]
                    }
                }
            }
        ]

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model": "gemma3-legal:latest",
                    "messages": messages,
                    "tools": tools,
                    "stream": False
                }
            )

            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'message': {
                        'content': 'LLM call failed',
                        'tool_calls': []
                    }
                }

    async def _call_triton(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Call Triton/TRT-LLM
        Note: Triton doesn't natively support tool calling JSON,
        so we rely on the model emitting structured tool-call JSON
        """
        # Format messages for Triton
        prompt = self._format_triton_prompt(messages)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.triton_url}/v2/models/gemma3_trt/infer",
                json={
                    "inputs": [
                        {
                            "name": "text_input",
                            "shape": [1, 1],
                            "datatype": "BYTES",
                            "data": [prompt]
                        }
                    ],
                    "parameters": {
                        "max_tokens": 512,
                        "temperature": 0.7
                    }
                }
            )

            if response.status_code == 200:
                data = response.json()
                output_text = data.get('outputs', [{}])[0].get('data', [''])[0]

                # Parse for tool calls (model should emit JSON)
                return {
                    'message': {
                        'content': output_text,
                        'tool_calls': self._parse_triton_tool_calls(output_text)
                    }
                }
            else:
                return {
                    'message': {
                        'content': 'Triton call failed',
                        'tool_calls': []
                    }
                }

    def _format_triton_prompt(self, messages: List[Dict[str, Any]]) -> str:
        """Format messages into Triton-compatible prompt"""
        prompt_parts = []

        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')

            if role == 'system':
                prompt_parts.append(f"<|system|>\n{content}\n")
            elif role == 'user':
                prompt_parts.append(f"<|user|>\n{content}\n")
            elif role == 'assistant':
                prompt_parts.append(f"<|assistant|>\n{content}\n")
            elif role == 'tool':
                prompt_parts.append(f"<|tool_result|>\n{content}\n")

        prompt_parts.append("<|assistant|>\n")
        return ''.join(prompt_parts)

    def _parse_triton_tool_calls(self, output_text: str) -> List[Dict[str, Any]]:
        """
        Parse tool calls from Triton output
        Expects JSON like: {"tool": "web_search", "args": {...}}
        """
        tool_calls = []

        try:
            # Try to find JSON in output
            if '{' in output_text and '}' in output_text:
                start = output_text.index('{')
                end = output_text.rindex('}') + 1
                json_str = output_text[start:end]

                data = json.loads(json_str)

                if isinstance(data, dict) and 'tool' in data:
                    tool_calls.append({
                        'id': hashlib.md5(json_str.encode()).hexdigest()[:8],
                        'type': 'function',
                        'function': {
                            'name': data['tool'],
                            'arguments': json.dumps(data.get('args', {}))
                        }
                    })
                elif isinstance(data, list):
                    for item in data:
                        if 'tool' in item:
                            tool_calls.append({
                                'id': hashlib.md5(json.dumps(item).encode()).hexdigest()[:8],
                                'type': 'function',
                                'function': {
                                    'name': item['tool'],
                                    'arguments': json.dumps(item.get('args', {}))
                                }
                            })
        except:
            pass

        return tool_calls

    def _extract_tool_calls(self, llm_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from LLM response"""
        message = llm_response.get('message', {})
        return message.get('tool_calls', [])

    async def _execute_tools(self, tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute tool calls via MCP server"""
        results = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for call in tool_calls:
                tool_id = call.get('id', 'unknown')
                function = call.get('function', {})
                tool_name = function.get('name', '')
                args = json.loads(function.get('arguments', '{}'))

                # Log tool call
                self.tool_call_log.append({
                    'tool': tool_name,
                    'args': args,
                    'timestamp': datetime.now().isoformat()
                })

                try:
                    # Call MCP tool server
                    response = await client.post(
                        f"{self.mcp_url}/tools/{tool_name}",
                        json=args
                    )

                    if response.status_code == 200:
                        result = response.json()
                    else:
                        result = {'error': f'Tool call failed: {response.status_code}'}

                except Exception as e:
                    result = {'error': str(e)}

                results.append({
                    'tool_call_id': tool_id,
                    'tool': tool_name,
                    'result': result
                })

        return results


# CLI for testing
if __name__ == "__main__":
    import asyncio
    import sys

    async def main():
        backend = sys.argv[1] if len(sys.argv) > 1 else 'ollama'
        query = sys.argv[2] if len(sys.argv) > 2 else 'Search for TypeScript 5.7 features'

        print(f"\n🤖 Agent Orchestrator - Backend: {backend}")
        print(f"📝 Query: {query}\n")

        agent = AgentOrchestrator(backend=backend)

        result = await agent.chat(
            user_message=query,
            system_prompt="You are a helpful AI assistant with access to web search, knowledge base, and graph queries."
        )

        print(f"\n✅ Response:")
        print(result['response'])

        print(f"\n🔧 Tool Calls: {len(result['tool_calls'])}")
        for call in result['tool_calls']:
            print(f"   • {call['tool']}: {call['args']}")

        print(f"\n📊 Metadata:")
        print(f"   Iterations: {result['metadata']['iterations']}")
        print(f"   Backend: {result['metadata']['backend']}")

    asyncio.run(main())
