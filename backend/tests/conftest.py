import os
import sys

# Make `app`, `engine` importable when running `pytest` from the backend folder.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
