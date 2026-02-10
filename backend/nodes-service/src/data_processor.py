"""
Data processor for SNA network data
Migrated and adapted from original backend/app/data_loader.py

Key changes from original:
- Groups are provided by user, not loaded from Excel files
- Data comes from Flow Service API, not local files
- Processing happens on-demand, not at startup
"""
import pandas as pd
import logging
import itertools
from typing import Dict, List, Optional
from models import Node, Edge, NetworkData

logger = logging.getLogger(__name__)


class SNADataProcessor:
    """Processes SNA data and builds network graph"""
    
    # Vibrant color palette for groups
    VIBRANT_COLORS = [
        "#E63946", "#4361EE", "#3A0CA3", "#7209B7", 
        "#F72585", "#4CC9F0", "#2A9D8F", "#E9C46A", 
        "#F4A261", "#E76F51"
    ]
    UNKNOWN_COLOR = "#adb5bd"
    RED_EDGE_COLOR = "#e63946"
    GRAY_EDGE_COLOR = "#ced4da"
    
    def __init__(self):
        """Initialize data processor"""
        logger.info("SNADataProcessor initialized")
    
    def process_network_data(
        self,
        sna_data: List[Dict],
        vector_data: List[Dict],
        groups: List[Dict]
    ) -> NetworkData:
        """
        Process raw data into network graph format
        
        Args:
            sna_data: List of connection records [{"side_a": "123", "side_b": "456", "weight": 4}]
            vector_data: List of keyword records [{"side_a": "123", "side_b": "456", "words": "cat,dog"}]
            groups: List of group definitions [{"name": "group a", "members": [{"pstn": "123", "name": "John"}]}]
        
        Returns:
            NetworkData with nodes, edges, and groups
        """
        logger.info("=" * 60)
        logger.info("PROCESSING NETWORK DATA")
        logger.info("=" * 60)
        logger.info(f"SNA records: {len(sna_data)}")
        logger.info(f"Vector records: {len(vector_data)}")
        logger.info(f"Groups: {len(groups)}")
        
        # Convert to DataFrames
        df_sna = pd.DataFrame(sna_data)
        df_vector = pd.DataFrame(vector_data) if vector_data else None
        
        # Process groups and assign colors
        id_to_name, node_colors, group_colors, recognized_ids = self._process_groups(groups)
        
        # Build nodes and edges
        nodes, edges = self._build_graph(df_sna, df_vector, id_to_name, node_colors, group_colors, recognized_ids)
        
        logger.info(f"✓ Processed {len(nodes)} nodes, {len(edges)} edges")
        logger.info("=" * 60)
        
        return NetworkData(
            nodes=nodes,
            edges=edges,
            groups=group_colors
        )
    
    def _process_groups(self, groups: List[Dict]) -> tuple:
        """
        Process user-provided groups and assign colors
        
        Returns:
            (id_to_name, node_colors, group_colors, recognized_ids)
        """
        logger.info("-" * 60)
        logger.info("PROCESSING GROUPS")
        logger.info("-" * 60)
        
        id_to_name = {}
        node_colors = {}
        group_colors = {}
        recognized_ids = set()
        
        color_cycle = itertools.cycle(self.VIBRANT_COLORS)
        
        for group in groups:
            group_name = group.get("name", "Unknown")
            members = group.get("members", [])
            
            # Assign color to group
            color = next(color_cycle)
            group_colors[group_name] = color
            
            logger.info(f"Group '{group_name}': {color} ({len(members)} members)")
            
            for member in members:
                pstn = str(member.get("pstn", ""))
                name = member.get("name", pstn)
                
                if pstn:
                    recognized_ids.add(pstn)
                    id_to_name[pstn] = name
                    node_colors[pstn] = color
        
        # Add "Unknown" group
        group_colors["Unknown"] = self.UNKNOWN_COLOR
        
        logger.info(f"Total recognized IDs: {len(recognized_ids)}")
        logger.info(f"Total groups: {len(group_colors)}")
        logger.info("-" * 60)
        
        return id_to_name, node_colors, group_colors, recognized_ids
    
    def _build_graph(
        self,
        df_sna: pd.DataFrame,
        df_vector: Optional[pd.DataFrame],
        id_to_name: Dict[str, str],
        node_colors: Dict[str, str],
        group_colors: Dict[str, str],
        recognized_ids: set
    ) -> tuple:
        """
        Build nodes and edges from data
        
        Returns:
            (nodes, edges)
        """
        logger.info("-" * 60)
        logger.info("BUILDING GRAPH")
        logger.info("-" * 60)
        
        # All node IDs from edges
        all_ids = set(df_sna["side_a"].astype(str)) | set(df_sna["side_b"].astype(str))
        
        # Calculate degree for each node
        degree = {}
        for _, row in df_sna.iterrows():
            a, b = str(row["side_a"]), str(row["side_b"])
            degree[a] = degree.get(a, 0) + 1
            degree[b] = degree.get(b, 0) + 1
        
        # Build vector lookup: (a,b) and (b,a) -> words
        vector_lookup = {}
        if df_vector is not None and len(df_vector) > 0:
            for _, row in df_vector.iterrows():
                a, b = str(row["side_a"]), str(row["side_b"])
                words = str(row.get("words", ""))
                vector_lookup[(a, b)] = words
                vector_lookup[(b, a)] = words
        
        # Build nodes
        nodes = []
        for nid in all_ids:
            name = id_to_name.get(nid, "Unknown")
            color = node_colors.get(nid, self.UNKNOWN_COLOR)
            group = self._get_group_name_for_color(color, group_colors)
            
            # Node is relevant if:
            # - It's in recognized_ids, OR
            # - It has 2+ connections
            relevant = nid in recognized_ids or degree.get(nid, 0) >= 2
            
            # Node size based on degree (15-25 range)
            size = 15 + min(degree.get(nid, 0), 10)
            
            # Label: use name if known, otherwise PSTN
            label = name if name != "Unknown" else nid
            
            nodes.append(
                Node(
                    id=nid,
                    label=label,
                    name=name,
                    group=group,
                    color=color,
                    relevant=relevant,
                    size=size
                )
            )
        
        # Build edges (aggregate by pair in case of duplicate rows)
        edge_agg = {}
        for _, row in df_sna.iterrows():
            a, b = str(row["side_a"]), str(row["side_b"])
            w = int(row["weight"])
            
            # Use ordered key (min, max) to avoid duplicates
            key = (min(a, b), max(a, b))
            
            if key not in edge_agg:
                has_vec = key in vector_lookup or (key[1], key[0]) in vector_lookup
                words = vector_lookup.get(key) or vector_lookup.get((key[1], key[0]))
                edge_agg[key] = {
                    "weight": 0,
                    "words": words,
                    "has_vector": has_vec
                }
            
            edge_agg[key]["weight"] += w
        
        # Create edge objects
        edges = []
        for (a, b), v in edge_agg.items():
            has_vector = v["has_vector"]
            edge_color = self.RED_EDGE_COLOR if has_vector else self.GRAY_EDGE_COLOR
            eid = f"{a}_{b}"
            
            edges.append(
                Edge(
                    id=eid,
                    source=a,
                    target=b,
                    weight=v["weight"],
                    words=v["words"] if has_vector else None,
                    has_vector=has_vector,
                    color=edge_color
                )
            )
        
        logger.info(f"✓ Built {len(nodes)} nodes, {len(edges)} edges")
        logger.info("-" * 60)
        
        return nodes, edges
    
    def _get_group_name_for_color(self, color: str, group_colors: Dict[str, str]) -> str:
        """Reverse lookup: node color -> group name"""
        for name, c in group_colors.items():
            if c == color:
                return name
        return "Unknown"
