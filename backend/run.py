import os
import sys

# 自动将当前 Python 解释器所在目录加入 PATH，以便在 venv / 打包 EXE 中定位 ffmpeg/ffprobe
_scripts_dir = os.path.dirname(sys.executable)
if _scripts_dir not in os.environ.get("PATH", "").split(os.pathsep):
    os.environ["PATH"] = _scripts_dir + os.pathsep + os.environ.get("PATH", "")

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
