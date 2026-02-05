import { useState, useRef, useEffect } from 'react'
import './SearchBox.css'

function SearchBox({ data, aggregateNames, onNodeSelect }) {
  const [searchValue, setSearchValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const inputRef = useRef(null)
  
  useEffect(() => {
    if (!searchValue || !data) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    const query = searchValue.toLowerCase()
    const matches = aggregateNames ? {} : []
    
    // Search through nodes
    data.nodes.forEach(node => {
      const nameMatch = node.name.toLowerCase().includes(query)
      const idMatch = node.id.toLowerCase().includes(query)
      const labelMatch = node.label.toLowerCase().includes(query)
      
      if (nameMatch || idMatch || labelMatch) {
        if (aggregateNames) {
          // Aggregated mode - group by name
          const key = node.name !== 'Unknown' ? node.name : node.id
          if (!matches[key]) {
            matches[key] = {
              name: key,
              ids: new Set(),
              nodeId: node.id
            }
          }
          matches[key].ids.add(node.id)
        } else {
          // Non-aggregated mode - show each PSTN separately
          matches.push({
            name: node.name !== 'Unknown' ? `${node.name}` : 'Unknown',
            ids: new Set([node.id]),
            nodeId: node.id,
            displayName: node.name !== 'Unknown' ? `${node.name} (${node.id})` : node.id
          })
        }
      }
    })
    
    const suggestionsList = aggregateNames 
      ? Object.values(matches).slice(0, 8)
      : matches.slice(0, 8)
      
    setSuggestions(suggestionsList)
    setShowSuggestions(suggestionsList.length > 0)
    setSelectedIndex(-1)
    
  }, [searchValue, data, aggregateNames])
  
  // Handle Ctrl+F to show/hide search
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsVisible(prev => !prev)
        if (!isVisible) {
          setTimeout(() => inputRef.current?.focus(), 100)
        }
      }
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false)
        handleClear()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isVisible])
  
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch()
      }
      if (e.key === 'Escape') {
        setIsVisible(false)
        handleClear()
      }
      return
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0) {
        selectSuggestion(suggestions[selectedIndex])
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }
  
  const selectSuggestion = (suggestion) => {
    console.log(`Selected: ${suggestion.name} (ID: ${suggestion.nodeId})`)
    setSearchValue(suggestion.name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    onNodeSelect(suggestion.nodeId)
  }
  
  const handleSearch = () => {
    if (!searchValue || !data) return
    
    const query = searchValue.toLowerCase()
    const node = data.nodes.find(n => 
      n.id.toLowerCase() === query || 
      n.label.toLowerCase() === query ||
      n.name.toLowerCase() === query
    )
    
    if (node) {
      console.log(`Search: Found node ${node.id}`)
      onNodeSelect(node.id)
    } else {
      console.log(`Search: No match for "${searchValue}"`)
    }
  }
  
  const handleClear = () => {
    console.log('Clear search')
    setSearchValue('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    if (searchValue) {
      onNodeSelect(null)
    }
  }
  
  if (!isVisible) {
    return (
      <div 
        className="search-trigger"
        onClick={() => setIsVisible(true)}
        title="Click or press Ctrl+F to search"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
    )
  }
  
  return (
    <div className="search-floating">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search Name or PSTN... (Esc to close)"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoFocus
        />
        {searchValue && (
          <button 
            className="search-clear-btn" 
            onClick={handleClear}
            title="Clear"
          >
            ×
          </button>
        )}
        <button 
          className="search-close-btn" 
          onClick={() => {
            setIsVisible(false)
            handleClear()
          }}
          title="Close (Esc)"
        >
          ×
        </button>
      
        {showSuggestions && (
          <div className="suggestion-box">
            {suggestions.map((suggestion, index) => {
              const idsArray = Array.from(suggestion.ids)
              
              if (aggregateNames) {
                // Aggregated mode - show name with all PSTNs
                const pstnDisplay = idsArray.slice(0, 2).join(', ') + 
                  (idsArray.length > 2 ? `... +${idsArray.length - 2}` : '')
                
                return (
                  <div
                    key={suggestion.nodeId}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <strong>{suggestion.name}</strong>
                    <br />
                    <span style={{ color: '#666', fontSize: '11px' }}>
                      {pstnDisplay}
                    </span>
                  </div>
                )
              } else {
                // Non-aggregated mode - show each PSTN separately
                return (
                  <div
                    key={suggestion.nodeId}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <strong>{suggestion.displayName || suggestion.name}</strong>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchBox
