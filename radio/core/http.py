"""Hook de relance unique du processus (stamina).

`set_on_retry_hooks` est global : un seul hook générique, qui ne journalise que le nom de la
fonction, le type d'exception et le numéro d'essai. Jamais les arguments ni le message : la
clé Last.fm voyage dans l'URL, et les URL d'extraits Deezer sont signées.
"""

import logging

from stamina.instrumentation import RetryDetails, set_on_retry_hooks

logger = logging.getLogger(__name__)


def log_retry(details: RetryDetails) -> None:
    logger.warning(
        "%s failed (%s), retrying (attempt %d)",
        details.name,
        type(details.caused_by).__name__,
        details.retry_num,
    )


set_on_retry_hooks((log_retry,))
