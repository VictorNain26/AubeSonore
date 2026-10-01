# Layer 0 — Genre order Implementation Plan


**Goal:** Give the 1 348 genres a display order derived from the bands they share, published as a column of the vocabulary and frozen in the baseline.

**Architecture:** SQL builds the weighted co-occurrence graph from the frieze population and arbitrates every rule about it. One pure Python module turns that graph into a permutation — the first business rule in this repository that is not in SQL, for a reason stated below. SQL then adds the column and checks the result, and `tests/test_baseline.py` freezes it.

**Tech Stack:** Python 3.12, DuckDB 1.5.5, no new dependency.

**Spec:** `docs/superpowers/specs/2026-09-13-layer1-frieze-design.md`, section "Ordre des genres".

**Not in this plan.** Anything the front-end does with the order. The renderer is a later plan; this one delivers the column and its guarantees.

## Global Constraints

- **Every number in this plan was measured on this repository against dump `20260909-001002`, and the implementation it prescribes was run against the real data before being written down.** A step that produces a different number has found a bug — in the code or in this plan. Report it; never adjust an expected value to make a test pass.
- **No new dependency.** The project's runtime dependency list is `duckdb` and stays that way. The reason is in the algorithm section; it is a decision, not an oversight.
- **Determinism is the acceptance criterion, not a nice-to-have.** The pipeline is byte-for-byte reproducible and the outputs are checksummed. Every ordering comparison must fall back on the genre's mbid, which is unique, so that the result is a function of the input alone.
- **English** in code, comments, commits and identifiers. `CLAUDE.md` and the spec are French and stay French.
- **Zero comments by default.** A comment earns its place only for a non-obvious WHY. Three are prescribed by name below; that is the budget.
- `pathlib` for paths, paths anchored on the package. `ruff` and `mypy` must stay clean.
- Commits follow `<type>(<scope>): <description>`.

## What the measurement established

Ten candidate orderings were scored against two metrics and two baselines before this plan was written. What follows is the part that constrains the implementation.

**The population is the frieze's**, not the whole artist table: 84 262 bands carrying 185 497 band-genre pairs. `frieze` already materialises exactly that predicate, so the SQL joins it rather than restating `y0 IS NOT NULL AND type = 'Group' AND …`.

**The weight is cosine**, `n / sqrt(n_a · n_b)`. Judged against a label the co-occurrence data cannot see — a name-derived family for 390 genres — cosine ranks same-family pairs above cross-family pairs with AUC 0.7810, against 0.7598 for Jaccard, 0.7225 for PMI and 0.6738 for the raw count. Raw count is worst because every edge touching `rock` (10 527 bands) outranks every edge that does not.

**The graph is built at a threshold of one shared band.** Thresholding at five shatters it: the giant component falls from 1 233 genres to 668 and 638 genres become singletons. Thresholds are a rendering concern.

**Measured shape**, all reproduced independently by two different queries:

| quantity | value |
|---|---|
| co-occurring pairs | 35 901 |
| genres with at least one edge | 1 241 of 1 348 |
| components among them | 5 — one of 1 233, four of 2 |
| genres present on a band but with no edge | 69 |
| genres absent from the population entirely | 38 |

1 233 + 8 + 69 + 38 = 1 348.

**Spectral ordering was rejected twice over,** and both reasons matter enough to record here so nobody proposes it again.

It is not deterministic. Changing `OMP_NUM_THREADS` from 1 to 8 — same machine, same input, same wheels — moved 25 of 1 233 positions. Rounding the Fiedler vector before sorting makes that particular test pass but is a threshold, not a total order: the vector has 25 adjacent pairs closer than 1e-12 and a minimum non-zero gap of 2.2e-19, and those pairs are structurally equivalent genres that are exact ties in exact arithmetic.

It is also musically wrong, which the primary cost metric could not see. Spectral scored 0.2830 against the chosen method's 0.2837 — a virtual tie — while spreading the `* metal` genres over 275 positions and putting `electronic` between `art song` and `western swing`. A second metric that uses no co-occurrence data at all (mean internal rank distance within the ten name-derived families) caught it: 0.729 against 0.605, lower being better.

**Why not scipy's optimal leaf ordering.** It scores slightly better — 0.2767 against 0.2837 on cost, 0.565 against 0.605 on cohesion — and `CLAUDE.md` prefers a proven maintained solution to custom code. It is rejected anyway, and the argument has to be stated rather than assumed:

