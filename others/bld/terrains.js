const TerrainUtil = (() => {
  const DEFAULT_TYPES = [
    { id: 'water', name: '水域', color: '#8fd3ff' },
    { id: 'mountain', name: '山地', color: '#79c86b' },
    { id: 'area', name: '区域', color: '#d9d9d9' }
  ]

  function normalizeData(data) {
    if (!data) return
if (data.terrainMaxOpacity === undefined)
    data.terrainMaxOpacity = 0.4
    if (!Array.isArray(data.terrainTypes)) {
      data.terrainTypes = DEFAULT_TYPES.map(x => ({ ...x }))
    } else {
      const ids = new Set(data.terrainTypes.map(x => x.id))
      for (const t of DEFAULT_TYPES) {
        if (!ids.has(t.id)) data.terrainTypes.push({ ...t })
      }
    }

    if (!Array.isArray(data.terrains)) data.terrains = []
    if (data.terrainNextId === undefined) data.terrainNextId = 1
if (data.terrainInteraction === undefined) data.value.terrainInteraction = true

    for (let i = 0; i < data.terrainTypes.length; i++) {
      const t = data.terrainTypes[i]
      if (!t.id) t.id = `terrain_type_${i + 1}`
      if (!t.name) t.name = t.id
      if (!t.color) t.color = '#d9d9d9'
    }

    for (const t of data.terrains) normalizeTerrain(data, t)
  }

  function normalizeTerrain(data, t) {
    if (!t) return

    if (!t.id && t.id !== 0) t.id = nextTerrainId(data)
    if (!t.name) t.name = '新地形'
    if (!t.typeId) t.typeId = 'area'
    if (!t.mode) t.mode = 'polygon' // polygon / bezier
    if (t.closed === undefined) t.closed = true
    if (!Number.isFinite(Number(t.strokeWidth))) t.strokeWidth = 80
    if (!Number.isFinite(Number(t.opacity))) t.opacity = 0.55
    if (t.visible === undefined) t.visible = true
    if (!Array.isArray(t.pts)) t.pts = []

    for (const p of t.pts) {
      if (!Number.isFinite(Number(p.lng))) p.lng = 0
      if (!Number.isFinite(Number(p.lat))) p.lat = 0
      delete p.hin
      delete p.hout
    }
  }

  function nextTerrainId(data) {
    if (!data) return 1
    if (!Array.isArray(data.terrains)) data.terrains = []

    let n = Number(data.terrainNextId || 1)
    const ids = data.terrains.map(x => Number(x.id)).filter(Number.isFinite)
    if (ids.length) n = Math.max(n, Math.max(...ids) + 1)

    data.terrainNextId = n + 1
    return n
  }

  function nextTerrainTypeId(data) {
    normalizeData(data)
    let i = data.terrainTypes.length + 1
    while (data.terrainTypes.some(x => x.id === `terrain${i}`)) i++
    return `terrain${i}`
  }

  function typeById(data, id) {
    normalizeData(data)
    return data.terrainTypes.find(x => x.id === id)
      || data.terrainTypes[0]
      || DEFAULT_TYPES[2]
  }

  function colorOf(data, terrain) {
    return terrain.color || typeById(data, terrain.typeId).color || '#d9d9d9'
  }

  function makePt(lng, lat) {
    return { lng, lat }
  }

  function makeDefaultPts(typeId, center) {
    const cx = Number(center?.lng) || 0
    const cy = Number(center?.lat) || 0

    if (typeId === 'water') {
      return [
        makePt(cx - 3.8, cy - 1.5),
        makePt(cx + 0.8, cy - 2.8),
        makePt(cx + 4.2, cy + 0.6),
        makePt(cx + 1.6, cy + 3.0),
        makePt(cx - 3.2, cy + 2.2)
      ]
    }

    if (typeId === 'mountain') {
      return [
        makePt(cx - 4.0, cy + 2.6),
        makePt(cx - 1.2, cy - 3.2),
        makePt(cx + 1.0, cy - 1.4),
        makePt(cx + 3.8, cy - 3.0),
        makePt(cx + 4.5, cy + 2.8)
      ]
    }

    return [
      makePt(cx - 4.0, cy - 2.6),
      makePt(cx + 4.0, cy - 2.6),
      makePt(cx + 4.0, cy + 2.6),
      makePt(cx - 4.0, cy + 2.6)
    ]
  }

  function createType(data) {
    normalizeData(data)
    const id = nextTerrainTypeId(data)
    data.terrainTypes.push({ id, name: '新地形类型', color: '#cccccc' })
    return id
  }

  function deleteType(data, id) {
    normalizeData(data)
    data.terrainTypes = data.terrainTypes.filter(x => x.id !== id)
    for (const t of data.terrains) {
      if (t.typeId === id) t.typeId = 'area'
    }
  }

  function createTerrain(data, typeId = 'area', center = { lng: 0, lat: 0 }, empty = false) {
    normalizeData(data)

    const type = typeById(data, typeId)
    const terrain = {
      id: nextTerrainId(data),
      name: `新${type.name || '地形'}`,
      typeId,
      mode: typeId === 'bezier' ,
      closed: true,
      strokeWidth: 80,
      opacity: 1,
      visible: true,
      pts: []
    }

    data.terrains.push(terrain)
    return terrain
  }

  function duplicateTerrain(data, id) {
    normalizeData(data)

    const old = data.terrains.find(x => x.id === id)
    if (!old) return null

    const terrain = JSON.parse(JSON.stringify(old))
    terrain.id = nextTerrainId(data)
    terrain.name = `${terrain.name || '地形'} 副本`

    for (const p of terrain.pts) {
      p.lng += 1
      p.lat += 1
    }

    data.terrains.push(terrain)
    return terrain
  }

  function deleteTerrain(data, id) {
    normalizeData(data)
    data.terrains = data.terrains.filter(x => x.id !== id)
  }

  function reversePts(terrain) {
    if (!terrain || !Array.isArray(terrain.pts)) return
    terrain.pts.reverse()
  }

  function reorderByDrag(arr, dragId, targetId, side) {
    if (!Array.isArray(arr)) return
    if (dragId == null || targetId == null || dragId === targetId) return

    const from = arr.findIndex(x => x.id === dragId)
    let to = arr.findIndex(x => x.id === targetId)
    if (from < 0 || to < 0) return

    const item = arr.splice(from, 1)[0]
    if (from < to) to--
    if (side === 'after') to++
    arr.splice(to, 0, item)
  }

  function ptsToScreenPoints(terrain, worldToScreen) {
    return terrain.pts
      .map((p, i) => {
        const s = worldToScreen(p.lng, p.lat)
        if (!s) return null
        return {
          index: i,
          lng: p.lng,
          lat: p.lat,
          x: s.x,
          y: s.y
        }
      })
      .filter(Boolean)
  }

  function linePath(points) {
    if (!points || points.length === 0) return ''
    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x},${points[i].y}`
    return d
  }

function terrainPathD(terrain, screenPts) {
  if (!screenPts || screenPts.length === 0) return ''

  if (terrain.mode !== 'bezier') {
    let d = linePath(screenPts)
    if (terrain.closed && screenPts.length >= 3) d += ' Z'
    return d
  }

  if (terrain.closed && screenPts.length >= 3) {
    return closedBezierPath(screenPts)
  }

  return svgPath(screenPts.map(p => [p.x, p.y]), bezierCommand)
}
function closedBezierPath(screenPts) {
  const n = screenPts.length
  if (n === 0) return ''
  if (n === 1) return `M ${screenPts[0].x},${screenPts[0].y}`

  let d = `M ${screenPts[0].x},${screenPts[0].y}`

  for (let i = 1; i <= n; i++) {
    const point = screenPts[i % n]
    const prevPt = screenPts[(i - 1 + n) % n]
    const prevPrev = screenPts[(i - 2 + n) % n]
    const nextNext = screenPts[(i + 1) % n]

    const dx = point.x - prevPt.x
    const dy = point.y - prevPt.y
    const segLen = Math.hypot(dx, dy)

    const c1 = controlPoint(
      [prevPt.x, prevPt.y],
      [prevPrev.x, prevPrev.y],
      [point.x, point.y],
      false,
      segLen
    )

    const c2 = controlPoint(
      [point.x, point.y],
      [prevPt.x, prevPt.y],
      [nextNext.x, nextNext.y],
      true,
      segLen
    )

    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${point.x},${point.y}`
  }

  return d + ' Z'
}

  function midHandles(terrain, screenPts) {
    const out = []
    if (!screenPts || screenPts.length < 2) return out

    const segCount = terrain.closed ? screenPts.length : screenPts.length - 1

    for (let i = 0; i < segCount; i++) {
      const a = screenPts[i]
      const b = screenPts[(i + 1) % screenPts.length]

      out.push({
        afterIndex: i,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
      })
    }

    return out
  }

  function renderObject(data, terrain, worldToScreen, scale = 1, applyOpacityLimit = true) {
    normalizeTerrain(data, terrain)
    if (!terrain.pts.length) return null
const opacity =
    applyOpacityLimit
        ? Math.min(
            Number(terrain.opacity ?? 0.55),
            Number(data.terrainMaxOpacity ?? 1)
        )
        : Number(terrain.opacity ?? 0.55)
    const screenPts = ptsToScreenPoints(terrain, worldToScreen)
    const color = colorOf(data, terrain)
    const sw = Math.max(1, Number(terrain.strokeWidth || 80) * Number(scale || 1))

    return {
      id: terrain.id,
      name: terrain.name,
      mode: terrain.mode,
      closed: !!terrain.closed,
      d: terrainPathD(terrain, screenPts),
      color,
      fill: terrain.closed ? color : 'none',
      stroke: terrain.closed ? 'none' : color,
      strokeWidth: terrain.closed ? 0 : sw,
    opacity,
      screenPts,
      midHandles: midHandles(terrain, screenPts)
    }
  }

  function addPt(terrain, lng, lat) {
    if (!terrain || !Array.isArray(terrain.pts)) return -1
    terrain.pts.push(makePt(lng, lat))
    return terrain.pts.length - 1
  }

  function insertPt(terrain, afterIndex, pos) {
    if (!terrain || !Array.isArray(terrain.pts)) return null

    const a = terrain.pts[afterIndex]
    const b = terrain.pts[(afterIndex + 1) % terrain.pts.length]
    if (!a || !b) return null

    const p = makePt(
      pos?.lng ?? ((a.lng + b.lng) / 2),
      pos?.lat ?? ((a.lat + b.lat) / 2)
    )

    terrain.pts.splice(afterIndex + 1, 0, p)
    return afterIndex + 1
  }

  function deletePt(terrain, index) {
    if (!terrain || !Array.isArray(terrain.pts)) return false

    const min = terrain.closed ? 3 : 2
    if (terrain.pts.length <= min) return false

    terrain.pts.splice(index, 1)
    return true
  }

  function movePt(terrain, index, world, startWorld, shift) {
    if (!terrain || !terrain.pts || !terrain.pts[index] || !world) return

    const p = terrain.pts[index]
    let newLng = world.lng
    let newLat = world.lat

    if (shift && startWorld) {
      const dlng = newLng - startWorld.lng
      const dlat = newLat - startWorld.lat
      if (Math.abs(dlng) >= Math.abs(dlat)) newLat = startWorld.lat
      else newLng = startWorld.lng
    }

    p.lng = newLng
    p.lat = newLat
  }
  function moveTerrain(terrain, dx, dy) {
    if (!terrain || !Array.isArray(terrain.pts)) return

    for (const p of terrain.pts) {
      p.lng += dx
      p.lat += dy
    }
  }
  return {
    DEFAULT_TYPES,
    moveTerrain,
    normalizeData,
    normalizeTerrain,

    nextTerrainId,
    nextTerrainTypeId,
    typeById,
    colorOf,

    makePt,
    makeDefaultPts,

    createType,
    deleteType,
    createTerrain,
    duplicateTerrain,
    deleteTerrain,

    reversePts,
    reorderByDrag,

    terrainPathD,
    renderObject,
    midHandles,

    addPt,
    insertPt,
    deletePt,
    movePt
  }
})()