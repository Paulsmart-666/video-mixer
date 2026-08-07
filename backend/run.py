import os
import sys

# 自动将当前 Python 解释器所在目录加入 PATH，以便在 venv / 打包 EXE 中定位 ffmpeg/ffprobe
_scripts_dir = os.path.dirname(sys.executable)
if _scripts_dir not in os.environ.get("PATH", "").split(os.pathsep):
    os.environ["PATH"] = _scripts_dir + os.pathsep + os.environ.get("PATH", "")

# static_ffmpeg 自带 ffmpeg/ffprobe 静态二进制（位于其 site-packages 的 bin 目录），
# 一并加入 PATH，确保无论 venv 是否被重置都能找到 ffprobe（素材扫描依赖它）。
try:
    import static_ffmpeg

    _static_exes = static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()
    _static_bin = os.path.dirname(_static_exes[0])
    if _static_bin not in os.environ.get("PATH", "").split(os.pathsep):
        os.environ["PATH"] = _static_bin + os.pathsep + os.environ.get("PATH", "")
except Exception:
    pass

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
