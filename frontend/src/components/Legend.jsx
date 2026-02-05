import DraggableContainer from './DraggableContainer'
import './Legend.css'

function Legend({ groups, disabledGroups, toggleGroup }) {
  console.log('Rendering Legend with groups:', Object.keys(groups))
  
  return (
    <DraggableContainer 
      title="Groups"
      initialPosition={{ x: 20, y: 20, position: 'absolute' }}
    >
      <div className="legend-content">
        {Object.entries(groups).map(([groupName, color]) => (
          <div
            key={groupName}
            className={`legend-item ${disabledGroups.has(groupName) ? 'disabled' : ''}`}
            onClick={() => toggleGroup(groupName)}
          >
            <div 
              className="legend-color" 
              style={{ background: color }}
            />
            <span>{groupName}</span>
          </div>
        ))}
      </div>
    </DraggableContainer>
  )
}

export default Legend