- It costs numpy and scipy, two compiled wheels of tens of megabytes, in a project whose entire runtime dependency list is `duckdb`.
- 95 % of the distance matrix is exactly 1.0. scipy breaks those ties by array index, so the published order — which enters `output_sha256` and the baseline — depends on the input row order, a property nothing in scipy documents or guarantees. Measured: permuting the input rows preserved only 0.89 to 0.93 of adjacency.
- The implementation below has no such dependence. Permuting its input leaves the output byte-identical, because every comparison falls back on the mbid.

Two and a half percent on a display ordering does not buy an implicit contract and two compiled wheels. If the gap ever matters, scipy's `optimal_leaf_ordering` is a drop-in for `_orient`.

**The result, measured.** SHA-256 of the 1 233-genre component order, newline-joined: `b7e61cea77a09ab5cfb64eaee1f0db9dd9da1b8ea9fd58c75bcc0250caf391c5`. It repairs exactly the break the README documents in the Wikidata tree — `metal` at 183, `doom metal` 184, `heavy metal` 201, `thrash metal` 281, `death metal` 308, `black metal` 321, a span of 138 positions out of 1 233. Neighbourhoods read correctly:

```
around metal: instrumental, post-rock, post-metal, atmospheric sludge metal,
              [metal], doom metal, sludge metal, stoner metal, stoner rock
around jazz : electro swing, nu jazz, jazz rock, jazz fusion,
              [jazz], acid jazz, jazz-funk, soul jazz, instrumental jazz
```

**Cost.** The co-occurrence query is 0.11 s on the materialised tables; the ordering is 1.0 s for 1 233 genres and allocates a 2 465 × 2 465 array of doubles, 48.6 MB. Inside a pipeline that already runs for minutes, neither is worth optimising.

## Where the rule lives, and the exception this creates

`CLAUDE.md` says the rules live in the SQL and the Python only chains and verifies. This plan breaks that for the first time, and does so deliberately rather than quietly.

**SQL keeps everything that arbitrates:** which bands count, which pairs exist, how an edge is weighted, and whether the finished order is well formed. All of it is testable the way the repository already tests — a table you can query and an invariant view that must be empty.

**Python owns the ordering itself, because it cannot be expressed in SQL.** Average linkage is a sequential contraction of a distance matrix and the leaf orientation is a traversal of the resulting tree; DuckDB's recursive CTEs cannot carry a mutable matrix across iterations. Claiming otherwise would be a pretend-fix.

Two things keep the exception honest. The module is a pure function from `(ids, weights)` to a permutation — no database, no I/O — so it is unit-testable on graphs small enough to work out by hand. And the verification goes back into SQL and the baseline: an invariant view proves the column is a permutation of `0 … n-1`, and the baseline freezes the order's digest.

## File Structure

```
src/musilogy/
  sql/75_genre_cooccurrence.sql   the weighted graph, from the frieze population
  sql/95_genre_order.sql          adds the column to genres; run by name, after the Python
  sql/90_invariants.sql           three new views that must be empty
  seriation.py                    the pure ordering; no database, no I/O
  build.py                        chains the Python step between the two SQL phases
  publish.py                      genre_order joins the published vocabulary
tests/
  test_seriation.py               the pure function, on graphs small enough to verify by hand
  test_genre_order.py             the column and the co-occurrence table, on the witnesses
  test_baseline.py                the frozen digest on the real dump
```

`95_` is excluded from `build()`'s glob and run by name, exactly as `90_invariants.sql` already is. That is the existing idiom for a SQL file that must run outside the main sequence, and it is why the Python step needs no special casing in the loop.

---

### Task 1: The co-occurrence graph

**Files:**
- Create: `src/musilogy/sql/75_genre_cooccurrence.sql`
- Modify: `src/musilogy/sql/90_invariants.sql`, `src/musilogy/build.py` (the `INVARIANTS` tuple only)
- Create: `tests/test_genre_order.py`

**Interfaces:**
- Consumes: the `frieze` table from `70_frieze.sql` and `bands.genres`.
- Produces: table `genre_cooccurrence(genre_a VARCHAR, genre_b VARCHAR, n_bands BIGINT, cosine DOUBLE)`, one row per unordered pair with `genre_a < genre_b`. Task 3 reads it.

