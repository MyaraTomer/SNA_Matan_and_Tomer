"""
Mock data loader - loads Excel files and returns as JSON
This simulates the third-party API response
"""
import logging
from pathlib import Path
from typing import Dict, List
import pandas as pd

logger = logging.getLogger(__name__)


class MockDataLoader:
    """Loads mock data from Excel files"""
    
    def __init__(self, data_dir: Path):
        """
        Initialize mock data loader
        
        Args:
            data_dir: Path to directory containing Excel files
        """
        self.data_dir = data_dir
        self.sna_file = data_dir / "df_sna.xlsx"
        self.vector_file = data_dir / "df_vector.xlsx"
        
        logger.info(f"MockDataLoader initialized with data_dir: {data_dir}")
        
        # Verify files exist
        if not self.sna_file.exists():
            logger.warning(f"SNA file not found: {self.sna_file}")
        if not self.vector_file.exists():
            logger.warning(f"Vector file not found: {self.vector_file}")
    
    def load_data(self, time_range: Dict = None) -> Dict[str, List[Dict]]:
        """
        Load mock data from Excel files
        
        Args:
            time_range: Time range filter (currently ignored in mock)
                       Format: {"from": "2024-01-01T00:00:00Z", "to": "2024-01-31T23:59:59Z"}
        
        Returns:
            Dictionary with sna_data and vector_data
        
        Raises:
            FileNotFoundError: If Excel files don't exist
            Exception: If files can't be read
        """
        logger.info("Loading mock data from Excel files")
        if time_range:
            logger.info(f"  Time range: {time_range['from']} to {time_range['to']} (ignored in mock)")
        
        try:
            # Load SNA data
            if not self.sna_file.exists():
                raise FileNotFoundError(f"SNA file not found: {self.sna_file}")
            
            df_sna = pd.read_excel(self.sna_file)
            logger.info(f"✓ Loaded SNA data: {len(df_sna)} rows")
            logger.info(f"  Columns: {list(df_sna.columns)}")
            
            # Validate required columns
            required_sna_cols = ['side_a', 'side_b', 'weight']
            missing_cols = [col for col in required_sna_cols if col not in df_sna.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns in SNA file: {missing_cols}")
            
            # Load Vector data
            df_vector = None
            if self.vector_file.exists():
                df_vector = pd.read_excel(self.vector_file)
                logger.info(f"✓ Loaded Vector data: {len(df_vector)} rows")
                logger.info(f"  Columns: {list(df_vector.columns)}")
                
                # Validate required columns
                required_vector_cols = ['side_a', 'side_b', 'words']
                missing_cols = [col for col in required_vector_cols if col not in df_vector.columns]
                if missing_cols:
                    logger.warning(f"Missing columns in Vector file: {missing_cols}")
                    df_vector = None
            else:
                logger.warning("Vector file not found - returning empty vector data")
            
            # Convert to records (list of dicts)
            sna_data = df_sna.to_dict(orient='records')
            vector_data = df_vector.to_dict(orient='records') if df_vector is not None else []
            
            logger.info(f"✓ Mock data loaded successfully")
            logger.info(f"  SNA records: {len(sna_data)}")
            logger.info(f"  Vector records: {len(vector_data)}")
            
            return {
                "sna_data": sna_data,
                "vector_data": vector_data
            }
            
        except FileNotFoundError as e:
            logger.error(f"✗ File not found: {e}")
            raise
        except Exception as e:
            logger.error(f"✗ Failed to load mock data: {e}")
            raise
