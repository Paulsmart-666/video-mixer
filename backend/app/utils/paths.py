from pathlib import Path

from fastapi import HTTPException


def ensure_within(base: Path, target: Path) -> Path:
    try:
        base_rp = base.resolve()
        target_rp = target.resolve()
        if not target_rp.is_relative_to(base_rp):
            raise HTTPException(status_code=403, detail="路径越界")
        return target_rp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"路径解析失败: {e}")


def sanitize_filename(name: str, max_len: int = 120) -> str:
    invalid = '\\/:*?"<>|'
    for ch in invalid:
        name = name.replace(ch, "_")
    name = "".join(c for c in name if c.isprintable())
    return name.strip(". ")[:max_len]
