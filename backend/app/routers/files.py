import mimetypes
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..config import config_store
from ..utils.paths import ensure_within

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/browse")
def browse_files(path: str = Query("/workspace")):
    target = Path(path)
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

    return {"path": str(target.resolve()), "items": items}


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
    return FileResponse(
        path=str(target),
        filename=target.name,
        media_type=media_type or "application/octet-stream",
    )
