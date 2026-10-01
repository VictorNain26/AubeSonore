import logging

import pytest
import requests
import responses
from responses import matchers

from radio.notify.whatsapp import API, WhatsAppError, send_whatsapp

PHONE = "+33600000000"
KEY = "cle-secrete-123"


@responses.activate
def test_sends_text_with_phone_and_key() -> None:
    responses.get(
        API,
        status=200,
        match=[matchers.query_param_matcher({"phone": PHONE, "text": "Écoute é", "apikey": KEY})],
    )
    send_whatsapp(PHONE, KEY, "Écoute é")
    assert len(responses.calls) == 1


@pytest.mark.parametrize(("status", "why"), [(210, "quota"), (500, "HTTP 500")])
@responses.activate
def test_anything_but_200_is_an_error_without_secrets(status: int, why: str) -> None:
    responses.get(API, status=status)
    with pytest.raises(WhatsAppError) as e:
        send_whatsapp(PHONE, KEY, "x")
    assert why in str(e.value)
    assert KEY not in str(e.value)
    assert PHONE not in str(e.value)


@responses.activate
def test_network_error_names_only_its_type(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)
    responses.get(API, body=requests.ConnectionError(f"{API}?apikey={KEY}"))
    with pytest.raises(WhatsAppError) as e:
        send_whatsapp(PHONE, KEY, "x")
    assert str(e.value) == "ConnectionError"
    assert e.value.__cause__ is None
    assert e.value.__suppress_context__
    assert KEY not in caplog.text
