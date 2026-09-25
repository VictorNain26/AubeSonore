import json
import sqlite3
from pathlib import Path

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.library.artists import register_library
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable
from radio.votes.importer import import_votes, load_bench, vote_counts
from tests_radio.factories import make_library

SIGNED = "https://cdnt-preview.dzcdn.net/api/1/1/secret-signature.mp3?hdnea=exp=1~hmac=abc"


class FakeDeezer:
    def __init__(self, fail_on: int | None = None) -> None:
        self.calls: list[int] = []
        self.fail_on = fail_on

    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None:
        self.calls.append(track_id)
        if track_id == self.fail_on:
            raise DeezerUnavailable("code 4")
        if track_id == 555:
            t = DeezerTrack(555, "Bande organisée", "Bande organisée", 200, 900, 9, "Jul", True)
            return t, SIGNED
        if track_id in (556, 560):
            t = DeezerTrack(track_id, "Wait (Remastered)", "Wait", 343, 500, 83, "M83", True)
            return t, SIGNED
        if track_id == 558:
            raise DeezerError("code 12")
        return None


def bench(tmp_path: Path, votes: dict[str, str]) -> tuple[Path, Path]:
    series = tmp_path / "series.json"
    series.write_text(
        json.dumps(
            {
                "s1": [
                    {"id": "555", "artist": "Jul", "title": "Bande organisée"},
                    {"id": "557", "artist": "Ghost", "title": "Nowhere"},
                ],
                "s2": [
                    {"id": "101", "artist": "M83", "title": "Midnight City"},
                    {"id": "556", "artist": "M83", "title": "Wait (Remastered)"},
                    {"id": "558", "artist": "Err", "title": "Broken"},
                    {"id": "559", "artist": "Never", "title": "Voted"},
                    {"id": "560", "artist": "M83", "title": "Wait (Remastered)"},
                ],
            }
        )
    )
    d = tmp_path / "votes"
    d.mkdir()
    for tid, v in votes.items():
        # % 60 : l'id 560 se termine par "60", une minute invalide (l'ancien stockage verbatim
        # ne la validait pas).
        minute = int(tid[-2:]) % 60
        (d / f"{tid}.json").write_text(
            json.dumps({"vote": v, "at": f"2026-09-24T16:{minute:02d}Z"})
        )
    return d, series


VOTES = {"101": "oui", "555": "non", "556": "passe", "557": "oui", "558": "non"}


def db(tmp_path: Path) -> sqlite3.Connection:
    conn = make_library(tmp_path)
    register_library(conn, "d1")
    return conn


def test_load_bench(tmp_path: Path) -> None:
    votes = load_bench(*bench(tmp_path, VOTES))
    assert [(v.deezer_track_id, v.kind, v.vote) for v in votes] == [
        (101, "lesson", "oui"),
        (555, "exam", "non"),
        (556, "lesson", "passer"),
        (557, "exam", "oui"),
        (558, "lesson", "non"),
    ]
    assert votes[1].label == "Jul - Bande organisée"
    assert votes[0].voted_at == "2026-09-24T16:01:00+00:00"  # ...Z sans secondes -> UTC explicite


def test_load_bench_refuses_an_unknown_vote(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="vote inconnu"):
        load_bench(*bench(tmp_path, {"101": "peut-être"}))


def test_load_bench_refuses_a_vote_outside_the_series(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="hors des séries"):
        load_bench(*bench(tmp_path, {"999": "oui"}))


def test_load_bench_refuses_a_naive_date(tmp_path: Path) -> None:
    votes_dir, series = bench(tmp_path, VOTES)
    (votes_dir / "101.json").write_text(json.dumps({"vote": "oui", "at": "2026-09-24T16:01:00"}))
    with pytest.raises(ValueError, match="date sans fuseau"):
        load_bench(votes_dir, series)


def test_load_bench_refuses_an_unparsable_date(tmp_path: Path) -> None:
    votes_dir, series = bench(tmp_path, VOTES)
    (votes_dir / "101.json").write_text(json.dumps({"vote": "oui", "at": "pas une date"}))
    with pytest.raises(ValueError, match="date illisible"):
        load_bench(votes_dir, series)