- [ ] **Step 1: Write the failing test**

`tests/test_genre_order.py`:

```python
def test_cooccurrence_pairs_are_unordered_and_unique(con):
    row = con.execute(
        "SELECT count(*) FROM genre_cooccurrence WHERE genre_a >= genre_b"
    ).fetchone()
    assert row is not None
    assert row[0] == 0


def test_cooccurrence_counts_the_bands_two_genres_share(con):
    # The witnesses are small enough to state the answer independently: this
    # recomputes the count from bands rather than from the table under test.
    rows = con.execute(
        "SELECT co.genre_a, co.genre_b, co.n_bands, ("
        "  SELECT count(*) FROM frieze f JOIN bands b ON b.mbid = f.mbid"
        "  WHERE list_contains(list_transform(b.genres, g -> g.mbid), co.genre_a)"
        "    AND list_contains(list_transform(b.genres, g -> g.mbid), co.genre_b)"
        ") AS recomputed FROM genre_cooccurrence co"
    ).fetchall()
    assert rows
    assert all(n == recomputed for _, _, n, recomputed in rows)


def test_cosine_is_the_shared_count_over_the_geometric_mean(con):
    row = con.execute(
        "SELECT count(*) FROM genre_cooccurrence co "
        "WHERE abs(co.cosine - co.n_bands / sqrt("
        "  (SELECT count(*) FROM frieze f JOIN bands b ON b.mbid = f.mbid"
        "     WHERE list_contains(list_transform(b.genres, g -> g.mbid), co.genre_a))::DOUBLE"
        "  * (SELECT count(*) FROM frieze f JOIN bands b ON b.mbid = f.mbid"
        "     WHERE list_contains(list_transform(b.genres, g -> g.mbid), co.genre_b))"
        ")) > 1e-12"
    ).fetchone()
    assert row is not None
    assert row[0] == 0
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
uv run pytest tests/test_genre_order.py -v
```

Expected: FAIL — `Catalog Error: Table with name genre_cooccurrence does not exist`.

- [ ] **Step 3: Write the SQL**

`src/musilogy/sql/75_genre_cooccurrence.sql`. This exact statement was run against the reference dump and produced 35 901 rows over 1 241 genres in 0.11 s:

```sql
-- How close two genres are, measured by the bands that carry both. The frieze
-- population is the one that counts: an order computed over artists the frieze
-- never draws would arrange the vocabulary around evidence the reader cannot see.
--
-- Pair by pair this is wider than density: a band enters the frieze on one
-- density-eligible genre, after which every genre it declares co-occurs with
-- every other. Restricting to eligible genres here would hide from the order
-- the very adjacencies those bands are evidence of.
--
-- Cosine rather than the raw count: measured against a name-derived family
-- label, cosine ranks same-family pairs above cross-family pairs with AUC
-- 0.781 against 0.674 for the raw count, which is dominated by every edge
-- touching rock. Descriptive figures; the frozen ones are in
-- tests/test_baseline.py.
CREATE OR REPLACE TABLE genre_cooccurrence AS
WITH carried AS (
  SELECT f.mbid AS band_mbid, t.g.mbid AS genre_mbid
  FROM frieze f
  JOIN bands b ON b.mbid = f.mbid,
  UNNEST(b.genres) AS t(g)
),
sizes AS (
  SELECT genre_mbid, count(*) AS n FROM carried GROUP BY genre_mbid
)
SELECT
  a.genre_mbid AS genre_a,
  z.genre_mbid AS genre_b,
  count(*)::BIGINT AS n_bands,
  count(*) / sqrt(sa.n::DOUBLE * sz.n) AS cosine
FROM carried a
JOIN carried z ON a.band_mbid = z.band_mbid AND a.genre_mbid < z.genre_mbid
JOIN sizes sa ON sa.genre_mbid = a.genre_mbid
JOIN sizes sz ON sz.genre_mbid = z.genre_mbid
GROUP BY a.genre_mbid, z.genre_mbid, sa.n, sz.n;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
uv run pytest tests/test_genre_order.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Add the invariants**

Append to `src/musilogy/sql/90_invariants.sql`, in the file's existing style — a view per rule, each of which must return no rows:

```sql
CREATE OR REPLACE VIEW cooccurrence_self_pair AS
SELECT * FROM genre_cooccurrence WHERE genre_a = genre_b;

