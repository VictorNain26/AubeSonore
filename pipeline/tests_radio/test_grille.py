import json
from datetime import date
from pathlib import Path

import numpy as np
import responses

from radio.antenna.grille import (
    Titre,
    bloc,
    load_titres,
    m3u,
    plan_day,
    playlist_name,
    publish,
    shares,
    slot_sequence,
)
from radio.core.config import Categorie, Creneau, GrilleConfig
from radio.sources.azuracast import AzuracastClient
from tests_radio.model_factory import make_model_db

FRIDAY = date(2026, 10, 2)


def _titre(tid: int, categorie: Categorie, q: float, artist: int | None = None) -> Titre:
    v = np.full(3, q)
    return Titre(tid, artist or tid, categorie, f"antenne/{tid}.mp3", f"s{tid}", v, v, v, True)


def _grille(**stocks: int) -> GrilleConfig:
    """Grille aux parts d'origine, dont chaque stock vaut celui demandé (100 par défaut)."""
    parts: dict[Categorie, float] = {
        "nouveautes": 1 / 3,
        "decouvertes": 1 / 3,
        "fond": 1 / 6,
        "reperes": 1 / 6,
    }
    return GrilleConfig(
        categories={
            c: Creneau(part=p, passages=p * 14.6 * 168 / stocks.get(c, 100))
            for c, p in parts.items()
        }
    )


def test_blocks_of_the_day_and_the_weekend_party() -> None:
    assert [bloc(1, h) for h in (3, 4, 6, 12, 20, 23)] == [
        "nuit",
        "fin_de_nuit",
        "matin",
        "apres_midi",
        "soir",
        "nuit",
    ]
    assert bloc(5, 20) == bloc(5, 23) == bloc(6, 2) == bloc(6, 21) == bloc(7, 2) == "fete"
    assert (bloc(6, 3), bloc(6, 4), bloc(6, 5), bloc(7, 4), bloc(1, 2)) == (
        "nuit",
        "nuit",
        "fin_de_nuit",
        "nuit",
        "nuit",
    )
    assert playlist_name(5, 9) == "Grille ven 09h"


def test_slots_follow_the_shares_evenly() -> None:
    seq = slot_sequence(
        {"nouveautes": 1 / 3, "decouvertes": 1 / 3, "fond": 1 / 6, "reperes": 1 / 6}, 12
    )
    assert seq.count("nouveautes") == seq.count("decouvertes") == 4
    assert seq.count("fond") == seq.count("reperes") == 2
    assert "fond" in seq[:6] and "reperes" in seq[:6]  # réparties, pas regroupées en fin


def test_a_category_short_of_its_stock_gives_its_share_away() -> None:
    titres = [_titre(i, "decouvertes", 0.5) for i in range(100)]
    titres += [_titre(1000 + i, "reperes", 0.5) for i in range(25)]
    s = shares(titres, _grille())
    # Découvertes pleines (1/3), repères au quart (1/6 x 1/4), le reste vide.
    assert abs(s["decouvertes"] - (1 / 3) / (1 / 3 + 1 / 24)) < 1e-9
    assert s["nouveautes"] == s["fond"] == 0


