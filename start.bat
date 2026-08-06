@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [video-mixer] 正在启动后端服务...
cd backend
start "video-mixer backend" "%~dp0backend\.venv\Scripts\python.exe" run.py

echo [video-mixer] 等待服务启动...
timeout /t 3 /nobreak >nul

echo [video-mixer] 正在打开浏览器...
start http://localhost:8000

echo [video-mixer] 后端窗口已打开，请不要关闭它。浏览器访问 http://localhost:8000
