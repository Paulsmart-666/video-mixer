from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .enums import Category, FrameworkType, TaskStatus


class ComposeOptions(BaseModel):
    transition: bool = False
    subtitle: bool = False
    watermark: bool = False
    bgm: bool = False
    voice_normalize: bool = False
    transition_type: str = "fade"
    transition_duration: float = 0.5
    watermark_text: str = ""
    bgm_path: Optional[str] = None
    bgm_volume: float = 0.25


class ComposeRequest(BaseModel):
    framework: FrameworkType
    count: int = Field(default=10, ge=1, le=500)
    max_duration: int = Field(default=70, ge=0)
    options: ComposeOptions = Field(default_factory=ComposeOptions)
    naming_rule: str = "随机组合+前贴+口播+{n}"
    output_dir: str


class SegmentRef(BaseModel):
    category: Category
    clip_id: str
    name: str
    duration: float


class TaskItem(BaseModel):
    id: str
    index: int
    filename: str
    status: TaskStatus = TaskStatus.QUEUED
    segments: list[SegmentRef] = Field(default_factory=list)
    est_duration: float = 0.0
    progress: float = Field(default=0.0, ge=0, le=1)
    output_path: Optional[str] = None
    download_url: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class BatchState(BaseModel):
    batch_id: str
    created_at: datetime
    request: ComposeRequest
    tasks: list[TaskItem] = Field(default_factory=list)
    total: int = 0
    done: int = 0
    failed: int = 0
    cancelled: int = 0
    status: Literal["running", "completed", "cancelled", "partial"] = "running"
    planning_note: Optional[str] = None


class BatchSummary(BaseModel):
    batch_id: str
    created_at: datetime
    total: int
    done: int
    failed: int
    cancelled: int
    status: Literal["running", "completed", "cancelled", "partial"]
