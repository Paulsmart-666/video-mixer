#!/usr/bin/env bash
# 视频混剪工具一键启动脚本
# 终端 1 启动后端，终端 2 启动前端
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 启动后端 (http://localhost:8000)"
cd "$ROOT_DIR/backend"
python3 run.py &
BACKEND_PID=$!

echo "==> 启动前端 (http://localhost:5173)"
cd "$ROOT_DIR/frontend"
pnpm dev &
FRONTEND_PID=$!

echo "==> 已启动"
echo "    前端: http://localhost:5173"
echo "    后端 API: http://localhost:8000"
echo "    Ctrl+C 退出"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
wait
