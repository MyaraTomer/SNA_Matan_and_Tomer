"""
Script to create sample Excel files for testing the SNA application
Run this after installing the backend requirements
"""
import pandas as pd
import os
from pathlib import Path

def create_sample_data():
    """Create sample Excel files in the data/ directory"""
    
    print("=" * 60)
    print("CREATING SAMPLE EXCEL FILES")
    print("=" * 60)
    
    # Create data directory if it doesn't exist
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    print(f"Data directory: {data_dir}")
    print()
    
    # Create df_sna.xlsx
    print("Creating df_sna.xlsx...")
    sna_data = [
        ('05056109230', '05026109230', 4),
        ('05056109230', '05211122334', 3),
        ('05056109230', '05333344455', 5),
        ('05026109230', '05211122334', 2),
        ('05026109230', '05333344455', 4),
        ('05211122334', '05333344455', 1),
        ('05077788899', '05056109230', 3),
        ('05077788899', '05211122334', 5),
        ('05077788899', '05333344455', 4),
        ('05077788899', '05333344412125', 4),
        ('05077788899', '053333444211235', 4),
    ]
    df_sna = pd.DataFrame(sna_data, columns=['side_a', 'side_b', 'weight'])
    df_sna.to_excel(data_dir / 'df_sna.xlsx', index=False)
    print(f"  ✓ Created df_sna.xlsx ({len(df_sna)} rows)")
    
    # Create df_vector.xlsx
    print("Creating df_vector.xlsx...")
    vector_data = [
        ('05056109230', '05026109230', 'cat, dog, log'),
        ('05077788899', '05026109230', 'cat, fff, werf'),
        ('05077788899', '05056109230', 'ffff, dsf, dfsdf'),
    ]
    df_vector = pd.DataFrame(vector_data, columns=['side_a', 'side_b', 'words'])
    df_vector.to_excel(data_dir / 'df_vector.xlsx', index=False)
    print(f"  ✓ Created df_vector.xlsx ({len(df_vector)} rows)")
    
    # Create names_group_a.xlsx
    print("Creating names_group_a.xlsx...")
    names_group_a = [
        ('05077788899', 'Lior'),
        ('05026109230', 'Lior')
    ]
    df_names_a = pd.DataFrame(names_group_a, columns=['pstn', 'name'])
    df_names_a.to_excel(data_dir / 'names_group_a.xlsx', index=False)
    print(f"  ✓ Created names_group_a.xlsx ({len(df_names_a)} entries) → Group: 'Group A'")
    
    # Create names_group_b.xlsx
    print("Creating names_group_b.xlsx...")
    names_group_b = [
        ('05056109230', 'Noam'),
        ('05211122334', 'Yael')
    ]
    df_names_b = pd.DataFrame(names_group_b, columns=['pstn', 'name'])
    df_names_b.to_excel(data_dir / 'names_group_b.xlsx', index=False)
    print(f"  ✓ Created names_group_b.xlsx ({len(df_names_b)} entries) → Group: 'Group B'")
    
    print()
    print("=" * 60)
    print("SAMPLE DATA CREATED SUCCESSFULLY")
    print("=" * 60)
    print()
    print("Files created:")
    print(f"  - {data_dir / 'df_sna.xlsx'}")
    print(f"  - {data_dir / 'df_vector.xlsx'}")
    print(f"  - {data_dir / 'names_group_a.xlsx'}")
    print(f"  - {data_dir / 'names_group_b.xlsx'}")
    print()
    print("You can now start the backend server!")

if __name__ == "__main__":
    try:
        create_sample_data()
    except ImportError as e:
        print("ERROR: Required packages not installed")
        print("Please run: pip install -r backend/requirements.txt")
        print(f"Details: {e}")
    except Exception as e:
        print(f"ERROR: {e}")
