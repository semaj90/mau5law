import asyncio
import sys
sys.path.insert(0, '.')
from python_codebase.python_services.agentic_bridge_service import invoke
from pydantic import BaseModel

# Mock request object
class MockRequest:
    def __init__(self, json_data):
        self.json_data = json_data

    async def json(self):
        return self.json_data

async def test_invoke():
    # Test payload
    payload = {
        'name': 'web_parse',
        'args': {'json_input': '{"test": "simd parsing", "data": [1,2,3,4,5]}'}
    }

    request = MockRequest(payload)
    result = await invoke(request)
    print("Result:", result)

if __name__ == "__main__":
    asyncio.run(test_invoke())