import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..config import config_store
from ..models import Category, ComposeRequest, FrameworkType, FRAMEWORK_SEQUENCE, SegmentRef, TaskItem
from ..services.combinator import plan_combinations
from ..services.scanner import scan_library
from ..services.task_manager import task_manager
from ..utils.naming import NamingContext, render_filename

router = APIRouter(prefix="/api/compose", tags=["compose"])


def _build_segments(combo, framework: FrameworkType) -> list[SegmentRef]:
    seq = FRAMEWORK_SEQUENCE[framework]
    return [
        SegmentRef(category=cat, clip_id=clip.id, name=clip.name, duration=clip.duration)
        for cat, clip in zip(seq, combo.clips)
    ]


def _build_tasks(request: ComposeRequest, snapshot) -> tuple[list[TaskItem], str | None]:
    combos, note = plan_combinations(
        snapshot=snapshot,
        framework=request.framework,
        count=request.count,
        max_duration=request.max_duration,
    )
    batch_id = uuid.uuid4().hex[:8]
    tasks: list[TaskItem] = []
    for idx, combo in enumerate(combos, start=1):
        segments = _build_segments(combo, request.framework)
        ctx = NamingContext(
            index=idx,
            total=len(combos),
            framework=request.framework,
            segments={seg.category: seg.name.rsplit(".", 1)[0] for seg in segments},
            duration=combo.total_duration,
            batch_id=batch_id,
        )
        filename = render_filename(request.naming_rule, ctx) + ".mp4"
        tasks.append(TaskItem(
            id=uuid.uuid4().hex[:12],
            index=idx,
            filename=filename,
            segments=segments,
            est_duration=combo.total_duration,
        ))
    return tasks, note, batch_id


@router.post("/preview")
def preview_compose(request: ComposeRequest):
    snapshot = scan_library(config_store.settings.material_root)
    try:
        tasks, note, batch_id = _build_tasks(request, snapshot)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "batch_id": batch_id,
        "total": len(tasks),
        "planning_note": note,
        "tasks": [t.model_dump() for t in tasks],
    }


@router.post("")
def create_compose(request: ComposeRequest):
    snapshot = scan_library(config_store.settings.material_root)
    try:
        tasks, note, batch_id = _build_tasks(request, snapshot)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    batch = task_manager.create_batch(request, tasks, note)
    return batch.model_dump()


@router.get("/batches")
def list_batches():
    return [b.model_dump() for b in task_manager.list_batches()]


@router.get("/batches/{batch_id}")
def get_batch(batch_id: str):
    batch = task_manager.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch.model_dump()


@router.post("/batches/{batch_id}/cancel")
def cancel_batch(batch_id: str):
    batch = task_manager.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    task_manager.cancel_batch(batch_id)
    return task_manager.get_batch(batch_id).model_dump()
