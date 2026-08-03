import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from ..config import config_store
from ..models import Category, MaterialClip
from ..services.probe import probe_media
from ..services.scanner import VIDEO_EXTS, _clip_id, scan_library
from ..utils.paths import ensure_within

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("")
def get_library():
    snapshot = scan_library(config_store.settings.material_root)
    return snapshot.model_dump()


@router.post("/refresh")
def refresh_library():
    snapshot = scan_library(config_store.settings.material_root, force=True)
    return snapshot.model_dump()


@router.delete("/clip")
def delete_clip(clip_id: str = Query(...)):
    snapshot = scan_library(config_store.settings.material_root)
    clip_map = {c.id: c for g in snapshot.groups for c in g.clips}
    clip = clip_map.get(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="素材不存在")
    # 防目录穿越：确保落在素材根内
    root = Path(config_store.settings.material_root).resolve()
    ensure_within(root, Path(clip.abs_path))
    try:
        os.remove(clip.abs_path)
    except FileNotFoundError:
        pass
    return {"ok": True, "id": clip_id}


@router.delete("/clips")
def delete_clips(data: dict):
    clip_ids = data.get("clip_ids", [])
    if not isinstance(clip_ids, list) or len(clip_ids) == 0:
        raise HTTPException(status_code=400, detail="未选择素材")
    snapshot = scan_library(config_store.settings.material_root)
    clip_map = {c.id: c for g in snapshot.groups for c in g.clips}
    root = Path(config_store.settings.material_root).resolve()
    deleted: list[str] = []
    not_found: list[str] = []
    for clip_id in clip_ids:
        clip = clip_map.get(clip_id)
        if not clip:
            not_found.append(clip_id)
            continue
        ensure_within(root, Path(clip.abs_path))
        try:
            os.remove(clip.abs_path)
            deleted.append(clip_id)
        except FileNotFoundError:
            deleted.append(clip_id)
    return {"ok": True, "deleted": deleted, "not_found": not_found}


def _resolve_save_path(category_dir: Path, filename: str) -> Path:
    target = category_dir / filename
    if not target.exists():
        return target
    stem, ext = os.path.splitext(filename)
    i = 1
    while True:
        candidate = category_dir / f"{stem}_{i}{ext}"
        if not candidate.exists():
            return candidate
        i += 1


@router.post("/upload")
async def upload_clip(
    category: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        cat = Category(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的分类: {category}")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in VIDEO_EXTS:
        raise HTTPException(status_code=400, detail=f"不支持的视频格式: {ext or '未知'}")

    root = Path(config_store.settings.material_root).resolve()
    category_dir = root / cat.value
    category_dir.mkdir(parents=True, exist_ok=True)

    save_path = _resolve_save_path(category_dir, file.filename or f"{uuid.uuid4().hex}{ext}")
    # 防目录穿越：确保落在素材根内
    ensure_within(root, save_path)

    abs_path = str(save_path.resolve())
    tmp_path = abs_path + ".part"
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        file.file.close()

        # 探测素材信息（不再限制时长与大小）
        info = probe_media(tmp_path)

        os.replace(tmp_path, abs_path)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"保存失败: {e}")

    clip = MaterialClip(
        id=_clip_id(str(save_path.relative_to(root))),
        name=save_path.name,
        rel_path=str(save_path.relative_to(root)),
        abs_path=abs_path,
        category=cat,
        duration=info.duration,
        width=info.width,
        height=info.height,
        fps=info.fps,
        has_audio=info.has_audio,
        size=info.size,
        video_codec=info.video_codec,
        pix_fmt=info.pix_fmt,
    )
    return clip.model_dump()
