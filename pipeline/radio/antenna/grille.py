"""Grille d'antenne et enchaînement (docs/recherches/2026-10-02-cycle-de-vie.md §6).

La grille se remplit créneau par créneau, comme un logiciel de programmation radio
(MusicMaster) :

1. Chaque heure a ses créneaux, répartis entre les catégories selon leurs parts.
2. Pour un créneau, on parcourt la catégorie dans l'ordre de rotation (joué il y a le plus
   longtemps d'abord, d'après l'historique d'AzuraCast), sur une fenêtre de recherche, et on
   garde le titre le plus proche de la cible de l'heure, l'ancienneté départageant. Un artiste ne
   repasse ni dans l'heure ni dans l'heure précédente : au moins une heure entre deux passages.
   Un titre placé repart en fin de rotation.
3. Chaque heure est ensuite ordonnée en fil qui dérive : elle part du dernier titre de la
   précédente et va chaque fois au plus proche, de la fin d'un titre au début du suivant.

Une heure prévoit un titre de plus que la station n'en joue : l'heure suivante démarre à l'heure,
et le secours ne comble pas une fin d'heure. Le titre de trop n'est pas joué ; il reste parmi les
plus anciens et revient le lendemain.
"""

import math
import sqlite3
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date
from typing import Protocol

import numpy as np
import numpy.typing as npt

from radio.core.config import Bloc, Categorie, GrilleConfig

Vector = npt.NDArray[np.float64]

CATEGORIES: tuple[Categorie, ...] = ("nouveautes", "decouvertes", "fond", "reperes")
JOURS = ("lun", "mar", "mer", "jeu", "ven", "sam", "dim")
NEUTRE = np.full(3, 0.5)


def bloc(day: int, hour: int) -> Bloc:
    """Bloc de la journée ; `day` en ISO (1 lundi, 7 dimanche). La nuit du vendredi et celle du
    samedi sont en fête jusqu'à 3 h ; le week-end, la fin de nuit commence à 5 h (Heggli 2021)."""
    if (day in (5, 6) and hour >= 20) or (day in (6, 7) and hour < 3):
        return "fete"
    if hour >= 23 or hour < (5 if day in (6, 7) else 4):
        return "nuit"
    if hour < 6:
        return "fin_de_nuit"
    if hour < 12:
        return "matin"
    return "apres_midi" if hour < 20 else "soir"


def playlist_name(day: int, hour: int) -> str:
    return f"Grille {JOURS[day - 1]} {hour:02d}h"


@dataclass(frozen=True)
class Titre:
    tid: int
    artist: int
    categorie: Categorie
    path: str
    song_id: str
    q: Vector
    q_start: Vector
    q_end: Vector
    measured: bool


@dataclass
class Plan:
    day: date
    hours: dict[int, list[Titre]]
    slots: dict[str, int] = field(default_factory=dict)
    empty_slots: int = 0
    unmeasured: int = 0


def load_titres(conn: sqlite3.Connection) -> list[Titre]:
    """Titres à l'antenne, chaque mesure (énergie = arousal, dansabilité, tempo) ramenée à son
    quantile parmi les titres mesurés : les cibles suivent la couleur de l'antenne. Un titre pas
    encore mesuré est neutre (0,5)."""
    rows = conn.execute(
        """
        SELECT n.deezer_track_id, COALESCE(t.deezer_artist_id, -n.deezer_track_id), n.categorie,
               n.path, n.song_id, f.status = 'ok',
               f.arousal, f.danceability, f.bpm,
               f.arousal_start, f.danceability_start, f.bpm_start,
               f.arousal_end, f.danceability_end, f.bpm_end
        FROM antenne n
        LEFT JOIN tracks t USING (deezer_track_id)
        LEFT JOIN track_features f USING (deezer_track_id)
        WHERE n.categorie != 'repos'
        ORDER BY n.deezer_track_id
        """
    ).fetchall()
    ok = [r for r in rows if r[5]]
    ref = [np.sort(np.array([float(r[6 + k]) for r in ok])) for k in range(3)]

    def quantiles(values: Iterable[float]) -> Vector:
        return np.array(
            [np.searchsorted(ref[k], v, side="right") / len(ref[k]) for k, v in enumerate(values)]
        )

    out = []
    for r in rows:
        measured = bool(r[5])
        out.append(
            Titre(
                int(r[0]),
                int(r[1]),
                r[2],
                str(r[3]),
                str(r[4]),
                quantiles(map(float, r[6:9])) if measured else NEUTRE,
                quantiles(map(float, r[9:12])) if measured else NEUTRE,
                quantiles(map(float, r[12:15])) if measured else NEUTRE,
                measured,
            )
        )
    return out


