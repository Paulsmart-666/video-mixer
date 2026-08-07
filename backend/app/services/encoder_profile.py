import subprocess
from dataclasses import dataclass
from functools import lru_cache
from typing import List

from .ffmpeg_path import get_ffmpeg_exe


@dataclass
class EncoderProfile:
    name: str
    video_args: List[str]
    audio_args: List[str]


@lru_cache(maxsize=1)
def _available_encoders() -> set:
    ffmpeg = get_ffmpeg_exe()
    if not ffmpeg:
        return set()
    try:
        result = subprocess.run(
            [ffmpeg, "-encoders"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        encoders = set()
        for line in result.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0].startswith("V"):
                encoders.add(parts[1])
        return encoders
    except Exception:
        return set()


def _encoder_works(encoder: str) -> bool:
    ffmpeg = get_ffmpeg_exe()
    if not ffmpeg:
        return False
    args = [ffmpeg, "-hide_banner", "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=30", "-c:v", encoder]
    if encoder == "libopenh264":
        args += ["-profile", "high", "-rc_mode", "bitrate", "-b:v", "1M"]
    elif encoder == "libx264":
        args += ["-preset", "ultrafast", "-b:v", "1M"]
    elif encoder == "h264_nvenc":
        args += ["-preset", "fast", "-b:v", "1M"]
    elif encoder == "h264_vaapi":
        args += ["-b:v", "1M"]
    args += ["-f", "null", "-"]
    try:
        result = subprocess.run(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=15,
        )
        return result.returncode == 0 and "Conversion failed" not in result.stderr
    except Exception:
        return False


def detect_encoder_profile() -> EncoderProfile:
    enc = _available_encoders()

    candidates = [
        ("h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "fast", "-b:v", "4M", "-maxrate", "6M"]),
        ("h264_vaapi", ["-c:v", "h264_vaapi", "-b:v", "4M", "-maxrate", "6M"]),
        ("libx264", ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-maxrate", "6M"]),
        ("libopenh264", ["-c:v", "libopenh264", "-profile", "high", "-coder", "cabac", "-rc_mode", "bitrate", "-b:v", "4M", "-maxrate", "6M", "-g", "50"]),
    ]
    for name, video_args in candidates:
        if name in enc and _encoder_works(name):
            return EncoderProfile(
                name=name,
                video_args=video_args,
                audio_args=["-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2"],
            )
    raise RuntimeError("未找到可用的 H.264 编码器")
