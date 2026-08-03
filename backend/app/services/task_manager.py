import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..config import config_store
from ..models import BatchState, BatchSummary, ComposeRequest, TaskItem, TaskStatus
from .composer import Composer
from .scanner import scan_library


class TaskManager:
    def __init__(self):
        self._batches: Dict[str, BatchState] = {}
        self._cancel_events: Dict[str, threading.Event] = {}
        self._lock = threading.RLock()
        self._pool: Optional[ThreadPoolExecutor] = None

    def _ensure_pool(self):
        if self._pool is None or self._pool._shutdown:
            self._pool = ThreadPoolExecutor(max_workers=config_store.settings.concurrency)

    def create_batch(self, request: ComposeRequest, tasks: List[TaskItem], note: Optional[str]) -> BatchState:
        batch_id = uuid.uuid4().hex[:8]
        batch = BatchState(
            batch_id=batch_id,
            created_at=datetime.now(),
            request=request,
            tasks=tasks,
            total=len(tasks),
            planning_note=note,
        )

        with self._lock:
            self._batches[batch_id] = batch
            self._cancel_events[batch_id] = threading.Event()

        # 构建 clip id -> clip 的映射
        snapshot = scan_library(config_store.settings.material_root)
        clip_map = {clip.id: clip for group in snapshot.groups for clip in group.clips}

        self._ensure_pool()
        for task in tasks:
            task.output_path = str(Path(request.output_dir) / task.filename)
            task.download_url = f"/api/files/download?path={task.output_path}"
            self._pool.submit(self._worker, batch_id, task.id, clip_map)

        return batch

    def get_batch(self, batch_id: str) -> Optional[BatchState]:
        with self._lock:
            return self._batches.get(batch_id)

    def list_batches(self) -> List[BatchState]:
        with self._lock:
            return list(self._batches.values())

    def cancel_batch(self, batch_id: str) -> None:
        with self._lock:
            batch = self._batches.get(batch_id)
            event = self._cancel_events.get(batch_id)
        if event:
            event.set()
        if batch:
            for task in batch.tasks:
                if task.status == TaskStatus.QUEUED:
                    task.status = TaskStatus.CANCELLED

    def _update_task(self, batch_id: str, task_id: str, **fields):
        with self._lock:
            batch = self._batches.get(batch_id)
            if not batch:
                return
            for task in batch.tasks:
                if task.id == task_id:
                    for k, v in fields.items():
                        setattr(task, k, v)
                    break
            self._recalc_batch(batch)

    def _recalc_batch(self, batch: BatchState):
        done = sum(1 for t in batch.tasks if t.status == TaskStatus.DONE)
        failed = sum(1 for t in batch.tasks if t.status == TaskStatus.FAILED)
        cancelled = sum(1 for t in batch.tasks if t.status == TaskStatus.CANCELLED)
        batch.done = done
        batch.failed = failed
        batch.cancelled = cancelled

        if done + failed + cancelled >= batch.total:
            if failed and done:
                batch.status = "partial"
            elif failed:
                batch.status = "completed"  # 全部失败也标记完成，便于前端展示
            elif cancelled:
                batch.status = "cancelled"
            else:
                batch.status = "completed"
        else:
            batch.status = "running"

    def _worker(self, batch_id: str, task_id: str, clip_map: Dict[str, object]):
        batch = self.get_batch(batch_id)
        if not batch:
            return
        task = next((t for t in batch.tasks if t.id == task_id), None)
        if not task:
            return

        cancel_event = self._cancel_events.get(batch_id)
        if not cancel_event:
            return

        if cancel_event.is_set():
            self._update_task(batch_id, task_id, status=TaskStatus.CANCELLED)
            return

        clips = [clip_map[seg.clip_id] for seg in task.segments]
        if any(c is None for c in clips):
            self._update_task(batch_id, task_id, status=TaskStatus.FAILED, error="素材未找到")
            return

        self._update_task(batch_id, task_id, status=TaskStatus.RUNNING, started_at=datetime.now())

        def on_progress(p: float):
            self._update_task(batch_id, task_id, progress=p)

        composer = Composer()
        composer.run(task, batch.request, clips, cancel_event, on_progress)
        self._update_task(
            batch_id,
            task_id,
            status=task.status,
            progress=task.progress,
            output_path=task.output_path,
            download_url=task.download_url,
            error=task.error,
            finished_at=datetime.now(),
        )


task_manager = TaskManager()
