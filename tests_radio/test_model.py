from radio.model.model import _decide


def test_decide_keeps_the_serving_model_unless_the_new_one_is_as_good() -> None:
    serving = (1, object())
    assert _decide(None, None, None) is None
    assert _decide(serving, 0.8, 0.8) is None
    assert _decide(serving, 0.7, 0.8) == "AUC d'examen 0,700 < 0,800 (modèle en service)"
    assert _decide(serving, None, 0.8) is not None