def test_the_least_recently_played_pass_and_each_artist_once_a_day() -> None:
    titres = [_titre(i, "decouvertes", 0.5, artist=i // 2) for i in range(40)]
    played = {f"s{i}": 1000.0 + i for i in range(40)}
    played["s39"] = 0.0  # le plus ancien passage
    plan = plan_day(titres, played, _grille(decouvertes=40), FRIDAY, [8], None)
    chosen = plan.hours[8]
    assert len(chosen) == 16  # ceil(14,6) + 1 créneaux
    assert 39 in {t.tid for t in chosen}
    assert len({t.artist for t in chosen}) == len(chosen)


def test_each_title_goes_to_the_hour_that_resembles_it_and_the_hour_drifts() -> None:
    calm = [_titre(i, "decouvertes", 0.1 + i / 1000) for i in range(16)]
    lively = [_titre(100 + i, "decouvertes", 0.9 - i / 1000) for i in range(16)]
    plan = plan_day(calm + lively, {}, _grille(decouvertes=32), FRIDAY, [3, 21], None)
    assert {t.tid for t in plan.hours[3]} == {t.tid for t in calm}  # nuit
    assert {t.tid for t in plan.hours[21]} == {t.tid for t in lively}  # fête du vendredi
    # La nuit part de sa cible (0,25) : le plus proche d'abord, puis chaque fois le plus proche.
    order = [round(float(t.q[0]), 3) for t in plan.hours[3]]
    assert order == sorted(order, reverse=True)


def test_an_artist_waits_an_hour_and_a_title_goes_back_in_rotation() -> None:
    titres = [_titre(i, "decouvertes", 0.5) for i in range(20)]
    plan = plan_day(titres, {}, _grille(decouvertes=20), FRIDAY, [8, 9, 10], None)
    eight, nine, ten = ({t.artist for t in plan.hours[h]} for h in (8, 9, 10))
    assert len(eight) == 16 and not eight & nine  # 4 artistes libres seulement à 9 h
    assert len(nine) == 4 and plan.empty_slots == 12
    assert len(ten) == 16 and ten & eight  # deux heures plus tard, ils reviennent


def test_missing_titles_leave_empty_slots() -> None:
    titres = [_titre(i, "decouvertes", 0.5) for i in range(10)]
    plan = plan_day(titres, {}, _grille(decouvertes=10), FRIDAY, [8], None)
    assert len(plan.hours[8]) == 10 and plan.empty_slots == 6


def test_titles_on_air_are_read_with_their_measures_as_quantiles(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    for i, tid in enumerate((200000, 200001, 200002)):
        conn.execute(
            "INSERT INTO antenne VALUES (?, 'decouverte', 'decouvertes', ?, ?, ?, 'd', 'd')",
            (tid, tid, f"s{tid}", f"antenne/{tid}.mp3"),
        )
        if i < 2:
            values = [float(i + 1)] * 12
            conn.execute(
                "INSERT INTO track_features VALUES (?, 'ok', 'm', 'd', 200, "
                + ", ".join("?" * 12)
                + ")",
                (tid, *values),
            )
    conn.execute(
        "INSERT INTO antenne VALUES "
        "(200003, 'decouverte', 'repos', 9, 's9', 'repos/9.mp3', 'd', 'd')"
    )
    conn.commit()
    titres = {t.tid: t for t in load_titres(conn)}
    assert set(titres) == {200000, 200001, 200002}  # le repos est hors antenne
    assert list(titres[200000].q) == [0.5, 0.5, 0.5] and list(titres[200001].q) == [1, 1, 1]
    assert not titres[200002].measured and list(titres[200002].q_end) == [0.5, 0.5, 0.5]


class FakeStation:
    def __init__(self, found: dict[str, int] | None = None) -> None:
        self.existing = {"Grille ven 08h": 7}
        self.created: list[tuple[str, int, int]] = []
        self.filled: dict[int, str] = {}
        self.found = found or {}

    def playlists(self) -> dict[str, int]:
        return dict(self.existing)

    def create_hour_playlist(self, name: str, day: int, hour: int) -> int:
        self.created.append((name, day, hour))
        return 100 + hour

    def fill_playlist(self, playlist_id: int, m3u_text: str) -> int:
        self.filled[playlist_id] = m3u_text
        return self.found.get(str(playlist_id), m3u_text.count("\n") - 1)


def test_publish_writes_each_hour_into_its_playlist() -> None:
    titres = [_titre(i, "decouvertes", 0.5) for i in range(32)]
    plan = plan_day(titres, {}, _grille(decouvertes=32), FRIDAY, [8, 9], None)
    station = FakeStation(found={"109": 3})
    errors = publish(plan, station)
    assert station.created == [("Grille ven 09h", 5, 9)]
    assert station.filled[7] == m3u(plan.hours[8])
    assert station.filled[7].startswith("#EXTM3U\nantenne/")
    assert errors == ["Grille ven 09h : 3 titres retrouvés sur 16"]


API = "http://127.0.0.1:8080/api/station/1"


@responses.activate
def test_client_hour_playlists_history_and_import() -> None:
    responses.get(
        API + "/history",
        json=[
            {"played_at": 10, "song": {"id": "a"}},
            {"played_at": 30, "song": {"id": "a"}},
            {"played_at": 20, "song": {"id": "b"}},
        ],
    )
    responses.get(API + "/playlists", json=[{"id": 10, "name": "AubeSonore"}])
    responses.post(API + "/playlists", json={"id": 11})
    responses.delete(API + "/playlist/11/empty", json={"success": True})
    responses.post(
        API + "/playlist/11/import",
        json={
            "success": True,
            "import_results": [{"path": "a", "match": "a"}, {"path": "b", "match": None}],
        },
    )
    responses.get("http://127.0.0.1:8080/api/station/1", json={"timezone": "Europe/Paris"})
    c = AzuracastClient("http://127.0.0.1:8080", "k")
    assert c.last_played("2026-10-01", "2026-10-02") == {"a": 30.0, "b": 20.0}
    assert responses.calls[0].request.params == {"start": "2026-10-01", "end": "2026-10-02"}
    assert c.playlists() == {"AubeSonore": 10}
    assert c.create_hour_playlist("Grille ven 23h", 5, 23) == 11
    body = json.loads(responses.calls[2].request.body)
    assert body["order"] == "sequential" and body["avoid_duplicates"] is False
    assert body["schedule_items"] == [
        {
            "start_time": 2300,
            "end_time": 0,
            "start_date": None,
            "end_date": None,
            "days": [5],
            "loop_once": True,
        }
    ]
    assert c.fill_playlist(11, "#EXTM3U\na\nb\n") == 1
    assert b"playlist_file" in responses.calls[4].request.body
    assert c.timezone() == "Europe/Paris"
