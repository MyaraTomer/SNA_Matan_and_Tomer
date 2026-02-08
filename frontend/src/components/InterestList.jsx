import { useState, useEffect, useMemo } from 'react'
import DraggableContainer from './DraggableContainer'
import './InterestList.css'

function InterestList({ data, disabledGroups, aggregateNames, onNodeClick }) {
  const [activeFilter, setActiveFilter] = useState(null)
  
  // Calculate scores for nodes based on their connections
  const scores = useMemo(() => {
    if (!data) return []
    
    console.log('Calculating interest scores...')
    console.log(`  Aggregation: ${aggregateNames ? 'ON' : 'OFF'}`)
    
    let nodesToScore = data.nodes
    let edgesToUse = data.edges
    
    // If aggregation is enabled, create aggregated view
    if (aggregateNames) {
      // Group nodes by name
      const nameGroups = {}
      data.nodes.forEach(node => {
        const name = node.name
        if (!nameGroups[name]) nameGroups[name] = []
        nameGroups[name].push(node)
      })
      
      // Create PSTN to primary mapping
      const pstnToPrimary = {}
      Object.entries(nameGroups).forEach(([name, nodes]) => {
        if (name === 'Unknown') {
          nodes.forEach(node => { pstnToPrimary[node.id] = node.id })
        } else if (nodes.length > 1) {
          const primaryId = nodes[0].id
          nodes.forEach(node => { pstnToPrimary[node.id] = primaryId })
        } else {
          pstnToPrimary[nodes[0].id] = nodes[0].id
        }
      })
      
      // Build aggregated nodes list
      const aggregatedNodes = []
      Object.entries(nameGroups).forEach(([name, nodes]) => {
        if (name === 'Unknown') {
          // Keep all unknown nodes separate
          nodes.forEach(node => aggregatedNodes.push(node))
        } else if (nodes.length === 1) {
          // Single node
          aggregatedNodes.push(nodes[0])
        } else {
          // Multiple nodes - create aggregated node
          const primary = nodes[0]
          const groupIds = nodes.map(n => n.id)
          aggregatedNodes.push({
            ...primary,
            id: primary.id,
            label: name,
            name: name,
            aggregatedPSTNs: groupIds
          })
        }
      })
      
      // Build aggregated edges
      const edgeMap = new Map()
      data.edges.forEach(edge => {
        const fromPrimary = pstnToPrimary[edge.source] || edge.source
        const toPrimary = pstnToPrimary[edge.target] || edge.target
        
        // Skip self-loops
        if (fromPrimary === toPrimary) return
        
        // Create unique edge key (undirected)
        const edgeKey = [fromPrimary, toPrimary].sort().join('_')
        
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            source: fromPrimary,
            target: toPrimary,
            weight: 0,
            has_vector: false,
            vectorCount: 0
          })
        }
        
        const aggEdge = edgeMap.get(edgeKey)
        aggEdge.weight += edge.weight
        if (edge.has_vector) {
          aggEdge.has_vector = true
          aggEdge.vectorCount++
        }
      })
      
      nodesToScore = aggregatedNodes
      edgesToUse = Array.from(edgeMap.values())
      
      console.log(`  Aggregated: ${nodesToScore.length} nodes, ${edgesToUse.length} edges`)
    }
    
    const scoreMap = {}
    
    // Initialize scores for visible nodes
    nodesToScore.forEach(node => {
      // Skip if group is disabled
      if (disabledGroups.has(node.group)) return
      
      scoreMap[node.id] = {
        id: node.id,
        name: node.name,
        label: node.label,
        group: node.group,
        color: node.color,
        score: 0,
        red: 0,
        gray: 0
      }
    })
    
    // Calculate scores from edges
    edgesToUse.forEach(edge => {
      const sourceVisible = scoreMap[edge.source]
      const targetVisible = scoreMap[edge.target]
      
      if (!sourceVisible || !targetVisible) return
      
      const points = edge.has_vector ? 3 : 1
      
      // Add to source
      scoreMap[edge.source].score += points
      if (edge.has_vector) {
        scoreMap[edge.source].red++
      } else {
        scoreMap[edge.source].gray++
      }
      
      // Add to target
      scoreMap[edge.target].score += points
      if (edge.has_vector) {
        scoreMap[edge.target].red++
      } else {
        scoreMap[edge.target].gray++
      }
    })
    
    // Convert to array and filter by active filter
    let result = Object.values(scoreMap)
    
    if (activeFilter) {
      result = result.filter(item => item.group === activeFilter)
    }
    
    // Sort by score
    result.sort((a, b) => b.score - a.score)
    
    console.log(`✓ Calculated scores for ${result.length} nodes`)
    return result.slice(0, 15) // Top 15
    
  }, [data, disabledGroups, aggregateNames, activeFilter])
  
  const handleFilterClick = (groupName) => {
    console.log(`Interest filter: ${groupName}`)
    setActiveFilter(activeFilter === groupName ? null : groupName)
  }
  
  return (
    <DraggableContainer
      title="Interesting People (Live)"
      initialPosition={{ x: 20, y: 310, position: 'absolute' }}
      resizable={true}
      initialSize={{ width: 240, height: 280 }}
    >
      <div className="interest-filter-bar">
        <div 
          className={`filter-circle reset-filter ${!activeFilter ? 'active' : ''}`}
          title="Show All"
          onClick={() => handleFilterClick(null)}
        >
          ×
        </div>
        {data && Object.entries(data.groups).map(([groupName, color]) => (
          <div
            key={groupName}
            className={`filter-circle ${activeFilter === groupName ? 'active' : ''}`}
            style={{ background: color }}
            title={`Filter: ${groupName}`}
            onClick={() => handleFilterClick(groupName)}
          />
        ))}
      </div>
      
      <div className="interest-list">
        {scores.length === 0 ? (
          <div style={{ color: '#999', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
            No data matches filter
          </div>
        ) : (
          scores.map(item => (
            <div
              key={item.id}
              className="interest-item"
              onClick={() => onNodeClick(item.id)}
            >
              <div className="interest-left">
                <div 
                  className="legend-color" 
                  style={{ background: item.color }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="interest-name" title={item.label}>
                    {item.label}
                  </div>
                  <div className="interest-stats">
                    <span className="stat-badge stat-red">{item.red} red</span>
                    <span className="stat-badge stat-gray">{item.gray} gray</span>
                  </div>
                </div>
              </div>
              <div className="interest-score">{item.score}</div>
            </div>
          ))
        )}
      </div>
    </DraggableContainer>
  )
}

export default InterestList
