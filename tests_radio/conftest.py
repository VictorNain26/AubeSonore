import pytest
import stamina


@pytest.fixture(autouse=True)
def _stamina_testing() -> None:
    # Relances sans attente dans les tests.
    stamina.set_testing(True, attempts=3)
