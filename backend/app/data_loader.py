"""
Data loader for Excel files
Handles loading and processing of SNA data from Excel files
"""
import pandas as pd
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import itertools

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SNADataLoader:
    """Loads and processes SNA data from Excel files"""
    
    # Vibrant color palette for groups
    VIBRANT_COLORS = [
        "#E63946", "#4361EE", "#3A0CA3", "#7209B7", 
        "#F72585", "#4CC9F0", "#2A9D8F", "#E9C46A", 
        "#F4A261", "#E76F51"
    ]
    UNKNOWN_COLOR = "#adb5bd"
    RED_EDGE_COLOR = "#e63946"
    GRAY_EDGE_COLOR = "#ced4da"
    
    def __init__(self, data_path: str):
        """
        Initialize data loader
        
        Args:
            data_path: Path to the data directory containing Excel files
        """
        self.data_path = Path(data_path)
        logger.info(f"Initializing SNADataLoader with data path: {self.data_path}")
        
        # Data storage
        self.df_sna: Optional[pd.DataFrame] = None
        self.df_vector: Optional[pd.DataFrame] = None
        self.names_dfs: List[Tuple[pd.DataFrame, str]] = []
        
        # Processed data
        self.recognized_ids = set()
        self.id_to_name: Dict[str, str] = {}
        self.node_colors: Dict[str, str] = {}
        self.group_colors: Dict[str, str] = {}
        self.name_to_ids: Dict[str, List[str]] = {}
        
    def load_all_data(self) -> bool:
        """
        Load all Excel files from the data directory
        
        Returns:
            True if all files loaded successfully, False otherwise
        """
        logger.info("=" * 60)
        logger.info("STARTING DATA LOAD")
        logger.info("=" * 60)
        
        success = True
        
        # Load main SNA data
        if not self._load_sna_data():
            success = False
            
        # Load vector data (optional)
        self._load_vector_data()
        
        # Load all names files
        if not self._load_names_data():
            success = False
            
        # Process loaded data
        if success:
            self._process_names()
            logger.info("=" * 60)
            logger.info("DATA LOAD COMPLETE")
            logger.info("=" * 60)
        else:
            logger.error("DATA LOAD FAILED - Some required files are missing")
            
        return success
    
    def _load_sna_data(self) -> bool:
        """Load df_sna.xlsx file"""
        file_path = self.data_path / "df_sna.xlsx"
        logger.info(f"Loading SNA data from: {file_path}")
        
        try:
            self.df_sna = pd.read_excel(file_path)
            logger.info(f"✓ Successfully loaded df_sna.xlsx: {len(self.df_sna)} rows")
            logger.info(f"  Columns: {list(self.df_sna.columns)}")
            
            # Validate required columns
            required_cols = ['side_a', 'side_b', 'weight']
            missing_cols = [col for col in required_cols if col not in self.df_sna.columns]
            if missing_cols:
                logger.error(f"✗ Missing required columns in df_sna.xlsx: {missing_cols}")
                return False
                
            return True
            
        except FileNotFoundError:
            logger.error(f"✗ File not found: {file_path}")
            return False
        except Exception as e:
            logger.error(f"✗ Error loading df_sna.xlsx: {e}")
            return False
    
    def _load_vector_data(self) -> bool:
        """Load df_vector.xlsx file (optional)"""
        file_path = self.data_path / "df_vector.xlsx"
        logger.info(f"Loading vector data from: {file_path}")
        
        try:
            self.df_vector = pd.read_excel(file_path)
            logger.info(f"✓ Successfully loaded df_vector.xlsx: {len(self.df_vector)} rows")
            logger.info(f"  Columns: {list(self.df_vector.columns)}")
            
            # Validate required columns
            required_cols = ['side_a', 'side_b', 'words']
            missing_cols = [col for col in required_cols if col not in self.df_vector.columns]
            if missing_cols:
                logger.warning(f"⚠ Missing columns in df_vector.xlsx: {missing_cols}")
                self.df_vector = None
                return False
                
            return True
            
        except FileNotFoundError:
            logger.warning(f"⚠ Vector file not found (optional): {file_path}")
            self.df_vector = None
            return False
        except Exception as e:
            logger.warning(f"⚠ Error loading df_vector.xlsx (optional): {e}")
            self.df_vector = None
            return False
    
    def _load_names_data(self) -> bool:
        """Load all names_*.xlsx files"""
        logger.info("Loading names files...")
        
        # Find all files matching names_*.xlsx
        names_files = sorted(self.data_path.glob("names_*.xlsx"))
        
        if not names_files:
            logger.error("✗ No names files found (pattern: names_*.xlsx)")
            return False
        
        logger.info(f"Found {len(names_files)} names file(s)")
        
        for file_path in names_files:
            try:
                # Extract group name from filename
                # names_group_a.xlsx -> "Group A"
                filename = file_path.stem  # "names_group_a"
                group_raw = filename.replace("names_", "")  # "group_a"
                group_name = group_raw.replace("_", " ").title()  # "Group A"
                
                # Load DataFrame
                df = pd.read_excel(file_path)
                
                # Validate columns
                required_cols = ['pstn', 'name']
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    logger.error(f"✗ Missing columns in {file_path.name}: {missing_cols}")
                    continue
                
                self.names_dfs.append((df, group_name))
                logger.info(f"✓ Loaded {file_path.name}: {len(df)} entries → Group: '{group_name}'")
                
            except Exception as e:
                logger.error(f"✗ Error loading {file_path.name}: {e}")
                continue
        
        if not self.names_dfs:
            logger.error("✗ Failed to load any names files")
            return False
            
        return True
    
    def _process_names(self):
        """Process names data to create mappings and colors"""
        logger.info("-" * 60)
        logger.info("PROCESSING NAMES DATA")
        logger.info("-" * 60)
        
        color_cycle = itertools.cycle(self.VIBRANT_COLORS)
        
        for names_df, group_name in self.names_dfs:
            color = next(color_cycle)
            self.group_colors[group_name] = color
            logger.info(f"Group '{group_name}': {color} ({len(names_df)} members)")
            
            for _, row in names_df.iterrows():
                pstn = str(row['pstn'])
                name = row.get('name', pstn)
                
                if pstn:
                    self.recognized_ids.add(pstn)
                    self.id_to_name[pstn] = name
                    self.node_colors[pstn] = color
                    
                    if name not in self.name_to_ids:
                        self.name_to_ids[name] = []
                    self.name_to_ids[name].append(pstn)
        
        # Add "Unknown" group
        self.group_colors["Unknown"] = self.UNKNOWN_COLOR
        
        logger.info(f"Total recognized IDs: {len(self.recognized_ids)}")
        logger.info(f"Total unique names: {len(self.name_to_ids)}")
        logger.info(f"Total groups: {len(self.group_colors)}")
        logger.info("-" * 60)
    
    def get_files_status(self) -> Dict[str, bool]:
        """Get status of loaded files"""
        return {
            "df_sna.xlsx": self.df_sna is not None,
            "df_vector.xlsx": self.df_vector is not None,
            "names_files": len(self.names_dfs) > 0
        }
