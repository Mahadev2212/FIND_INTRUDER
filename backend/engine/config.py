"""
ChainTrace – loads config.yaml once (path is relative to the backend folder, not the CWD).
Owner: Bhanu Prasad
"""

from pathlib import Path
import yaml

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"

with open(CONFIG_PATH, encoding="utf-8") as f:
    CFG = yaml.safe_load(f)

T = CFG["thresholds"]
