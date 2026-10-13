from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    database_url: str = "sqlite:///./agrivision_dev.db"
    cors_origins: str = "http://localhost:5173"
    artifact_dir: str = "backend/artifacts"
    upload_dir: str = "backend/uploads"
    max_upload_mb: int = 8
    model_config = SettingsConfigDict(env_file="backend/.env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def artifacts_path(self) -> Path:
        path = Path(self.artifact_dir)
        return path if path.is_absolute() else ROOT / path

    @property
    def uploads_path(self) -> Path:
        path = Path(self.upload_dir)
        return path if path.is_absolute() else ROOT / path

settings = Settings()
