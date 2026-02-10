"""
Configuration for DB Service
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Database service configuration"""
    
    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "sna_db"
    postgres_user: str = "sna_user"
    postgres_password: str = "sna_password"
    
    # Service
    service_port: int = 8002
    service_host: str = "0.0.0.0"
    
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL"""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
