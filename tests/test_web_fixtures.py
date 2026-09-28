import subprocess

from musilogy import REFERENCE_DUMP as DUMP
from musilogy.paths import REPO_ROOT, WEB_FIXTURES_DIR
from musilogy.publish import publish

WEB_FIXTURES = ("frieze.bin.gz", "lineage.bin.gz", "frieze_ids.bin", "genres.json.gz")


def test_the_committed_web_fixtures_match_a_fresh_witness_publish(con, tmp_path):
    publish(con, tmp_path, DUMP, None)
    for name in WEB_FIXTURES:
        assert (WEB_FIXTURES_DIR / name).read_bytes() == (tmp_path / "web" / name).read_bytes(), (
            f"{name} is stale: run `uv run musilogy make-web-fixtures`"
        )


def test_the_web_fixtures_are_not_ignored_by_git():
    # Same trap as tests/fixtures/*.jsonl: a repo-wide pattern can swallow a
    # generated file that only survives because it is already in the index, and
    # a fresh clone then loses it silently.
    for name in WEB_FIXTURES:
        path = f"web/tests/fixtures/{name}"
        result = subprocess.run(
            ["git", "check-ignore", "--no-index", path],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode != 128, (
            f"git check-ignore could not answer for {path}: {result.stderr.strip()}"
        )
        assert result.returncode == 1, f"{path} is ignored: {result.stdout.strip()}"


def test_the_witness_frieze_holds_the_bands_the_reader_tests_expect(con):
    assert con.execute("SELECT count(*) FROM frieze").fetchone()[0] == 22
    assert con.execute("SELECT count(*) FROM lineage").fetchone()[0] == 1
    assert con.execute("SELECT src, dst, shared FROM lineage").fetchone() == (6, 8, 3)
