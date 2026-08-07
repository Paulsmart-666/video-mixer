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
  - 导出文件夹选择（指定成片保存目录，支持在目录内任意层级选择）
  - 合成选项开关：转场 / 字幕（占位） / 水印 / BGM / 人声统一
    - 字幕：首期占位，尚未实现
    - 水印：开启后填写水印文字即可生效（按平台自动选择中文字体）
    - BGM：开启后上传音频文件即可生效
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
- 合成路径：统一走 `filter_complex` 归一化重编码（统一画布 + 黑边），规避流拷贝拼接不同编码/参数导致的成片损坏。

## 项目方向

本项目定位是**本地运行的桌面工具**，不依赖公网服务器，素材与成片全部保存在本地磁盘。

- **当前阶段**：在本地以 FastAPI + React 的 Web 技术栈运行，浏览器访问 `http://localhost:8000`。
- **最终目标**：开发成熟后打包为 **Windows 单机 EXE 应用**，用户下载后双击运行，无需安装 Python / Node / ffmpeg。
- **公网暴露仅作临时验证**：v1.1.5 曾用 cloudflared quick tunnel 临时把后端映射为公网地址用于「换电脑测试」，但该方案依赖沙箱与 Cloudflare、URL 随机且无 SLA，仅验证用途；正式交付仍以本地 EXE 为准，不把公网入口作为长期方案。

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

## EXE 打包与鉴权计划（v1.2.0 目标）

> 状态：**方案已确认（v1.2.0），尚未实现**。本计划把工具从「手动起后端 + 浏览器」进化为「双击 EXE 即用」，并补齐临时公网隧道暴露的短板。下方「已确认决策」为与项目负责人对齐后的最终结论，实施时按此落地。

### 为什么做 EXE（对应临时公网隧道的 4 个问题）

v1.1.5 为「换电脑能打开」临时用 cloudflared quick tunnel 把沙箱后端映射成公网地址（`https://xxx.trycloudflare.com`），暴露出 4 个问题；本地 EXE 可一次性解决：

| # | 问题 | EXE 如何解决 |
|---|------|--------------|
| 1 | 隧道每次重启 URL 变（随机域名） | EXE 在本机 `localhost` 起服务，地址固定，无随机域名 |
| 2 | 无密码保护，拿到链接谁都能用 | **在 EXE 内加鉴权**（见下「鉴权设计」） |
| 3 | 依赖 WorkBuddy 沙箱存活 | EXE 跑在用户自己的 Windows 上，与沙箱无关 |
| 4 | Cloudflare quick tunnel 无 SLA | 完全自托管，无第三方依赖 |

结论：**1 / 3 / 4 由「本地 EXE」天然消除，2 由「EXE 内鉴权」补齐**。公网隧道仅作临时测试，不纳入正式交付。

### 打包方案

- **工具**：PyInstaller（**已确认，放弃 Nuitka 候选**）。把 FastAPI 后端、前端 `dist`、ffmpeg/ffprobe 二进制打成一个 Windows 可执行文件；双击启动 uvicorn（绑定 `127.0.0.1`）并自动打开系统默认浏览器。
- **ffmpeg 收集**：v1.1.5 已把 ffmpeg 解析收口到 `ffmpeg_path.py`（`imageio_ffmpeg.get_ffmpeg_exe()` / `static_ffmpeg`）。打包时需用 PyInstaller 的 `datas` 把这两个包里的二进制收进 bundle，并在冻结态（`sys._MEIPASS`）下正确解析路径——这是 EXE 化的**关键改动点**。
- **数据与设置目录**：运行时把 `settings.json`、素材库、成片输出放到用户可写目录（建议 `%APPDATA%/video-mixer`），避免写入程序安装目录（UAC 限制）。当前「相对项目根目录方便打包」的说法在 EXE 化后需改为 AppData 或 exe 同目录可写区。
- **启动器**：用打包后的 EXE 替代现有 `start.bat`；可选加系统托盘图标（暂停 / 退出）。

### 鉴权设计（解决第 2 点）

目标：EXE 默认仅本机可访问；如需在局域网内分享，则必须输密码。

- **后端**：在 `/api/*` 上加轻量鉴权中间件，要求请求携带 access token（Bearer 或签名 cookie）。token 存于 `settings.json`：
  - 首次启动自动生成随机 token；
  - 用户也可在「设置」里自定义一个访问密码，后端据此签发会话。
- **前端**：API 客户端自动附带 token；收到 `401` 时弹出「请输入访问密码」遮罩，输入正确后拿到会话 token 存 `localStorage`。
- **绑定策略**：默认 `127.0.0.1`（仅本机）；「设置」里提供「允许局域网访问」开关，开启后才绑 `0.0.0.0`，且**强制要求设置访问密码**（否则拒绝开启 LAN 模式）。
- **降级**：纯本机、未开 LAN 模式时允许「无密码」省去每次输入；一旦开 LAN 模式，密码强制启用。

### 实施步骤（roadmap）

1. PyInstaller spec + hook：收集 `imageio_ffmpeg` / `static_ffmpeg` 二进制与 `frontend/dist`。
2. 改造 `ffmpeg_path.py`：冻结态（`sys._MEIPASS`）下正确解析 ffmpeg/ffprobe。
3. 新增鉴权中间件 + 前端密码遮罩；默认 `127.0.0.1` 绑定，LAN 模式需密码。
4. 数据目录迁移到 `%APPDATA%/video-mixer`（兼容旧的相对路径）。
5. 用打包 EXE 替换 `start.bat` 启动流程；可选托盘。
6. 构建 / 签名 / 分发脚本；更新 README「快速开始」为 EXE 路径。
7. 版本三件套同步至 `v1.2.0`，提交打 tag 推送。

### 已确认决策（v1.2.0 实施依据）

以下 4 项已与项目负责人讨论并拍板，v1.2.0 实施严格按此执行：

| # | 讨论项 | 决策 | 理由 |
|---|--------|------|------|
| ① | 打包工具 | **PyInstaller** | 生态成熟、对 FastAPI 这类动态导入的 hooks 完善；Nuitka 编译慢且易踩动态导入坑。后续如需更小体积可再评估。 |
| ② | 鉴权粒度 | **单一共享密码** | 本地工具，单一密码够用且实现简单；多用户 / 多会话无必要。token 由该密码签发，存 `settings.json`。 |
| ③ | 分发形态 | **单文件便携 EXE（优先）** | 双击即用、零安装、易分发；带安装器（Inno Setup）的安装包列为后续可选项，本期不做。 |
| ④ | 鉴权默认值 | **本机无密码** | `localhost` 仅本机可达，省去每次输入；但「允许局域网访问」开关一旦开启，**强制要求设置访问密码**方可绑 `0.0.0.0`，否则拒绝开启 LAN 模式。 |

> 实施落地后，把对应步骤标记为「✅ 已实现」回填到此章节，并同步更新「快速开始」「本地运行方式」为 EXE 路径；版本三件套同步至 `v1.2.0`。
