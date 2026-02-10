import { useState, useEffect } from 'react'
import './HistoryList.css'

const HistoryList = ({ projectId, onHistorySelect }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (projectId) {
      fetchHistory()
    }
  }, [projectId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/searches`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }
      
      const data = await response.json()
      setHistory(data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching history:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeSinceUpdate = (dateString) => {
    const now = new Date()
    const updated = new Date(dateString)
    const diffMs = now - updated
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  if (loading) {
    return (
      <div className="history-loading">
        <div className="spinner"></div>
        <p>Loading search history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="history-error">
        <p>❌ {error}</p>
        <button onClick={fetchHistory} className="btn-retry">
          Retry
        </button>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <div className="empty-icon">🔍</div>
        <h3>No search history yet</h3>
        <p>Create your first search to get started!</p>
      </div>
    )
  }

  return (
    <div className="history-list">
      <div className="history-header">
        <h2>Search History</h2>
        <button onClick={fetchHistory} className="btn-refresh" title="Refresh">
          🔄
        </button>
      </div>

      <div className="history-items">
        {history.map((item) => (
          <div
            key={item.id}
            className="history-item"
            onClick={() => onHistorySelect(item)}
          >
            <div className="history-item-header">
              <h3 className="history-name">{item.name || 'Unnamed Search'}</h3>
              <span className="history-time">
                Last updated: {getTimeSinceUpdate(item.updated_at)}
              </span>
            </div>

            <div className="history-metadata">
              <div className="metadata-row">
                <span className="metadata-label">Created by:</span>
                <span className="metadata-value">{item.created_by}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Created:</span>
                <span className="metadata-value">{formatDate(item.created_at)}</span>
              </div>
              {item.updated_at !== item.created_at && (
                <div className="metadata-row">
                  <span className="metadata-label">Updated:</span>
                  <span className="metadata-value">{formatDate(item.updated_at)}</span>
                </div>
              )}
            </div>

            <button
              className="btn-open"
              onClick={(e) => {
                e.stopPropagation()
                onHistorySelect(item)
              }}
            >
              Open →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoryList
