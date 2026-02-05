import { useEffect, useRef, useState } from 'react'
import { Network } from 'vis-network'
import './NetworkGraph.css'

function NetworkGraph({ 
  data, 
  disabledGroups, 
  hideIrrelevant, 
  aggregateNames,
  physicsEnabled,
  selectedNode,
  setSelectedNode,
  showToast
}) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const [highlightActive, setHighlightActive] = useState(false)
  const originalStylesRef = useRef({ nodes: new Map(), edges: new Map() })
  const allNodesRef = useRef([])
  const allEdgesRef = useRef([])
  
  useEffect(() => {
    if (!data || !containerRef.current) return
    
    console.log('-'.repeat(60))
    console.log('INITIALIZING NETWORK GRAPH')
    console.log('-'.repeat(60))
    
    // Prepare nodes data
    const nodes = data.nodes.map(node => ({
      id: node.id,
      label: node.label,
      title: node.name !== 'Unknown' 
        ? `${node.name}\nPSTN: ${node.id}`
        : `Unknown\nPSTN: ${node.id}`,
      color: node.color,
      size: node.size,
      shape: 'dot',
      font: { size: 14, face: 'Inter' },
      // Store metadata
      nodeName: node.name,
      nodeGroup: node.group,
      relevant: node.relevant
    }))
    
    // Prepare edges data
    const edges = data.edges.map(edge => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      color: edge.color,
      title: edge.words 
        ? `Calls: ${edge.weight}\nWords: ${edge.words}`
        : `Calls: ${edge.weight}`,
      width: Math.log(edge.weight + 1) * 1.5,
      value: edge.weight,
      smooth: false,
      // Store metadata
      originalWeight: edge.weight,
      vectorWords: edge.words || '',
      hasVector: edge.has_vector
    }))
    
    // Store original data for aggregation
    allNodesRef.current = nodes
    allEdgesRef.current = edges
    
    // Create network
    const networkData = {
      nodes: nodes,
      edges: edges
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
    
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy()
      }
      // Clean up tooltip
      const tooltipDiv = document.getElementById('network-tooltip')
      if (tooltipDiv) {
        tooltipDiv.style.display = 'none'
      }
    }
  }, [data])
  
  // Handle aggregation
  useEffect(() => {
    if (!networkRef.current || !data) return
    
    console.log('-'.repeat(60))
    console.log('APPLYING AGGREGATION')
    console.log(`  Aggregate names: ${aggregateNames}`)
    console.log('-'.repeat(60))
    
    if (aggregateNames) {
      // Group nodes by name
      const nameGroups = {}
      allNodesRef.current.forEach(node => {
        const name = node.nodeName || 'Unknown'
        if (!nameGroups[name]) nameGroups[name] = []
        nameGroups[name].push(node)
      })
      
      const nodesToShow = []
      const nodesToHide = []
      const edgesToAdd = []
      const edgesToRemove = []
      
      // Build mapping: PSTN -> Primary PSTN for aggregated nodes
      const pstnToPrimary = {}
      Object.entries(nameGroups).forEach(([name, nodes]) => {
        if (name === 'Unknown') {
          // Unknown nodes always map to themselves (never aggregate)
          nodes.forEach(node => {
            pstnToPrimary[node.id] = node.id
          })
        } else if (nodes.length > 1) {
          // Multiple nodes with same name - map all to primary
          const primaryId = nodes[0].id
          nodes.forEach(node => {
            pstnToPrimary[node.id] = primaryId
          })
        } else {
          // Single node maps to itself
          pstnToPrimary[nodes[0].id] = nodes[0].id
        }
      })
      
      // Build a set of all nodes that will be hidden
      const allHiddenNodes = new Set()
      Object.entries(nameGroups).forEach(([name, nodes]) => {
        // Only aggregate nodes with actual names (not Unknown) that have duplicates
        if (name !== 'Unknown' && nodes.length > 1) {
          nodes.slice(1).forEach(node => allHiddenNodes.add(node.id))
        }
      })
      
      Object.entries(nameGroups).forEach(([name, nodes]) => {
        if (name === 'Unknown') {
          // Unknown nodes - NEVER aggregate, show all of them individually
          console.log(`  Keeping ${nodes.length} unknown nodes separate`)
          nodes.forEach(node => nodesToShow.push(node))
        } else if (nodes.length === 1) {
          // Single node with a name - show as is
          nodesToShow.push(nodes[0])
        } else {
          // Multiple nodes with same name - aggregate
          console.log(`  Aggregating ${nodes.length} nodes for name: ${name}`)
          console.log(`    PSTNs: ${nodes.map(n => n.id).join(', ')}`)
          
          const primary = nodes[0]
          const groupIds = nodes.map(n => n.id)
          const groupIdSet = new Set(groupIds)
          
          // Update primary node
          nodesToShow.push({
            ...primary,
            label: name,
            title: `${name}\nPSTNs: ${groupIds.join(', ')}`,
            size: 25,
            borderWidth: 3,
            shadow: true,
            font: { size: 16, bold: true, face: 'Inter' }
          })
          
          // Hide other nodes
          nodes.slice(1).forEach(node => {
            nodesToHide.push(node.id)
          })
          
          // Aggregate edges - combine all connections from any PSTN in this group
          const targetMap = new Map()
          
          allEdgesRef.current.forEach(edge => {
            const isSourceInGroup = groupIdSet.has(edge.from)
            const isTargetInGroup = groupIdSet.has(edge.to)
            
            // Internal edge (both ends in same group) - remove it
            if (isSourceInGroup && isTargetInGroup) {
              edgesToRemove.push(edge.id)
              console.log(`    Removing internal edge: ${edge.from} → ${edge.to}`)
              return
            }
            
            // External edge (one end in group, other outside)
            if (isSourceInGroup || isTargetInGroup) {
              // Find the external node (the one NOT in this group)
              const externalNode = isSourceInGroup ? edge.to : edge.from
              
              // Map external node to its primary (in case it's also aggregated)
              const externalPrimary = pstnToPrimary[externalNode] || externalNode
              
              // Initialize aggregation data for this external node if needed
              if (!targetMap.has(externalPrimary)) {
                targetMap.set(externalPrimary, {
                  weight: 0,
                  words: [],
                  hasVector: false,
                  color: '#ced4da'
                })
              }
              
              // Add this edge's data to the aggregation
              const aggData = targetMap.get(externalPrimary)
              aggData.weight += edge.originalWeight || 1
              
              if (edge.vectorWords && edge.vectorWords.length > 0) {
                aggData.words.push(edge.vectorWords)
                aggData.hasVector = true
                aggData.color = '#e63946'
              }
              
              // Mark this edge for removal (will be replaced by aggregated edge)
              edgesToRemove.push(edge.id)
            }
          })
          
          // Create new aggregated edges from primary node to all external nodes
          console.log(`    Creating ${targetMap.size} aggregated edges`)
          targetMap.forEach((aggData, targetPrimary) => {
            // Skip if we're trying to create an edge to ourselves
            if (targetPrimary === primary.id) {
              console.log(`    Skipping self-loop to ${targetPrimary}`)
              return
            }
            
            const combinedWords = aggData.words.join(' | ')
            const tooltip = aggData.words.length > 0
              ? `Calls: ${aggData.weight}\nWords: ${combinedWords}`
              : `Calls: ${aggData.weight}`
            
            // Get the name of the target for logging
            const targetNode = allNodesRef.current.find(n => n.id === targetPrimary)
            const targetName = targetNode ? targetNode.nodeName : targetPrimary
            
            // Better scaling for aggregated edges: use square root for better visual representation
            // This makes higher weights more visibly thicker while keeping it reasonable
            const edgeWidth = Math.max(1, Math.min(Math.sqrt(aggData.weight) * 2, 15))
            
            console.log(`      ${name} (${primary.id}) → ${targetName} (${targetPrimary}) [weight: ${aggData.weight}, width: ${edgeWidth.toFixed(1)}]`)
            
            edgesToAdd.push({
              id: `agg_${primary.id}_${targetPrimary}`,
              from: primary.id,
              to: targetPrimary,
              color: aggData.color,
              width: edgeWidth,
              value: aggData.weight,
              title: tooltip,
              smooth: false,
              originalWeight: aggData.weight,
              vectorWords: combinedWords,
              hasVector: aggData.hasVector
            })
          })
        }
      })
      
      // Apply changes to network
      console.log(`  Total nodes to show: ${nodesToShow.length}`)
      console.log(`  Total nodes to hide: ${nodesToHide.length}`)
      console.log(`  Total edges to remove: ${edgesToRemove.length}`)
      console.log(`  Total aggregated edges to add: ${edgesToAdd.length}`)
      
      networkRef.current.body.data.nodes.clear()
      networkRef.current.body.data.nodes.add(nodesToShow)
      
      networkRef.current.body.data.edges.clear()
      
      // Add edges that don't involve hidden nodes and weren't marked for removal
      const remainingEdges = allEdgesRef.current.filter(edge => {
        const isRemoving = edgesToRemove.includes(edge.id)
        const hasHiddenSource = nodesToHide.includes(edge.from)
        const hasHiddenTarget = nodesToHide.includes(edge.to)
        return !isRemoving && !hasHiddenSource && !hasHiddenTarget
      })
      
      console.log(`  Remaining edges: ${remainingEdges.length}`)
      
      // Add all edges (remaining + aggregated)
      const allEdges = [...remainingEdges, ...edgesToAdd]
      networkRef.current.body.data.edges.add(allEdges)
      
      console.log(`✓ Aggregation complete: ${nodesToShow.length} visible nodes, ${remainingEdges.length + edgesToAdd.length} total edges`)
      console.log(`  Aggregated edges sample:`, edgesToAdd.slice(0, 3).map(e => ({
        from: e.from,
        to: e.to,
        weight: e.originalWeight,
        width: e.width
      })))
      
    } else {
      // Restore original nodes and edges
      console.log('  Restoring original nodes and edges')
      networkRef.current.body.data.nodes.clear()
      networkRef.current.body.data.nodes.add(allNodesRef.current)
      
      networkRef.current.body.data.edges.clear()
      networkRef.current.body.data.edges.add(allEdgesRef.current)
      
      console.log('✓ Original graph restored')
    }
    
  }, [aggregateNames, data])
  
  // Handle filters (groups, relevance)
  useEffect(() => {
    if (!networkRef.current || !data) return
    
    console.log('-'.repeat(60))
    console.log('APPLYING FILTERS')
    console.log(`  Disabled groups: ${Array.from(disabledGroups).join(', ') || 'none'}`)
    console.log(`  Hide irrelevant: ${hideIrrelevant}`)
    console.log('-'.repeat(60))
    
    const allNodes = networkRef.current.body.data.nodes.get()
    
    // Apply visibility filters
    const updates = allNodes.map(node => {
      const groupDisabled = disabledGroups.has(node.nodeGroup)
      const relevanceDisabled = hideIrrelevant && !node.relevant
      
      return {
        id: node.id,
        hidden: groupDisabled || relevanceDisabled
      }
    })
    
    networkRef.current.body.data.nodes.update(updates)
    console.log('✓ Filters applied')
    
  }, [disabledGroups, hideIrrelevant, data])
  
  // Handle physics toggle
  useEffect(() => {
    if (!networkRef.current) return
    
    console.log(`Physics: ${physicsEnabled ? 'enabled' : 'disabled'}`)
    networkRef.current.setOptions({ 
      physics: { enabled: physicsEnabled } 
    })
  }, [physicsEnabled])
  
  // Handle node selection/highlighting
  useEffect(() => {
    if (!networkRef.current || !data) return
    
    if (selectedNode) {
      console.log(`Highlighting node: ${selectedNode}`)
      highlightNode(selectedNode)
    } else {
      console.log('Unhighlighting all nodes')
      forceUnhighlightAll()
    }
  }, [selectedNode, data])
  
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
