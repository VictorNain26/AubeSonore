import json
from pathlib import Path
from typing import Any

import duckdb
import pytest

from musilogy.build import build
from musilogy.paths import SQL_DIR

FIX = Path(__file__).parent / "fixtures"
SQL = SQL_DIR


@pytest.fixture(scope="module")
def con():
    c = duckdb.connect(":memory:")
    build(c, SQL, FIX / "artists.jsonl", FIX / "release_groups.jsonl", None)
    return c


# Synthetic records, for the date shapes the witnesses do not carry (a begin
# below the floor, an end in 1537...). They validate a rule against a shape,
# never the source itself: anything a real witness can show is tested on the
# fixtures instead.
def synthetic_artist(
    mbid: str,
    begin: str | None,
    end: str | None,
    members: list[dict[str, Any]] | None = None,
    genres: list[dict[str, Any]] | None = None,
    name: str | None = None,
) -> dict[str, Any]:
    return {
        "mbid": mbid,
        "name": name or mbid,
        "type": "Group",
        "begin": begin,
        "end": end,
        "ended": end is not None,
        "country": None,
        "begin_area": None,
        "genres": genres or [],
        "members": members or [],
    }


def synthetic_release_group(
    mbid: str,
    artist: str,
    date: str,
    secondary: list[str] | None = None,
    co_artists: list[str] | None = None,
    genres: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "mbid": mbid,
        "title": mbid,
        "date": date,
        "secondary": secondary or [],
        "artists": [artist, *(co_artists or [])],
        "genres": genres or [],
    }


def build_synthetic(tmp_path, artists, release_groups=(), **build_kwargs):
    artists_path = tmp_path / "artists.jsonl"
    rgs_path = tmp_path / "release_groups.jsonl"
    artists_path.write_text("".join(json.dumps(a) + "\n" for a in artists), encoding="utf-8")
    rgs_path.write_text("".join(json.dumps(r) + "\n" for r in release_groups), encoding="utf-8")
    c = duckdb.connect(":memory:")
    build(c, SQL, artists_path, rgs_path, None, **build_kwargs)
    return c


# Valid UUIDs rather than readable labels: publish() writes raw 16-byte mbids
# to frieze_ids.bin, so a witness that is not a UUID is not a witness of
# anything this pipeline can deliver.
BAND_EXCLUDED = "00000000-0000-4000-8000-000000000001"
BAND_EXCLUDED_2 = "00000000-0000-4000-8000-000000000002"
BAND_SMALL = "00000000-0000-4000-8000-000000000003"
BAND_CLEAN = "00000000-0000-4000-8000-000000000004"
BAND_ORPHAN = "00000000-0000-4000-8000-000000000005"


def unreliable_genre_records():
    """Four genres that differ only in what the multi-artist rule costs them:
    `g-excluded` loses 250 candidate release-groups out of 250, `g-small` loses
    10 out of 10 (over the rate, under the sample minimum), `g-clean` loses
    none out of 250, `g-orphan` has no candidate at all. `guest` is credited on
    the multi-artist release-groups and is deliberately absent from the artist
    records: a co-credit does not have to be a band of this pipeline.

    Shared by the reliability, invariant and manifest suites, which all need
    the same scenario and must not each invent their own."""
    artists = [
        synthetic_artist(
            BAND_EXCLUDED,
            "1990",
            None,
            genres=[{"mbid": "g-excluded", "name": "excluded", "votes": 3}],
            name="band-excluded",
        ),
        synthetic_artist(
            BAND_EXCLUDED_2,
            "1995",
            None,
            genres=[{"mbid": "g-excluded", "name": "excluded", "votes": 3}],
            name="band-excluded-2",
        ),
        synthetic_artist(
            BAND_SMALL,
            "1990",
            None,
            genres=[{"mbid": "g-small", "name": "small", "votes": 2}],
            name="band-small",
        ),
        synthetic_artist(
            BAND_CLEAN,
            "1990",
            None,
            genres=[{"mbid": "g-clean", "name": "clean", "votes": 1}],
            name="band-clean",
        ),
        synthetic_artist(
            BAND_ORPHAN,
            "1990",
            None,
            genres=[{"mbid": "g-orphan", "name": "orphan", "votes": 1}],
            name="band-orphan",
        ),
    ]
    release_groups = [
        *(
            synthetic_release_group(f"rg-excluded-{i}", BAND_EXCLUDED, "2000", co_artists=["guest"])
            for i in range(250)
        ),
        *(
            synthetic_release_group(f"rg-small-{i}", BAND_SMALL, "2000", co_artists=["guest"])
            for i in range(10)
        ),
        *(synthetic_release_group(f"rg-clean-{i}", BAND_CLEAN, "2000") for i in range(250)),
    ]
    return artists, release_groups
