# GestureMol 更新日志与开发记录

本文档记录 GestureMol 从项目 Prompt、技术调研、MVP 实现到交互调试的完整过程，可直接作为项目汇报与 Presentation 的开发依据。

版本格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。除正式版本变化外，本文额外保留 Prompt 驱动开发记录和 Debug 时间线，以呈现 Vibe Coding 的真实迭代过程。

---

## 项目摘要

GestureMol 不是重新开发 PyMOL，而是在 PyMOL 上方增加一层手势交互接口：

```text
摄像头
  ↓
React + MediaPipe Hand Landmarker
  ↓
FastAPI 动作校验层
  ↓
PyMOL 官方 Python / Command API
  ↓
PyMOL 桌面窗口
```

核心原则：

- 不自行实现分子 Viewer。
- 不自行解析 PDB、CIF 等结构文件。
- 不自行实现分子旋转矩阵或 OpenGL 渲染。
- 所有真实分子与视图操作交给 PyMOL。
- GestureMol 只负责识别、平滑、限流和动作映射。
- MVP 稳定性优先于功能数量。

---

## [未发布]

### 计划新增

- 一键启动器：自动启动可见 PyMOL、FastAPI 和 React 页面。
- 页面内显示 Camera、FastAPI 和 PyMOL 三方连接状态。
- 使用录制的 Hand Landmark 数据进行自动化手势回归测试。
- 将旋转、Zoom、手势保持时间拆分成独立校准参数。
- 增加首次启动向导，减少手动输入 `+2 -R` 的操作。
- 为 Voice / LLM / Point Gesture 预留统一动作接口。

### 待优化

- 在更多摄像头、光线、肤色、手型和背景条件下校准阈值。
- 进一步解决 Open Palm 与移动旋转之间的姿态语义冲突。
- 对连续动作加入更完整的累计 Rotation Limit 与 Zoom Limit。
- 增加 PyMOL 断线后的自动重连提示。

---

## [0.1.0] - 2026-07-14 至 2026-07-16

### 版本目标

完成可运行的本地 MVP：摄像头识别单手，通过 FastAPI 调用 PyMOL 官方 API，实现 Rotate、Zoom、Reset 与 Pause，并完成 README、更新日志和 GitHub 仓库。

## 新增功能

### 前端与摄像头

- 使用 React + Vite 创建科研软件风格页面。
- 增加 `Enable Camera` / `Disable Camera`。
- 增加镜像摄像头预览。
- 增加摄像头权限、设备不可用和浏览器不支持提示。
- 增加 Camera Status、Hand Tracking 和 Gesture Status。
- 增加手动 `Reset View` 与 `Pause Gesture` 按钮。
- 增加全局 Sensitivity 滑块，范围为 `0.5×–3.0×`。

### MediaPipe Hand Tracking

- 接入官方 `@mediapipe/tasks-vision`。
- 将 MediaPipe WASM 和 Hand Landmarker 模型保存在本地，避免运行时依赖 CDN。
- 限制为单手识别。
- 绘制 21 个手部关键点和骨架连线。
- 计算并绘制橙色手掌中心点。
- 显示 Left / Right hand detected 状态。

### 手势功能

- 手掌左右移动映射到 PyMOL Y 轴旋转。
- 手掌上下移动映射到 PyMOL X 轴旋转。
- Pinch 映射到 Zoom In。
- 五指张开并保持静止映射到连续 Zoom Out。
- 五指张开但正在移动时优先执行 Rotate。
- 握拳保持 0.5 秒切换 Pause / Resume。
- Open Palm 和 Fist 均加入保持确认，避免单帧误触。
- 手势停止或离开画面后重置内部追踪基线。

### 稳定性处理

- 为 Pinch 距离加入 EMA 平滑。
- 为手掌中心移动加入 EMA 平滑。
- 为 Zoom 与 Rotation 加入 Dead Zone。
- 将连续 PyMOL 调用限制到约 20 Hz。
- 对单次 Rotation 和 Zoom 值进行夹紧。
- Pinch 单次输出限制为 `±0.25`。
- FastAPI 输入值限制为 `-1.0～1.0`。
- 后端 Zoom 增益由 `2.0` 调整为 `6.0`。

### FastAPI 与 PyMOL

- 增加 `GET /health`。
- 增加 `POST /api/gesture`。
- 支持 `rotate_left`、`rotate_right`、`rotate_up`、`rotate_down`、`zoom`、`reset`。
- 使用 Pydantic 枚举与数值范围校验动作。
- 增加本地 CORS 白名单，仅允许 Vite 开发地址。
- 创建窄接口 `PyMOLAdapter`，禁止前端提交任意 PyMOL 命令字符串。
- 通过 PyMOL 官方 XML-RPC 模式连接 `127.0.0.1:9123`。
- Rotate 使用官方 `turn()`，避免修改分子原子坐标。
- Zoom 使用官方 `move("z", amount)` 实现增量视图缩放。
- Reset 使用官方 `reset()`。
- 增加 `step2_pymol_control_test.py`，验证 Python 可真实控制 PyMOL。

