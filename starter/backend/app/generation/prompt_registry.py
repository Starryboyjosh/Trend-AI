from __future__ import annotations

from functools import lru_cache
from pathlib import Path

PROMPT_ROOT = Path(__file__).resolve().parents[4] / "contracts" / "prompts"


@lru_cache(maxsize=8)
def get_social_copy_prompt() -> tuple[str, str]:
    prompt = (PROMPT_ROOT / "social-copy.system.md").read_text(encoding="utf-8")
    version = "1.0.0"
    for line in prompt.splitlines():
        if line.startswith("version:"):
            version = line.split(":", 1)[1].strip()
            break
    return prompt, f"social-copy@{version}"
