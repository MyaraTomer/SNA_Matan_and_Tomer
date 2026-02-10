"""
Configuration for Flow Service
"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Flow service configuration"""
    
    # Service
    service_port: int = 8003
    service_host: str = "0.0.0.0"
    
    # Mock data path
    mock_data_path: str = "mock/data"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Resolve mock data path
MOCK_DATA_DIR = Path(__file__).parent / settings.mock_data_path
