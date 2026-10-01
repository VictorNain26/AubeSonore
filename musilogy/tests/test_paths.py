from musilogy.paths import DATA_DIR, FIXTURES_DIR, PACKAGE_DIR, RAW_DIR, out_dir, work_dir


def test_the_extraction_directory_carries_the_dump_it_came_from():
    # The trap this closes: `musilogy run` reusing a previous dump's extraction
    # and publishing a manifest that names the new dump and its checksums. A
    # work directory that ignores its argument makes the two indistinguishable.
    assert work_dir("20260909-001002") != work_dir("20270101-000000")
    assert work_dir("20260909-001002").name == "20260909-001002"
    assert out_dir("20260909-001002").name == "20260909-001002"


def test_data_paths_never_depend_on_the_current_directory():
    for path in (DATA_DIR, RAW_DIR, FIXTURES_DIR, work_dir("d"), out_dir("d")):
        assert path.is_absolute(), path


def test_the_data_directory_sits_beside_the_package_not_under_it():
    # data/ is a sibling of src/, never inside the installed package: a path
    # rooted on PACKAGE_DIR would write outputs into the source tree.
    assert PACKAGE_DIR not in DATA_DIR.parents
    assert DATA_DIR.name == "data"
