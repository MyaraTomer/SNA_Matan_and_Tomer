-- Initial database schema for SNA application
-- PostgreSQL

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create history table
CREATE TABLE IF NOT EXISTS history (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Raw data from Flow Service (as JSON strings)
    sna_df TEXT NOT NULL,
    vector_df TEXT NOT NULL,
    
    -- Search parameters and metadata
    search_metadata TEXT NOT NULL,
    
    -- Audit fields
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_project_id ON history(project_id);
CREATE INDEX IF NOT EXISTS idx_history_created_by ON history(created_by);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_updated_at ON history(updated_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_history_updated_at 
    BEFORE UPDATE ON history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO projects (name) VALUES ('Sample Project Alpha');
-- INSERT INTO projects (name) VALUES ('Sample Project Beta');
