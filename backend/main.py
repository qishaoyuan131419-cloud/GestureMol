"""GestureMol Step 5 API: validate and log gesture actions only."""

from enum import Enum

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.pymol_adapter import PyMOLAdapter, PyMOLUnavailable


class GestureAction(str, Enum):
    ROTATE_LEFT = "rotate_left"
    ROTATE_RIGHT = "rotate_right"
    ROTATE_UP = "rotate_up"
    ROTATE_DOWN = "rotate_down"
    ZOOM = "zoom"
    RESET = "reset"


class GestureEvent(BaseModel):
    action: GestureAction
    value: float | None = Field(default=None, ge=-1.0, le=1.0)


class GestureResponse(BaseModel):
    accepted: bool
    message: str


app = FastAPI(title="GestureMol API", version="0.1.0")
pymol = PyMOLAdapter()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "pymol": "connected" if pymol.is_connected() else "not_connected",
    }


@app.post("/api/gesture", response_model=GestureResponse)
def receive_gesture(event: GestureEvent) -> GestureResponse:
    labels = {
        GestureAction.ROTATE_LEFT: "Rotate Left",
        GestureAction.ROTATE_RIGHT: "Rotate Right",
        GestureAction.ROTATE_UP: "Rotate Up",
        GestureAction.ROTATE_DOWN: "Rotate Down",
        GestureAction.ZOOM: "Zoom",
        GestureAction.RESET: "Reset",
    }
    message = labels[event.action]
    if event.value is not None:
        message = f"{message}: {event.value:.3f}"

    if event.action in (GestureAction.ROTATE_LEFT, GestureAction.ROTATE_RIGHT):
        magnitude = abs(event.value) if event.value is not None else 0.5
        angle = magnitude * 8.0
        if event.action is GestureAction.ROTATE_LEFT:
            angle = -angle
        try:
            pymol.rotate_y(angle)
        except PyMOLUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    if event.action in (GestureAction.ROTATE_UP, GestureAction.ROTATE_DOWN):
        magnitude = abs(event.value) if event.value is not None else 0.5
        angle = magnitude * 8.0
        if event.action is GestureAction.ROTATE_UP:
            angle = -angle
        try:
            pymol.rotate_x(angle)
        except PyMOLUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    if event.action is GestureAction.ZOOM:
        amount = (event.value if event.value is not None else 0.0) * 6.0
        try:
            pymol.zoom(amount)
        except PyMOLUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    if event.action is GestureAction.RESET:
        try:
            pymol.reset_view()
        except PyMOLUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    print(message, flush=True)
    return GestureResponse(accepted=True, message=message)
