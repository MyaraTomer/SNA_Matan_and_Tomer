import { useState, useEffect, useMemo } from 'react'
import NetworkGraph from './components/NetworkGraph'
import Legend from './components/Legend'
import InterestList from './components/InterestList'
import SearchBox from './components/SearchBox'
import FilterPanel from './components/FilterPanel'
import DataFilterPanel from './components/DataFilterPanel'
import Toast from './components/Toast'
import LoadingOverlay from './components/LoadingOverlay'
import { applyDataFilters, DEFAULT_FILTERS } from './utils/dataFilters'
import './App.css'

function App() {
  // Data state
  const [networkData, setNetworkData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // UI state
  const [disabledGroups, setDisabledGroups] = useState(new Set())
  const [aggregateNames, setAggregateNames] = useState(false)
  const [physicsEnabled, setPhysicsEnabled] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [highlightWords, setHighlightWords] = useState([]) // keywords to highlight in connections
  const [dataFilters, setDataFilters] = useState({ ...DEFAULT_FILTERS })
  const [dataFilterPanelOpen, setDataFilterPanelOpen] = useState(false)

  // Apply min connections / weight / keyword filters to get data for graph, legend, list, search
  const filteredData = useMemo(
    () => (networkData ? applyDataFilters(networkData, dataFilters) : null),
    [networkData, dataFilters]
  )
  // Legend: only groups that have at least one node in filtered data
  const legendGroups = useMemo(() => {
    if (!filteredData?.groups || !filteredData?.nodes?.length) return filteredData?.groups ?? {}
    const present = new Set(filteredData.nodes.map((n) => n.group))
    return Object.fromEntries(
      Object.entries(filteredData.groups).filter(([name]) => present.has(name))
    )
  }, [filteredData])
  
  // Load network data on mount
  useEffect(() => {
    console.log('='.repeat(60))
    console.log('APP INITIALIZING')
    console.log('='.repeat(60))
    
    fetchNetworkData()
  }, [])
  
  const fetchNetworkData = async () => {
    try {
      console.log('Fetching network data from API...')
      const response = await fetch('/api/network')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✓ Network data loaded successfully')
      console.log(`  Nodes: ${data.nodes.length}`)
      console.log(`  Edges: ${data.edges.length}`)
      console.log(`  Groups: ${Object.keys(data.groups).length}`)
      
      setNetworkData(data)
      setLoading(false)
    } catch (err) {
      console.error('✗ Error loading network data:', err)
      setError(err.message)
      setLoading(false)
    }
  }
  
  const showToast = (message) => {
    console.log(`Toast: ${message}`)
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), 2000)
  }
  
  const toggleGroup = (groupName) => {
    console.log(`Toggle group: ${groupName}`)
    setDisabledGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
        console.log(`  → Enabled group: ${groupName}`)
      } else {
        newSet.add(groupName)
        console.log(`  → Disabled group: ${groupName}`)
      }
      return newSet
    })
  }
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingOverlay visible={true} />
        <div style={{ fontSize: '18px', color: '#666' }}>Loading network data...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}>
        <h2 style={{ color: '#e63946', marginBottom: '10px' }}>Error Loading Data</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
        <button 
          onClick={fetchNetworkData}
          style={{
            padding: '10px 20px',
            background: '#4361EE',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Retry
        </button>
        <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', maxWidth: '600px' }}>
          <h3>Troubleshooting:</h3>
          <ul style={{ textAlign: 'left', marginTop: '10px' }}>
            <li>Make sure the backend server is running (port 8000)</li>
            <li>Ensure Excel files exist in the data/ folder</li>
            <li>Check backend logs for errors</li>
          </ul>
        </div>
      </div>
    )
  }
  
  return (
    <div className="app">
      <NetworkGraph 
        data={filteredData}
        disabledGroups={disabledGroups}
        aggregateNames={aggregateNames}
        physicsEnabled={physicsEnabled}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        highlightWords={highlightWords}
        showToast={showToast}
      />
      
      <Legend 
        groups={legendGroups}
        disabledGroups={disabledGroups}
        toggleGroup={toggleGroup}
      />
      
      <InterestList 
        data={filteredData}
        disabledGroups={disabledGroups}
        aggregateNames={aggregateNames}
        onNodeClick={setSelectedNode}
      />

      <SearchBox 
        data={filteredData}
        aggregateNames={aggregateNames}
        onNodeSelect={setSelectedNode}
        onHighlightWords={setHighlightWords}
        highlightWords={highlightWords}
      />

      <DataFilterPanel
        filters={dataFilters}
        onFiltersChange={setDataFilters}
        isOpen={dataFilterPanelOpen}
        onOpenChange={setDataFilterPanelOpen}
        groups={networkData?.groups ?? {}}
      />

      <FilterPanel 
        aggregateNames={aggregateNames}
        setAggregateNames={setAggregateNames}
        physicsEnabled={physicsEnabled}
        setPhysicsEnabled={setPhysicsEnabled}
      />
      
      <Toast message={toastMessage} />
    </div>
  )
}

export default App
