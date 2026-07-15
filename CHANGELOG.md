# Changelog

All notable changes to GestureMol are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Planned one-command launcher for PyMOL, FastAPI, and the React frontend.
- Planned automated gesture tests using recorded landmark fixtures.
- Planned in-app PyMOL connection indicator and calibration controls.

### Changed

- Gesture thresholds remain subject to calibration with additional cameras, lighting conditions, and hand sizes.

## [0.1.0] - 2026-07-14

### Added

- React and Vite frontend with camera permission handling and mirrored preview.
- Local MediaPipe Hand Landmarker model and WASM runtime.
- Single-hand tracking with 21-point skeleton and palm-center overlay.
- Pinch recognition mapped to PyMOL zoom in.
- Stationary open-palm recognition mapped to PyMOL zoom out.
- Palm movement mapped to X/Y camera rotation.
- Fist-hold recognition mapped to pause and resume.
- Manual Reset View and Pause Gesture controls.
- Global sensitivity control from `0.5×` to `3.0×`.
- FastAPI health and gesture endpoints with strict action/value validation.
- PyMOL XML-RPC adapter for `turn`, `move`, and `reset` using official PyMOL APIs.
- Step 2 standalone PyMOL Python control test.
- Local development documentation and troubleshooting guidance.

### Changed

- Increased backend zoom gain from `2.0` to `6.0` after interactive testing.
- Changed zoom-out mapping from pinch closure to a stationary open palm.
- Prioritized moving-hand rotation over open-palm zoom-out detection.
- Increased open-palm activation dwell to 0.7 seconds to reduce accidental zoom events.
- Relaxed landmark pose thresholds while tightening stationary-motion requirements.

### Fixed

- Prevented pinch release from undoing the selected zoom level.
- Prevented large landmark jumps from producing unbounded zoom commands.
- Fixed intermittent PyMOL disconnections caused by sharing a non-thread-safe XML-RPC connection across FastAPI requests.
- Corrected PowerShell launch documentation for quoted PyMOL executable paths.
- Distinguished visible RPC-enabled PyMOL instances from hidden background instances.

### Security

- Restricted CORS to the local Vite development origins.
- Constrained action values to the range `-1.0` through `1.0`.
- Excluded arbitrary PyMOL command execution from the public API.
- Added ignore rules for environment files, logs, virtual environments, build output, and common molecular structure files.

[Unreleased]: https://github.com/qishaoyuan131419-cloud/GestureMol/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qishaoyuan131419-cloud/GestureMol/releases/tag/v0.1.0
