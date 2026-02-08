import { useState, useRef, useEffect } from 'react'
import { DEFAULT_FILTERS } from '../utils/dataFilters'
import './DataFilterPanel.css'

function DataFilterPanel({ filters, onFiltersChange, isOpen, onOpenChange, groups = {} }) {
  const [minConnections, setMinConnections] = useState(filters.minConnections)
  const [minWeight, setMinWeight] = useState(filters.minWeight)
  const [keywordChips, setKeywordChips] = useState(Array.isArray(filters.keywords) ? [...filters.keywords] : (filters.keyword ? filters.keyword.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : []))
  const [keywordInput, setKeywordInput] = useState('')
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editingValue, setEditingValue] = useState('')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState(
    Array.isArray(filters.selectedGroups) && filters.selectedGroups.length === 1 ? filters.selectedGroups[0] : null
  )
  const panelRef = useRef(null)
  const editInputRef = useRef(null)

  useEffect(() => {
    setMinConnections(filters.minConnections)
    setMinWeight(filters.minWeight)
    setKeywordChips(Array.isArray(filters.keywords) ? [...filters.keywords] : (filters.keyword ? filters.keyword.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : []))
    setSelectedGroupFilter(Array.isArray(filters.selectedGroups) && filters.selectedGroups.length === 1 ? filters.selectedGroups[0] : (filters.selectedGroups?.length ? filters.selectedGroups[0] : null))
  }, [filters.minConnections, filters.minWeight, filters.keywords, filters.keyword, filters.selectedGroups])

  const wrapperRef = useRef(null)
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) onOpenChange(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onOpenChange])

  useEffect(() => {
    if (editingIndex >= 0 && editInputRef.current) editInputRef.current.focus()
  }, [editingIndex])

  const commitFilters = () => {
    const minConn = minConnections === '' || minConnections == null ? 0 : Math.max(0, Number(minConnections))
    const minW = minWeight === '' || minWeight == null ? 1 : Math.max(1, Number(minWeight))
    onFiltersChange({
      minConnections: minConn,
      minWeight: minW,
      keywords: keywordChips.filter(Boolean),
      selectedGroups: selectedGroupFilter ? [selectedGroupFilter] : []
    })
  }

  const getCurrentKeywords = () => {
    if (editingIndex < 0) return keywordChips
    const next = [...keywordChips]
    if (editingValue.trim()) next[editingIndex] = editingValue.trim()
    else next.splice(editingIndex, 1)
    return next
  }

  const handleApply = () => {
    const finalChips = getCurrentKeywords()
    if (editingIndex >= 0) {
      setKeywordChips(finalChips)
      setEditingIndex(-1)
      setEditingValue('')
    }
    const minConn = minConnections === '' || minConnections == null ? 0 : Math.max(0, Number(minConnections))
    const minW = minWeight === '' || minWeight == null ? 1 : Math.max(1, Number(minWeight))
    onFiltersChange({
      minConnections: minConn,
      minWeight: minW,
      keywords: finalChips.filter(Boolean),
      selectedGroups: selectedGroupFilter ? [selectedGroupFilter] : []
    })
    onOpenChange(false)
  }

  const handleReset = () => {
    setMinConnections(DEFAULT_FILTERS.minConnections)
    setMinWeight(DEFAULT_FILTERS.minWeight)
    setKeywordChips(DEFAULT_FILTERS.keywords || [])
    setKeywordInput('')
    setEditingIndex(-1)
    setSelectedGroupFilter(null)
    onFiltersChange({ ...DEFAULT_FILTERS })
  }

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = keywordInput.trim()
      if (v && !keywordChips.includes(v)) {
        setKeywordChips((prev) => [...prev, v])
        setKeywordInput('')
      }
    }
  }

  const removeChip = (index) => {
    setKeywordChips((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(-1)
    else if (editingIndex > index) setEditingIndex((i) => i - 1)
  }

  const startEditChip = (index) => {
    setEditingIndex(index)
    setEditingValue(keywordChips[index] || '')
  }

  const finishEditChip = () => {
    if (editingIndex < 0) return
    const v = editingValue.trim()
    const next = [...keywordChips]
    if (v) {
      next[editingIndex] = v
      setKeywordChips(next)
    } else {
      next.splice(editingIndex, 1)
      setKeywordChips(next)
    }
    setEditingIndex(-1)
    setEditingValue('')
  }

  const toggleGroupFilter = (groupName) => {
    setSelectedGroupFilter((prev) => (prev === groupName ? null : groupName))
  }

  const hasActiveFilters =
    (filters.minConnections || 0) > 0 ||
    (filters.minWeight || 0) > 1 ||
    (Array.isArray(filters.keywords) && filters.keywords.length > 0) ||
    (filters.keyword || '').trim().length > 0 ||
    (Array.isArray(filters.selectedGroups) && filters.selectedGroups.length > 0)

  const groupEntries = Object.entries(groups).filter(([name]) => name !== 'Unknown')

  return (
    <div ref={wrapperRef} className="data-filter-wrapper">
      <button
        type="button"
        className={`data-filter-trigger ${isOpen ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
        onClick={() => onOpenChange(!isOpen)}
        title="Filter by connections, weight, and keywords"
        aria-label="Open filters"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {hasActiveFilters && <span className="data-filter-badge" aria-hidden />}
      </button>

      {isOpen && (
        <div ref={panelRef} className="data-filter-panel">
          <div className="data-filter-panel-header">
            <span className="data-filter-panel-title">Filters</span>
          </div>
          <div className="data-filter-panel-body">
            <label className="data-filter-label">
              Minimum connections
              <input
                type="number"
                min={0}
                value={minConnections}
                onChange={(e) => {
                  const v = e.target.value
                  setMinConnections(v === '' ? '' : Math.max(0, parseInt(v, 10) || 0))
                }}
                placeholder="0"
                className="data-filter-input"
              />
              <span className="data-filter-hint">Profiles with fewer are hidden</span>
            </label>

            <label className="data-filter-label">
              Minimum connection weight
              <input
                type="number"
                min={1}
                value={minWeight}
                onChange={(e) => {
                  const v = e.target.value
                  setMinWeight(v === '' ? '' : Math.max(1, parseInt(v, 10) || 1))
                }}
                placeholder="1"
                className="data-filter-input"
              />
              <span className="data-filter-hint">1+ calls (0 = no connection)</span>
            </label>

            <div className="data-filter-label">
              <span className="data-filter-group-title">Keywords in connections</span>
              <span className="data-filter-hint">Press Enter to add; profile must match at least one</span>
              <div className="data-filter-keyword-chips">
                {keywordChips.map((chip, index) => (
                  <div key={`${chip}-${index}`} className="data-filter-chip-wrap">
                    {editingIndex === index ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        className="data-filter-chip-input"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={finishEditChip}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEditChip()
                          if (e.key === 'Escape') {
                            setEditingIndex(-1)
                            setEditingValue('')
                          }
                        }}
                      />
                    ) : (
                      <span
                        className="data-filter-chip"
                        onDoubleClick={() => startEditChip(index)}
                        title="Double-click to edit"
                      >
                        {chip}
                      </span>
                    )}
                    <button
                      type="button"
                      className="data-filter-chip-remove"
                      onClick={() => removeChip(index)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  className="data-filter-keyword-input"
                  placeholder="Type word and press Enter"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
              </div>
            </div>

            <div className="data-filter-label">
              <span className="data-filter-group-title">Filter by group</span>
              <span className="data-filter-hint">Click a circle to show only that group; click × for all</span>
              <div className="data-filter-group-circles">
                <div
                  className={`data-filter-circle data-filter-circle-reset ${!selectedGroupFilter ? 'active' : ''}`}
                  title="Show all groups"
                  onClick={() => setSelectedGroupFilter(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedGroupFilter(null) } }}
                >
                  ×
                </div>
                {groupEntries.map(([groupName, color]) => (
                  <div
                    key={groupName}
                    className={`data-filter-circle ${selectedGroupFilter === groupName ? 'active' : ''}`}
                    style={{ background: color }}
                    title={`Show only: ${groupName}`}
                    onClick={() => toggleGroupFilter(groupName)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroupFilter(groupName) } }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="data-filter-panel-footer">
            <button type="button" className="data-filter-btn data-filter-reset" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="data-filter-btn data-filter-apply" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataFilterPanel
