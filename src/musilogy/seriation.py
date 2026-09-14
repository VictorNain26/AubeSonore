"""Orders genres so that the ones sharing bands sit close together.

Pure: no database, no I/O, no dependency. Average linkage over 1 - cosine,
then a bottom-up leaf orientation."""

from __future__ import annotations

from array import array

Weights = dict[tuple[str, str], float]

_MIN_SIZE_FOR_LINKAGE = 3


def _linkage(
    ids: list[str], weights: Weights
) -> tuple[int, dict[int, tuple[int, int]], array[float]]:
    """Nearest-neighbour-chain average linkage. Absent pairs sit at distance 1."""
    n = len(ids)
    index = {mbid: i for i, mbid in enumerate(ids)}
    size = 2 * n - 1
    d = array("d", [1.0]) * (size * size)
    for i in range(size):
        d[i * size + i] = 0.0
    for (mbid_a, mbid_b), w in weights.items():
        pos_a, pos_b = index.get(mbid_a), index.get(mbid_b)
        if pos_a is not None and pos_b is not None:
            d[pos_a * size + pos_b] = d[pos_b * size + pos_a] = 1.0 - w

    weight = [1] * size
    key = list(ids) + [""] * (n - 1)
    children: dict[int, tuple[int, int]] = {}
    active = set(range(n))
    chain: list[int] = []
    nxt = n

    while len(active) > 1:
        if not chain:
            chain = [min(active, key=lambda i: key[i])]
        a = chain[-1]
        b = min((i for i in active if i != a), key=lambda i: (d[a * size + i], key[i]))
        if len(chain) > 1 and chain[-2] == b:
            chain.pop()
            chain.pop()
            left, right = (a, b) if key[a] < key[b] else (b, a)
            for c in active:
                if c not in (left, right):
                    merged = (
                        weight[left] * d[left * size + c] + weight[right] * d[right * size + c]
                    ) / (weight[left] + weight[right])
                    d[nxt * size + c] = d[c * size + nxt] = merged
            active.difference_update((left, right))
            active.add(nxt)
            weight[nxt] = weight[left] + weight[right]
            key[nxt] = key[left]
            children[nxt] = (left, right)
            nxt += 1
        else:
            chain.append(b)
    return next(iter(active)), children, d


def _orient(
    root: int, children: dict[int, tuple[int, int]], d: array[float], ids: list[str]
) -> list[int]:
    """Flips each pair of children so the two facing ends are the closest of the
    four possibilities. Iterative: a linkage tree over 1 233 leaves is deep
    enough to overflow the recursion limit, and raising the limit would hide
    that rather than answer it."""
    n = len(ids)
    size = 2 * n - 1
    runs: dict[int, list[int]] = {}
    stack = [(root, False)]
    while stack:
        node, expanded = stack.pop()
        if node < n:
            runs[node] = [node]
            continue
        if not expanded:
            stack.append((node, True))
            stack.extend((child, False) for child in children[node])
            continue
        left, right = children[node]
        _, _, _, flip_left, flip_right = min(
            (
                d[
                    (runs[left][0] if fl else runs[left][-1]) * size
                    + (runs[right][-1] if fr else runs[right][0])
                ],
                ids[runs[left][-1] if fl else runs[left][0]],
                ids[runs[right][0] if fr else runs[right][-1]],
                fl,
                fr,
            )
            for fl in (False, True)
            for fr in (False, True)
        )
        runs[node] = (runs[left][::-1] if flip_left else runs[left]) + (
            runs[right][::-1] if flip_right else runs[right]
        )
        del runs[left], runs[right]
    return runs[root]


def seriate(ids: list[str], weights: Weights) -> list[str]:
    """Orders `ids` so that heavily co-occurring pairs sit close together.

    Every comparison falls back on the mbid, which is unique, so the result is a
    function of the input alone — neither the order of `ids` nor the order of
    `weights` can change it. The pipeline's byte-for-byte reproducibility does
    not survive a tie resolved by iteration order."""
    if len(ids) < _MIN_SIZE_FOR_LINKAGE:
        return sorted(ids)
    root, children, d = _linkage(ids, weights)
    order = [ids[i] for i in _orient(root, children, d, ids)]
    return order[::-1] if order[-1] < order[0] else order
