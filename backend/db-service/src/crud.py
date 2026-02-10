"""
CRUD operations for database
"""
import json
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from models import Project, History


# ============================================================================
# PROJECTS
# ============================================================================

def get_all_projects(db: Session) -> List[Project]:
    """Get all projects"""
    return db.query(Project).order_by(Project.created_at.desc()).all()


def get_project_by_id(db: Session, project_id: int) -> Optional[Project]:
    """Get project by ID"""
    return db.query(Project).filter(Project.id == project_id).first()


def get_project_by_name(db: Session, name: str) -> Optional[Project]:
    """Get project by name"""
    return db.query(Project).filter(Project.name == name).first()


def create_project(db: Session, name: str) -> Project:
    """Create new project"""
    project = Project(name=name)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


# ============================================================================
# HISTORY
# ============================================================================

def get_history_by_id(db: Session, history_id: int) -> Optional[History]:
    """Get history entry by ID"""
    return db.query(History).filter(History.id == history_id).first()


def get_project_history(db: Session, project_id: int) -> List[History]:
    """Get all history entries for a project"""
    return db.query(History)\
        .filter(History.project_id == project_id)\
        .order_by(History.updated_at.desc())\
        .all()


def create_history(
    db: Session,
    project_id: int,
    name: Optional[str],
    sna_df: str,
    vector_df: str,
    search_metadata: str,
    created_by: str
) -> History:
    """Create new history entry"""
    history = History(
        project_id=project_id,
        name=name,
        sna_df=sna_df,
        vector_df=vector_df,
        search_metadata=search_metadata,
        created_by=created_by
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def update_history(
    db: Session,
    history_id: int,
    sna_df: str,
    vector_df: str,
    search_metadata: str
) -> Optional[History]:
    """Update history entry"""
    history = db.query(History).filter(History.id == history_id).first()
    if not history:
        return None
    
    history.sna_df = sna_df
    history.vector_df = vector_df
    history.search_metadata = search_metadata
    # updated_at will be automatically updated by onupdate
    
    db.commit()
    db.refresh(history)
    return history


def delete_history(db: Session, history_id: int) -> bool:
    """Delete history entry"""
    history = db.query(History).filter(History.id == history_id).first()
    if not history:
        return False
    
    db.delete(history)
    db.commit()
    return True


def find_duplicate_history(
    db: Session,
    project_id: int,
    created_by: str,
    groups: list,
    time_range: dict
) -> Optional[History]:
    """
    Find duplicate search by matching:
    - project_id
    - created_by
    - groups (exact match)
    - time_range (exact match)
    """
    # Get all history for this project and user
    candidates = db.query(History).filter(
        and_(
            History.project_id == project_id,
            History.created_by == created_by
        )
    ).all()
    
    # Check each candidate for exact match
    for candidate in candidates:
        try:
            metadata = json.loads(candidate.search_metadata)
            candidate_groups = metadata.get("groups", [])
            candidate_time_range = metadata.get("time_range", {})
            
            # Compare groups and time_range
            if (normalize_groups(candidate_groups) == normalize_groups(groups) and
                candidate_time_range == time_range):
                return candidate
        except (json.JSONDecodeError, KeyError):
            continue
    
    return None


def normalize_groups(groups: list) -> str:
    """
    Normalize groups for comparison
    Sort groups and members to ensure consistent comparison
    """
    if not groups:
        return ""
    
    # Sort groups by name, sort members by pstn
    sorted_groups = sorted(groups, key=lambda g: g.get("name", ""))
    for group in sorted_groups:
        members = group.get("members", [])
        group["members"] = sorted(members, key=lambda m: m.get("pstn", ""))
    
    return json.dumps(sorted_groups, sort_keys=True)
