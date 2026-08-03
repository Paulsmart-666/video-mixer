# syntax=docker/dockerfile:1

# ============================================================
# 视频混剪工具（video-mixer）生产镜像
# 多阶段构建：前端用 Node 构建，运行环境用 Ubuntu 22.04 + 系统 Python + ffmpeg
# 说明：ffmpeg 编码器由程序自动探测（libopenh264 优先，否则回退 libx264），
#       本镜像基于 Ubuntu 22.04，apt 安装的 ffmpeg 自带 libopenh264，与沙箱一致。
# ============================================================

# ---------- 阶段 1：构建前端 static/dist ----------
FROM node:20-slim AS frontend-build
WORKDIR /src
# 先装依赖以利用层缓存
# 用 npm 全局安装与本地一致的 pnpm 10.28.2（corepack prepare 在构建环境内拉取易失败）
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN cd frontend && npm install -g pnpm@10.28.2 && pnpm install --prefer-offline
# 再复制源码并构建（tsc -b && vite build -> frontend/dist）
COPY frontend/ ./frontend/
RUN cd frontend && pnpm build

# ---------- 阶段 2：运行环境 ----------
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Ubuntu 22.04 系统 Python 3.10 + ffmpeg（apt 版自带 libopenh264，与沙箱编码器一致）
# 注：本应用无 3.11 专属特性，3.10 完全兼容；如需严格 3.11 可改用 python:3.11-slim 基础镜像。
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv ffmpeg \
    && python3 -m pip install --upgrade pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# 后端代码与依赖
COPY backend/ /workspace/backend/
RUN python3 -m pip install -r /workspace/backend/requirements.txt

# 前端构建产物（main.py 挂载 /workspace/frontend/dist）
COPY --from=frontend-build /src/frontend/dist /workspace/frontend/dist

# 运行时目录（生产环境请用持久卷挂载 materials / output / backend/data）
RUN mkdir -p /workspace/materials /workspace/output /workspace/backend/data

WORKDIR /workspace/backend
EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
