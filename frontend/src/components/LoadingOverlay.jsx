import './LoadingOverlay.css'

function LoadingOverlay({ visible }) {
  if (!visible) return null
  
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
    </div>
  )
}

export default LoadingOverlay
