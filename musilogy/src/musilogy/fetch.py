"""Downloads and verifies the MusicBrainz archives and the ListenBrainz snapshots."""

from __future__ import annotations

import hashlib
import http.client
import itertools
import json
import time
import urllib.error
import urllib.request
from collections.abc import Iterable, Iterator
from email.message import Message
from http import HTTPStatus
from pathlib import Path
from typing import Any

UA = "musilogy/0.1 ( victor.lenain26@gmail.com )"
BASE = "https://data.metabrainz.org/pub/musicbrainz/data/json-dumps"
DOWNLOAD_TIMEOUT = 30.0  # seconds, per connection (connect + each read)


class ChecksumError(Exception):
    pass


class DownloadError(Exception):
    pass


def sha256_file(path: Path) -> str:
    with path.open("rb") as fh:
        return hashlib.file_digest(fh, "sha256").hexdigest()


def expected_sums(sums_path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in sums_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        digest, name = line.split(None, 1)
        out[name.strip().lstrip("*")] = digest
    return out


def verify(path: Path, expected: str) -> None:
    actual = sha256_file(path)
    if actual != expected:
        raise ChecksumError(f"{path.name}: expected {expected}, got {actual}")


def download(url: str, dest: Path, timeout: float = DOWNLOAD_TIMEOUT) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r, dest.open("wb") as out:
            while chunk := r.read(1 << 20):
                out.write(chunk)
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        raise DownloadError(f"failed to download {url}: {e}") from e
    return dest


def fetch_dump(date: str, name: str, raw_dir: Path, sums_path: Path) -> Path:
    dest = raw_dir / date / name
    if not dest.exists():
        download(f"{BASE}/{date}/{name}", dest)
    verify(dest, expected_sums(sums_path)[name])
    return dest


POPULARITY_URL = "https://api.listenbrainz.org/1/popularity/artist"
# MAX_ITEMS_PER_GET in listenbrainz/webserver/views/api_tools.py.
POPULARITY_BATCH = 1000
# "ONE call per second" (listenbrainz.readthedocs.io/en/latest/users/api/,
# Rate limiting), whatever the X-RateLimit-* headers would still allow.
MIN_INTERVAL = 1.0
# A snapshot takes an hour: ListenBrainz answers 502 for a minute or more now
# and then (2026-10-02), and a give-up costs the whole hour. About 3 min of
# outage is ridden out, with waits doubling up to MAX_BACKOFF.
MAX_ATTEMPTS = 8
MAX_BACKOFF = 60.0


def _post(url: str, payload: dict[str, Any]) -> tuple[Any, Message]:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"User-Agent": UA, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as r:
        return json.load(r), r.headers


def _reset_in(headers: Message) -> float:
    return float(headers.get("X-RateLimit-Reset-In") or MIN_INTERVAL)


def _backoff(attempt: int) -> float:
    return min(2.0**attempt, MAX_BACKOFF)


def popularity_batch(mbids: list[str]) -> tuple[list[dict[str, Any]], float]:
    """Rows of one batch, and how long to wait before the next request.

    The response is an external payload: it must answer the batch asked, in
    order, or a count lands on the wrong artist without anything noticing."""
    attempt = 0
    while True:
        attempt += 1
        try:
            rows, headers = _post(POPULARITY_URL, {"artist_mbids": mbids})
        except urllib.error.HTTPError as e:
            throttled = e.code == HTTPStatus.TOO_MANY_REQUESTS
            if not throttled and e.code < HTTPStatus.INTERNAL_SERVER_ERROR:
                raise DownloadError(f"ListenBrainz refused a batch: {e}") from e
            if attempt == MAX_ATTEMPTS:
                raise DownloadError(f"ListenBrainz: {e}, {attempt} attempts") from e
            time.sleep(_reset_in(e.headers) if throttled else _backoff(attempt))
            continue
        # A connection cut mid-answer raises outside URLError (RemoteDisconnected,
        # ConnectionResetError, IncompleteRead): an outage all the same.
        except (
            urllib.error.URLError,
            TimeoutError,
            ConnectionError,
            http.client.HTTPException,
        ) as e:
            if attempt == MAX_ATTEMPTS:
                raise DownloadError(f"ListenBrainz: {e}, {attempt} attempts") from e
            time.sleep(_backoff(attempt))
            continue
        if (
            not isinstance(rows, list)
            or [r.get("artist_mbid") if isinstance(r, dict) else None for r in rows] != mbids
        ):
            raise DownloadError("ListenBrainz answered a batch other than the one asked")
        remaining = int(headers.get("X-RateLimit-Remaining") or 1)
        return rows, _reset_in(headers) if remaining == 0 else MIN_INTERVAL


def _skip_written(partial: Path, batches: Iterator[list[str]]) -> tuple[int, Iterator[list[str]]]:
    """A run cut short resumes where it stopped. The batches whose answers the
    partial file holds whole, artist by artist and in order, are not asked
    again; the file is cut after the last of them. The snapshot directory
    carries its date, so only a run of the same day resumes."""
    kept_bytes, kept_rows = 0, 0
    pending: list[str] | None = None
    with partial.open("rb") as fh:
        lines = iter(fh)
        for batch in batches:
            size = 0
            for mbid in batch:
                line = next(lines, b"")
                try:
                    written = json.loads(line)["artist_mbid"]
                except (ValueError, KeyError, TypeError):
                    # Bytes left by a crash: cut there and ask again.
                    written = None
                if not line.endswith(b"\n") or written != mbid:
                    pending = batch
                    break
                size += len(line)
            if pending is not None:
                break
            kept_bytes += size
            kept_rows += len(batch)
    with partial.open("r+b") as fh:
        fh.truncate(kept_bytes)
    return kept_rows, itertools.chain([pending] if pending else [], batches)


def fetch_popularity(batches: Iterable[list[str]], dest: Path) -> int:
    """Writes the answers as received, one row per line. Written aside and
    renamed at the end: an interrupted snapshot leaves no file that looks like
    a complete one, and the next run of the day resumes it."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    partial = dest.with_name(dest.name + ".partial")
    n, rest = 0, iter(batches)
    if partial.exists():
        n, rest = _skip_written(partial, rest)
    wait = 0.0
    with partial.open("a", encoding="utf-8") as out:
        for batch in rest:
            time.sleep(wait)
            rows, wait = popularity_batch(batch)
            out.writelines(json.dumps(r) + "\n" for r in rows)
            n += len(rows)
    partial.replace(dest)
    return n
