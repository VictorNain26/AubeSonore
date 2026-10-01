import duckdb

from musilogy.paths import REPO_ROOT


def test_duckdb_version_is_pinned():
    assert duckdb.__version__ == "1.5.5"


def test_duckdb_runs_a_multi_statement_script():
    con = duckdb.connect(":memory:")
    con.execute("CREATE TABLE t(i INT); INSERT INTO t VALUES (1), (2);")
    assert con.execute("SELECT sum(i) FROM t").fetchall() == [(3,)]


def test_both_licences_are_declared():
    # The code and the produced data are under different licences: MusicBrainz
    # genres and tags force CC-BY-NC-SA on the data, which must not contaminate
    # the pipeline itself.
    assert (REPO_ROOT / "LICENSE").read_text(encoding="utf-8").startswith("MIT License")
    assert "CC BY-NC-SA 3.0" in (REPO_ROOT / "LICENSE-DATA").read_text(encoding="utf-8")
