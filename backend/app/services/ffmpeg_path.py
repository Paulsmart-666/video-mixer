import shutil
from pathlib import Path


def get_ffmpeg_exe() -> str:
    """解析 ffmpeg 可执行文件路径。

    优先级：
      1. PATH 中的 ffmpeg（系统或 static_ffmpeg 提供的、可能支持硬件编码的版本）
      2. imageio_ffmpeg 自带的静态 ffmpeg（含 libx264，必定随包安装存在）

    这样不再要求把 ffmpeg 手动拷贝进 .venv/Scripts 才能运行——
    打包 / venv 重置后只要 imageio_ffmpeg 在，就能定位到可用的 ffmpeg。
    """
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and Path(exe).exists():
            return exe
    except Exception:
        pass
    raise RuntimeError(
        "未找到可用的 ffmpeg（请确保 imageio_ffmpeg 已安装，或通过 PATH 提供 ffmpeg）"
    )


def get_ffprobe_exe() -> str:
    """解析 ffprobe 可执行文件路径。

    优先级：
      1. PATH 中的 ffprobe
      2. static_ffmpeg 包内的 ffprobe（随包安装存在）
    """
    found = shutil.which("ffprobe")
    if found:
        return found
    try:
        import static_ffmpeg

        exes = static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()
        for e in exes:
            if Path(e).name.lower().startswith("ffprobe"):
                return e
    except Exception:
        pass
    raise RuntimeError(
        "未找到可用的 ffprobe（请确保 static_ffmpeg 已安装，或通过 PATH 提供 ffprobe）"
    )
