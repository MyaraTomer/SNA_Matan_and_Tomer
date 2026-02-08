import { useEffect, useRef, useState, useMemo } from 'react'
import { Network } from 'vis-network'
import './NetworkGraph.css'

function toVisNode(node) {
  return {
    id: node.id,
    label: node.label,
    title: node.name !== 'Unknown' ? `${node.name}\nPSTN: ${node.id}` : `Unknown\nPSTN: ${node.id}`,
    color: node.color,
    size: node.size,
    shape: 'dot',
    font: { size: 14, face: 'Inter' },
    nodeName: node.name,
    nodeGroup: node.group,
    relevant: node.relevant
  }
}

function toVisEdge(edge) {
  return {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    color: edge.color,
    title: edge.words ? `Calls: ${edge.weight}\nWords: ${edge.words}` : `Calls: ${edge.weight}`,
    width: Math.log(edge.weight + 1) * 1.5,
    value: edge.weight,
    smooth: false,
    originalWeight: edge.weight,
    vectorWords: edge.words || '',
    hasVector: edge.has_vector
  }
}

function NetworkGraph({
  data,
  disabledGroups,
  aggregateNames,
  physicsEnabled,
  selectedNode,
  setSelectedNode,
  highlightWords = [],
  showToast
}) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const [highlightActive, setHighlightActive] = useState(false)
  const originalStylesRef = useRef({ nodes: new Map(), edges: new Map() })
  const allNodesRef = useRef([])
  const allEdgesRef = useRef([])

  // Compute display data once: either raw or pre-aggregated. This avoids creating the
  // network with full data and then mutating it (which caused ghost nodes when clearing filters).
  const displayData = useMemo(() => {
    if (!data || !data.nodes || !data.edges) return null
    const nodes = data.nodes.map(toVisNode)
    const edges = data.edges.map(toVisEdge)
    if (!aggregateNames) return { nodes, edges }

    const nameGroups = {}
    nodes.forEach((node) => {
      const name = node.nodeName || 'Unknown'
      if (!nameGroups[name]) nameGroups[name] = []
      nameGroups[name].push(node)
    })
    const pstnToPrimary = {}
    Object.entries(nameGroups).forEach(([name, groupNodes]) => {
      if (name === 'Unknown') {
        groupNodes.forEach((n) => { pstnToPrimary[n.id] = n.id })
      } else if (groupNodes.length > 1) {
        const primaryId = groupNodes[0].id
        groupNodes.forEach((n) => { pstnToPrimary[n.id] = primaryId })
      } else {
        pstnToPrimary[groupNodes[0].id] = groupNodes[0].id
      }
    })

    const nodesToShow = []
    const nodesToHide = []
    const edgesToRemove = new Set()
    const edgesToAdd = []

    Object.entries(nameGroups).forEach(([name, groupNodes]) => {
      if (name === 'Unknown') {
        groupNodes.forEach((n) => nodesToShow.push(n))
        return
      }
      if (groupNodes.length === 1) {
        nodesToShow.push(groupNodes[0])
        return
      }
      const primary = groupNodes[0]
      const groupIdSet = new Set(groupNodes.map((n) => n.id))
      groupNodes.slice(1).forEach((n) => nodesToHide.push(n.id))
      nodesToShow.push({
        ...primary,
        label: name,
        title: `${name}\nPSTNs: ${groupIdSet.size > 0 ? [...groupIdSet].join(', ') : primary.id}`,
        size: 25,
        borderWidth: 3,
        shadow: true,
        font: { size: 16, bold: true, face: 'Inter' }
      })

      const targetMap = new Map()
      edges.forEach((edge) => {
        const isSourceInGroup = groupIdSet.has(edge.from)
        const isTargetInGroup = groupIdSet.has(edge.to)
        if (isSourceInGroup && isTargetInGroup) {
          edgesToRemove.add(edge.id)
          return
        }
        if (isSourceInGroup || isTargetInGroup) {
          const externalNode = isSourceInGroup ? edge.to : edge.from
          const externalPrimary = pstnToPrimary[externalNode] || externalNode
          if (!targetMap.has(externalPrimary)) {
            targetMap.set(externalPrimary, { weight: 0, words: [], hasVector: false, color: '#ced4da' })
          }
          const agg = targetMap.get(externalPrimary)
          agg.weight += edge.originalWeight || 1
          if (edge.vectorWords && edge.vectorWords.length > 0) {
            agg.words.push(edge.vectorWords)
            agg.hasVector = true
            agg.color = '#e63946'
          }
          edgesToRemove.add(edge.id)
        }
      })
      targetMap.forEach((agg, targetPrimary) => {
        if (targetPrimary === primary.id) return
        const w = Math.max(1, Math.min(Math.sqrt(agg.weight) * 2, 15))
        const tooltip = agg.words.length > 0
          ? `Calls: ${agg.weight}\nWords: ${agg.words.join(' | ')}`
          : `Calls: ${agg.weight}`
        edgesToAdd.push({
          id: `agg_${primary.id}_${targetPrimary}`,
          from: primary.id,
          to: targetPrimary,
          color: agg.color,
          width: w,
          value: agg.weight,
          title: tooltip,
          smooth: false,
          originalWeight: agg.weight,
          vectorWords: agg.words.join(' | '),
          hasVector: agg.hasVector
        })
      })
    })

    const remainingEdges = edges.filter((edge) => {
      if (edgesToRemove.has(edge.id)) return false
      if (nodesToHide.includes(edge.from) || nodesToHide.includes(edge.to)) return false
      return true
    })
    const visibleIds = new Set(nodesToShow.map((n) => n.id))
    const safeRemaining = remainingEdges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
    const displayEdges = [...safeRemaining, ...edgesToAdd]
    return { nodes: nodesToShow, edges: displayEdges }
  }, [data, aggregateNames])

  useEffect(() => {
    if (!displayData || !containerRef.current) return

    console.log('-'.repeat(60))
    console.log('INITIALIZING NETWORK GRAPH')
    console.log('-'.repeat(60))

    const { nodes, edges } = displayData
    allNodesRef.current = nodes
    allEdgesRef.current = edges

    const networkData = {
      nodes,
      edges
    }
    
    const options = {
      nodes: {
        borderWidth: 1,
        borderWidthSelected: 3,
      },
      edges: {
        width: 1,
        chosen: {
          edge: function(values, id, selected, hovering) {
            if (hovering) {
              values.width = values.width * 1.5
            }
          }
        }
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0
        },
        stabilization: {
          enabled: true,
          iterations: 100
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: false,
        keyboard: false,
        zoomView: true,
        dragView: true
      }
    }
    
    networkRef.current = new Network(containerRef.current, networkData, options)
    console.log('✓ Network graph initialized')
    
    // Add custom tooltip div
    let tooltipDiv = document.getElementById('network-tooltip')
    if (!tooltipDiv) {
      tooltipDiv = document.createElement('div')
      tooltipDiv.id = 'network-tooltip'
      tooltipDiv.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        pointer-events: none;
        z-index: 10000;
        display: none;
        white-space: pre-line;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `
      document.body.appendChild(tooltipDiv)
    }
    
    // Show tooltip on hover
    networkRef.current.on('hoverNode', (params) => {
      const node = networkRef.current.body.data.nodes.get(params.node)
      if (node && node.title) {
        tooltipDiv.innerHTML = node.title.replace(/\\n/g, '<br>')
        tooltipDiv.style.display = 'block'
      }
    })
    
    networkRef.current.on('blurNode', () => {
      tooltipDiv.style.display = 'none'
    })
    
    networkRef.current.on('hoverEdge', (params) => {
      const edge = networkRef.current.body.data.edges.get(params.edge)
      if (edge && edge.title) {
        tooltipDiv.innerHTML = edge.title.replace(/\\n/g, '<br>')
        tooltipDiv.style.display = 'block'
      }
    })
    
    networkRef.current.on('blurEdge', () => {
      tooltipDiv.style.display = 'none'
    })
    
    // Update tooltip position on mouse move
    const handleMouseMove = (e) => {
      if (tooltipDiv.style.display === 'block') {
        tooltipDiv.style.left = (e.pageX + 15) + 'px'
        tooltipDiv.style.top = (e.pageY + 15) + 'px'
      }
    }
    containerRef.current.addEventListener('mousemove', handleMouseMove)
    
    // Click handler (single click for highlight)
    let clickTimeout = null
    const clickDelay = 250
    
    networkRef.current.on('click', (params) => {
      if (clickTimeout !== null) {
        clearTimeout(clickTimeout)
        clickTimeout = null
        return
      }
      
      clickTimeout = setTimeout(() => {
        clickTimeout = null
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          console.log(`Single click on node: ${nodeId}`)
          setSelectedNode(nodeId)
        } else {
          console.log('Click on canvas - unhighlight all')
          setSelectedNode(null)
        }
      }, clickDelay)
    })
    
    // Double click handler (copy to clipboard)
    networkRef.current.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        console.log(`Double click on node: ${nodeId} - copying to clipboard`)
        navigator.clipboard.writeText(nodeId).then(() => {
          showToast(`Copied: ${nodeId}`)
        })
      }
    })

    const displayIds = new Set(nodes.map((n) => n.id))
    if (selectedNode && !displayIds.has(selectedNode)) {
      setSelectedNode(null)
    }
    
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy()
      }
      const tooltipDiv = document.getElementById('network-tooltip')
      if (tooltipDiv) {
        tooltipDiv.style.display = 'none'
      }
    }
  }, [displayData])

  // Handle filters (groups, relevance)
  useEffect(() => {
    if (!networkRef.current || !displayData) return
    
    console.log('-'.repeat(60))
    console.log('APPLYING FILTERS')
    console.log(`  Disabled groups: ${Array.from(disabledGroups).join(', ') || 'none'}`)
    console.log('-'.repeat(60))

    const allNodes = networkRef.current.body.data.nodes.get()

    const updates = allNodes.map((node) => ({
      id: node.id,
      hidden: disabledGroups.has(node.nodeGroup)
    }))
    
    networkRef.current.body.data.nodes.update(updates)
    console.log('✓ Filters applied')
    
  }, [disabledGroups, displayData])
  
  // Handle physics toggle
  useEffect(() => {
    if (!networkRef.current) return
    console.log(`Physics: ${physicsEnabled ? 'enabled' : 'disabled'}`)
    networkRef.current.setOptions({ physics: { enabled: physicsEnabled } })
  }, [physicsEnabled])
  
  // Handle node selection / keyword highlighting
  useEffect(() => {
    if (!networkRef.current || !displayData) return

    const words = Array.isArray(highlightWords) ? highlightWords.filter(Boolean) : []
    if (words.length > 0) {
      highlightByWords(words)
    } else if (selectedNode) {
      highlightNode(selectedNode)
    } else {
      forceUnhighlightAll()
    }
  }, [selectedNode, highlightWords, displayData])

  const highlightByWords = (words) => {
    if (!networkRef.current) return
    forceUnhighlightAll()
    const allNodes = networkRef.current.body.data.nodes.get()
    const allEdges = networkRef.current.body.data.edges.get()
    const terms = words.map((w) => String(w).trim().toLowerCase()).filter(Boolean)
    if (!terms.length) return

    // Only red edges (with connection words) can match; gray edges have no words and must not be highlighted
    const matchingEdgeIds = []
    const matchingNodeIds = new Set()
    allEdges.forEach((edge) => {
      const wordsText = (edge.vectorWords || '').trim()
      if (!wordsText) return // gray edges have no vectorWords – do not match
      const text = wordsText.toLowerCase()
      if (terms.some((t) => text.includes(t))) {
        matchingEdgeIds.push(edge.id)
        matchingNodeIds.add(edge.from)
        matchingNodeIds.add(edge.to)
      }
    })

    originalStylesRef.current.nodes.clear()
    originalStylesRef.current.edges.clear()
    allNodes.forEach((n) => {
      if (!n.hidden) {
        originalStylesRef.current.nodes.set(n.id, {
          color: n.color,
          opacity: n.opacity || 1,
          size: n.size || 20,
          borderWidth: n.borderWidth || 1,
          font: n.font
        })
      }
    })
    allEdges.forEach((e) => {
      originalStylesRef.current.edges.set(e.id, {
        color: e.color,
        width: e.width || 1,
        opacity: e.opacity || 1
      })
    })

    const nodeUpdates = allNodes
      .filter((n) => !n.hidden)
      .map((node) => {
        if (matchingNodeIds.has(node.id)) {
          return { id: node.id, opacity: 1 }
        }
        return {
          id: node.id,
          opacity: 0.15,
          color: {
            background: typeof node.color === 'string' ? node.color : node.color.background,
            border: typeof node.color === 'string' ? node.color : node.color.border
          }
        }
      })
    networkRef.current.body.data.nodes.update(nodeUpdates)

    const edgeUpdates = allEdges.map((edge) => {
      if (matchingEdgeIds.includes(edge.id)) {
        const edgeColor = edge.hasVector ? '#e63946' : '#ced4da'
        return {
          id: edge.id,
          width: (edge.width || 1) * 2.5,
          color: edgeColor,
          shadow: {
            enabled: true,
            color: edge.hasVector ? 'rgba(230, 57, 70, 0.5)' : 'rgba(206, 212, 218, 0.5)',
            size: 10
          }
        }
      }
      return {
        id: edge.id,
        color: { color: edge.color, opacity: 0.08 },
        width: (edge.width || 1) * 0.5
      }
    })
    networkRef.current.body.data.edges.update(edgeUpdates)
    setHighlightActive(true)
  }

  const highlightNode = (nodeId) => {
    if (!networkRef.current) return
    
    // First, clear any previous highlight
    forceUnhighlightAll()
    
    const allNodes = networkRef.current.body.data.nodes.get()
    const allEdges = networkRef.current.body.data.edges.get()
    
    // Check if node exists (might be hidden or aggregated)
    const targetNode = allNodes.find(n => n.id === nodeId)
    if (!targetNode) {
      console.log(`Node ${nodeId} not found in current view`)
      return
    }
    
    // Store original styles
    originalStylesRef.current.nodes.clear()
    originalStylesRef.current.edges.clear()
    
    allNodes.forEach(n => {
      if (!n.hidden) {
        originalStylesRef.current.nodes.set(n.id, {
          color: n.color,
          opacity: n.opacity || 1,
          size: n.size || 20,
          borderWidth: n.borderWidth || 1,
          font: n.font
        })
      }
    })
    
    allEdges.forEach(e => {
      originalStylesRef.current.edges.set(e.id, {
        color: e.color,
        width: e.width || 1,
        opacity: e.opacity || 1
      })
    })
    
    // Find connected nodes
    const connectedNodes = new Set([nodeId])
    const connectedEdgeIds = []
    
    allEdges.forEach(edge => {
      if (edge.from === nodeId || edge.to === nodeId) {
        connectedNodes.add(edge.from)
        connectedNodes.add(edge.to)
        connectedEdgeIds.push(edge.id)
      }
    })
    
    // Update node styles
    const nodeUpdates = allNodes
      .filter(node => !node.hidden)
      .map(node => {
        if (node.id === nodeId) {
          // Selected node - make it prominent
          return {
            id: node.id,
            size: (node.size || 20) * 1.5,
            borderWidth: 4,
            color: {
              border: '#4361EE',
              background: typeof node.color === 'string' ? node.color : node.color.background
            },
            font: { size: 16, bold: true }
          }
        } else if (connectedNodes.has(node.id)) {
          // Connected node - keep visible
          return {
            id: node.id,
            opacity: 1
          }
        } else {
          // Unconnected node - fade out
          return {
            id: node.id,
            opacity: 0.15,
            color: {
              background: typeof node.color === 'string' ? node.color : node.color.background,
              border: typeof node.color === 'string' ? node.color : node.color.border
            }
          }
        }
      })
    
    networkRef.current.body.data.nodes.update(nodeUpdates)
    
    // Update edge styles - preserve red/gray distinction
    const edgeUpdates = allEdges.map(edge => {
      if (connectedEdgeIds.includes(edge.id)) {
        // Connected edge - emphasize while preserving color
        const edgeColor = edge.hasVector ? '#e63946' : '#ced4da'
        return {
          id: edge.id,
          width: (edge.width || 1) * 2.5,
          color: edgeColor,
          shadow: {
            enabled: true,
            color: edge.hasVector ? 'rgba(230, 57, 70, 0.5)' : 'rgba(206, 212, 218, 0.5)',
            size: 10
          }
        }
      } else {
        // Unconnected edge - fade out
        return {
          id: edge.id,
          color: {
            color: edge.color,
            opacity: 0.08
          },
          width: (edge.width || 1) * 0.5
        }
      }
    })
    
    networkRef.current.body.data.edges.update(edgeUpdates)
    
    // Focus on the node
    networkRef.current.focus(nodeId, {
      scale: 1.2,
      animation: {
        duration: 800,
        easingFunction: 'easeInOutQuad'
      }
    })
    
    setHighlightActive(true)
  }
  
  const forceUnhighlightAll = () => {
    if (!networkRef.current) return
    
    // Restore original styles if we have them
    if (originalStylesRef.current.nodes.size > 0) {
      const nodeUpdates = []
      originalStylesRef.current.nodes.forEach((style, id) => {
        nodeUpdates.push({
          id: id,
          color: style.color,
          opacity: style.opacity,
          size: style.size,
          borderWidth: style.borderWidth,
          font: style.font || { size: 14, bold: false }
        })
      })
      
      const edgeUpdates = []
      originalStylesRef.current.edges.forEach((style, id) => {
        edgeUpdates.push({
          id: id,
          color: style.color,
          width: style.width,
          shadow: false
        })
      })
      
      networkRef.current.body.data.nodes.update(nodeUpdates)
      networkRef.current.body.data.edges.update(edgeUpdates)
      
      originalStylesRef.current.nodes.clear()
      originalStylesRef.current.edges.clear()
    }
    
    setHighlightActive(false)
  }
  
  return <div ref={containerRef} className="network-graph" />
}

export default NetworkGraph
