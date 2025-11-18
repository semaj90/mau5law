import requests
import json

# Test the agentic bridge
payload = {
    'name': 'web_parse',
    'args': ['{"test": "simd parsing", "data": [1,2,3,4,5]}']  # Pass as list
}

try:
    response = requests.post('http://localhost:8099/invoke', json=payload, timeout=10)
    print('Response:', response.json())
except Exception as e:
    print('Error:', e)