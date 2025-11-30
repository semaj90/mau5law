
import sys
import os

# Add the current directory to sys.path to ensure we can import backend modules
sys.path.append(os.getcwd())

try:
    from backend.api.phase72_agent_api import router
    print("Import successful!")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Exception during import: {e}")
