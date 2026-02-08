/**
 * Apply data filters to network data.
 * - Only edges with weight >= minWeight are kept (minWeight defaults to 1; 0 = no connection).
 * - If keywords are set (comma-separated), edges whose .words contain ANY keyword are kept.
 * - If selectedGroups is non-empty, only nodes in those groups are kept.
 * - Only nodes with at least minConnections connections (in the filtered edge set) are kept.
 */
export const DEFAULT_FILTERS = {
  minConnections: 0,
  minWeight: 1,
  keywords: [], // each item added with Enter; profile must match at least one
  selectedGroups: [] // empty = all groups
}

function parseKeywords(keywordStr) {
  if (!keywordStr || !String(keywordStr).trim()) return []
  return String(keywordStr)
    .split(/[\n,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function getKeywords(filters) {
  if (Array.isArray(filters.keywords) && filters.keywords.length > 0) {
    return filters.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
  }
  return parseKeywords(filters.keyword)
}

export function applyDataFilters(data, filters) {
  if (!data || !data.nodes || !data.edges) return data

  const minWeight = Math.max(1, Number(filters.minWeight) || 1)
  const minConnections = Math.max(0, Number(filters.minConnections) || 0)
  const keywords = getKeywords(filters)
  const selectedGroups = Array.isArray(filters.selectedGroups) ? filters.selectedGroups : []

  // 1) Filter edges by weight (1+ = at least one call)
  let edgesFiltered = data.edges.filter((e) => e.weight >= minWeight)

  // 2) Filter edges by keywords (edge.words must contain at least one keyword)
  if (keywords.length > 0) {
    edgesFiltered = edgesFiltered.filter((e) => {
      if (!e.words) return false
      const wordsLower = String(e.words).toLowerCase()
      return keywords.some((kw) => wordsLower.includes(kw))
    })
  }

  // 3) Node set and degree from remaining edges
  const nodeIdsFromEdges = new Set()
  const degree = {}
  edgesFiltered.forEach((e) => {
    nodeIdsFromEdges.add(e.source)
    nodeIdsFromEdges.add(e.target)
    degree[e.source] = (degree[e.source] || 0) + 1
    degree[e.target] = (degree[e.target] || 0) + 1
  })

  // 4) Keep only nodes with degree >= minConnections (and that appear in edges)
  let nodeIdsPass = new Set(
    [...nodeIdsFromEdges].filter((id) => degree[id] >= minConnections)
  )

  // 5) Filter by selected groups (if any)
  if (selectedGroups.length > 0) {
    const groupSet = new Set(selectedGroups)
    nodeIdsPass = new Set(
      [...nodeIdsPass].filter((id) => {
        const node = data.nodes.find((n) => n.id === id)
        return node && groupSet.has(node.group)
      })
    )
  }

  // 6) Filter nodes and edges
  const nodesFiltered = data.nodes.filter((n) => nodeIdsPass.has(n.id))
  const edgesFinal = edgesFiltered.filter(
    (e) => nodeIdsPass.has(e.source) && nodeIdsPass.has(e.target)
  )

  return {
    nodes: nodesFiltered,
    edges: edgesFinal,
    groups: data.groups
  }
}
