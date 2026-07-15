"""Narrow PyMOL XML-RPC adapter for GestureMol."""

import socket
import xmlrpc.client


class TimeoutTransport(xmlrpc.client.Transport):
    def __init__(self, timeout: float = 1.0) -> None:
        super().__init__()
        self.timeout = timeout

    def make_connection(self, host):  # type: ignore[no-untyped-def]
        connection = super().make_connection(host)
        connection.timeout = self.timeout
        return connection


class PyMOLUnavailable(RuntimeError):
    """Raised when the local PyMOL RPC endpoint cannot be reached."""


class PyMOLAdapter:
    def __init__(self, endpoint: str = "http://127.0.0.1:9123") -> None:
        self._endpoint = endpoint

    def _client(self) -> xmlrpc.client.ServerProxy:
        # ServerProxy/HTTPConnection is not safe to share across FastAPI threads.
        return xmlrpc.client.ServerProxy(
            self._endpoint,
            allow_none=True,
            transport=TimeoutTransport(),
        )

    def is_connected(self) -> bool:
        try:
            self._client().get_version()
            return True
        except (OSError, socket.error, xmlrpc.client.Error):
            return False

    def rotate_y(self, angle: float) -> None:
        """Rotate the camera around Y through PyMOL's official turn API."""
        try:
            self._client().turn("y", float(angle))
        except (OSError, socket.error, xmlrpc.client.Error) as exc:
            raise PyMOLUnavailable(
                "PyMOL RPC is unavailable. Start PyMOL with the -R option."
            ) from exc

    def rotate_x(self, angle: float) -> None:
        """Rotate the camera around X through PyMOL's official turn API."""
        try:
            self._client().turn("x", float(angle))
        except (OSError, socket.error, xmlrpc.client.Error) as exc:
            raise PyMOLUnavailable(
                "PyMOL RPC is unavailable. Start PyMOL with the -R option."
            ) from exc

    def zoom(self, amount: float) -> None:
        """Apply incremental view zoom using PyMOL's official camera move API."""
        try:
            self._client().move("z", float(amount))
        except (OSError, socket.error, xmlrpc.client.Error) as exc:
            raise PyMOLUnavailable(
                "PyMOL RPC is unavailable. Start PyMOL with the -R option."
            ) from exc

    def reset_view(self) -> None:
        """Restore PyMOL's default view with the official reset API."""
        try:
            self._client().reset()
        except (OSError, socket.error, xmlrpc.client.Error) as exc:
            raise PyMOLUnavailable(
                "PyMOL RPC is unavailable. Start PyMOL with the -R option."
            ) from exc
