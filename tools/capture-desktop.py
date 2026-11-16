"""Capture the actual Pygame surface in the SDL dummy driver for repeatable QA."""
import argparse
import os
from pathlib import Path
import sys
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from game.game import gameLoop

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=("classic", "portal", "arena"), default="classic")
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    gameLoop(max_frames=2, capture_path=args.output, initial_mode=args.mode)
    print(f"Captured actual Pygame surface: {args.output.name}")