CREATE OR REPLACE VIEW cooccurrence_unknown_genre AS
SELECT co.* FROM genre_cooccurrence co
WHERE NOT EXISTS (SELECT 1 FROM genres g WHERE g.genre_mbid = co.genre_a)
   OR NOT EXISTS (SELECT 1 FROM genres g WHERE g.genre_mbid = co.genre_b);
```

Add `"cooccurrence_self_pair"` and `"cooccurrence_unknown_genre"` to the `INVARIANTS` tuple in `src/musilogy/build.py`, positioned beside the other genre entries rather than appended at the end.

- [ ] **Step 6: Run the whole fast suite**

```bash
uv run ruff check && uv run ruff format --check && uv run mypy && uv run pytest
```

Expected: 222 passed — 219 before this task, plus the three added here. Report the number you actually see.

- [ ] **Step 7: Commit**

```bash
git add src/musilogy/sql/75_genre_cooccurrence.sql src/musilogy/sql/90_invariants.sql \
        src/musilogy/build.py tests/test_genre_order.py
git commit -m "feat(genres): weight how often two genres share a band"
```

---

### Task 2: The ordering, as a pure function

**Files:**
- Create: `src/musilogy/seriation.py`, `tests/test_seriation.py`
- Modify: `pyproject.toml` (the mypy override list only)

**Interfaces:**
- Consumes: nothing. No database, no I/O, no dependency — that is the point.
- Produces:

```python
Weights = dict[tuple[str, str], float]

def seriate(ids: list[str], weights: Weights) -> list[str]:
    ...
```

`ids` are genre mbids; `weights[(a, b)]` is the cosine similarity of the pair with `a < b`, in `(0, 1]`; an absent pair means zero. The return is a permutation of `ids`. Task 3 is the only caller.

- [ ] **Step 1: Write the failing test**

`tests/test_seriation.py`. Use mbid-shaped strings so the tie-break is exercised the way the real data exercises it. Every expectation here is derivable by hand from the input — do not soften one.

```python
from musilogy.seriation import seriate

A, B, C, D, E, F = (f"{i:08d}-0000-0000-0000-000000000000" for i in range(6))


def test_an_empty_or_tiny_input_comes_back_sorted():
    assert seriate([], {}) == []
    assert seriate([B, A], {}) == [A, B]


def test_a_chain_comes_out_as_a_chain():
    # A-B-C-D linked only to their neighbours: the only orders that put every
    # linked pair adjacent are the chain and its mirror, and the mirror is
    # ruled out because the first mbid must be smaller than the last.
    weights = {(A, B): 0.9, (B, C): 0.9, (C, D): 0.9}
    assert seriate([A, B, C, D], weights) == [A, B, C, D]


def test_two_cliques_do_not_interleave():
    weights = {(A, B): 0.9, (A, C): 0.9, (B, C): 0.9, (D, E): 0.9, (D, F): 0.9, (E, F): 0.9}
    order = seriate([A, B, C, D, E, F], weights)
    assert sorted(order) == sorted([A, B, C, D, E, F])
    first = {order[0], order[1], order[2]}
    assert first in ({A, B, C}, {D, E, F})


def test_an_unlinked_genre_does_not_split_a_clique():
    weights = {(A, B): 0.9, (A, C): 0.9, (B, C): 0.9}
    order = seriate([A, B, C, D], weights)
    assert order.index(D) in (0, 3)


def test_the_result_does_not_depend_on_the_order_of_the_input():
    # The one property the whole pipeline's reproducibility rests on. scipy's
    # optimal leaf ordering does not have it: it breaks its ties by array index.
    weights = {(A, B): 0.9, (B, C): 0.4, (C, D): 0.9, (A, D): 0.2, (B, D): 0.1}
    reference = seriate([A, B, C, D], weights)
    for permutation in ([D, C, B, A], [C, A, D, B], [B, D, A, C]):
        assert seriate(permutation, weights) == reference


def test_the_result_does_not_depend_on_the_order_of_the_weights():
    weights = {(A, B): 0.9, (B, C): 0.4, (C, D): 0.9}
    reversed_weights = dict(reversed(list(weights.items())))
    assert seriate([A, B, C, D], weights) == seriate([A, B, C, D], reversed_weights)