### 工程化

- 创建独立 Python 虚拟环境，隔离系统 Python 与 PyMOL 自带 Python。
- 增加固定版本的 FastAPI 与 Uvicorn requirements。
- 增加生产构建检查与 Python 语法检查。
- 增加 `.gitignore`，排除日志、虚拟环境、构建目录、环境变量和常见分子文件。
- 增加完整 README、运行流程、API 文档、安全说明和故障排查。
- 初始化 Git 仓库并上传 GitHub。

---

## Prompt 驱动开发过程

### Prompt 0：定义项目边界

初始 Prompt 明确提出：

- 项目名称为 GestureMol。
- 目标是 AI-powered Gesture Interface for PyMOL。
- 不重新开发 PyMOL。
- 前端使用 React，手势使用 MediaPipe，后端使用 FastAPI，执行端使用 PyMOL API。
- 第一版只实现 Camera、Hand Tracking、Rotate、Zoom、Reset、Pause 与 Smoothing。
- Voice、LLM、Point Select、Circle Surface、Thumb Up Cartoon 只预留接口，不在 MVP 实现。
- 必须按 Step 1～Step 9 顺序开发，每一步运行、测试、修 Bug。

这一 Prompt 决定了后续所有技术选择，尤其是“不重复实现分子 Viewer”和“官方 API 优先”。

### Prompt 1：项目调研，不立即写代码

执行内容：

- 调研 PyMOL Command API、Python API、`pymol2`、XML-RPC。
- 调研 MediaPipe Hand Landmarker。
- 调研 3Dmol.js 作为备用方案。
- 确定 PyMOL 几乎所有 MVP 操作都能通过 `pymol.cmd` 控制。
- 确定视图旋转应优先使用 `cmd.turn()`，而不是可能影响对象变换的 `cmd.rotate()`。
- 确定 3Dmol.js 仅作为备用，不进入当前 MVP。

### Prompt 2：Step 1 环境检查

检测结果：

- 系统 Python：3.13.2。
- Node.js：24.18.0。
- npm：11.16.0。
- PyMOL 实际已安装于 `C:\ProgramData\pymol`，但未加入 PATH。
- PyMOL 自带 Python：3.10.15。
- PyMOL 版本：3.1.1。
- `pymol` 与 `pymol2` 在 PyMOL 自带环境中均可导入。
- FastAPI、Uvicorn 和 MediaPipe Python 包最初未安装。

决策：不污染 PyMOL 自带环境；FastAPI 使用项目内 `.venv`，MediaPipe 使用浏览器端 JavaScript 包。

### Prompt 3：Step 2 最小 PyMOL 控制验证

- 创建 `step2_pymol_control_test.py`。
- 使用 `cmd.pseudoatom()` 创建红色和青色测试对象。
- 使用 `cmd.rotate()` 完成 Prompt 要求的最小验证。
- 在 PyMOL 控制台运行脚本，得到 `PASS`。

### Prompt 4：Step 3 React 摄像头页面

- 创建 Vite + React 项目。
- 第一版页面只包含 Enable Camera 与 Camera Preview。
- 完成浏览器摄像头权限处理。
- 运行生产构建验证。

### Prompt 5：Step 4 MediaPipe Hand Tracking

- 安装 `@mediapipe/tasks-vision`。
- 下载官方 Hand Landmarker 模型。
- 本地托管模型和 WASM。
- 绘制骨架、关键点与手掌中心。

### Prompt 6：Step 5 FastAPI 动作接收层

- 创建独立 `.venv`。
- 增加 `/health` 与 `/api/gesture`。
- 首先只打印 Rotate Left、Rotate Right、Zoom、Reset，不调用 PyMOL。
- 通过 Swagger `/docs` 验证 POST 请求。

### Prompt 7：Step 6 Rotate 接入 PyMOL

- 发现系统 Python 与 PyMOL Python 相互隔离。
- 采用 PyMOL 官方 `-R` XML-RPC 作为进程桥接。
- FastAPI 使用固定动作调用 PyMOL `turn()`。
- 增加上下左右四个旋转方向。

### Prompt 8：Step 7 Pinch Zoom

- 使用拇指尖 landmark 4 与食指尖 landmark 8 的距离。
- 使用手掌尺度进行归一化，降低手与摄像头距离的影响。
- 将 Pinch 距离变化转换为连续 Zoom 值。
- 增加释放检测、EMA、Dead Zone、输出夹紧和灵敏度。

