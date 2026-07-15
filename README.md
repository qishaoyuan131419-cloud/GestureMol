# GestureMol

GestureMol is an AI-powered gesture interface for PyMOL. It adds webcam-based hand control without replacing PyMOL's molecular viewer, structure parser, or rendering engine.

> Current status: `0.1.0 MVP` for local Windows development. Gesture recognition and PyMOL control work, but startup is not yet packaged into a single launcher.

## Features

- Browser camera preview
- MediaPipe Hand Landmarker with one-hand tracking and 21-point skeleton
- Palm center, pinch, open-palm, and fist recognition
- Hand movement mapped to PyMOL X/Y camera rotation
- Pinch mapped to zoom in
- Stationary open palm mapped to zoom out
- Fist hold mapped to pause/resume
- Manual reset and pause/resume controls
- Adjustable global sensitivity (`0.5×` to `3.0×`)
- EMA smoothing, dead zones, per-event limits, and approximately 20 Hz command throttling
- FastAPI validation layer with a narrow PyMOL adapter

## Architecture

```text
Webcam
  ↓
React + MediaPipe Hand Landmarker
  ↓ HTTP JSON actions
FastAPI
  ↓ localhost XML-RPC
PyMOL official command API
  ↓
Visible PyMOL desktop window
```

GestureMol sends only validated actions. Molecular operations remain inside PyMOL.

## Gesture map

| Input | Action |
| --- | --- |
| Move palm left/right | Rotate around PyMOL Y axis |
| Move palm up/down | Rotate around PyMOL X axis |
| Pinch and slowly spread thumb/index | Zoom in |
| Open palm, keep still for 0.7 seconds | Zoom out |
| Open palm while moving | Rotate |
| Hold fist for 0.5 seconds | Pause/resume gesture control |
| Reset View button | Reset PyMOL view |

## Requirements

- Windows 10/11
- PyMOL with Python API and XML-RPC support
- Python 3.10 or newer for the API service
- Node.js 20 or newer
- npm
- Webcam and browser camera permission

The development machine used for the MVP has PyMOL 3.1.1 installed at `C:\ProgramData\pymol`.

## Installation

Clone the repository, then install the frontend dependencies:

```powershell
npm install
```

Create an isolated backend environment:

```powershell
python -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install -r ".\backend\requirements.txt"
```

The repository includes the MediaPipe WASM runtime and Hand Landmarker model under `public/` so the tracker does not depend on a runtime CDN.

## Running locally

### 1. Start visible PyMOL with RPC enabled

Close other PyMOL instances, then run:

```powershell
& "C:\ProgramData\pymol\PyMOLWin.exe" +2 -R
```

Load a molecular structure through PyMOL's **File → Open** menu or command line. For example:

```text
fetch 1ubq, async=0
show cartoon, 1ubq
zoom 1ubq
```

### 2. Start FastAPI

```powershell
& ".\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Verify the connection at <http://127.0.0.1:8000/health>. Expected response:

```json
{"status":"ok","pymol":"connected"}
```

### 3. Start the frontend

In another PowerShell window:

```powershell
npm run dev
```

Open <http://127.0.0.1:5173/>, select **Enable Camera**, and grant camera permission.

## API

Interactive documentation is available at <http://127.0.0.1:8000/docs> while FastAPI is running.

The action endpoint is:

```text
POST /api/gesture
```

Example:

```json
{
  "action": "rotate_right",
  "value": 0.25
}
```

Accepted actions are `rotate_left`, `rotate_right`, `rotate_up`, `rotate_down`, `zoom`, and `reset`. Values are validated in the range `-1.0` to `1.0`. The API does not accept arbitrary PyMOL command strings.

## Troubleshooting

### Health reports `pymol: not_connected`

- Confirm PyMOL was started with `-R`.
- Confirm port `9123` is not owned by a hidden or older PyMOL process.
- Close all PyMOL instances and start one visible instance with `+2 -R`.

### PyMOL is connected but the visible molecule does not move

The RPC server may belong to a different background PyMOL instance. Check the process listening on port `9123`, then restart a single visible PyMOL instance.

### Camera does not start

- Use `127.0.0.1` or `localhost`, which browsers treat as secure local contexts.
- Grant camera permission in the browser.
- Close other applications that exclusively own the webcam.

## Validation

Frontend production build:

```powershell
npm run build
```

Backend syntax check:

```powershell
& ".\.venv\Scripts\python.exe" -m py_compile backend\main.py backend\pymol_adapter.py
```

The Step 2 PyMOL control probe is available in `step2_pymol_control_test.py`.

## Security notes

- PyMOL RPC is bound to localhost for this MVP.
- Do not expose ports `8000` or `9123` to an untrusted network.
- The frontend sends an allow-listed action schema; arbitrary PyMOL commands are intentionally unsupported.
- Molecular files are ignored by default to reduce the risk of committing private research data.

## Roadmap

- One-command launcher for PyMOL, FastAPI, and the frontend
- Automated gesture unit tests using recorded landmark fixtures
- Improved gesture calibration and per-action sensitivity
- Connection status in the UI
- Voice/LLM action interface through the same allow-listed adapter
- Point-to-select and representation gestures in a future release

## Acknowledgements

- [PyMOL Open Source](https://github.com/schrodinger/pymol-open-source)
- [MediaPipe](https://github.com/google-ai-edge/mediapipe)
- [React](https://github.com/facebook/react)
- [FastAPI](https://github.com/fastapi/fastapi)

3Dmol.js was evaluated as a browser-viewer fallback but is not part of the current MVP.
