import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class MediaInfo:
    path: str
    duration: float
    width: int
    height: int
    fps: float
    has_audio: bool
    size: int
    video_codec: str = ""
    pix_fmt: str = ""
    sample_rate: int = 44100
    channels: int = 2
    audio_codec: str = "aac"


def _parse_fps(r_frame_rate: str) -> float:
    try:
        if "/" in r_frame_rate:
            num, den = r_frame_rate.split("/")
            return float(num) / float(den)
        return float(r_frame_rate)
    except Exception:
        return 30.0


def probe_media(path: str) -> MediaInfo:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("ffprobe 未安装")

    cmd = [
        ffprobe,
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe 失败: {result.stderr}")

    data = json.loads(result.stdout)
    fmt = data.get("format", {})
    duration = float(fmt.get("duration", 0) or 0)
    size = int(fmt.get("size", 0) or 0)

    video_stream = None
    audio_stream = None
    for stream in data.get("streams", []):
        codec_type = stream.get("codec_type")
        if codec_type == "video" and video_stream is None:
            video_stream = stream
        elif codec_type == "audio" and audio_stream is None:
            audio_stream = stream

    if video_stream is None:
        raise RuntimeError("未找到视频流")

    if duration <= 0:
        stream_duration = video_stream.get("duration")
        if stream_duration:
            duration = float(stream_duration)

    width = int(video_stream.get("width", 0) or 0)
    height = int(video_stream.get("height", 0) or 0)
    fps = _parse_fps(video_stream.get("r_frame_rate", "30/1"))
    video_codec = video_stream.get("codec_name", "")
    pix_fmt = video_stream.get("pix_fmt", "")

    sample_rate = 44100
    channels = 2
    audio_codec = "aac"
    if audio_stream:
        sample_rate = int(audio_stream.get("sample_rate", 44100) or 44100)
        channels = int(audio_stream.get("channels", 2) or 2)
        audio_codec = audio_stream.get("codec_name", "aac")

    return MediaInfo(
        path=path,
        duration=duration,
        width=width,
        height=height,
        fps=fps,
        has_audio=audio_stream is not None,
        size=size,
        video_codec=video_codec,
        pix_fmt=pix_fmt,
        sample_rate=sample_rate,
        channels=channels,
        audio_codec=audio_codec,
    )


def quick_duration(path: str) -> float:
    try:
        return probe_media(path).duration
    except Exception:
        return 0.0