### Prompt 9：Step 8 Reset 与后续手势调整

- 最初实现 Open Palm → Reset。
- 后续根据交互反馈，将 Open Palm 改为 Zoom Out。
- Reset 改由页面按钮稳定触发。
- 增加 Fist → Pause / Resume。
- 增加移动手掌 → Rotate X/Y。

### Prompt 10：Step 9 稳定性与 UI 参数

- 增加全局 Sensitivity。
- 增加 Rotation / Zoom EMA。
- 增加 Dead Zone 和调用频率限制。
- 调整 Open Palm 的保持时间与运动优先级。
- 持续根据实际 PyMOL 视觉反馈调整增益。

### Prompt 11：文档、GitHub 与发布准备

- 编写 README。
- 编写更新日志。
- 检查潜在密钥和敏感研究结构文件。
- 初始化本地 Git。
- 合并 GitHub 自动生成的 `.gitattributes` 初始提交。
- 推送 `main` 到 GitHub。

---

## Debug 时间线

### Debug 1：`http://localhost:9123` 无法打开

**现象**：浏览器显示 `ERR_CONNECTION_REFUSED`。

**原因**：`9123` 是 PyMOL XML-RPC 端口，不是网页；同时 PyMOL RPC 尚未启动。

**修复**：

- 明确前端地址为 `5173`。
- FastAPI 地址为 `8000`。
- PyMOL RPC 地址为 `9123`，只供程序调用。

### Debug 2：PyMOL 看似未安装

**现象**：`Get-Command pymol` 和系统 Python import 均失败。

**原因**：PyMOL 安装在 `C:\ProgramData\pymol`，没有加入 PATH，并使用自己的 Python 3.10。

**修复**：检查开始菜单快捷方式目标，确认 `PyMOLWin.exe`、自带 Python、`pymol` 和 `pymol2` 均可用。

### Debug 3：PowerShell 无法执行带 `-R` 的 PyMOL 路径

**现象**：PowerShell 报 `Unexpected token '-R'`。

**原因**：带引号的可执行文件路径需要调用运算符。

**修复命令**：

```powershell
& "C:\ProgramData\pymol\PyMOLWin.exe" +2 -R
```

### Debug 4：React 页面短暂可用后再次拒绝连接

**现象**：`127.0.0.1:5173` 返回 `ERR_CONNECTION_REFUSED`。

**原因**：首次后台启动的 Vite 进程随受限命令会话结束。

**修复**：使用独立持久进程启动 Vite，并在每次启动后执行 HTTP 200 探测。

### Debug 5：MediaPipe 模型无法下载

**现象**：`Invoke-WebRequest` 无法连接 Google Storage。

**原因**：沙箱网络访问受限。

**修复**：经用户授权后从 Google 官方模型仓库下载，并保存到 `public/models`。

### Debug 6：访问 `/api/gesture` 返回 Method Not Allowed

**现象**：浏览器显示 `{"detail":"Method Not Allowed"}`。

**原因**：浏览器地址栏发送 GET，而接口只接受 POST。

**修复**：通过 `/docs` Swagger 页面或 POST JSON 请求测试；GET 健康检查使用 `/health`。

### Debug 7：Health 显示 `pymol: not_connected`

**现象**：FastAPI 正常，但 PyMOL 未连接。

**原因**：用户使用普通方式打开 PyMOL，没有添加 `-R`。

**修复**：关闭普通实例，以 `+2 -R` 启动可见 RPC PyMOL。

### Debug 8：Health 已 connected，但可见 PyMOL 没反应

**现象**：API 返回成功，用户看到的 PyMOL 不动。

**原因**：RPC 端口被另一个无窗口 `pythonw.exe` PyMOL 实例占用；GestureMol 控制的是后台实例。

**验证**：调用 `get_view()` 前后比较，旋转矩阵确实发生变化，但 RPC 进程窗口句柄为 0。

**修复**：停止后台 RPC PID，只保留一个由用户桌面启动的可见 `+2 -R` PyMOL。

### Debug 9：PyMOL 动作幅度太小

**现象**：Zoom 生效但肉眼变化很小。

**原因**：初始后端增益为 `2.0`，前端 landmark delta 同样较小。

**修复**：将后端 Zoom 增益提高到 `6.0`，随后增加全局 Sensitivity。

### Debug 10：Pinch 结束后视图大小恢复

**现象**：Pinch 调整完成后，松开手指会抵消之前的缩放。

**原因**：快速张开手指被当成反方向 Zoom delta。

**修复**：

- 加入 Pinch release jump 检测。
- 松手只结束手势，不发送最后一次反向命令。
- 加入 EMA、Dead Zone 和单次输出限制。

