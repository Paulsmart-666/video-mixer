import json
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


class AppSettings(BaseModel):
    material_root: str = "/workspace/materials"
    output_dir: str = "/workspace/output"
    concurrency: int = Field(default=2, ge=1, le=16)


class ConfigStore:
    def __init__(self, path: str = "/workspace/backend/data/settings.json"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._settings = self._load()

    def _load(self) -> AppSettings:
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
                return AppSettings(**data)
            except Exception:
                pass
        return AppSettings()

    def save(self, settings: AppSettings) -> None:
        self.path.write_text(
            settings.model_dump_json(indent=2, exclude_none=True),
            encoding="utf-8",
        )
        self._settings = settings

    @property
    def settings(self) -> AppSettings:
        return self._settings

    def update(self, **kwargs) -> AppSettings:
        data = self._settings.model_dump()
        data.update(kwargs)
        new_settings = AppSettings(**data)
        self.save(new_settings)
        return new_settings


config_store = ConfigStore()
