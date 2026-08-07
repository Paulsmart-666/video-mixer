from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..config import config_store
from ..services.encoder_profile import detect_encoder_profile
from ..services.ffmpeg_path import get_ffmpeg_exe, get_ffprobe_exe

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _check_ffmpeg():
    try:
        get_ffmpeg_exe()
        get_ffprobe_exe()
        return True
    except Exception:
        return False


@router.get("")
def get_settings():
    s = config_store.settings
    profile = detect_encoder_profile()
    return {
        "material_root": s.material_root,
        "output_dir": s.output_dir,
        "concurrency": s.concurrency,
        "encoder_name": profile.name,
        "ffmpeg_ok": _check_ffmpeg(),
    }


@router.put("")
def update_settings(payload: dict):
    allowed = {"material_root", "output_dir", "concurrency"}
    updates = {k: v for k, v in payload.items() if k in allowed}

    if "material_root" in updates:
        p = Path(updates["material_root"])
        if not p.exists():
            p.mkdir(parents=True, exist_ok=True)
        if not p.is_dir():
            raise HTTPException(status_code=400, detail="素材目录必须是文件夹")

    if "output_dir" in updates:
        p = Path(updates["output_dir"])
        p.mkdir(parents=True, exist_ok=True)
        if not p.is_dir():
            raise HTTPException(status_code=400, detail="输出目录必须是文件夹")

    if "concurrency" in updates:
        try:
            updates["concurrency"] = max(1, min(16, int(updates["concurrency"])))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="并发数必须是 1~16 的整数")

    new_settings = config_store.update(**updates)
    return new_settings.model_dump()
