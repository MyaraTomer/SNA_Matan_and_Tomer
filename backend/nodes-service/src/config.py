"""
Configuration for Nodes Service
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Nodes service configuration"""
    
    # Service
    service_port: int = 8001
    service_host: str = "0.0.0.0"
    
    # Dependent services
    db_service_url: str = "http://localhost:8002"
    flow_service_url: str = "http://localhost:8003"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