def shares(titres: list[Titre], grille: GrilleConfig) -> dict[Categorie, float]:
    """Parts d'antenne effectives : tant qu'une catégorie n'a pas son stock, sa part est réduite
    en proportion et rendue aux autres (montée en charge)."""
    n = {c: sum(t.categorie == c for t in titres) for c in CATEGORIES}
    w = {c: grille.categories[c].part * min(1.0, n[c] / grille.stock(c)) for c in CATEGORIES}
    total = sum(w.values())
    return {c: (w[c] / total if total else 0.0) for c in CATEGORIES}


def slot_sequence(weights: dict[Categorie, float], n: int) -> list[Categorie]:
    """`n` créneaux répartis au prorata des poids, régulièrement (smooth weighted round-robin,
    l'algorithme de répartition de nginx)."""
    current = dict.fromkeys(weights, 0.0)
    out: list[Categorie] = []
    total = sum(weights.values())
    for _ in range(n):
        for c, w in weights.items():
            current[c] += w
        best = max(current, key=lambda c: current[c])
        current[best] -= total
        out.append(best)
    return out


def plan_day(
    titres: list[Titre],
    last_played: dict[str, float],
    grille: GrilleConfig,
    day: date,
    hours: list[int],
    previous: Titre | None = None,
) -> Plan:
    plan = Plan(day, {h: [] for h in hours}, unmeasured=sum(not t.measured for t in titres))
    weights = {c: w for c, w in shares(titres, grille).items() if w > 0}
    if not weights or not hours:
        return plan
    per_hour = math.ceil(grille.titres_par_heure) + 1
    hour_slots = slot_sequence(weights, per_hour)
    iso = day.isoweekday()
    # Rotation : dernier passage connu, puis chaque titre placé passe derrière tous les autres.
    clock = {t.tid: last_played.get(t.song_id, -math.inf) for t in titres}
    tick = max([v for v in clock.values() if v != -math.inf], default=0.0)
    by_cat = {c: [t for t in titres if t.categorie == c] for c in weights}
    window = {
        c: max(1, math.ceil(weights[c] * per_hour * 24 * (grille.marge - 1))) for c in weights
    }
    recent: list[set[int]] = [set(), set()]
    for h in hours:
        target = _target(grille, iso, h)
        recent = [recent[1], set()]
        for c in hour_slots:
            rotation = sorted(by_cat[c], key=lambda t: (clock[t.tid], t.tid))
            eligible = [t for t in rotation if t.artist not in recent[0] | recent[1]][: window[c]]
            if not eligible:
                plan.empty_slots += 1
                continue
            best = min(
                range(len(eligible)),
                key=lambda i: (
                    float(np.linalg.norm(eligible[i].q - target))
                    + grille.retard * i / len(eligible)
                ),
            )
            t = eligible[best]
            tick += 1
            clock[t.tid] = tick
            recent[1].add(t.artist)
            plan.hours[h].append(t)
            plan.slots[c] = plan.slots.get(c, 0) + 1
    last = previous
    for h in hours:
        plan.hours[h] = _drift(plan.hours[h], last, _target(grille, iso, h))
        if plan.hours[h]:
            last = plan.hours[h][-1]
    return plan


def _target(grille: GrilleConfig, day: int, hour: int) -> Vector:
    c = grille.cibles[bloc(day, hour)]
    return np.array([c.energie, c.dansabilite, c.tempo])


def _drift(titres: list[Titre], previous: Titre | None, target: Vector) -> list[Titre]:
    """Fil qui dérive : chaque titre est le plus proche, à son début, de la fin du précédent."""
    left = list(titres)
    out: list[Titre] = []
    end = previous.q_end if previous is not None else target
    while left:
        nxt = min(left, key=lambda t: (float(np.linalg.norm(t.q_start - end)), t.tid))
        left.remove(nxt)
        out.append(nxt)
        end = nxt.q_end
    return out


def m3u(titres: list[Titre]) -> str:
    return "#EXTM3U\n" + "".join(f"{t.path}\n" for t in titres)


class Programmer(Protocol):
    def playlists(self) -> dict[str, int]: ...

    def create_hour_playlist(self, name: str, day: int, hour: int) -> int: ...

    def fill_playlist(self, playlist_id: int, m3u: str) -> int: ...


def publish(plan: Plan, station: Programmer) -> list[str]:
    """Écrit chaque heure du plan dans sa playlist, créée au premier usage ; renvoie les erreurs
    (titres que la station n'a pas retrouvés)."""
    iso = plan.day.isoweekday()
    existing = station.playlists()
    errors = []
    for h, titres in plan.hours.items():
        name = playlist_name(iso, h)
        pid = existing.get(name)
        if pid is None:
            pid = station.create_hour_playlist(name, iso, h)
        found = station.fill_playlist(pid, m3u(titres))
        if found != len(titres):
            errors.append(f"{name} : {found} titres retrouvés sur {len(titres)}")
    return errors
