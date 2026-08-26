import mimetypes
import os
import shutil
import tempfile
import urllib.parse
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response

from ..config import PROJECT_ROOT, config_store
from ..services.task_manager import task_manager
from ..utils.paths import ensure_within

# 超过此大小的响应改走流式 FileResponse 兜底，避免一次性读入内存
_MAX_INLINE_BYTES = 200 * 1024 * 1024

router = APIRouter(prefix="/api/files", tags=["files"])

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}


@router.get("/browse")
def browse_files(path: str = Query("")):
    target = Path(path) if path else Path(config_store.settings.output_dir)
    if not target.exists():
        target = Path("/workspace")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="路径必须是文件夹")

    items = []
    try:
        for item in sorted(target.iterdir()):
            if item.name.startswith("."):
                continue
            items.append({
                "name": item.name,
                "path": str(item.resolve()),
                "is_dir": item.is_dir(),
            })
    except PermissionError:
        raise HTTPException(status_code=403, detail="没有权限访问该目录")

    # parent 由服务端计算，正确处理 Windows 反斜杠路径
    parent = target.parent.resolve()
    return {"path": str(target.resolve()), "parent": str(parent), "items": items}


@router.post("/upload-bgm")
async def upload_bgm(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in AUDIO_EXTS:
        raise HTTPException(status_code=400, detail=f"不支持的音频格式: {ext or '未知'}")

    base_dir = PROJECT_ROOT / "backend" / "data" / "bgm"
    base_dir.mkdir(parents=True, exist_ok=True)

    save_name = file.filename or f"{uuid.uuid4().hex}{ext}"
    save_path = base_dir / save_name
    ensure_within(base_dir, save_path)  # 防目录穿越

    tmp_path = str(save_path) + ".part"
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        file.file.close()
        os.replace(tmp_path, str(save_path))
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"保存失败: {e}")

    return {"path": str(save_path.resolve())}


@router.get("/download")
def download_file(path: str = Query(...)):
    target = Path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="只能下载文件")

    # 允许下载的目录：用户设置的 output_dir（若为空则回退到项目默认 output）以及项目默认 output。
    # 这样无论任务落在设置目录还是默认目录，都能正常下载。
    default_output = Path(PROJECT_ROOT / "output").resolve()
    configured_output = Path(config_store.settings.output_dir or str(default_output)).resolve()
    allowed_bases = {configured_output, default_output}
    target_rp = target.resolve()
    if not any(target_rp.is_relative_to(base) for base in allowed_bases):
        raise HTTPException(status_code=403, detail="路径越界")

    media_type, _ = mimetypes.guess_type(str(target))
    media_type = media_type or "application/octet-stream"

    # 中文/特殊文件名按 RFC 5987 编码，避免部分网关解析 Content-Disposition 失败。
    # filename* 是标准 UTF-8 编码名；filename 作为旧浏览器 fallback，使用纯 ASCII 安全名。
    encoded_name = urllib.parse.quote(target.name, safe="")
    safe_ascii_name = "".join(c if c.isascii() and c not in '\\/<>|:"?*' else "_" for c in target.name) or "download"
    if not Path(safe_ascii_name).suffix:
        safe_ascii_name += Path(target.name).suffix or ""

    # 小文件一次性读入内存返回普通 Response（非流式），
    # 规避网关对分块流式响应 / 中文文件名的兼容问题
    try:
        size = target.stat().st_size
        if size <= _MAX_INLINE_BYTES:
            data = target.read_bytes()
            headers = {
                "Content-Disposition": (
                    f"attachment; filename=\"{safe_ascii_name}\"; "
                    f"filename*=UTF-8''{encoded_name}"
                ),
                "Content-Length": str(size),
                "Accept-Ranges": "none",
            }
            return Response(content=data, media_type=media_type, headers=headers)
    except Exception:
        # 读取出错则回退到 FileResponse
        pass

    return FileResponse(
        path=str(target),
        filename=target.name,
        media_type=media_type,
    )


@router.get("/download-zip")
def download_batch_zip(batch_id: str = Query(...)):
    """把指定批次中所有已完成的视频打包成 ZIP 下载。"""
    batch = task_manager.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    done_tasks = [t for t in batch.tasks if t.status == "done" and t.output_path and Path(t.output_path).exists()]
    if not done_tasks:
        raise HTTPException(status_code=400, detail="该批次没有可下载的完成视频")

    # 校验所有文件都在允许目录内
    default_output = Path(PROJECT_ROOT / "output").resolve()
    configured_output = Path(config_store.settings.output_dir or str(default_output)).resolve()
    allowed_bases = {configured_output, default_output}

    for task in done_tasks:
        target = Path(task.output_path).resolve()
        if not any(target.is_relative_to(base) for base in allowed_bases):
            raise HTTPException(status_code=403, detail=f"路径越界: {task.output_path}")

    # 打包成 ZIP（先写临时文件，再流式返回）
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"{batch_id}_{ts}.zip"
    tmp_dir = Path(tempfile.gettempdir()) / "video-mixer-zip"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    zip_path = tmp_dir / zip_name

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for task in done_tasks:
            src = Path(task.output_path)
            # ZIP 内使用原文件名；如遇重名，用 index 前缀区分
            arcname = task.filename
            zf.write(src, arcname)

    media_type, _ = mimetypes.guess_type(str(zip_path))
    return FileResponse(
        path=str(zip_path),
        filename=zip_name,
        media_type=media_type or "application/zip",
    )
