import mimetypes
import os
import shutil
import urllib.parse
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response

from ..config import PROJECT_ROOT, config_store
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

    output_base = Path(config_store.settings.output_dir).resolve()
    ensure_within(output_base, target)

    media_type, _ = mimetypes.guess_type(str(target))
    media_type = media_type or "application/octet-stream"

    # 中文/特殊文件名按 RFC 5987 编码，避免部分网关解析 Content-Disposition 失败
    ascii_name = target.name.encode("ascii", "ignore").decode() or "download"
    encoded_name = urllib.parse.quote(target.name)

    # 小文件一次性读入内存返回普通 Response（非流式），
    # 规避网关对分块流式响应 / 中文文件名的兼容问题
    try:
        size = target.stat().st_size
        if size <= _MAX_INLINE_BYTES:
            data = target.read_bytes()
            headers = {
                "Content-Disposition": (
                    f"attachment; filename=\"{ascii_name}\"; "
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
