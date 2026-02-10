"""
SQLAlchemy models for database tables
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Project(Base):
    """Projects table"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationship
    history_entries = relationship("History", back_populates="project", cascade="all, delete-orphan")


class History(Base):
    """History table - stores SNA searches"""
    __tablename__ = "history"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Raw data from Flow Service (as JSON strings)
    sna_df = Column(Text, nullable=False)
    vector_df = Column(Text, nullable=False)
    
    # Search parameters
    search_metadata = Column(Text, nullable=False)
    
    # Audit fields
    created_by = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, index=True)
    
    # Relationship
    project = relationship("Project", back_populates="history_entries")
