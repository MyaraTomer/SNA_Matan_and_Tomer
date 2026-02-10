import { useState, useEffect, useMemo } from 'react'
import ProjectSelector from './components/ProjectSelector'
import LandingPage from './components/LandingPage'
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
  // App state
  const [currentView, setCurrentView] = useState('project-selection') // 'project-selection', 'landing', 'network'
  const [selectedProject, setSelectedProject] = useState(null)
  const [currentSearch, setCurrentSearch] = useState(null)
  
  // Data state
  const [networkData, setNetworkData] = useState(null)
  const [loading, setLoading] = useState(false)
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
  
  // Check for stored project on mount
  useEffect(() => {
    const storedProjectId = localStorage.getItem('sna_current_project_id')
    if (storedProjectId) {
      // Auto-load last project
      fetch(`/api/projects`)
        .then(res => res.json())
        .then(projects => {
          const project = projects.find(p => p.id === parseInt(storedProjectId))
          if (project) {
            handleProjectSelect(project)
          }
        })
        .catch(err => console.error('Failed to load stored project:', err))
    }
  }, [])
  
  const handleProjectSelect = (project) => {
    console.log('Project selected:', project)
    setSelectedProject(project)
    localStorage.setItem('sna_current_project_id', project.id)
    setCurrentView('landing')
  }

  const handleChangeProject = () => {
    setCurrentView('project-selection')
    setSelectedProject(null)
    setCurrentSearch(null)
    setNetworkData(null)
  }

  const handleSearchStart = async (searchData) => {
    console.log('Search started:', searchData)
    setCurrentSearch(searchData)
    setLoading(true)
    setError(null)
    setCurrentView('network')

    try {
      let data
      if (searchData.isHistory) {
        // Load existing search from history
        const response = await fetch(`/api/searches/${searchData.historyId}`)
        if (!response.ok) {
          throw new Error('Failed to load search')
        }
        const result = await response.json()
        data = result.data  // API returns 'data' not 'network_data'
      } else {
        // New search was already created, use the returned data
        data = searchData.data  // API returns 'data' not 'network_data'
      }

      if (!data || !data.nodes || !data.edges) {
        throw new Error('Invalid network data received')
      }

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
      // Go back to landing on error
      setCurrentView('landing')
    }
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
    setNetworkData(null)
    setCurrentSearch(null)
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
  
  // Show project selector
  if (currentView === 'project-selection') {
    return <ProjectSelector onProjectSelect={handleProjectSelect} />
  }

  // Show landing page
  if (currentView === 'landing') {
    return (
      <LandingPage
        project={selectedProject}
        onSearchStart={handleSearchStart}
        onChangeProject={handleChangeProject}
      />
    )
  }

  // Network view - show loading/error states
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
          onClick={handleBackToLanding}
          style={{
            padding: '10px 20px',
            background: '#4361EE',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            marginRight: '10px'
          }}
        >
          Back to Landing
        </button>
        <button 
          onClick={() => handleSearchStart(currentSearch)}
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
      </div>
    )
  }
  
  if (!filteredData) {
    return <div>No data available</div>
  }

  // Network visualization view
  return (
    <div className="app">
      <div className="app-header" style={{ 
        padding: '1rem 2rem', 
        background: 'white', 
        borderBottom: '2px solid #e1e8ed',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button 
          onClick={handleBackToLanding}
          style={{
            padding: '0.5rem 1rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ← Back to Landing
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#657786', fontSize: '0.9rem' }}>
            {selectedProject?.name}
          </div>
          {currentSearch?.name && (
            <div style={{ color: '#2c3e50', fontWeight: '600' }}>
              {currentSearch.name}
            </div>
          )}
        </div>
      </div>
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
