# 视频混剪工具（爆款批量合成）

一个 Web 化的视频批量混剪工具，支持建立素材库、按框架交叉组合多段视频，并批量生成不重复的成片。

> **本地运行地址：`http://localhost:8000`**
>
> 必须先启动后端服务，再用浏览器访问上面的地址。详细见下方「快速开始」。

## 快速开始

本项目是**本地运行**的桌面工具，浏览器打开前必须先启动后端服务。

### 一键启动（Windows）

在项目根目录双击 `start.bat`：

1. 自动启动后端服务（会弹出一个黑色命令窗口）
2. 等待 3 秒后自动打开浏览器访问 `http://localhost:8000`

> ⚠️ **不要关闭**黑色的后端命令窗口，关闭后页面就无法访问了。

### 手动启动

```bash
cd backend
.venv\Scripts\python run.py
```

然后在浏览器打开 `http://localhost:8000`。

## 功能

- **素材库**：指定本地素材根目录，自动识别一级子文件夹作为分类：
  - `前贴`（可选）
  - `口播开头`
  - `口播中间`
  - `口播结尾`
  - 每个分类列出视频素材及时长，自动识别未分类文件夹并提示。
- **爆款合成**：
  - 框架1（4 段）：前贴 + 口播开头 + 口播中间 + 口播结尾
  - 框架2（3 段）：口播开头 + 口播中间 + 口播结尾
  - 产出数量（理论最大组合数实时显示）
  - 成片时长限制（30秒~3分钟，或不限）
  - 文件命名规则（支持 `{n}` `{framework}` `{pre}` `{opening}` `{middle}` `{ending}` `{duration}` 占位符）
  - 导出文件夹选择
  - 合成选项开关：转场 / 字幕 / 水印 / BGM / 人声统一
- **产出进度**：批次任务列表实时轮询，显示每个任务的组成片段、进度、下载链接，支持停止批次。

## 目录结构

```
backend/       FastAPI 后端服务
frontend/      Vite + React + Tailwind 前端
materials/    默认素材根目录
output/       默认导出目录
```

## 运行方式

### 开发模式

```bash
# 终端 1：启动后端
cd backend
python3 run.py

# 终端 2：启动前端
cd frontend
pnpm dev
```

前端访问 http://localhost:5173 ，后端 API 在 http://localhost:8000 ，前端已配置代理。

### 生产模式（单端口）

```bash
cd frontend && pnpm build      # 构建到 frontend/dist
cd backend && python3 run.py    # 访问 http://localhost:8000
```

构建后的前端由后端在 8000 端口统一托管。

## 使用步骤

1. 在顶部修改「素材目录」指向你的素材根目录（目录内放 `前贴/` `口播开头/` `口播中间/` `口播结尾/` 四个文件夹）。
2. 点击「刷新」扫描素材库。
3. 在「爆款合成」中选择框架、数量、时长限制，可调整命名规则与导出目录。
4. 点击「开始合成」，右侧「产出进度」实时显示状态，完成后点击「下载」获取成片。

## 技术说明

- 后端：`FastAPI` + `ffmpeg`（libopenh264 软件编码，无 GPU 环境自动适配），线程池并发合成。
- 组合算法：小组合空间穷举去重，大空间拒绝采样，保证不重复且不超过时长上限。
- 合成路径：编码参数一致时走 `concat -c copy` 快速路径；否则走 `filter_complex` 统一画布（缩放 + 黑边）后编码。

## 项目方向

本项目定位是**本地运行的桌面工具**，不依赖公网服务器，素材与成片全部保存在本地磁盘。

- **当前阶段**：在本地以 FastAPI + React 的 Web 技术栈运行，浏览器访问 `http://localhost:8000`。
- **最终目标**：开发成熟后打包为 **Windows 单机 EXE 应用**，用户下载后双击运行，无需安装 Python / Node / ffmpeg。
- **不再维护公网部署**：此前的沙箱公网地址已随实例回收失效，且本项目依赖本地 ffmpeg 与持久磁盘，不适合 Serverless / 静态托管，以后不再提供公网入口。

### 为什么不部署到 Vercel / 静态托管

| 依赖 | Serverless 现状 | 结论 |
|------|----------------|------|
| 常驻 FastAPI 服务 + 线程池 | 函数无状态、超时短 | ❌ |
| ffmpeg 视频合成（CPU 密集、长耗时） | 运行时无 ffmpeg，且超时不够 | ❌ |
| 持久磁盘保存素材库 + 成片 | `/tmp` 临时、实例隔离 | ❌ |
| 前端静态站 | 能上静态托管 | ✅（但没后端跑不起来） |

## 本地运行方式

### 方式一：生产模式（推荐，单端口）

已安装 Python 与 npm 的 Windows / macOS / Linux 环境：

```bash
# 1. 安装后端依赖（创建 venv 并安装）
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt imageio-ffmpeg static-ffmpeg

# 2. 构建前端
cd ../frontend
npm install
npm run build

# 3. 启动后端（自动托管前端 dist，访问 http://localhost:8000）
cd ../backend
.venv\Scripts\python run.py
```

> Windows 路径用反斜杠；macOS/Linux 请换成 `.venv/bin/python` 与 `/`。

### 方式二：开发模式（前后端分离）

```bash
# 终端 1：启动后端
cd backend
.venv\Scripts\python run.py

# 终端 2：启动前端 dev server
cd frontend
npm run dev
```

前端访问 `http://localhost:5173`，后端 API 在 `http://localhost:8000`，dev server 已配置代理。

### 关于 ffmpeg

后端启动时会自动检测 H.264 编码器。若使用 venv，推荐同时安装 `imageio-ffmpeg` 与 `static-ffmpeg`，并把 ffmpeg/ffprobe 复制到 `.venv/Scripts`（Windows）或 `.venv/bin`（macOS/Linux）。`backend/run.py` 已加入自动把当前解释器所在目录加入 PATH 的逻辑，方便 venv / EXE 打包场景。

### 本地测试指引

1. 启动后端，浏览器打开 `http://localhost:8000`。
2. 在顶部「素材目录」选择或创建包含 `前贴/`、`口播开头/`、`口播中间/`、`口播结尾/` 四个文件夹的目录（默认使用项目根目录下的 `materials/`）。
3. 点击「刷新」扫描素材库。
4. 中间「爆款合成」：选**框架1（4 段）**或**框架2（3 段）**；数量随意；**成片时长限制建议选「不限」或 ≥60 秒**（测试素材单组合约 33~50 秒，选 30 秒会被判不可行）。
5. 点「开始合成」，右侧「产出进度」实时轮询，完成后点「下载」即可取回成片。
6. 也可在素材库里「导入」上传你自己的视频，或「修改」素材根目录。

> 说明：默认素材目录为 `materials/`，成片输出到 `output/`，设置保存在 `backend/data/settings.json`，均相对项目根目录，方便打包 EXE。

## EXE 化方向（未来）

最终计划打包成 Windows 单机可执行文件，候选路线：

1. **PyInstaller / Nuitka**：把 FastAPI 后端、前端 `dist`、ffmpeg/ffprobe 一起打包，启动后打开系统浏览器或内嵌 WebView。
2. **Tauri / Electron**：用桌面壳嵌入前端，后端仍用 Python 子进程提供 API。
3. **PyWebView**：Python 后端 + 轻量内嵌浏览器，体积最小。

具体方案待后续版本评估，相关脚本与配置会逐步加入仓库。
