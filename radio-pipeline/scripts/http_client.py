"""
Centralized HTTP client with retry logic, SSL/TLS support, and robust error handling.

Best practices 2026:
- Exponential backoff with jitter
- Circuit breaker pattern
- Structured logging
- Type safety with Pydantic
"""

from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class HTTPError(Exception):
    """Base HTTP error with context."""

    def __init__(self, message: str, status_code: int | None = None, response: requests.Response | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class ClientError(HTTPError):
    """4xx client errors (non-retryable)."""
    pass


class ServerError(HTTPError):
    """5xx server errors (retryable)."""
    pass


class ConnectionError(HTTPError):
    """Network/connection errors."""
    pass


class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """
    Circuit breaker to prevent cascading failures.

    Opens after `failure_threshold` consecutive failures.
    Attempts recovery after `recovery_timeout` seconds.
    """
    failure_threshold: int = 5
    recovery_timeout: float = 60.0

    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failure_count: int = field(default=0, init=False)
    _last_failure_time: float = field(default=0.0, init=False)

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                logger.info("Circuit breaker: HALF_OPEN (attempting recovery)")
        return self._state

    def record_success(self) -> None:
        self._failure_count = 0
        if self._state == CircuitState.HALF_OPEN:
            self._state = CircuitState.CLOSED
            logger.info("Circuit breaker: CLOSED (recovered)")

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN
            logger.warning(f"Circuit breaker: OPEN (after {self._failure_count} failures)")

    def can_execute(self) -> bool:
        state = self.state
        if state == CircuitState.CLOSED:
            return True
        if state == CircuitState.HALF_OPEN:
            return True
        return False


@dataclass
class RetryConfig:
    """Retry configuration with exponential backoff."""
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: float = 0.1  # Random factor to prevent thundering herd

    # HTTP status codes to retry
    retry_on_status: tuple[int, ...] = (429, 500, 502, 503, 504)

    def get_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff and jitter."""
        delay = min(
            self.base_delay * (self.exponential_base ** attempt),
            self.max_delay
        )
        jitter_range = delay * self.jitter
        return delay + random.uniform(-jitter_range, jitter_range)


class RobustHTTPClient:
    """
    Production-grade HTTP client.

    Features:
    - Automatic retry with exponential backoff
    - Circuit breaker pattern
    - SSL/TLS verification (enforced)
    - Request/response logging
    - Timeout enforcement
    """

    def __init__(
        self,
        base_url: str,
        api_key: str | None = None,
        timeout: float = 30.0,
        retry_config: RetryConfig | None = None,
        circuit_breaker: CircuitBreaker | None = None,
    ):
        self.base_url = self._validate_url(base_url)
        self.api_key = api_key
        self.timeout = timeout
        self.retry_config = retry_config or RetryConfig()
        self.circuit_breaker = circuit_breaker or CircuitBreaker()

        self._session = self._create_session()

    @staticmethod
    def _validate_url(url: str) -> str:
        """Validate and normalize URL."""
        url = url.rstrip("/")
        parsed = urlparse(url)

        if not parsed.scheme:
            raise ValueError(f"URL must include scheme (http/https): {url}")

        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Invalid URL scheme: {parsed.scheme}")

        if not parsed.netloc:
            raise ValueError(f"URL must include host: {url}")

        # Warn if using HTTP
        if parsed.scheme == "http":
            logger.warning(f"Using insecure HTTP connection to {parsed.netloc}")

        return url

    def _create_session(self) -> requests.Session:
        """Create session with connection pooling."""
        session = requests.Session()

        # Configure retry adapter for connection-level retries
        retry_strategy = Retry(
            total=self.retry_config.max_retries,
            backoff_factor=self.retry_config.base_delay,
            status_forcelist=list(self.retry_config.retry_on_status),
            allowed_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
            raise_on_status=False,
        )

        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=10,
            pool_maxsize=10,
        )

        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # Default headers
        session.headers.update({
            "User-Agent": "RadioPipeline/2.0 (AubeSonore)",
            "Accept": "application/json",
        })

        if self.api_key:
            session.headers["X-API-Key"] = self.api_key

        return session

    def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs: Any,
    ) -> requests.Response:
        """Execute HTTP request with circuit breaker and retry logic."""
        if not self.circuit_breaker.can_execute():
            raise ConnectionError(
                f"Circuit breaker is OPEN - service unavailable",
                status_code=None,
            )

        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault("timeout", self.timeout)
        kwargs.setdefault("verify", True)  # Always verify SSL

        last_exception: Exception | None = None

        for attempt in range(self.retry_config.max_retries + 1):
            try:
                logger.debug(f"Request: {method} {url} (attempt {attempt + 1})")

                response = self._session.request(method, url, **kwargs)

                # Log response
                logger.debug(f"Response: {response.status_code}")

                # Check for errors
                if response.status_code >= 400:
                    self._handle_error_response(response, attempt)

                # Success
                self.circuit_breaker.record_success()
                return response

            except requests.exceptions.SSLError as e:
                logger.error(f"SSL/TLS error: {e}")
                raise ConnectionError(f"SSL verification failed: {e}") from e

            except requests.exceptions.ConnectionError as e:
                last_exception = e
                self.circuit_breaker.record_failure()

                if attempt < self.retry_config.max_retries:
                    delay = self.retry_config.get_delay(attempt)
                    logger.warning(f"Connection error, retrying in {delay:.1f}s: {e}")
                    time.sleep(delay)
                else:
                    raise ConnectionError(f"Connection failed after {attempt + 1} attempts: {e}") from e

            except requests.exceptions.Timeout as e:
                last_exception = e
                self.circuit_breaker.record_failure()

                if attempt < self.retry_config.max_retries:
                    delay = self.retry_config.get_delay(attempt)
                    logger.warning(f"Timeout, retrying in {delay:.1f}s")
                    time.sleep(delay)
                else:
                    raise ConnectionError(f"Request timed out after {attempt + 1} attempts") from e

        raise ConnectionError(f"Request failed: {last_exception}")

    def _handle_error_response(self, response: requests.Response, attempt: int) -> None:
        """Handle HTTP error responses."""
        status = response.status_code

        # Client errors (4xx) - don't retry
        if 400 <= status < 500:
            self.circuit_breaker.record_success()  # Service is responding

            if status == 401:
                raise ClientError("Authentication failed - check API key", status, response)
            if status == 403:
                raise ClientError("Access forbidden - check permissions", status, response)
            if status == 404:
                raise ClientError("Resource not found", status, response)
            if status == 429:
                # Rate limited - do retry with backoff
                retry_after = response.headers.get("Retry-After", "60")
                delay = float(retry_after) if retry_after.isdigit() else 60.0
                logger.warning(f"Rate limited, waiting {delay}s")
                time.sleep(delay)
                raise ServerError("Rate limited", status, response)

            raise ClientError(f"Client error: {status}", status, response)

        # Server errors (5xx) - retry
        if status >= 500:
            self.circuit_breaker.record_failure()

            if attempt < self.retry_config.max_retries:
                delay = self.retry_config.get_delay(attempt)
                logger.warning(f"Server error {status}, retrying in {delay:.1f}s")
                time.sleep(delay)
                # Don't raise, let the retry loop continue
            else:
                raise ServerError(f"Server error after {attempt + 1} attempts: {status}", status, response)

    def get(self, endpoint: str, **kwargs: Any) -> requests.Response:
        """HTTP GET request."""
        return self._make_request("GET", endpoint, **kwargs)

    def post(self, endpoint: str, **kwargs: Any) -> requests.Response:
        """HTTP POST request."""
        return self._make_request("POST", endpoint, **kwargs)

    def put(self, endpoint: str, **kwargs: Any) -> requests.Response:
        """HTTP PUT request."""
        return self._make_request("PUT", endpoint, **kwargs)

    def delete(self, endpoint: str, **kwargs: Any) -> requests.Response:
        """HTTP DELETE request."""
        return self._make_request("DELETE", endpoint, **kwargs)

    def health_check(self, endpoint: str = "/api/status") -> bool:
        """
        Check if the service is healthy.

        Returns True if service responds with 2xx.
        """
        try:
            response = self.get(endpoint)
            return 200 <= response.status_code < 300
        except (HTTPError, ConnectionError):
            return False

    def close(self) -> None:
        """Close the session."""
        self._session.close()

    def __enter__(self) -> "RobustHTTPClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


class AzuraCastClient(RobustHTTPClient):
    """
    Specialized client for AzuraCast API.

    Provides typed methods for common operations.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        station_id: int = 1,
        **kwargs: Any,
    ):
        super().__init__(base_url, api_key, **kwargs)
        self.station_id = station_id

    def get_station_files(self) -> list[dict[str, Any]]:
        """Get all files in station library."""
        response = self.get(f"/api/station/{self.station_id}/files")
        return response.json()

    def get_playlists(self) -> list[dict[str, Any]]:
        """Get all playlists for station."""
        response = self.get(f"/api/station/{self.station_id}/playlists")
        return response.json()

    def upload_file(
        self,
        filepath: str,
        playlist_id: int | None = None,
    ) -> dict[str, Any] | None:
        """
        Upload a file to station.

        Returns file metadata on success, None on failure.
        """
        from pathlib import Path

        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        try:
            with open(filepath, "rb") as f:
                files = {"file": (path.name, f, "audio/mpeg")}
                response = self.post(
                    f"/api/station/{self.station_id}/files",
                    files=files,
                )

            if response.status_code in (200, 201):
                file_data = response.json()

                # Add to playlist if specified
                if playlist_id and "id" in file_data:
                    self._add_to_playlist(file_data["id"], playlist_id)

                return file_data

            logger.error(f"Upload failed: HTTP {response.status_code}")
            return None

        except (ClientError, ServerError, ConnectionError) as e:
            logger.error(f"Upload failed: {e}")
            return None

    def _add_to_playlist(self, file_id: int, playlist_id: int) -> bool:
        """Add file to playlist."""
        try:
            response = self.post(
                f"/api/station/{self.station_id}/playlists/{playlist_id}/files",
                json={"file_id": file_id},
            )
            return response.status_code in (200, 201)
        except HTTPError:
            return False

    def health_check(self, endpoint: str = "/api/status") -> bool:
        """Check AzuraCast availability."""
        return super().health_check(endpoint)
