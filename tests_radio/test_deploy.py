from radio.cli import app
from radio.core.config import REPO_ROOT

UNITS = REPO_ROOT / "deploy" / "systemd"
RADIO = "%h/radio/pipeline-v3/.venv/bin/radio"


def _commands() -> set[str]:
    names = set()
    for c in app.registered_commands:
        assert c.callback is not None
        names.add(c.name or c.callback.__name__.replace("_", "-"))
    return names


def test_units_run_existing_radio_commands_in_order() -> None:
    known = _commands()
    found = []
    for unit in sorted(UNITS.glob("*.service")):
        for line in unit.read_text(encoding="utf-8").splitlines():
            if line.startswith("ExecStart="):
                cmd = line.split("=", 1)[1].split()
                assert cmd[0] == RADIO, unit.name
                assert cmd[1] in known, (unit.name, cmd[1])
                found.append(cmd[1])
    assert found == [
        "votes-remind",
        "votes-serve",
        "library-sync",
        "discover",
        "signals",
        "train",
        "votes-select",
    ]


def test_timers_are_weekly_and_catch_up() -> None:
    for name, when in (
        ("radio-weekly.timer", "Sun *-*-* 03:00:00"),
        ("radio-remind.timer", "Sun *-*-* 10:00:00"),
    ):
        text = (UNITS / name).read_text(encoding="utf-8")
        assert f"OnCalendar={when}" in text
        assert "Persistent=true" in text


def test_batch_work_yields_to_the_broadcast() -> None:
    text = (UNITS / "radio-weekly.service").read_text(encoding="utf-8")
    for line in ("Type=oneshot", "Nice=19", "CPUWeight=20", "IOSchedulingClass=idle"):
        assert line in text


def test_reminder_waits_for_the_weekly_pass_but_is_not_blocked_by_it() -> None:
    text = (UNITS / "radio-remind.service").read_text(encoding="utf-8")
    assert "After=radio-weekly.service" in text
    assert "Requires=radio-weekly" not in text
    assert "Wants=radio-weekly" not in text