### Debug 11：Pinch 只能缩小，不能放大

**现象**：松手保护过强，阻止了正常的张开变化。

**原因**：Pinch release 阈值过低，有效距离范围过小。

**修复**：扩大有效比例范围，放宽快速释放阈值，并显示 Zoom In / Zoom Out 状态用于校准。

### Debug 12：XML-RPC 偶发 `CannotSendRequest`

**现象**：Health 与 Zoom 并发时偶发断开或 500 错误。

**原因**：多个 FastAPI 线程共享同一个非线程安全的 `ServerProxy/HTTPConnection`。

**修复**：每次 PyMOL API 调用创建独立 XML-RPC client。连续 10 次 Health + Zoom 测试全部 connected。

### Debug 13：Open Palm 检测不灵敏

**现象**：五指已经张开，但 Gesture 状态不稳定。

**原因**：拇指和四指的伸直比例要求过严，MediaPipe landmark 存在轻微抖动。

**修复**：

- 允许 5 根手指中可靠检测到 4 根。
- 四指伸展比例从 `1.12` 放宽至 `1.03`。
- 放宽拇指条件。
- 调整保持时间和静止容差。

### Debug 14：想旋转时误触 Zoom Out

**现象**：移动张开的手掌准备旋转，却进入 Open Palm Zoom Out。

**根本原因**：旋转与 Zoom Out 使用了高度相似的 Open Palm 姿态，属于交互语义冲突，而不仅是识别精度问题。

**修复策略**：

- 手掌移动始终优先 Rotate。
- Open Palm 等待期间不阻止 Rotate。
- 只有五指张开且累计位移低于 `0.018`、静止保持 0.7 秒后才开始 Zoom Out。
- 明显移动立即取消 Zoom Out 倒计时。

### Debug 15：GitHub 首次 Push 被拒绝

**现象**：`main -> main (fetch first)`。

**原因**：GitHub 仓库已包含自动生成的 `.gitattributes` 初始提交，本地仓库拥有独立历史。

**修复**：

- 先 fetch 远程 main。
- 检查远程仅包含 `.gitattributes`。
- 使用 `--allow-unrelated-histories` 安全合并。
- 保留双方历史后正常推送，不使用 force push。

---

## 关键技术决策变化

| 阶段 | 初始方案 | 最终方案 | 原因 |
| --- | --- | --- | --- |
| 旋转 API | `cmd.rotate()` | `cmd.turn()` | Rotate 视图而非修改对象/坐标 |
| MediaPipe 位置 | Python 后端 | React 前端 | 减少视频传输延迟与后端负担 |
| PyMOL 连接 | 直接 import | localhost XML-RPC | 系统 Python 与 PyMOL Python 隔离 |
| 浏览器 Viewer | 考虑 3Dmol.js | PyMOL 独立窗口 | 避免维护第二套分子 Viewer |
| Pinch 行为 | 双向 Zoom | Pinch Zoom In | 减少松手回弹与歧义 |
| Zoom Out | Pinch 反方向 | 静止 Open Palm | 提供独立、可表达的缩小手势 |
| Reset | Open Palm | 页面按钮 | Open Palm 已用于 Zoom Out，按钮更稳定 |
| XML-RPC client | 单例共享 | 每次调用独立连接 | 避免 FastAPI 并发线程冲突 |

---

## Presentation 可用结论

1. GestureMol 成功证明了“浏览器手势层控制桌面科学软件”的可行性。
2. PyMOL 无需被重写，官方 API 足以支持旋转、缩放、重置、选择和表示控制。
3. MediaPipe 能稳定提供 21 个 landmarks，但高质量交互依赖时间、速度、姿态和状态机，而不是单帧阈值。
4. 最困难的问题不是模型推理，而是手势语义冲突、进程连接、状态保持与抖动控制。
5. Vibe Coding 在本项目中体现为：Prompt 定义边界 → 小步实现 → 实机测试 → 用户反馈 → 参数和交互重构。
6. 当前 MVP 已完成核心闭环，但正式产品还需要一键启动器、自动重连、回归数据集和更系统的可用性测试。

---

## 安全与隐私

- FastAPI 只接受白名单动作，不接受任意 PyMOL 命令。
- CORS 限制为本地开发地址。
- PyMOL RPC 与 FastAPI 不应暴露到不可信网络。
- Git 忽略 PDB、CIF、MOL、MOL2、SDF 等常见结构文件，降低私人研究数据被误提交的风险。
- Git 忽略 `.env`、日志、虚拟环境、Node modules 与构建产物。

[未发布]: https://github.com/qishaoyuan131419-cloud/GestureMol/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qishaoyuan131419-cloud/GestureMol/releases/tag/v0.1.0
