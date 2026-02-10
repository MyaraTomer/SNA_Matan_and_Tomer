import { useState } from 'react'
import './SearchForm.css'

const SearchForm = ({ projectId, userName, onSearchSubmit }) => {
  const [searchName, setSearchName] = useState('')
  const [inputMode, setInputMode] = useState('manual') // 'manual' or 'excel'
  
  // Manual input state
  const [groups, setGroups] = useState([{ name: '', members: [{ pstn: '', name: '' }] }])
  
  // Excel upload state
  const [excelFiles, setExcelFiles] = useState([])
  
  // Time range state
  const [timeMode, setTimeMode] = useState('relative') // 'relative' or 'absolute'
  const [relativeTime, setRelativeTime] = useState({ value: 1, unit: 'week' })
  const [absoluteTime, setAbsoluteTime] = useState({
    from: '',
    to: new Date().toISOString().split('T')[0]
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Add new group
  const handleAddGroup = () => {
    setGroups([...groups, { name: '', members: [{ pstn: '', name: '' }] }])
  }

  // Remove group
  const handleRemoveGroup = (groupIndex) => {
    setGroups(groups.filter((_, i) => i !== groupIndex))
  }

  // Update group name
  const handleGroupNameChange = (groupIndex, name) => {
    const newGroups = [...groups]
    newGroups[groupIndex].name = name
    setGroups(newGroups)
  }

  // Add member to group
  const handleAddMember = (groupIndex) => {
    const newGroups = [...groups]
    newGroups[groupIndex].members.push({ pstn: '', name: '' })
    setGroups(newGroups)
  }

  // Remove member from group
  const handleRemoveMember = (groupIndex, memberIndex) => {
    const newGroups = [...groups]
    newGroups[groupIndex].members = newGroups[groupIndex].members.filter((_, i) => i !== memberIndex)
    setGroups(newGroups)
  }

  // Update member
  const handleMemberChange = (groupIndex, memberIndex, field, value) => {
    const newGroups = [...groups]
    newGroups[groupIndex].members[memberIndex][field] = value
    setGroups(newGroups)
  }

  // Handle Excel file upload
  const handleExcelUpload = (e) => {
    const files = Array.from(e.target.files)
    setExcelFiles(files)
  }

  // Calculate absolute time range from relative
  const getTimeRange = () => {
    if (timeMode === 'absolute') {
      return {
        from: new Date(absoluteTime.from).toISOString(),
        to: new Date(absoluteTime.to).toISOString()
      }
    } else {
      const now = new Date()
      const from = new Date(now)
      
      switch (relativeTime.unit) {
        case 'day':
          from.setDate(from.getDate() - relativeTime.value)
          break
        case 'week':
          from.setDate(from.getDate() - (relativeTime.value * 7))
          break
        case 'month':
          from.setMonth(from.getMonth() - relativeTime.value)
          break
        case 'year':
          from.setFullYear(from.getFullYear() - relativeTime.value)
          break
      }
      
      return {
        from: from.toISOString(),
        to: now.toISOString()
      }
    }
  }

  // Submit search
  const handleSubmit = async () => {
    // Validation
    if (!searchName.trim()) {
      setError('Please enter a search name')
      return
    }

    let groupsData = []

    if (inputMode === 'manual') {
      // Validate manual input
      const validGroups = groups.filter(g => g.name.trim())
      if (validGroups.length === 0) {
        setError('Please add at least one group with a name')
        return
      }

      // Convert to API format - array of Group objects
      groupsData = validGroups.map(group => {
        const validMembers = group.members.filter(m => m.pstn.trim())
        return {
          name: group.name.trim(),
          members: validMembers.map(m => ({
            pstn: m.pstn.trim(),
            name: m.name.trim() || 'Unknown'
          }))
        }
      }).filter(g => g.members.length > 0)

      if (groupsData.length === 0) {
        setError('Please add at least one member to your groups')
        return
      }
    } else {
      // Excel mode - will be handled by backend
      if (excelFiles.length === 0) {
        setError('Please upload at least one Excel file')
        return
      }
      // For now, set empty groups as Excel files will be processed by backend
      groupsData = []
    }

    const timeRange = getTimeRange()

    const searchRequest = {
      project_id: projectId,
      username: userName,
      search_name: searchName.trim(),
      groups: groupsData,
      time_range: timeRange
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create search')
      }

      const result = await response.json()
      onSearchSubmit(result)
    } catch (err) {
      console.error('Error creating search:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="search-form">
      <h2>Create New Search</h2>

      {error && (
        <div className="form-error">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {/* Search Name */}
      <div className="form-section">
        <label className="form-label">Search Name *</label>
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="e.g., Investigation Alpha - Week 1"
          className="form-input"
        />
      </div>

      {/* Input Mode Selection */}
      <div className="form-section">
        <label className="form-label">Group Input Method</label>
        <div className="input-mode-tabs">
          <button
            className={`input-mode-tab ${inputMode === 'manual' ? 'active' : ''}`}
            onClick={() => setInputMode('manual')}
          >
            Manual Entry
          </button>
          <button
            className={`input-mode-tab ${inputMode === 'excel' ? 'active' : ''}`}
            onClick={() => setInputMode('excel')}
          >
            Excel Upload
          </button>
        </div>
      </div>

      {/* Manual Input */}
      {inputMode === 'manual' && (
        <div className="form-section">
          <label className="form-label">Groups</label>
          <div className="groups-container">
            {groups.map((group, groupIndex) => (
              <div key={groupIndex} className="group-card">
                <div className="group-header">
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => handleGroupNameChange(groupIndex, e.target.value)}
                    placeholder="Group Name (e.g., Group A)"
                    className="group-name-input"
                  />
                  {groups.length > 1 && (
                    <button
                      onClick={() => handleRemoveGroup(groupIndex)}
                      className="btn-remove-group"
                      title="Remove group"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="members-list">
                  {group.members.map((member, memberIndex) => (
                    <div key={memberIndex} className="member-row">
                      <input
                        type="text"
                        value={member.pstn}
                        onChange={(e) => handleMemberChange(groupIndex, memberIndex, 'pstn', e.target.value)}
                        placeholder="PSTN (e.g., 5077788899)"
                        className="member-input pstn-input"
                      />
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleMemberChange(groupIndex, memberIndex, 'name', e.target.value)}
                        placeholder="Name (optional)"
                        className="member-input name-input"
                      />
                      {group.members.length > 1 && (
                        <button
                          onClick={() => handleRemoveMember(groupIndex, memberIndex)}
                          className="btn-remove-member"
                          title="Remove member"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddMember(groupIndex)}
                  className="btn-add-member"
                >
                  + Add Member
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleAddGroup} className="btn-add-group">
            + Add Group
          </button>
        </div>
      )}

      {/* Excel Upload */}
      {inputMode === 'excel' && (
        <div className="form-section">
          <label className="form-label">Upload Excel Files</label>
          <p className="form-help">
            Upload one or more Excel files. Each file should have 'PSTN' and 'Name' columns.
            The filename will be used as the group name.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleExcelUpload}
            className="file-input"
          />
          {excelFiles.length > 0 && (
            <div className="uploaded-files">
              {excelFiles.map((file, index) => (
                <div key={index} className="file-item">
                  📄 {file.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Time Range */}
      <div className="form-section">
        <label className="form-label">Time Range</label>
        <div className="time-mode-tabs">
          <button
            className={`time-mode-tab ${timeMode === 'relative' ? 'active' : ''}`}
            onClick={() => setTimeMode('relative')}
          >
            Relative
          </button>
          <button
            className={`time-mode-tab ${timeMode === 'absolute' ? 'active' : ''}`}
            onClick={() => setTimeMode('absolute')}
          >
            Specific Dates
          </button>
        </div>

        {timeMode === 'relative' ? (
          <div className="relative-time">
            <span>Last</span>
            <input
              type="number"
              min="1"
              value={relativeTime.value}
              onChange={(e) => setRelativeTime({ ...relativeTime, value: parseInt(e.target.value) || 1 })}
              className="time-value-input"
            />
            <select
              value={relativeTime.unit}
              onChange={(e) => setRelativeTime({ ...relativeTime, unit: e.target.value })}
              className="time-unit-select"
            >
              <option value="day">Day(s)</option>
              <option value="week">Week(s)</option>
              <option value="month">Month(s)</option>
              <option value="year">Year(s)</option>
            </select>
          </div>
        ) : (
          <div className="absolute-time">
            <div className="date-input-group">
              <label>From:</label>
              <input
                type="date"
                value={absoluteTime.from}
                onChange={(e) => setAbsoluteTime({ ...absoluteTime, from: e.target.value })}
                className="date-input"
              />
            </div>
            <div className="date-input-group">
              <label>To:</label>
              <input
                type="date"
                value={absoluteTime.to}
                onChange={(e) => setAbsoluteTime({ ...absoluteTime, to: e.target.value })}
                className="date-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-submit"
      >
        {loading ? 'Creating Search...' : 'Create Search'}
      </button>
    </div>
  )
}

export default SearchForm