def test_ties_are_broken_by_mbid_not_by_position():
    # Every pair equally close: nothing but the mbid can decide, so the answer
    # is the sorted order whatever the input looked like.
    ids = [C, A, E, B, D]
    weights = {(x, y): 0.5 for x in sorted(ids) for y in sorted(ids) if x < y}
    assert seriate(ids, weights) == sorted(ids)
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
uv run pytest tests/test_seriation.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'musilogy.seriation'`.

- [ ] **Step 3: Write the module**

`src/musilogy/seriation.py`. This code was run against the real 1 233-genre graph and reproduced the reference digest exactly; transcribe it rather than rewriting it.

```python
"""Orders genres so that the ones sharing bands sit close together.

Pure: no database, no I/O, no dependency. Average linkage over 1 - cosine,
then a bottom-up leaf orientation."""

from __future__ import annotations

from array import array

Weights = dict[tuple[str, str], float]


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
    for (a, b), w in weights.items():
        i, j = index.get(a), index.get(b)
        if i is not None and j is not None:
            d[i * size + j] = d[j * size + i] = 1.0 - w

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
        if len(chain) >= 2 and chain[-2] == b:
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
                d[(runs[left][0] if fl else runs[left][-1]) * size
                  + (runs[right][-1] if fr else runs[right][0])],
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
    if len(ids) < 3:
        return sorted(ids)
    root, children, d = _linkage(ids, weights)
    order = [ids[i] for i in _orient(root, children, d, ids)]
    return order[::-1] if order[-1] < order[0] else order
```

- [ ] **Step 4: Run the tests and the type check**

```bash
uv run pytest tests/test_seriation.py -v
uv run mypy
```

Expected: 7 passed, no mypy issue. If mypy rejects `array[float]` as a return annotation on the Python version in use, report what it says rather than reaching for `Any` — `array` is generic at type-check time only, and the fix is an import from `typing`, not a widened type.

Add `test_seriation` to the mypy override list in `pyproject.toml`, in the same alphabetical position the existing entries imply.

- [ ] **Step 5: Commit**

```bash
git add src/musilogy/seriation.py tests/test_seriation.py pyproject.toml
git commit -m "feat(genres): order a co-occurrence graph by average linkage"
```

---

### Task 3: The column

**Files:**
- Create: `src/musilogy/sql/95_genre_order.sql`
- Modify: `src/musilogy/build.py`, `src/musilogy/publish.py`, `src/musilogy/sql/90_invariants.sql`, `tests/test_genre_order.py`, `tests/test_publish.py`

**Interfaces:**
- Consumes: `genre_cooccurrence` from Task 1, `seriate` from Task 2.
- Produces: a `genre_order INTEGER` column on `genres`, a permutation of `0 … n-1`, delivered in `genres.parquet` and `web/genres.json.gz`.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_genre_order.py`:

```python
def test_genre_order_is_a_permutation(con):
    rows = con.execute("SELECT genre_order FROM genres ORDER BY genre_order").fetchall()
    assert [r[0] for r in rows] == list(range(len(rows)))


def test_genres_that_share_bands_sit_closer_than_genres_that_do_not(con):
    # Weak but independent of the algorithm: the mean rank distance over
    # co-occurring pairs must beat the mean over all pairs, or the column is
    # carrying no signal at all.
    row = con.execute(
        "SELECT ("
        "  SELECT avg(abs(ga.genre_order - gb.genre_order)) FROM genre_cooccurrence co"
        "  JOIN genres ga ON ga.genre_mbid = co.genre_a"
        "  JOIN genres gb ON gb.genre_mbid = co.genre_b"
        "), (SELECT (count(*) + 1) / 3.0 FROM genres)"
    ).fetchone()
    assert row is not None
    linked, expected_at_random = row
    assert linked < expected_at_random
```

And to `tests/test_publish.py`, beside the existing vocabulary tests:

```python
def test_the_published_vocabulary_carries_the_display_order(con, tmp_path):
    publish(con, tmp_path, DUMP, None)
    vocabulary = read_web(tmp_path, "genres")
    assert sorted(vocabulary["genre_order"]) == list(range(len(vocabulary["genre_mbid"])))


def test_the_published_vocabulary_stays_keyed_by_mbid(con, tmp_path):
    # frieze.bin's genre_ids are positions in this array. Publishing the
    # vocabulary in display order instead would silently relabel every band.
    publish(con, tmp_path, DUMP, None)
    vocabulary = read_web(tmp_path, "genres")
    assert vocabulary["genre_mbid"] == sorted(vocabulary["genre_mbid"])
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
uv run pytest tests/test_genre_order.py tests/test_publish.py -v
```

