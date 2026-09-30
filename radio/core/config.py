"""Configuration : secrets et chemins depuis .env, réglages éditoriaux depuis un TOML validé."""

import tomllib
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    plex_url: str = "http://127.0.0.1:32400"
    # repr=False : exclure du repr, pas seulement masquer la valeur — le nom du champ
    # « plex_token » contient lui-même la sous-chaîne du secret dans les tests.
    plex_token: SecretStr | None = Field(default=None, repr=False)
    plex_music_section: str | None = None
    # Seule racine dont on accepte les chemins de section renvoyés par Plex.
    plex_music_root: Path = Path("/media/plex/Musique")
    lastfm_api_key: SecretStr | None = Field(default=None, repr=False)
    data_dir: Path = Field(default=REPO_ROOT / "data", validation_alias="RADIO_DATA_DIR")
    config_dir: Path = Field(default=REPO_ROOT / "config", validation_alias="RADIO_CONFIG_DIR")
    effnet_model: Path = Field(
        default=REPO_ROOT / "models" / "discogs-effnet-bs64-1.pb",
        validation_alias="RADIO_EFFNET_MODEL",
    )
    votes_host: str = Field(default="127.0.0.1", validation_alias="RADIO_VOTES_HOST")
    votes_port: int = Field(default=8040, validation_alias="RADIO_VOTES_PORT")
    votes_url: str | None = Field(default=None, validation_alias="RADIO_VOTES_URL")
    cf_access_team_domain: str | None = Field(
        default=None, pattern=r"^[a-z0-9-]+\.cloudflareaccess\.com$"
    )
    cf_access_aud: str | None = None
    # Le numéro est une donnée personnelle : masqué comme un secret.
    whatsapp_phone: SecretStr | None = Field(default=None, repr=False)
    callmebot_apikey: SecretStr | None = Field(default=None, repr=False)


class LibraryConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    duration_tolerance_s: int = Field(default=3, ge=0, le=10)


class DiscoverConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    seeds_per_run: int = Field(default=15, ge=1, le=200)
    seed_cooldown_days: int = Field(default=30, ge=0, le=365)
    tracks_per_neighbour: int = Field(default=10, ge=1, le=100)
    lastfm_similar_limit: int = Field(default=100, ge=1, le=250)


class ModelConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    c: float = Field(default=0.1, gt=0)
    weak_weight: float = Field(default=0.1, ge=0, le=1)
    keep_fraction: float = Field(default=1 / 3, gt=0, le=1)
    exam_window: int = Field(default=60, ge=10, le=1000)


class VotesConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    exam_per_selection: int = Field(default=10, ge=1, le=100)
    lesson_per_selection: int = Field(default=10, ge=0, le=100)
    quiet_days: int = Field(default=7, ge=1, le=60)


class Editorial(BaseModel):
    model_config = ConfigDict(extra="forbid")
    library: LibraryConfig = LibraryConfig()
    discover: DiscoverConfig = DiscoverConfig()
    model: ModelConfig = ModelConfig()
    votes: VotesConfig = VotesConfig()


def load_editorial(path: Path) -> Editorial:
    with path.open("rb") as f:
        return Editorial.model_validate(tomllib.load(f))
