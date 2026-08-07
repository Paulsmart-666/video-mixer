import os
import sys
import tempfile
from pathlib import Path
from typing import List

from ..models import MaterialClip
from .encoder_profile import detect_encoder_profile
from .ffmpeg_path import get_ffmpeg_exe


def _resolve_watermark_font() -> str:
    """按平台挑选一个存在的中文字体，找不到则返回空串（退回 ffmpeg 默认字体）。"""
    candidates: List[str] = []
    if os.name == "nt":
        candidates = [
            r"C:/Windows/Fonts/msyh.ttc",
            r"C:/Windows/Fonts/simhei.ttf",
            r"C:/Windows/Fonts/arial.ttf",
        ]
    elif sys.platform == "darwin":
        candidates = [
            "/System/Library/Fonts/PingFang.ttc",
            "/Library/Fonts/Arial Unicode.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return ""


def _target_canvas(clips: List[MaterialClip]) -> tuple[int, int]:
    if not clips:
        return 1080, 1920
    first = clips[0]
    return first.width, first.height


def _escape_drawtext(text: str) -> str:
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def build_filter_complex_cmd(
    clips: List[MaterialClip],
    output_path: str,
    enable_transition: bool = False,
    transition_type: str = "fade",
    transition_duration: float = 0.5,
    enable_subtitle: bool = False,
    enable_watermark: bool = False,
    watermark_text: str = "",
    enable_bgm: bool = False,
    bgm_path: str = "",
    bgm_volume: float = 0.25,
    enable_voice_normalize: bool = False,
) -> tuple[List[str], List[Path]]:
    """返回 ffmpeg 命令列表和需要清理的临时文件列表。"""
    if not clips:
        raise ValueError("至少需要一段素材")

    width, height = _target_canvas(clips)
    fps = 30
    profile = detect_encoder_profile()

    inputs: List[str] = []
    video_filters: List[str] = []
    audio_filters: List[str] = []

    for i, clip in enumerate(clips):
        inputs += ["-i", clip.abs_path]
        # 视频标准化
        vf = (
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"setsar=1,fps={fps},format=yuv420p[v{i}]"
        )
        video_filters.append(vf)

        # 音频标准化
        if clip.has_audio:
            af = f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a{i}]"
        else:
            dur = clip.duration
            af = (
                f"anullsrc=channel_layout=stereo:sample_rate=44100[asrc{i}];"
                f"[asrc{i}]atrim=0:{dur}[a{i}]"
            )
        audio_filters.append(af)

    n = len(clips)
    if not enable_transition:
        # 简单 concat：concat 滤镜要求按"每段 [video][audio]"交错排列输入
        concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(n))
        concat_filter = f"{concat_inputs}concat=n={n}:v=1:a=1[vc][ac]"
        filter_complex_parts = video_filters + audio_filters + [concat_filter]
    else:
        # xfade 串联（首期占位，未启用）
        current_v = "v0"
        current_a = "a0"
        for i in range(1, n):
            offset = sum(clips[j].duration for j in range(i)) - transition_duration * i
            video_filters.append(
                f"[{current_v}][v{i}]xfade=transition={transition_type}:duration={transition_duration}:offset={offset}[xv{i}]"
            )
            audio_filters.append(
                f"[{current_a}][a{i}]acrossfade=d={transition_duration}[xa{i}]"
            )
            current_v = f"xv{i}"
            current_a = f"xa{i}"
        video_filters.append(f"[{current_v}]format=yuv420p[vc]")
        audio_filters.append(f"[{current_a}]aformat=sample_rates=44100:channel_layouts=stereo[ac]")
        filter_complex_parts = video_filters + audio_filters

    # 人声统一（首期占位）
    if enable_voice_normalize:
        filter_complex_parts.append("[ac]loudnorm=I=-16:TP=-1.5:LRA=11[ac]")

    # BGM（首期占位）
    if enable_bgm and bgm_path and Path(bgm_path).exists():
        inputs += ["-i", bgm_path]
        bgm_idx = n
        filter_complex_parts.append(
            f"[{bgm_idx}:a]aloop=loop=-1:size=2e9,volume={bgm_volume}[bgm];"
            f"[ac][bgm]amix=inputs=2:duration=first:dropout_transition=0[ac]"
        )

    # 字幕（首期占位）
    if enable_subtitle:
        pass

    # 水印
    if enable_watermark and watermark_text:
        text = _escape_drawtext(watermark_text)
        font = _resolve_watermark_font()
        if font:
            filter_complex_parts.append(
                f"[vc]drawtext=fontfile={font}:text='{text}':"
                f"x=w-tw-40:y=40:fontsize=36:fontcolor=white@0.6[vc]"
            )
        else:
            # 找不到字体文件时退回 ffmpeg 默认字体，避免 Windows 下直接报错
            filter_complex_parts.append(
                f"[vc]drawtext=text='{text}':"
                f"x=w-tw-40:y=40:fontsize=36:fontcolor=white@0.6[vc]"
            )

    filter_complex = ";".join(filter_complex_parts)

    cmd = [
        get_ffmpeg_exe(), "-hide_banner", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vc]", "-map", "[ac]",
        *profile.video_args,
        *profile.audio_args,
        "-movflags", "+faststart",
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]

    return cmd, []


def build_concat_demuxer_cmd(clips: List[MaterialClip], output_path: str) -> tuple[List[str], Path]:
    """快速路径：当所有片段编码参数完全一致时使用 concat demuxer -c copy。"""
    lines = []
    for clip in clips:
        escaped = clip.abs_path.replace("'", "'\\''")
        lines.append(f"file '{escaped}'")

    fd, list_path = tempfile.mkstemp(suffix=".txt", prefix="concat_", dir="/tmp")
    with open(fd, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    cmd = [
        get_ffmpeg_exe(), "-hide_banner", "-y",
        "-f", "concat", "-safe", "0",
        "-i", list_path,
        "-c", "copy",
        "-movflags", "+faststart",
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]
    return cmd, Path(list_path)
