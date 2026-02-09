"""
FastAPI application for SNA - serves network data to the frontend.
"""
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.data_loader import SNADataLoader
from app.models import NetworkData, Node, Edge, StatusResponse

logger = logging.getLogger(__name__)

app = FastAPI(title="SNA API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Data loaded on startup
loader: Optional[SNADataLoader] = None
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def _get_group_name_for_color(color: str) -> str:
    """Reverse lookup: node color -> group name."""
    if not loader:
        return "Unknown"
    for name, c in loader.group_colors.items():
        if c == color:
            return name
    return "Unknown"


@app.on_event("startup")
def startup_event():
    global loader
    logger.info("Starting SNA backend...")
    loader = SNADataLoader(str(DATA_DIR))
    if not loader.load_all_data():
        logger.error("Data load failed - /api/network may return empty or fail")
    else:
        logger.info("Backend ready.")


@app.get("/")
def root():
    return {"message": "SNA API", "docs": "/docs"}


@app.get("/api/status", response_model=StatusResponse)
def get_status():
    if not loader:
        return StatusResponse(status="error", message="Data not loaded", files_loaded={})
    return StatusResponse(
        status="ok",
        message="Data loaded",
        files_loaded=loader.get_files_status(),
    )


@app.get("/api/network", response_model=NetworkData)
def get_network_data():
    if not loader or loader.df_sna is None:
        return NetworkData(nodes=[], edges=[], groups={})
    df = loader.df_sna
    # All node IDs from edges
    all_ids = set(df["side_a"].astype(str)) | set(df["side_b"].astype(str))
    # Degree for relevance (unknown with 2+ connections are relevant)
    degree = {}
    for _, row in df.iterrows():
        a, b = str(row["side_a"]), str(row["side_b"])
        degree[a] = degree.get(a, 0) + 1
        degree[b] = degree.get(b, 0) + 1
    # Vector lookup: (a,b) and (b,a) -> words
    vector_lookup = {}
    if loader.df_vector is not None:
        for _, row in loader.df_vector.iterrows():
            a, b = str(row["side_a"]), str(row["side_b"])
            words = str(row.get("words", ""))
            vector_lookup[(a, b)] = words
            vector_lookup[(b, a)] = words
    # Build nodes
    nodes = []
    for nid in all_ids:
        name = loader.id_to_name.get(nid, "Unknown")
        color = loader.node_colors.get(nid, loader.UNKNOWN_COLOR)
        group = _get_group_name_for_color(color)
        relevant = nid in loader.recognized_ids or degree.get(nid, 0) >= 2
        size = 15 + min(degree.get(nid, 0), 10)
        label = name if name != "Unknown" else nid
        nodes.append(
            Node(
                id=nid,
                label=label,
                name=name,
                group=group,
                color=color,
                relevant=relevant,
                size=size,
            )
        )
    # Build edges (aggregate by pair in case of duplicate rows)
    edge_agg = {}
    for _, row in df.iterrows():
        a, b = str(row["side_a"]), str(row["side_b"])
        w = int(row["weight"])
        key = (min(a, b), max(a, b))
        if key not in edge_agg:
            has_vec = key in vector_lookup or (key[1], key[0]) in vector_lookup
            words = vector_lookup.get(key) or vector_lookup.get((key[1], key[0]))
            edge_agg[key] = {"weight": 0, "words": words, "has_vector": has_vec}
        edge_agg[key]["weight"] += w
    edges = []
    for (a, b), v in edge_agg.items():
        has_vector = v["has_vector"]
        edge_color = loader.RED_EDGE_COLOR if has_vector else loader.GRAY_EDGE_COLOR
        eid = f"{a}_{b}"
        edges.append(
            Edge(
                id=eid,
                source=a,
                target=b,
                weight=v["weight"],
                words=v["words"] if has_vector else None,
                has_vector=has_vector,
                color=edge_color,
            )
        )
    return NetworkData(nodes=nodes, edges=edges, groups=loader.group_colors)
