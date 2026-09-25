"""Rappel WhatsApp par CallMeBot (canal existant du serveur, spec §6.2).

CallMeBot répond 210, et non une erreur, quand le quota (16 messages par 4 h) est épuisé : seul
un 200 garantit l'envoi. La clé et le numéro voyagent dans l'URL : ni l'URL, ni les paramètres,
ni le message d'une exception requests ne sont journalisés ou repris. Pas de relance : un rappel
hebdomadaire ne doit pas partir deux fois.
"""

import requests

API = "https://api.callmebot.com/whatsapp.php"
_QUOTA = 210


class WhatsAppError(Exception):
    """Le message n'est pas parti."""


def send_whatsapp(
    phone: str, apikey: str, text: str, session: requests.Session | None = None
) -> None:
    s = session or requests.Session()
    try:
        r = s.get(API, params={"phone": phone, "text": text, "apikey": apikey}, timeout=30)
    except requests.RequestException as e:
        raise WhatsAppError(type(e).__name__) from None
    if r.status_code == _QUOTA:
        raise WhatsAppError("HTTP 210 : quota CallMeBot épuisé (16 messages / 4 h)")
    if r.status_code != 200:
        raise WhatsAppError(f"HTTP {r.status_code}")