Expected: the four new tests fail — `Binder Error: Referenced column "genre_order" not found`.

- [ ] **Step 3: Write the SQL that adds the column**

`src/musilogy/sql/95_genre_order.sql`. It runs after the Python step, by name, the way `90_invariants.sql` does:

```sql
-- Joins the display order computed in Python onto the vocabulary. A single
-- row_number() does both halves: genres the ordering placed sort by their
-- position, and the ones it never saw — no band in the frieze population, or no
-- co-occurring genre — fall to the end by name, which keeps the tail stable
-- rather than arbitrary. 107 of the 1 348 land there on the reference dump.
CREATE OR REPLACE TABLE genres AS
SELECT
  g.*,
  (row_number() OVER (ORDER BY s.position NULLS LAST, g.name, g.genre_mbid) - 1)::INTEGER
    AS genre_order
FROM genres g
LEFT JOIN genre_seriation s ON s.genre_mbid = g.genre_mbid;
```

`g.*` rather than an `EXCLUDE`: within one `build()` the table is rebuilt by `50_genres.sql` and `55_genre_reliability.sql` before this file runs, so `genre_order` never pre-exists. This statement was run against the reference dump and produced a valid permutation of `0 … 1347` preserving the seriated order exactly.

- [ ] **Step 4: Wire the Python step into `build()`**

`src/musilogy/build.py`. The SQL loop must skip `95_` as it already skips `90_`, then the Python step runs, then `95_` runs by name.

```python
def order_genres(con: duckdb.DuckDBPyConnection, sql_dir: Path) -> None:
    """Turns the co-occurrence graph into a display order.

    Components are ordered independently and concatenated: the graph is not
    connected — four pairs and sixty-nine isolated genres sit outside the giant
    component on the reference dump — and average linkage over a disconnected
    graph would interleave them at distance 1, which is no information at all."""
    weights = {
        (a, b): w
        for a, b, w in con.execute(
            "SELECT genre_a, genre_b, cosine FROM genre_cooccurrence"
        ).fetchall()
    }
    neighbours: dict[str, list[str]] = {}
    for a, b in weights:
        neighbours.setdefault(a, []).append(b)
        neighbours.setdefault(b, []).append(a)

    seen: set[str] = set()
    components: list[list[str]] = []
    for start in sorted(neighbours):
        if start in seen:
            continue
        seen.add(start)
        stack, members = [start], [start]
        while stack:
            node = stack.pop()
            for other in neighbours[node]:
                if other not in seen:
                    seen.add(other)
                    stack.append(other)
                    members.append(other)
        components.append(sorted(members))
    components.sort(key=lambda m: (-len(m), m[0]))

    order: list[str] = []
    for members in components:
        order.extend(seriate(members, weights))

    con.execute("CREATE OR REPLACE TABLE genre_seriation (genre_mbid VARCHAR, position INTEGER)")
    con.executemany(
        "INSERT INTO genre_seriation VALUES (?, ?)",
        [(mbid, position) for position, mbid in enumerate(order)],
    )
    con.execute((sql_dir / "95_genre_order.sql").read_text(encoding="utf-8"))
```

Three things in that code are load-bearing rather than incidental, and were verified against the reference dump:

- **`sorted(neighbours)` and `sorted(members)`.** The traversal must not depend on the order the query returned or on how a set iterates, or the component boundaries stay the same while the seriated order inside them does not.
- **`(-len(m), m[0])`.** Size alone is not a total order here: four of the five components have exactly two members, so the smallest mbid is what separates them.
- **Genres with no edge never enter `genre_seriation`.** 107 of the 1 348 have none on the reference dump — 38 carry no band in the frieze population, 69 more are present but isolated. `95_genre_order.sql` places them.

Measured on the reference dump: 5 components of 1 233, 2, 2, 2 and 2; 1 241 genres seriated in 1.1 s; 107 in the tail.

Import `seriate` from `musilogy.seriation`, and add `order_genres` to the sequence in `build()` after the SQL loop. The loop must skip `95_` the way it already skips `90_`.

- [ ] **Step 5: Publish the column**

`src/musilogy/publish.py`: add `"genre_order"` to `WEB_COLUMNS["genres"]`.