def test_import_votes(tmp_path: Path) -> None:
    conn = db(tmp_path)
    deezer = FakeDeezer()
    rep = import_votes(conn, deezer, load_bench(*bench(tmp_path, VOTES)), "banc", "d2")
    assert deezer.calls == [555, 556, 557, 558]
    assert (rep.n_votes, rep.n_recorded, rep.n_added, rep.n_mapped) == (5, 3, 1, 1)
    assert rep.not_found == ["Ghost - Nowhere"]
    assert rep.skipped == ["Err - Broken (code 12)"]
    rows = conn.execute("SELECT * FROM votes ORDER BY deezer_track_id").fetchall()
    assert [tuple(r) for r in rows] == [
        (101, "lesson", "oui", "2026-09-24T16:01:00+00:00", "banc"),
        (103, "lesson", "passer", "2026-09-24T16:56:00+00:00", "banc"),
        (555, "exam", "non", "2026-09-24T16:55:00+00:00", "banc"),
    ]
    added = conn.execute("SELECT origin, deezer_artist_id FROM tracks WHERE deezer_track_id = 555")
    assert tuple(added.fetchone()) == ("candidate", 9)
    assert vote_counts(conn) == {"exam": {"non": 1}, "lesson": {"oui": 1, "passer": 1}}


def test_import_is_idempotent(tmp_path: Path) -> None:
    conn = db(tmp_path)
    votes = load_bench(*bench(tmp_path, VOTES))
    import_votes(conn, FakeDeezer(), votes, "banc", "d2")
    deezer = FakeDeezer()
    rep = import_votes(conn, deezer, votes, "banc", "d3")
    assert deezer.calls == [556, 557, 558]
    assert (rep.n_recorded, rep.n_added, rep.n_mapped) == (3, 0, 1)
    assert conn.execute("SELECT COUNT(*) FROM votes").fetchone()[0] == 3


def test_two_votes_on_the_same_track_keep_the_first(tmp_path: Path) -> None:
    conn = db(tmp_path)
    votes = load_bench(*bench(tmp_path, {"556": "oui", "560": "non"}))
    rep = import_votes(conn, FakeDeezer(), votes, "banc", "d2")
    assert rep.n_recorded == 1
    assert rep.skipped == ["M83 - Wait (Remastered) (même titre que M83 - Wait (Remastered))"]
    assert conn.execute("SELECT vote FROM votes WHERE deezer_track_id = 103").fetchone()[0] == "oui"


def test_an_outage_keeps_the_votes_already_recorded(tmp_path: Path) -> None:
    conn = db(tmp_path)
    with pytest.raises(DeezerUnavailable):
        import_votes(conn, FakeDeezer(fail_on=556), load_bench(*bench(tmp_path, VOTES)), "b", "d")
    assert conn.execute("SELECT COUNT(*) FROM votes").fetchone()[0] == 2


def test_cli_votes_import(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db(tmp_path / "data").close()
    settings = Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data")
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer())
    votes_dir, series = bench(tmp_path, VOTES)
    res = CliRunner().invoke(cli.app, ["votes-import", str(votes_dir), str(series)])
    assert res.exit_code == 0, res.output
    assert "Votes du banc : 5 lus → 3 enregistrés" in res.output
    assert "  introuvable : Ghost - Nowhere" in res.output
    assert "Votes en base : examen 1 (oui 0, non 1, passer 0)" in res.output
    assert "1 nouveaux titres à mesurer : lancer radio signals" in res.output
    assert "secret-signature" not in res.output


def test_cli_votes_import_refuses_a_broken_bench(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data")
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    votes_dir, series = bench(tmp_path, {"101": "peut-être"})
    res = CliRunner().invoke(cli.app, ["votes-import", str(votes_dir), str(series)])
    assert res.exit_code == 2
    assert "Banc d'écoute illisible" in res.output
