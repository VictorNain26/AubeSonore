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


class LibraryConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    duration_tolerance_s: int = Field(default=3, ge=0, le=10)


class DiscoverConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    seeds_per_run: int = Field(default=15, ge=1, le=200)
    seed_cooldown_days: int = Field(default=30, ge=0, le=365)
    tracks_per_neighbour: int = Field(default=10, ge=1, le=100)
    lastfm_similar_limit: int = Field(default=100, ge=1, le=250)


class SignalsConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    culture_vocabulary: int = Field(default=200, ge=10, le=2000)


class Editorial(BaseModel):
    model_config = ConfigDict(extra="forbid")
    library: LibraryConfig = LibraryConfig()
    discover: DiscoverConfig = DiscoverConfig()
    signals: SignalsConfig = SignalsConfig()


def load_editorial(path: Path) -> Editorial:
    with path.open("rb") as f:
        return Editorial.model_validate(tomllib.load(f))
