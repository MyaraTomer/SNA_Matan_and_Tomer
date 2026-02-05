"""
Data models for SNA application
"""
from pydantic import BaseModel
from typing import Optional, List, Dict


class Node(BaseModel):
    """Represents a node in the network"""
    id: str
    label: str
    name: str
    group: str
    color: str
    relevant: bool
    size: int = 20


class Edge(BaseModel):
    """Represents an edge/connection in the network"""
    id: str
    source: str  # from node
    target: str  # to node
    weight: int
    words: Optional[str] = None
    has_vector: bool
    color: str


class NetworkData(BaseModel):
    """Complete network data response"""
    nodes: List[Node]
    edges: List[Edge]
    groups: Dict[str, str]  # group_name -> color mapping


class StatusResponse(BaseModel):
    """API status response"""
    status: str
    message: str
    files_loaded: Dict[str, bool]
