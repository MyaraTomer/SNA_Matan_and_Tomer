import DraggableContainer from './DraggableContainer'
import './FilterPanel.css'

function FilterPanel({ 
  hideIrrelevant, 
  setHideIrrelevant, 
  aggregateNames, 
  setAggregateNames,
  physicsEnabled,
  setPhysicsEnabled
}) {
  const handleToggle = (setter, value, name) => {
    console.log(`Toggle ${name}: ${!value}`)
    setter(!value)
  }
  
  return (
    <DraggableContainer
      title="Filters"
      initialPosition={{ x: window.innerWidth - 240, y: window.innerHeight - 200, position: 'absolute' }}
    >
      <div className="filter-content">
        <div className="toggle-row">
        <span className="toggle-label">Hide Irrelevant</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={hideIrrelevant}
            onChange={() => handleToggle(setHideIrrelevant, hideIrrelevant, 'Hide Irrelevant')}
          />
          <span className="slider"></span>
        </label>
      </div>
      
      <div className="toggle-row">
        <span className="toggle-label">Aggregate Names</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={aggregateNames}
            onChange={() => handleToggle(setAggregateNames, aggregateNames, 'Aggregate Names')}
          />
          <span className="slider"></span>
        </label>
      </div>
      
      <div className="toggle-row">
        <span className="toggle-label">Disable Physics</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={!physicsEnabled}
            onChange={() => handleToggle(setPhysicsEnabled, physicsEnabled, 'Physics')}
          />
          <span className="slider"></span>
        </label>
      </div>
      </div>
    </DraggableContainer>
  )
}

export default FilterPanel
