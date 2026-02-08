import { useState, useRef, useEffect } from 'react'
import './SearchBox.css'

function parseTerms(value) {
  if (!value || !String(value).trim()) return []
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function SearchBox({
  data,
  aggregateNames,
  onNodeSelect,
  onHighlightWords = () => {},
  highlightWords = []
}) {
  const [searchValue, setSearchValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!searchValue.trim() || !data) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const terms = parseTerms(searchValue).map((t) => t.toLowerCase())
    const personMatches = aggregateNames ? {} : new Map() // Map nodeId -> suggestion for non-aggregate

    terms.forEach((query) => {
      data.nodes.forEach((node) => {
        const nameMatch = node.name.toLowerCase().includes(query)
        const idMatch = node.id.toLowerCase().includes(query)
        const labelMatch = node.label.toLowerCase().includes(query)
        if (!nameMatch && !idMatch && !labelMatch) return

        if (aggregateNames) {
          const key = node.name !== 'Unknown' ? node.name : node.id
          if (!personMatches[key]) {
            personMatches[key] = {
              type: 'person',
              name: key,
              ids: new Set(),
              nodeId: node.id
            }
          }
          personMatches[key].ids.add(node.id)
        } else {
          if (!personMatches.has(node.id)) {
            personMatches.set(node.id, {
              type: 'person',
              name: node.name !== 'Unknown' ? node.name : 'Unknown',
              ids: new Set([node.id]),
              nodeId: node.id,
              displayName: node.name !== 'Unknown' ? `${node.name} (${node.id})` : node.id
            })
          }
        }
      })
    })

    const personList = aggregateNames ? Object.values(personMatches) : Array.from(personMatches.values())
    const personSuggestions = personList.slice(0, 6)

    let keywordSuggestion = null
    if (data.edges && terms.length > 0) {
      let count = 0
      data.edges.forEach((edge) => {
        const text = (edge.words && String(edge.words).toLowerCase()) || ''
        if (terms.some((t) => text.includes(t))) count++
      })
      if (count > 0) {
        keywordSuggestion = {
          type: 'keywords',
          terms: [...terms],
          count
        }
      }
    }

    const list = [...personSuggestions]
    if (keywordSuggestion) list.push(keywordSuggestion)

    setSuggestions(list)
    setShowSuggestions(list.length > 0)
    setSelectedIndex(-1)
  }, [searchValue, data, aggregateNames])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsVisible((prev) => !prev)
        if (!isVisible) setTimeout(() => inputRef.current?.focus(), 100)
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
      if (e.key === 'Enter') handleSearch()
      if (e.key === 'Escape') {
        setIsVisible(false)
        handleClear()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
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
    setShowSuggestions(false)
    setSelectedIndex(-1)
    if (suggestion.type === 'keywords') {
      onHighlightWords(suggestion.terms)
      onNodeSelect(null)
      setSearchValue(suggestion.terms.join(', '))
    } else {
      onNodeSelect(suggestion.nodeId)
      onHighlightWords([])
      setSearchValue(suggestion.name)
    }
  }

  const handleSearch = () => {
    if (!searchValue.trim() || !data) return
    const terms = parseTerms(searchValue).map((t) => t.toLowerCase())
    const first = terms[0]
    const node = data.nodes.find(
      (n) =>
        n.id.toLowerCase() === first ||
        n.label.toLowerCase() === first ||
        n.name.toLowerCase() === first
    )
    if (node) {
      onNodeSelect(node.id)
      onHighlightWords([])
      return
    }
    const count = data.edges.filter((edge) => {
      const text = (edge.words && String(edge.words).toLowerCase()) || ''
      return terms.some((t) => text.includes(t))
    }).length
    if (count > 0) {
      onHighlightWords(terms)
      onNodeSelect(null)
    }
  }

  const handleClear = () => {
    setSearchValue('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    onNodeSelect(null)
    onHighlightWords([])
  }

  if (!isVisible) {
    return (
      <div
        className="search-trigger"
        onClick={() => setIsVisible(true)}
        title="Search people or keywords (Ctrl+F)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
    )
  }

  return (
    <div className="search-floating">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Name, PSTN, or keywords (comma for multiple)"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoFocus
        />
        {searchValue && (
          <button className="search-clear-btn" onClick={handleClear} title="Clear">
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
              if (suggestion.type === 'keywords') {
                return (
                  <div
                    key="keywords"
                    className={`suggestion-item suggestion-item-keywords ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <strong>Highlight {suggestion.count} connection{suggestion.count !== 1 ? 's' : ''} with: {suggestion.terms.join(', ')}</strong>
                  </div>
                )
              }
              const idsArray = Array.from(suggestion.ids)
              if (aggregateNames) {
                const pstnDisplay = idsArray.slice(0, 2).join(', ') + (idsArray.length > 2 ? `... +${idsArray.length - 2}` : '')
                return (
                  <div
                    key={suggestion.nodeId}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <strong>{suggestion.name}</strong>
                    <br />
                    <span style={{ color: '#666', fontSize: '11px' }}>{pstnDisplay}</span>
                  </div>
                )
              }
              return (
                <div
                  key={suggestion.nodeId}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <strong>{suggestion.displayName || suggestion.name}</strong>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchBox
