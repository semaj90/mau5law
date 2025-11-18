import sys
sys.path.insert(0, '.')
from python_codebase.utilities.simd_parser_service import main

# Simulate command line args
original_argv = sys.argv
sys.argv = ['simd_parser_service.py', '{"test": "direct import", "data": [1,2,3]}']

try:
    main()
finally:
    sys.argv = original_argv