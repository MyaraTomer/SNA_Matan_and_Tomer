import { useState, useRef, useEffect } from 'react'
import { GiClothespin } from 'react-icons/gi'
import './DraggableContainer.css'

function DraggableContainer({ 
  children, 
  initialPosition, 
  title,
  defaultPinned = false,
  resizable = false,
  initialSize = null
}) {
  const [position, setPosition] = useState(initialPosition)
  const [isPinned, setIsPinned] = useState(defaultPinned)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const dragStart = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    if (isDragging && !isPinned) {
      const handleMouseMove = (e) => {
        const deltaX = e.clientX - dragStart.current.x
        const deltaY = e.clientY - dragStart.current.y
        
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }))
        
        dragStart.current = { x: e.clientX, y: e.clientY }
      }
      
      const handleMouseUp = () => {
        setIsDragging(false)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isPinned])
  
  const handleMouseDown = (e) => {
    if (isPinned) return
    if (e.target.closest('.no-drag')) return // Don't drag if clicking on interactive elements
    
    // Don't drag if clicking in the resize area (bottom-right 20px)
    if (resizable && dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      
      // Check if click is in the resize zone (bottom-right corner)
      const isInResizeZone = 
        clickX > rect.width - 20 && 
        clickY > rect.height - 20
      
      if (isInResizeZone) {
        return // Don't start dragging, allow resize
      }
    }
    
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
  
  const togglePin = () => {
    setIsPinned(!isPinned)
    console.log(`${title} ${!isPinned ? 'pinned' : 'unpinned'}`)
  }
  
  const containerStyle = {
    position: initialPosition.position === 'fixed' ? 'fixed' : 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    cursor: isPinned ? 'default' : (isDragging ? 'grabbing' : 'grab'),
    ...(initialSize && {
      width: `${initialSize.width}px`,
      height: `${initialSize.height}px`
    })
  }
  
  return (
    <div 
      ref={dragRef}
      className={`draggable-container ui-container ${isPinned ? 'pinned' : ''} ${isDragging ? 'dragging' : ''} ${resizable ? 'resizable' : ''}`}
      style={containerStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="drag-header">
        <span className="drag-title">{title}</span>
        <button 
          className={`pin-button no-drag ${isPinned ? 'pinned' : ''}`}
          onClick={togglePin}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <GiClothespin size={18} style={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(-45deg)' }} />
        </button>
      </div>
      <div className="draggable-content no-drag">
        {children}
      </div>
    </div>
  )
}

export default DraggableContainer
