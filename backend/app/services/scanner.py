import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Iterator, Optional

from ..config import PROJECT_ROOT
from ..models import Category, CategoryGroup, LibrarySnapshot, MaterialClip
from .probe import probe_media

VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".m4v", ".ts", ".webm", ".3gp", ".mpg", ".mpeg"}

CATEGORY_ALIASES: dict[str, Category] = {
    "前贴": Category.PRE_ROLL,
    "前贴片": Category.PRE_ROLL,
    "preroll": Category.PRE_ROLL,
    "pre": Category.PRE_ROLL,
    "口播开头": Category.OPENING,
    "开头": Category.OPENING,
    "opening": Category.OPENING,
    "口播中间": Category.MIDDLE,
    "中间": Category.MIDDLE,
    "middle": Category.MIDDLE,
    "口播结尾": Category.ENDING,
    "结尾": Category.ENDING,
    "ending": Category.ENDING,
}

IGNORE_DIRS = {".git", "__MACOSX", "@eaDir", ".DS_Store", "node_modules", "__pycache__"}

def _normalize(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[\s\-_]+", "", text)
    return text


def _match_category(folder_name: str) -> Optional[Category]:
    normalized = _normalize(folder_name)
    if normalized in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[normalized]
    for alias, cat in CATEGORY_ALIASES.items():
        if normalized == _normalize(alias):
            return cat
    return None


def _is_video(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in VIDEO_EXTS and path.stat().st_size > 0


def _iter_videos(folder: Path) -> Iterator[Path]:
    if not folder.is_dir():
        return
    for item in folder.iterdir():
        if item.is_file() and _is_video(item):
            yield item


def _clip_id(rel_path: str) -> str:
    return hashlib.sha1(rel_path.encode("utf-8")).hexdigest()[:12]


def _load_probe_cache(cache_path: Path) -> dict:
    if cache_path.exists():
        try:
            return json.loads(cache_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _save_probe_cache(cache_path: Path, cache: dict) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def scan_library(root: str, cache_path: str = "", force: bool = False) -> LibrarySnapshot:
    if not cache_path:
        cache_path = str(PROJECT_ROOT / "backend" / "data" / "probe_cache.json")
    root_path = Path(root)
    if not root_path.is_dir():
        return LibrarySnapshot(
            root=root,
            scanned_at=datetime.now(),
            missing_categories=list(Category),
            errors=[f"素材目录不存在: {root}"],
        )

    cache = {} if force else _load_probe_cache(Path(cache_path))
    new_cache: dict[str, dict] = {}
    groups: dict[Category, list[MaterialClip]] = {cat: [] for cat in Category}
    unknown_folders: list[str] = []
    errors: list[str] = []
    def probe_and_build(video_path: Path, category: Category, rel_path: str) -> Optional[MaterialClip]:
        try:
            abs_path = str(video_path.resolve())
            stat = video_path.stat()
            cache_key = f"{abs_path}|{stat.st_mtime_ns}|{stat.st_size}"

            if not force and cache_key in cache:
                info = cache[cache_key]
            else:
                info = probe_media(abs_path)
                info_dict = {
                    "duration": info.duration,
                    "width": info.width,
                    "height": info.height,
                    "fps": info.fps,
                    "has_audio": info.has_audio,
                    "size": info.size,
                    "video_codec": info.video_codec,
                    "pix_fmt": info.pix_fmt,
                    "sample_rate": info.sample_rate,
                    "channels": info.channels,
                    "audio_codec": info.audio_codec,
                }
                new_cache[cache_key] = info_dict

            duration = info["duration"] if isinstance(info, dict) else info.duration

            clip = MaterialClip(
                id=_clip_id(rel_path),
                name=video_path.name,
                rel_path=rel_path,
                abs_path=abs_path,
                category=category,
                duration=duration,
                width=info["width"] if isinstance(info, dict) else info.width,
                height=info["height"] if isinstance(info, dict) else info.height,
                fps=info["fps"] if isinstance(info, dict) else info.fps,
                has_audio=info["has_audio"] if isinstance(info, dict) else info.has_audio,
                size=info["size"] if isinstance(info, dict) else info.size,
                video_codec=info["video_codec"] if isinstance(info, dict) else info.video_codec,
                pix_fmt=info["pix_fmt"] if isinstance(info, dict) else info.pix_fmt,
            )
            return clip
        except Exception as e:
            errors.append(f"{rel_path}: {e}")
            return None

    tasks = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for sub in sorted(root_path.iterdir()):
            if not sub.is_dir() or sub.name.startswith(".") or sub.name in IGNORE_DIRS:
                continue
            category = _match_category(sub.name)
            if category is None:
                unknown_folders.append(sub.name)
                continue
            for video in sorted(_iter_videos(sub)):
                rel = str(video.relative_to(root_path))
                future = executor.submit(probe_and_build, video, category, rel)
                tasks.append((category, future))

    for category, future in tasks:
        clip = future.result()
        if clip:
            groups[category].append(clip)

    cache.update(new_cache)
    _save_probe_cache(Path(cache_path), cache)

    category_groups = []
    missing = []
    for cat in Category:
        clips = sorted(groups[cat], key=lambda c: c.name)
        total_duration = sum(c.duration for c in clips)
        category_groups.append(
            CategoryGroup(category=cat, clips=clips, count=len(clips), total_duration=total_duration)
        )
        if cat != Category.PRE_ROLL and len(clips) == 0:
            missing.append(cat)

    return LibrarySnapshot(
        root=str(root_path.resolve()),
        scanned_at=datetime.now(),
        groups=category_groups,
        missing_categories=missing,
        unknown_folders=unknown_folders,
        errors=errors,
        ignored_clips=[],
    )
