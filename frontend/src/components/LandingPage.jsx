import { useState, useEffect } from 'react'
import SearchForm from './SearchForm'
import HistoryList from './HistoryList'
import './LandingPage.css'

const LandingPage = ({ project, onSearchStart, onChangeProject }) => {
  const [mode, setMode] = useState('history') // 'history' or 'new'
  const [userName, setUserName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)

  useEffect(() => {
    // Check if user name is stored
    const storedName = localStorage.getItem('sna_user_name')
    if (storedName) {
      setUserName(storedName)
    } else {
      setShowNamePrompt(true)
    }
  }, [])

  const handleSaveName = () => {
    if (userName.trim()) {
      localStorage.setItem('sna_user_name', userName.trim())
      setShowNamePrompt(false)
    }
  }

  const handleHistorySelect = (historyEntry) => {
    // Load the selected history entry
    onSearchStart({
      historyId: historyEntry.id,
      isHistory: true,
      historyEntry
    })
  }

  return (
    <div className="landing-page">
      {showNamePrompt && (
        <div className="name-prompt-overlay">
          <div className="name-prompt-modal">
            <h3>Welcome!</h3>
            <p>Please enter your name for tracking purposes:</p>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              className="name-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveName()
                }
              }}
            />
            <button onClick={handleSaveName} className="btn-save-name">
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="landing-header">
        <div className="project-info">
          <h1>{project.name}</h1>
          <button onClick={onChangeProject} className="btn-change-project">
            Change Project
          </button>
        </div>
        {userName && (
          <div className="user-info">
            <span className="user-label">User:</span>
            <span className="user-name">{userName}</span>
            <button
              onClick={() => setShowNamePrompt(true)}
              className="btn-edit-name"
              title="Change name"
            >
              ✎
            </button>
          </div>
        )}
      </div>

      <div className="landing-content">
        <div className="mode-selector">
          <button
            className={`mode-button ${mode === 'history' ? 'active' : ''}`}
            onClick={() => setMode('history')}
          >
            <span className="mode-icon">📋</span>
            <span className="mode-label">View History</span>
          </button>
          <button
            className={`mode-button ${mode === 'new' ? 'active' : ''}`}
            onClick={() => setMode('new')}
          >
            <span className="mode-icon">➕</span>
            <span className="mode-label">New Search</span>
          </button>
        </div>

        <div className="mode-content">
          {mode === 'history' ? (
            <HistoryList
              projectId={project.id}
              onHistorySelect={handleHistorySelect}
            />
          ) : (
            <SearchForm
              projectId={project.id}
              userName={userName}
              onSearchSubmit={onSearchStart}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default LandingPage
