from collections import Counter
from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest

import radio.model.model as model_mod
from radio.core.config import ModelConfig
from radio.model.model import _decide, rescore, train
from tests_radio.model_factory import NOW, add_vote, make_model_db


def test_decide_keeps_the_serving_model_unless_the_new_one_is_as_good() -> None:
    serving = (1, object())
    assert _decide(None, None, None) is None
    assert _decide(serving, 0.8, 0.8) is None
    assert _decide(serving, 0.7, 0.8) == "AUC d'examen 0,700 < 0,800 (modèle en service)"
    assert _decide(serving, None, 0.8) is not None


def _two_batches(conn: Any) -> None:
    conn.execute("INSERT INTO discover_runs VALUES (1, 'd', 'd', 'done'), (2, 'd', 'd', 'done')")
    conn.execute(
        "INSERT INTO candidates (deezer_track_id, run_id, source, seed_artist_id, "
        "neighbour_artist_id) SELECT deezer_track_id, 1 + (deezer_artist_id >= 3000), "
        "'voisin', 1000, deezer_artist_id FROM tracks WHERE origin = 'candidate'"
    )
    conn.commit()


def _scores(conn: Any) -> dict[int, tuple[int, int]]:
    return {
        int(r[0]): (int(r[1]), int(r[2]))
        for r in conn.execute("SELECT deezer_track_id, model_id, accepted FROM scores")
    }


def test_each_batch_and_family_keeps_its_best_and_library_titles_are_not_discoveries(
    tmp_path: Path,
) -> None:
    conn = make_model_db(tmp_path)
    _two_batches(conn)
    # Les nouveautés de la fournée 1 sont des titres rejetés : elles ne disputent pas la coupure
    # des découvertes, aimées, et gardent leur propre quota.
    conn.execute(
        "UPDATE candidates SET source = 'hypem', seed_artist_id = NULL, "
        "neighbour_artist_id = NULL, detail = 'Blog', run_id = 1 "
        "WHERE deezer_track_id BETWEEN 300000 AND 300599"
    )
    conn.execute("UPDATE tracks SET origin = 'library' WHERE deezer_track_id = 200000")
    conn.commit()
    cfg = ModelConfig(keep_decouvertes=10, keep_nouveautes=5)
    assert train(conn, tmp_path / "models", cfg, NOW).promoted
    rescore(conn, tmp_path / "models", cfg)
    scores = _scores(conn)
    assert 200000 not in scores
    groups = {
        int(t): (int(r), s)
        for t, r, s in conn.execute("SELECT deezer_track_id, run_id, source FROM candidates")
    }
    kept = Counter(groups[t] for t, (_, a) in scores.items() if a)
    # La fournée 2 n'a que 6 artistes voisins (3006 à 3011) : 6 retenus, un par artiste.
    assert kept == {(1, "voisin"): 10, (1, "hypem"): 5, (2, "voisin"): 6}
    artist_of = dict(conn.execute("SELECT deezer_track_id, deezer_artist_id FROM tracks"))
    per_artist = Counter((groups[t][0], artist_of[t]) for t, (_, a) in scores.items() if a)
    assert max(per_artist.values()) == 1  # un titre par artiste et par fournée
    assert all(
        t // 100 < 3000
        for t, (_, a) in scores.items()
        if a and groups[t][1] == "voisin" and groups[t][0] == 1
    )


def test_a_worse_model_is_kept_out_of_service(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    conn = make_model_db(tmp_path)
    _two_batches(conn)
    cfg = ModelConfig()
    first = train(conn, tmp_path / "models", cfg, NOW)
    for t in (200100, 200200, 200300):
        add_vote(conn, t, "exam", "oui")
    for t in (300100, 300200, 300300):
        add_vote(conn, t, "exam", "non")
    real_fit = model_mod.fit

    def inverted(table: Any, ds: Any, c: ModelConfig) -> Any:
        return real_fit(table, replace(ds, labels=1 - ds.labels), c)

    monkeypatch.setattr(model_mod, "fit", inverted)
    second = train(conn, tmp_path / "models", cfg, NOW)
    assert not second.promoted and second.new_auc == 0.0 and second.current_auc == 1.0
    assert rescore(conn, tmp_path / "models", cfg) == first.model_id
    assert {m for m, _ in _scores(conn).values()} == {first.model_id}