**Do not touch `ORDER_BY["genres"]`.** It is `"genre_mbid"`, and `frieze.bin`'s `genre_ids` are positions in the array that ordering produces. Publishing the vocabulary in display order would relabel every band in the blob with no test outside `test_the_published_vocabulary_stays_keyed_by_mbid` to see it. That is what the second test in Step 1 exists to pin.

- [ ] **Step 6: Add the invariant**

Append to `src/musilogy/sql/90_invariants.sql`:

```sql
CREATE OR REPLACE VIEW genre_order_not_a_permutation AS
SELECT g.genre_mbid, g.genre_order FROM genres g
WHERE g.genre_order IS NULL
   OR g.genre_order < 0
   OR g.genre_order >= (SELECT count(*) FROM genres)
UNION ALL
SELECT genre_mbid, genre_order FROM genres
WHERE genre_order IN (SELECT genre_order FROM genres GROUP BY genre_order HAVING count(*) > 1);
```

Add `"genre_order_not_a_permutation"` to the `INVARIANTS` tuple, beside the other genre entries.

- [ ] **Step 7: Run the whole fast suite**

```bash
uv run ruff check && uv run ruff format --check && uv run mypy && uv run pytest
```

Expected: 233 passed — 219 on `main`, plus 3 from Task 1, 7 from Task 2 and 4 here. Report the number you actually see.

- [ ] **Step 8: Commit**

```bash
git add src/musilogy/sql/95_genre_order.sql src/musilogy/sql/90_invariants.sql \
        src/musilogy/build.py src/musilogy/publish.py \
        tests/test_genre_order.py tests/test_publish.py
git commit -m "feat(genres): publish the display order as a column of the vocabulary"
```

---

### Task 4: Freeze it on the real dump, and re-sync the delivery

**Files:**
- Modify: `tests/test_baseline.py`, `web/public/data/*` (regenerated), `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the frozen digest, and a delivery whose committed blobs match the new manifest.

This task needs the real dump. `data/work/20260909-001002/` holds the extractions on this machine, so `uv run musilogy run` works without re-fetching; it takes about ten minutes. Do not skip it and do not fabricate its output.

- [ ] **Step 1: Write the failing baseline test**

Append to `tests/test_baseline.py`, in the file's existing style — the module's constants at the top, the assertion in the marked-slow test:

```python
# The display order of the vocabulary, frozen as a digest because the order
# itself is 1 348 lines.
GENRE_ORDER_SHA256 = "0fc377ba221a5d35380d9b094979c2e91488d7009b41889cc822b8c7dacd8c60"
# The break the README documents in the Wikidata tree, and the reason the order
# is derived from co-occurrence rather than taken from a taxonomy: these six
# must sit in one block. Measured span 138 of 1 348 positions.
METAL_BLOCK_SPAN = 138
```

and, inside the slow test:

```python
    rows = con.execute("SELECT genre_mbid FROM genres ORDER BY genre_order").fetchall()
    digest = hashlib.sha256("\n".join(r[0] for r in rows).encode()).hexdigest()
    assert digest == GENRE_ORDER_SHA256

    row = con.execute(
        "SELECT max(genre_order) - min(genre_order) FROM genres WHERE name IN "
        "('metal', 'heavy metal', 'black metal', 'death metal', 'thrash metal', 'doom metal')"
    ).fetchone()
    assert row is not None
    assert row[0] == METAL_BLOCK_SPAN
