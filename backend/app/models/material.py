from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .enums import Category


class MaterialClip(BaseModel):
    id: str
    name: str
    rel_path: str
    abs_path: str
    category: Category
    duration: float = Field(..., ge=0)
    width: int = Field(..., ge=0)
    height: int = Field(..., ge=0)
    fps: float = Field(..., gt=0)
    has_audio: bool = False
    size: int = Field(..., ge=0)
    video_codec: str = ""
    pix_fmt: str = ""


class CategoryGroup(BaseModel):
    category: Category
    clips: list[MaterialClip] = Field(default_factory=list)
    count: int = 0
    total_duration: float = 0.0


class LibrarySnapshot(BaseModel):
    root: str
    scanned_at: datetime
    groups: list[CategoryGroup] = Field(default_factory=list)
    missing_categories: list[Category] = Field(default_factory=list)
    unknown_folders: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    ignored_clips: list[dict] = Field(default_factory=list)
