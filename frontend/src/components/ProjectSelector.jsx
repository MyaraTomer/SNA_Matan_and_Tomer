import { useState, useEffect } from 'react'
import './ProjectSelector.css'

const ProjectSelector = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('select') // 'select' or 'create'

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      const data = await response.json()
      setProjects(data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newProjectName.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const newProject = await response.json()
      onProjectSelect(newProject)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSelectProject = () => {
    if (!selectedProject) {
      setError('Please select a project')
      return
    }
    onProjectSelect(selectedProject)
  }

  return (
    <div className="project-selector-overlay">
      <div className="project-selector-modal">
        <h2>Select Project</h2>
        
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="close-error">×</button>
          </div>
        )}

        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'select' ? 'active' : ''}`}
            onClick={() => setMode('select')}
          >
            Select Existing
          </button>
          <button
            className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create New
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            {mode === 'select' ? (
              <div className="select-mode">
                {projects.length === 0 ? (
                  <div className="no-projects">
                    <p>No projects found. Create a new one to get started.</p>
                    <button onClick={() => setMode('create')} className="btn-secondary">
                      Create Project
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="projects-list">
                      {projects.map((project) => (
                        <div
                          key={project.id}
                          className={`project-item ${
                            selectedProject?.id === project.id ? 'selected' : ''
                          }`}
                          onClick={() => setSelectedProject(project)}
                        >
                          <div className="project-name">{project.name}</div>
                          <div className="project-date">
                            Created: {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleSelectProject}
                      className="btn-primary"
                      disabled={!selectedProject}
                    >
                      Open Project
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="create-mode">
                <div className="form-group">
                  <label htmlFor="projectName">Project Name</label>
                  <input
                    id="projectName"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name (e.g., Investigation Alpha)"
                    className="text-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateProject()
                      }
                    }}
                  />
                </div>
                <button onClick={handleCreateProject} className="btn-primary">
                  Create Project
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProjectSelector
