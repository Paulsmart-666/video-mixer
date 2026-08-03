import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from ..models import Category, FrameworkType
from .paths import sanitize_filename


@dataclass
class NamingContext:
    index: int
    total: int
    framework: FrameworkType
    segments: dict[Category, str]
    duration: float
    batch_id: str


def render_filename(rule: str, ctx: NamingContext) -> str:
    segments_lower = {cat.value: name for cat, name in ctx.segments.items()}

    def replacer(match):
        key = match.group(1)
        if key in ("n", "index"):
            width = len(str(ctx.total))
            return str(ctx.index).zfill(width)
        if key == "date":
            return datetime.now().strftime("%Y%m%d")
        if key == "time":
            return datetime.now().strftime("%H%M%S")
        if key == "datetime":
            return datetime.now().strftime("%Y%m%d%H%M%S")
        if key == "framework":
            return "4段" if ctx.framework == FrameworkType.F4 else "3段"
        if key in ("pre", "opening", "middle", "ending"):
            cat_map = {
                "pre": Category.PRE_ROLL,
                "opening": Category.OPENING,
                "middle": Category.MIDDLE,
                "ending": Category.ENDING,
            }
            return segments_lower.get(cat_map[key].value, "")
        if key == "duration":
            return f"{int(ctx.duration)}s"
        if key == "batch":
            return ctx.batch_id[:6]
        return match.group(0)

    if "{n}" not in rule and "{index}" not in rule:
        rule = rule + "_{n}"

    name = re.sub(r"\{(\w+)\}", replacer, rule)
    return sanitize_filename(name)
