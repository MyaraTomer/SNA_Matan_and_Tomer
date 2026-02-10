"""
Configuration for API Gateway
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """API Gateway configuration"""
    
    # Service
    service_port: int = 8000
    service_host: str = "0.0.0.0"
    
    # Nodes Service
    nodes_service_url: str = "http://localhost:8001"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
