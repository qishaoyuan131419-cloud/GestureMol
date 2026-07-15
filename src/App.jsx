import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const previousPinchRef = useRef(null);
  const rawPinchRef = useRef(null);
  const smoothedPinchRef = useRef(null);
  const lastGestureSentRef = useRef(0);
  const openPalmStartRef = useRef(null);
  const openPalmAnchorRef = useRef(null);
  const lastOpenPalmZoomRef = useRef(0);
  const fistStartRef = useRef(null);
  const fistLatchedRef = useRef(false);
  const pausedRef = useRef(false);
  const smoothedPalmRef = useRef(null);
  const previousPalmRef = useRef(null);
  const lastRotationSentRef = useRef(0);
  const sensitivityRef = useRef(1);
  const [status, setStatus] = useState("Camera disabled");
  const [trackingStatus, setTrackingStatus] = useState("Not tracking");
  const [gestureStatus, setGestureStatus] = useState("None");
  const [paused, setPaused] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [error, setError] = useState("");

  const clearOverlay = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawHand = (landmarks) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = Math.max(2, canvas.width / 420);
    context.strokeStyle = "#72c7c2";

    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      context.beginPath();
      context.moveTo((1 - start.x) * canvas.width, start.y * canvas.height);
      context.lineTo((1 - end.x) * canvas.width, end.y * canvas.height);
      context.stroke();
    }

    context.fillStyle = "#eafffd";
    for (const point of landmarks) {
      context.beginPath();
      context.arc(
        (1 - point.x) * canvas.width,
        point.y * canvas.height,
        Math.max(3, canvas.width / 260),
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    const palmIndices = [0, 5, 9, 13, 17];
    const palm = palmIndices.reduce(
      (center, index) => ({
        x: center.x + landmarks[index].x / palmIndices.length,
        y: center.y + landmarks[index].y / palmIndices.length,
      }),
      { x: 0, y: 0 },
    );
    context.fillStyle = "#ffb45e";
    context.beginPath();
    context.arc((1 - palm.x) * canvas.width, palm.y * canvas.height, 8, 0, Math.PI * 2);
    context.fill();
  };

  const distance2d = (first, second) => Math.hypot(
    first.x - second.x,
    first.y - second.y,
  );

  const sendGesture = (action, value) => {
    fetch("http://127.0.0.1:8000/api/gesture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, value }),
    }).catch(() => setGestureStatus("Backend unavailable"));
  };

  const processPinch = (landmarks, now) => {
    const palmScale = distance2d(landmarks[0], landmarks[9]);
    if (palmScale < 0.01) return false;

    const pinchRatio = distance2d(landmarks[4], landmarks[8]) / palmScale;
    const wasPinching = previousPinchRef.current !== null;
    const isPinching = pinchRatio < (wasPinching ? 0.9 : 0.65);

    if (!isPinching) {
      previousPinchRef.current = null;
      rawPinchRef.current = null;
      smoothedPinchRef.current = null;
      setGestureStatus("None");
      return false;
    }

    // A quick increase in finger distance means the user released the pinch.
    // End the gesture without turning that release motion into reverse zoom.
    if (
      rawPinchRef.current !== null
      && pinchRatio - rawPinchRef.current > 0.2
    ) {
      previousPinchRef.current = null;
      rawPinchRef.current = null;
      smoothedPinchRef.current = null;
      setGestureStatus("None");
      return false;
    }

    rawPinchRef.current = pinchRatio;
    smoothedPinchRef.current = smoothedPinchRef.current === null
      ? pinchRatio
      : smoothedPinchRef.current + 0.35 * (pinchRatio - smoothedPinchRef.current);

    setGestureStatus("Pinch · Zoom");
    if (previousPinchRef.current === null) {
      previousPinchRef.current = smoothedPinchRef.current;
      return true;
    }
    if (
      now - lastGestureSentRef.current >= 50
    ) {
      const delta = smoothedPinchRef.current - previousPinchRef.current;
      if (Math.abs(delta) >= 0.012) {
        const value = Math.max(
          -0.25,
          Math.min(0.25, delta * 5 * sensitivityRef.current),
        );
        if (value > 0) sendGesture("zoom", value);
        lastGestureSentRef.current = now;
        previousPinchRef.current = smoothedPinchRef.current;
        setGestureStatus(value > 0 ? "Pinch · Zoom In" : "Open fingers for Zoom Out");
      }
    }
    return true;
  };

  const processOpenPalm = (landmarks, now) => {
    const wrist = landmarks[0];
    const extendedFingerPairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
    const extendedFingerCount = extendedFingerPairs.filter(([tip, joint]) => (
      distance2d(landmarks[tip], wrist) > distance2d(landmarks[joint], wrist) * 1.03
    )).length;
    const thumbExtended = (
      distance2d(landmarks[4], landmarks[9])
      > distance2d(landmarks[3], landmarks[9])
    );
    const openPalm = extendedFingerCount + Number(thumbExtended) >= 4;

    if (!openPalm) {
      openPalmStartRef.current = null;
      openPalmAnchorRef.current = null;
      return false;
    }

    const palmIndices = [0, 5, 9, 13, 17];
    const palm = palmIndices.reduce(
      (center, index) => ({
        x: center.x + landmarks[index].x / palmIndices.length,
        y: center.y + landmarks[index].y / palmIndices.length,
      }),
      { x: 0, y: 0 },
    );
    if (openPalmAnchorRef.current === null) openPalmAnchorRef.current = palm;
    if (distance2d(palm, openPalmAnchorRef.current) > 0.018) {
      openPalmAnchorRef.current = palm;
      openPalmStartRef.current = null;
      return false;
    }

    if (openPalmStartRef.current === null) {
      openPalmStartRef.current = now;
    }

    const heldFor = now - openPalmStartRef.current;
    if (heldFor >= 700) {
      if (now - lastOpenPalmZoomRef.current >= 150) {
        sendGesture("zoom", Math.max(-0.25, -0.08 * sensitivityRef.current));
        lastOpenPalmZoomRef.current = now;
      }
      setGestureStatus("Open Palm · Zoom Out");
      return true;
    } else {
      setGestureStatus(`Open Palm · Keep still ${Math.ceil((700 - heldFor) / 100) / 10}s`);
      return false;
    }
  };

  const resetRotationTracking = () => {
    smoothedPalmRef.current = null;
    previousPalmRef.current = null;
  };

  const processFist = (landmarks, now) => {
    const wrist = landmarks[0];
    const foldedPairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
    const fist = foldedPairs.every(([tip, joint]) => (
      distance2d(landmarks[tip], wrist) < distance2d(landmarks[joint], wrist) * 1.08
    ));

    if (!fist) {
      fistStartRef.current = null;
      fistLatchedRef.current = false;
      return false;
    }

    resetRotationTracking();
    if (fistLatchedRef.current) {
      setGestureStatus(pausedRef.current ? "Fist · Paused" : "Fist · Control active");
      return true;
    }
    if (fistStartRef.current === null) fistStartRef.current = now;

    const heldFor = now - fistStartRef.current;
    if (heldFor >= 500) {
      pausedRef.current = !pausedRef.current;
      setPaused(pausedRef.current);
      fistLatchedRef.current = true;
      setGestureStatus(pausedRef.current ? "Fist · Paused" : "Fist · Control active");
    } else {
      setGestureStatus(`Fist · Hold ${Math.ceil((500 - heldFor) / 100) / 10}s`);
    }
    return true;
  };

  const processRotation = (landmarks, now) => {
    const palmIndices = [0, 5, 9, 13, 17];
    const palm = palmIndices.reduce(
      (center, index) => ({
        x: center.x + (1 - landmarks[index].x) / palmIndices.length,
        y: center.y + landmarks[index].y / palmIndices.length,
      }),
      { x: 0, y: 0 },
    );
    smoothedPalmRef.current = smoothedPalmRef.current === null
      ? palm
      : {
          x: smoothedPalmRef.current.x + 0.25 * (palm.x - smoothedPalmRef.current.x),
          y: smoothedPalmRef.current.y + 0.25 * (palm.y - smoothedPalmRef.current.y),
        };

    if (previousPalmRef.current === null) {
      previousPalmRef.current = { ...smoothedPalmRef.current };
      setGestureStatus("Move hand to rotate");
      return;
    }
    if (now - lastRotationSentRef.current < 50) return;

    const deltaX = smoothedPalmRef.current.x - previousPalmRef.current.x;
    const deltaY = smoothedPalmRef.current.y - previousPalmRef.current.y;
    const deadZone = 0.008;
    let moved = false;
    if (Math.abs(deltaX) >= deadZone) {
      sendGesture(
        deltaX > 0 ? "rotate_right" : "rotate_left",
        Math.min(0.5, Math.abs(deltaX) * 12 * sensitivityRef.current),
      );
      moved = true;
    }
    if (Math.abs(deltaY) >= deadZone) {
      sendGesture(
        deltaY > 0 ? "rotate_down" : "rotate_up",
        Math.min(0.5, Math.abs(deltaY) * 12 * sensitivityRef.current),
      );
      moved = true;
    }
    if (moved) {
      previousPalmRef.current = { ...smoothedPalmRef.current };
      lastRotationSentRef.current = now;
      setGestureStatus("Hand Move · Rotate");
    }
  };

  const trackHands = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || !streamRef.current) return;

    if (video.currentTime !== lastVideoTimeRef.current) {
      const result = landmarker.detectForVideo(video, performance.now());
      lastVideoTimeRef.current = video.currentTime;
      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        const now = performance.now();
        drawHand(landmarks);
        const fist = processFist(landmarks, now);
        if (!fist && pausedRef.current) {
          resetRotationTracking();
          setGestureStatus("Paused · Make a fist to resume");
        } else if (!fist) {
          const pinching = processPinch(landmarks, now);
          const openPalm = pinching ? false : processOpenPalm(landmarks, now);
          if (!pinching && !openPalm) processRotation(landmarks, now);
          else resetRotationTracking();
        }
        const handedness = result.handedness[0]?.[0]?.categoryName ?? "Hand";
        setTrackingStatus(`${handedness} hand detected`);
      } else {
        clearOverlay();
        previousPinchRef.current = null;
        rawPinchRef.current = null;
        smoothedPinchRef.current = null;
        openPalmStartRef.current = null;
        openPalmAnchorRef.current = null;
        fistStartRef.current = null;
        fistLatchedRef.current = false;
        resetRotationTracking();
        setGestureStatus("None");
        setTrackingStatus("No hand detected");
      }
    }

    animationRef.current = requestAnimationFrame(trackHands);
  };

  const initializeLandmarker = async () => {
    if (landmarkerRef.current) return;
    setTrackingStatus("Loading hand tracker…");
    const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task", delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
  };

  const stopCamera = () => {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    clearOverlay();
    previousPinchRef.current = null;
    rawPinchRef.current = null;
    smoothedPinchRef.current = null;
    openPalmStartRef.current = null;
    openPalmAnchorRef.current = null;
    fistStartRef.current = null;
    fistLatchedRef.current = false;
    resetRotationTracking();
    pausedRef.current = false;
    setPaused(false);
    setTrackingStatus("Not tracking");
    setGestureStatus("None");
    setStatus("Camera disabled");
  };

  useEffect(() => () => {
    cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
  }, []);

  const enableCamera = async () => {
    setError("");
    setStatus("Requesting camera permission…");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera access.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      await initializeLandmarker();
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("Camera active");
      lastVideoTimeRef.current = -1;
      animationRef.current = requestAnimationFrame(trackHands);
    } catch (cameraError) {
      stopCamera();
      setError(cameraError.message || "Camera access failed.");
    }
  };

  const active = status === "Camera active";

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    resetRotationTracking();
    setGestureStatus(pausedRef.current ? "Paused" : "Control active");
  };

  const resetView = () => sendGesture("reset");

  const updateSensitivity = (event) => {
    const value = Number(event.target.value);
    sensitivityRef.current = value;
    setSensitivity(value);
  };

  return (
    <main className="app-shell">
      <header>
        <div>
          <p className="eyebrow">AI-powered gesture interface for PyMOL</p>
          <h1>GestureMol</h1>
        </div>
        <span className={`status ${active ? "active" : ""}`}>{status}</span>
      </header>

      <section className="camera-panel" aria-labelledby="camera-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Input</p>
            <h2 id="camera-title">Camera Preview</h2>
          </div>
          <button type="button" onClick={active ? stopCamera : enableCamera}>
            {active ? "Disable Camera" : "Enable Camera"}
          </button>
        </div>

        <div className="preview-frame">
          <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
          <canvas ref={canvasRef} aria-hidden="true" />
          {!active && <p>Camera feed will appear here.</p>}
        </div>

        <div className="tracking-row">
          <span>Hand Tracking</span>
          <strong>{trackingStatus}</strong>
        </div>
        <div className="tracking-row">
          <span>Gesture</span>
          <strong>{gestureStatus}</strong>
        </div>

        <label className="sensitivity-control">
          <span>
            Sensitivity
            <strong>{sensitivity.toFixed(1)}×</strong>
          </span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={sensitivity}
            onChange={updateSensitivity}
          />
        </label>

        <div className="control-row">
          <button type="button" className="secondary" onClick={resetView}>Reset View</button>
          <button type="button" className="secondary" onClick={togglePause}>
            {paused ? "Resume Gesture" : "Pause Gesture"}
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
