import pytest

from musilogy import REFERENCE_DUMP
from musilogy.fetch import ChecksumError, expected_sums, sha256_file, verify
from musilogy.paths import REFERENCE_DIR

REF = REFERENCE_DIR / f"{REFERENCE_DUMP}.SHA256SUMS"


def test_sha256_of_known_content(tmp_path):
    p = tmp_path / "a.bin"
    p.write_bytes(b"musilogy")
    assert sha256_file(p) == ("a4164857777a9573db9057c25dd069b99c641aa3909b3fe38e5e3e711dfa01ae")


def test_expected_sums_reads_the_reference_file():
    sums = expected_sums(REF)
    assert sums["artist.tar.xz"] == (
        "a68940e911830f65ff412275f4ba8a9100569cba1f677bdd6e6c091938e452f2"
    )
    assert sums["release-group.tar.xz"] == (
        "38de1e46c25b6b6e5acc051e3ab359ed13e873056e1ddfe4aae75fe2e642124f"
    )


def test_verify_rejects_a_corrupted_file(tmp_path):
    p = tmp_path / "a.bin"
    p.write_bytes(b"corrompu")
    with pytest.raises(ChecksumError):
        verify(p, "0" * 64)