```

- [ ] **Step 2: Run the pipeline and read the real values**

```bash
uv run musilogy run
```

Then compute both values from the freshly built database and check them against the constants:

```bash
uv run python -c "
import duckdb, hashlib
from musilogy.build import build, order_genres
from musilogy.paths import SQL_DIR, work_dir, CORRECTIONS_CSV
from musilogy import REFERENCE_DUMP as DUMP
w = work_dir(DUMP)
con = duckdb.connect(':memory:')
build(con, SQL_DIR, w / 'artists.jsonl', w / 'release_groups.jsonl', CORRECTIONS_CSV)
rows = con.execute('SELECT genre_mbid FROM genres ORDER BY genre_order').fetchall()
print('sha  ', hashlib.sha256(chr(10).join(r[0] for r in rows).encode()).hexdigest())
print('span ', con.execute(\"SELECT max(genre_order) - min(genre_order) FROM genres WHERE name IN ('metal','heavy metal','black metal','death metal','thrash metal','doom metal')\").fetchone()[0])
"
```

Both were measured before this plan was written, on this dump, with the exact code above: the digest is `0fc377ba221a5d35380d9b094979c2e91488d7009b41889cc822b8c7dacd8c60` and the span is 138. **If either differs, that is a finding, not a constant to update** — report it with the value you got and stop, because a divergence means the implementation differs from the one that was measured.

Adapt the snippet if `order_genres` ends up with a different signature; what matters is that the database is built by the real pipeline, not by a prototype.

- [ ] **Step 3: Run the slow suite**

```bash
uv run pytest -m slow
```

Expected: 1 passed. The frieze and lineage counts must be unchanged at 84 262 and 37 136 — this task adds a column to the vocabulary and must not move the population.

- [ ] **Step 4: Re-sync the versioned delivery**

The new column changes `genres.json.gz` and therefore `output_sha256`, so the committed blobs no longer match their manifest:

```bash
uv run pytest tests/test_delivery.py -v   # expected to FAIL before the sync
uv run musilogy sync-web
uv run pytest tests/test_delivery.py -v   # expected to pass after
cd web && pnpm run test
```

The web suite must stay green: `frieze.bin.gz` is regenerated too, and `delivered.test.ts` re-reads it. The counts it asserts — 84 262 and 37 136 — must not move. If either does, stop and report.

- [ ] **Step 5: Check the README**

`README.md` describes layer 0's tables and rules. Read the sections about `genres` and about the Wikidata tree, and add what is now true: the vocabulary carries a display order derived from co-occurrence. Change only what the branch made incomplete; do not restructure, and keep the file's French.

- [ ] **Step 6: Run everything**

```bash
uv run ruff check && uv run ruff format --check && uv run mypy && uv run pytest
uv run pytest -m slow
cd web && pnpm run check && pnpm run types && pnpm run test && pnpm run build
```

- [ ] **Step 7: Commit**

```bash
git add tests/test_baseline.py README.md web/public/data
git commit -m "test(baseline): freeze the genre display order"
```

---

### Task 5: Correct the design document

The spec's "Ordre des genres" section states three figures that were measured on the wrong population. They are not rounding differences — they come from all 103 221 genre-bearing artists, including non-groups and undated ones the frieze never draws.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-13-layer1-frieze-design.md`

- [ ] **Step 1: Correct the three figures**

The section says:

> « 49 321 groupes portent plusieurs genres, 2,08 en moyenne, et 7 347 paires de genres co-occurrent sur au moins 5 groupes »

On the population the same document declares the frieze draws — 84 262 bands — the measured values are **43 590**, **2,20** and **7 059**. All three were reproduced by two independent queries. The conclusion the sentence draws, that the signal exists, survives unchanged.

Rewrite the sentence with the correct numbers, in the document's French and its register. State that they are measured on the frieze population, since that is precisely what went wrong.

- [ ] **Step 2: Record what the section left out**

The same section says the seriation algorithm remains to be chosen. It has been. Replace that paragraph with what was decided and why, briefly — the weight is cosine, the method is average linkage with a bottom-up leaf orientation, the tie-break is the mbid at every comparison, and spectral ordering was rejected because a thread-count change moved 25 of 1 233 positions. Point at this plan for the measurements rather than repeating them.

Add the fact the section does not mention and should: **107 of the 1 348 genres have no co-occurrence signal at all** — 38 carry no band in the frieze population and 69 more are isolated at every threshold. Whatever the renderer does with the order has to tolerate a tail of 115 positions that mean nothing.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-13-layer1-frieze-design.md
git commit -m "docs(layer1): correct the genre-order figures and record the chosen method"
```

---

## Acceptance

| check | expected |
|---|---|
| `uv run pytest` | green, count reported rather than predicted |
| `uv run pytest -m slow` | 1 passed, frieze 84 262 and lineage 37 136 unchanged |
| `uv run ruff check` / `format --check` / `mypy` | clean |
| `cd web && pnpm run check` / `types` / `test` / `build` | clean |
| `uv run musilogy sync-web` then `git status` | no modification under `web/public/data/` |

And the six genres the README names — `metal`, `heavy metal`, `black metal`, `death metal`, `thrash metal`, `doom metal` — sit within 138 positions of one another, in a vocabulary of 1 348, ordered by nothing but the bands they share.
