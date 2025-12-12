#!/usr/bin/env python3
"""
Test script to run the minimal FastAPI backend
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import and run the minimal app
from backend.api.main_minimal import app
import uvicorn

if __name__ == "__main__":
    print("Starting minimal FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)