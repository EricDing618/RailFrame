const HistoryUtil = (() => {
  const ACTIONS = ['plan', 'cancelPlan', 'start', 'pause', 'open', 'close', 'abandon', 'remove']

  const ACTION_LABEL = {
    plan: '出现规划',
    cancelPlan: '取消规划',
    start: '开工',
    pause: '停工',
    open: '运营',
    close: '停运',
    abandon: '废弃',
    remove: '拆除'
  }

  const STATIC = ['none', 'planned', 'construction', 'operating', 'suspended', 'abandoned']

  const STATIC_LABEL = {
    none: '不存在',
    planned: '规划中',
    construction: '建设中',
    operating: '运营中',
    suspended: '停运中',
    abandoned: '废弃中'
  }

  const RAINBOW = ['#e60012', '#ff7f00', '#ffd700', '#22aa44', '#00a8a8', '#2868d8', '#7a35c9']

  const historyWorkerStatus = {
    alive: 0,
    lastError: ''
  }

  // Per-project prepared indexes and structural split cache. Records are grouped once
  // instead of filtering the complete historySegments array for every line and frame.
  const _projectCaches = new WeakMap()
  const _normalizedProjects = new WeakSet()
  const _topologyRevisions = new WeakMap()

  function invalidateCaches(data) {
    if (data && typeof data === 'object') _projectCaches.delete(data)
  }

  function setTopologyRevision(data, revision) {
    if (data && typeof data === 'object') _topologyRevisions.set(data, Number(revision) || 0)
  }

  function getProjectCache(data) {
    let c = _projectCaches.get(data)
    if (c) return c
    const lineRecords = new Map()
    const connectorRecords = new Map()
    for (const r of (data?.historySegments || [])) {
      const ownerId = r.ownerId ?? r.lineId ?? r.connId
      const map = r.connector ? connectorRecords : lineRecords
      const key = String(ownerId)
      let arr = map.get(key)
      if (!arr) map.set(key, arr = [])
      arr.push(r)
    }
    c = { lineRecords, connectorRecords, splitCache: new Map() }
    _projectCaches.set(data, c)
    return c
  }

  function getOwnerRecords(data, connector, ownerId) {
    const c = getProjectCache(data)
    return (connector ? c.connectorRecords : c.lineRecords).get(String(ownerId)) || []
  }

  function trimSplitCache(cache, limit = 1200) {
    while (cache.size > limit) cache.delete(cache.keys().next().value)
  }

  function normalizeData(data) {
    if (!data) return
    if (_normalizedProjects.has(data)) {
      fixHistoryWorkerCount(data)
      return
    }

    if (!Array.isArray(data.historySegments)) data.historySegments = []
    if (!Array.isArray(data.historyStations)) data.historyStations = []
    if (!Array.isArray(data.historyStationNames)) data.historyStationNames = []
    if (!Array.isArray(data.historyLineNames)) data.historyLineNames = []
    if (!Array.isArray(data.historyLineColors)) data.historyLineColors = []
    if (data.historyNextId === undefined) data.historyNextId = 1
    if (data.historyTime === undefined) data.historyTime = 0
    if (data.historyMode === undefined) data.historyMode = false
    if (!data.defaultStyles) data.defaultStyles = {}
    if (!data.defaultStyles.defaultStaticState) data.defaultStyles.defaultStaticState = 'operating'
    if (!data.defaultStyles.timeStyles) data.defaultStyles.timeStyles = {}

    ;['planned', 'construction', 'operating', 'suspended', 'abandoned'].forEach(k => {
      if (!data.defaultStyles.timeStyles[k]) data.defaultStyles.timeStyles[k] = { styleId: null }
    })

    if (data.historyWorkerCount === undefined) {
      data.historyWorkerCount = data.interactionWorkerCount ?? 10
    }

    fixHistoryWorkerCount(data)
    migrateHistorySegmentsToPtId(data)
    _normalizedProjects.add(data)
  }

  function fixHistoryWorkerCount(data) {
    if (!data) return 10

    let n = Number(data.historyWorkerCount)
    if (!Number.isFinite(n)) n = Number(data.interactionWorkerCount) || 10

    n = Math.floor(n)
    if (n < 1) n = 1
    if (n > 64) n = 64

    data.historyWorkerCount = n
    return n
  }

  function migrateHistorySegmentsToPtId(data) {
    const lineMap = new Map()
    const connMap = new Map()

    for (const l of data.lines || []) {
      lineMap.set(l.id, l)
      lineMap.set(String(l.id), l)
    }

    for (const c of data.connectors || []) {
      connMap.set(c.id, c)
      connMap.set(String(c.id), c)
    }

    for (const r of data.historySegments || []) {
      if (r.fromPtId !== undefined && r.toPtId !== undefined) continue

      const ownerId = r.ownerId ?? r.lineId ?? r.connId
      const owner = r.connector
        ? (connMap.get(ownerId) || connMap.get(String(ownerId)))
        : (lineMap.get(ownerId) || lineMap.get(String(ownerId)))

      if (!owner || !Array.isArray(owner.pts)) continue

      const fromIdx = Number(r.fromIdx)
      const toIdx = Number(r.toIdx)

      if (!Number.isFinite(fromIdx) || !Number.isFinite(toIdx)) continue
      if (owner.pts[fromIdx] === undefined || owner.pts[toIdx] === undefined) continue

      r.fromPtId = owner.pts[fromIdx]
      r.toPtId = owner.pts[toIdx]

      delete r.fromIdx
      delete r.toIdx
    }
  }

  function evalTime(expr, data) {
    try {
      const r = TimeVarUtil.evalExpr(expr, data.timeVars || [])

      if (r.type === 'date') {
        return new Date(
          r.value.getFullYear(),
          r.value.getMonth(),
          r.value.getDate()
        ).getTime()
      }

      if (r.type === 'duration') {
        return r.value
      }

      return NaN
    } catch {
      return NaN
    }
  }

  function actionToState(action) {
    return {
      plan: 'planned',
      cancelPlan: 'none',
      start: 'construction',
      pause: 'planned',
      open: 'operating',
      close: 'suspended',
      abandon: 'abandoned',
      remove: 'none'
    }[action] || 'none'
  }

  function colorByRank(t, minT, maxT) {
    if (!Number.isFinite(t)) return '#999'
    if (!(maxT > minT)) return RAINBOW[RAINBOW.length - 1]

    const k = Math.max(0, Math.min(1, (t - minT) / (maxT - minT)))
    return RAINBOW[Math.round(k * (RAINBOW.length - 1))]
  }

  function historyGetEdgeIndexSet(n, fromIdx, toIdx, ring) {
    const set = new Set()

    if (!Number.isFinite(n) || n < 2) return set
    if (fromIdx === toIdx) return set

    if (!ring) {
      const a = Math.min(fromIdx, toIdx)
      const b = Math.max(fromIdx, toIdx)

      for (let i = a; i < b; i++) set.add(i)
      return set
    }

    if (fromIdx < toIdx) {
      for (let i = fromIdx; i < toIdx; i++) set.add(i)
    } else {
      for (let i = fromIdx; i < n; i++) set.add(i)
      for (let i = 0; i < toIdx; i++) set.add(i)
    }

    return set
  }

  function historyGetEdgeIndexSetByPtIds(owner, fromPtId, toPtId) {
    const set = new Set()

    if (!owner || !Array.isArray(owner.pts)) return set

    const n = owner.pts.length
    if (n < 2) return set

    let idxA = owner.pts.findIndex(x => String(x) === String(fromPtId))
    let idxB = owner.pts.findIndex(x => String(x) === String(toPtId))

    if (idxA < 0 || idxB < 0 || idxA === idxB) return set

    if (!owner.ring && idxA > idxB) {
      const t = idxA
      idxA = idxB
      idxB = t
    }

    return historyGetEdgeIndexSet(n, idxA, idxB, !!owner.ring)
  }

  function historyGetPointSeqByPtIds(owner, fromPtId, toPtId) {
    if (!owner || !Array.isArray(owner.pts)) return []

    const ids = owner.pts
    const n = ids.length

    if (n < 2) return []

    let idxA = ids.findIndex(x => String(x) === String(fromPtId))
    let idxB = ids.findIndex(x => String(x) === String(toPtId))

    if (idxA < 0 || idxB < 0) return []
    if (idxA === idxB) return [ids[idxA]]

    const out = []

    if (!owner.ring) {
      if (idxA > idxB) {
        const t = idxA
        idxA = idxB
        idxB = t
      }

      for (let i = idxA; i <= idxB; i++) out.push(ids[i])
      return out
    }

    let i = idxA
    let guard = 0

    out.push(ids[i])

    while (i !== idxB && guard < n) {
      i = (i + 1) % n
      out.push(ids[i])
      guard++
    }

    return out
  }

  function historyRingAutoOrder(line, idxA, idxB) {
    if (!line || !Array.isArray(line.pts)) {
      return { fromPtId: null, toPtId: null }
    }

    if (!line.ring) {
      return {
        fromPtId: line.pts[Math.min(idxA, idxB)],
        toPtId: line.pts[Math.max(idxA, idxB)]
      }
    }

    const n = line.pts.length
    const forward = (idxB - idxA + n) % n
    const backward = (idxA - idxB + n) % n

    return forward <= backward
      ? { fromPtId: line.pts[idxA], toPtId: line.pts[idxB] }
      : { fromPtId: line.pts[idxB], toPtId: line.pts[idxA] }
  }

  function historyRecordAppliesToEdge(r, edgeIdx, owner) {
    if (!owner) return false
    return historyGetEdgeIndexSetByPtIds(owner, r.fromPtId, r.toPtId).has(edgeIdx)
  }

  function appliesToEdge(rec, ownerId, edgeIdx, isConn, owner = null) {
    if (!!rec.connector !== !!isConn) return false

    const oid = rec.ownerId ?? rec.lineId ?? rec.connId
    if (String(oid) !== String(ownerId)) return false
    if (!owner) return false

    return historyGetEdgeIndexSetByPtIds(owner, rec.fromPtId, rec.toPtId).has(edgeIdx)
  }

  function stateAt(records, ownerId, edgeIdx, time, data, isConn, defaultState, owner = null) {
    let bestT = -Infinity
    let bestState = null
    let hasAnyHistory = false
    let firstT = Infinity

    for (const r of records || []) {
      if (!appliesToEdge(r, ownerId, edgeIdx, isConn, owner)) continue

      const t = evalTime(r.time, data)
      if (!Number.isFinite(t)) continue

      hasAnyHistory = true
      if (t < firstT) firstT = t

      if (t <= time && t >= bestT) {
        bestT = t
        bestState = actionToState(r.action)
      }
    }

    if (hasAnyHistory && time < firstT) return 'none'
    if (bestState) return bestState

    return defaultState || data.defaultStyles?.defaultStaticState || 'operating'
  }

  function latestActionTime(records, ownerId, edgeIdx, data, isConn, owner = null) {
    let best = -Infinity

    for (const r of records || []) {
      if (!appliesToEdge(r, ownerId, edgeIdx, isConn, owner)) continue

      const t = evalTime(r.time, data)
      if (Number.isFinite(t) && t > best) best = t
    }

    return best
  }

  function setSegment(data, payload) {
    normalizeData(data)

    const id = data.historyNextId++
    const ownerId = payload.ownerId ?? payload.lineId ?? payload.connId

    data.historySegments.push({
      id,
      connector: !!payload.connector,
      ownerId,
      fromPtId: payload.fromPtId,
      toPtId: payload.toPtId,
      action: payload.action,
      time: payload.time
    })

    return id
  }

  function eraseSegment(data, payload) {
    normalizeData(data)

    const ownerId = payload.ownerId ?? payload.lineId ?? payload.connId
    const connector = !!payload.connector

    data.historySegments = data.historySegments.filter(r => {
      if (!!r.connector !== connector) return true

      const rid = r.ownerId ?? r.lineId ?? r.connId
      if (String(rid) !== String(ownerId)) return true

      const sameForward =
        String(r.fromPtId) === String(payload.fromPtId) &&
        String(r.toPtId) === String(payload.toPtId)

      const sameBackward =
        String(r.fromPtId) === String(payload.toPtId) &&
        String(r.toPtId) === String(payload.fromPtId)

      return !(sameForward || sameBackward)
    })
  }

  function setStation(data, staid, action, time, ptId = null) {
    normalizeData(data)

    data.historyStations.push({
      id: data.historyNextId++,
      staid,
      ptId,
      action,
      time
    })
  }

  function eraseStation(data, staid, ptId = null) {
    normalizeData(data)

    data.historyStations = data.historyStations.filter(r => {
      if (ptId !== null && ptId !== undefined) return r.ptId !== ptId
      return r.staid !== staid
    })
  }

  function stationRecordApplies(r, staid, ptId) {
    if (!r) return false
    if (r.ptId !== undefined && r.ptId !== null) return String(r.ptId) === String(ptId)
    return String(r.staid) === String(staid)
  }

  function stationStateAt(data, staid, time, ptId = null) {
    normalizeData(data)

    let bestT = -Infinity
    let bestState = null
    let hasAnyHistory = false
    let firstT = Infinity

    for (const r of data.historyStations || []) {
      if (!stationRecordApplies(r, staid, ptId)) continue

      const t = evalTime(r.time, data)
      if (!Number.isFinite(t)) continue

      hasAnyHistory = true
      if (t < firstT) firstT = t

      if (t <= time && t >= bestT) {
        bestT = t
        bestState = actionToState(r.action)
      }
    }

    if (hasAnyHistory && time < firstT) return 'none'
    if (bestState) return bestState

    return data.defaultStyles?.defaultStaticState || 'operating'
  }

  function hasStationHistory(data, staid, ptId = null) {
    normalizeData(data)

    return (data.historyStations || []).some(r => {
      if (r.ptId !== undefined && r.ptId !== null) return String(r.ptId) === String(ptId)
      return String(r.staid) === String(staid)
    })
  }

  function buildOwnerPtIndexMap(ownerMap) {
    const map = new Map()

    if (!ownerMap) return map

    for (const owner of ownerMap.values()) {
      if (!owner || owner.id == null || !Array.isArray(owner.pts)) continue
      if (map.has(owner.id) || map.has(String(owner.id))) continue

      const ptIndex = new Map()

      for (let i = 0; i < owner.pts.length; i++) {
        const pid = owner.pts[i]
        ptIndex.set(pid, i)
        ptIndex.set(String(pid), i)
      }

      const item = {
        owner,
        ptIndex,
        n: owner.pts.length,
        ring: !!owner.ring
      }

      map.set(owner.id, item)
      map.set(String(owner.id), item)
    }

    return map
  }

  function buildSegmentIndex(records, data, isConn, ownerMap = null) {
    normalizeData(data)

    const idx = new Map()
    const ownerIndexMap = buildOwnerPtIndexMap(ownerMap)
    const timeCache = new Map()
    const stateCache = new Map()

    for (const r of records || []) {
      if (!!r.connector !== !!isConn) continue

      const ownerId = r.ownerId ?? r.lineId ?? r.connId
      if (ownerId == null) continue

      const oi = ownerIndexMap.get(ownerId) || ownerIndexMap.get(String(ownerId))
      if (!oi || oi.n < 2) continue

      let t = timeCache.get(r.time)
      if (t === undefined) {
        t = evalTime(r.time, data)
        timeCache.set(r.time, t)
      }

      if (!Number.isFinite(t)) continue

      let idxA = oi.ptIndex.get(r.fromPtId)
      if (idxA === undefined) idxA = oi.ptIndex.get(String(r.fromPtId))

      let idxB = oi.ptIndex.get(r.toPtId)
      if (idxB === undefined) idxB = oi.ptIndex.get(String(r.toPtId))

      if (idxA === undefined || idxB === undefined || idxA === idxB) continue

      if (!oi.ring && idxA > idxB) {
        const tmp = idxA
        idxA = idxB
        idxB = tmp
      }

      let arr = idx.get(ownerId)
      if (!arr) {
        arr = []
        idx.set(ownerId, arr)
      }

      let st = stateCache.get(r.action)
      if (!st) {
        st = actionToState(r.action)
        stateCache.set(r.action, st)
      }

      if (!oi.ring) {
        for (let e = idxA; e < idxB; e++) {
          arr.push({
            edgeIdx: e,
            t,
            action: r.action,
            state: st,
            record: r
          })
        }
      } else if (idxA < idxB) {
        for (let e = idxA; e < idxB; e++) {
          arr.push({
            edgeIdx: e,
            t,
            action: r.action,
            state: st,
            record: r
          })
        }
      } else {
        for (let e = idxA; e < oi.n; e++) {
          arr.push({
            edgeIdx: e,
            t,
            action: r.action,
            state: st,
            record: r
          })
        }

        for (let e = 0; e < idxB; e++) {
          arr.push({
            edgeIdx: e,
            t,
            action: r.action,
            state: st,
            record: r
          })
        }
      }
    }

    for (const arr of idx.values()) {
      arr.sort((a, b) => a.edgeIdx - b.edgeIdx || a.t - b.t)
    }

    return idx
  }

  function splitLineByHistory(line, ptsMap, data, time, timeView, linesMapForIndex = null) {
    normalizeData(data)

    const defaultState = data.defaultStyles?.defaultStaticState || 'operating'
    const ownerMap = linesMapForIndex || new Map([[line.id, line]])
    const segIndex = buildSegmentIndex(data.historySegments || [], data, false, ownerMap)
    const lineRecords = segIndex.get(line.id) || segIndex.get(String(line.id)) || []

    const byEdge = new Map()

    for (const r of lineRecords) {
      let arr = byEdge.get(r.edgeIdx)
      if (!arr) {
        arr = []
        byEdge.set(r.edgeIdx, arr)
      }
      arr.push(r)
    }

    let minT = Infinity
    let maxT = -Infinity

    if (timeView) {
      for (const r of lineRecords) {
        if (r.t < minT) minT = r.t
        if (r.t > maxT) maxT = r.t
      }
    }

    const edgeCount = line.ring ? line.pts.length : line.pts.length - 1
    const segs = []
    let cur = null

    for (let i = 0; i < edgeCount; i++) {
      const arr = byEdge.get(i) || []

      let firstT = Infinity
      let bestT = -Infinity
      let st = null
      let latestT = -Infinity

      for (const r of arr) {
        if (r.t < firstT) firstT = r.t
        if (r.t > latestT) latestT = r.t

        if (r.t <= time && r.t >= bestT) {
          bestT = r.t
          st = r.state
        }
      }

      if (arr.length > 0 && time < firstT) st = 'none'
      else if (!st) st = defaultState

      const p0 = ptsMap.get(line.pts[i]) || ptsMap.get(String(line.pts[i]))
      const p1 = ptsMap.get(line.pts[(i + 1) % line.pts.length]) || ptsMap.get(String(line.pts[(i + 1) % line.pts.length]))

      if (!p0 || !p1) continue

      const color = timeView ? colorByRank(latestT, minT, maxT) : null
      const isVirtualRingEdge = line.ring && i === line.pts.length - 1

      const key = timeView
        ? `${st}|${color}|${isVirtualRingEdge ? 'ringEdge' : ''}`
        : `${st}|${isVirtualRingEdge ? 'ringEdge' : ''}`

      if (!cur || cur.key !== key || isVirtualRingEdge) {
        if (cur) segs.push(cur)

        cur = {
          key,
          type: 0,
          state: st,
          timeColor: color,
          pts: [p0, p1],
          startIdx: i,
          endIdx: i + 1
        }
      } else {
        cur.pts.push(p1)
        cur.endIdx = i + 1
      }

      if (isVirtualRingEdge) {
        segs.push(cur)
        cur = null
      }
    }

    if (cur) segs.push(cur)

    for (const s of segs) {
      s.uid = `${line.id}-${s.startIdx}-${s.endIdx}-${s.state}-${s.timeColor || ''}`
      if (line.ring) {
        const n = line.pts.length
        const prevId = line.pts[(s.startIdx - 1 + n) % n]
        const nextId = line.pts[(s.endIdx + 1) % n]
        s.prevNeighborPt = ptsMap.get(prevId) || ptsMap.get(String(prevId)) || null
        s.nextNeighborPt = ptsMap.get(nextId) || ptsMap.get(String(nextId)) || null
      } else {
        s.prevNeighborPt = s.startIdx > 0
          ? (ptsMap.get(line.pts[s.startIdx - 1]) || ptsMap.get(String(line.pts[s.startIdx - 1])) || null)
          : null
        s.nextNeighborPt = s.endIdx < line.pts.length - 1
          ? (ptsMap.get(line.pts[s.endIdx + 1]) || ptsMap.get(String(line.pts[s.endIdx + 1])) || null)
          : null
      }
    }

    return segs
  }

  const HistoryWorkerPool = (() => {
    let workers = []
    let rr = 0
    let seq = 1

    function terminateAll() {
      for (const w of workers) {
        try { w.terminate() } catch (_) {}
      }

      workers = []
      historyWorkerStatus.alive = 0
    }

    function createOneWorker() {
      const workerUrl = new URL('./historyworker.js?v=20260729-ring-close-tangent-1', window.location.href).href
      const w = new Worker(workerUrl)

      w.__pending = new Map()
      w.__broken = false

      w.onmessage = e => {
        const msg = e.data || {}
        const task = w.__pending.get(msg.id)

        if (!task) return

        clearTimeout(task.timer)
        w.__pending.delete(msg.id)

        if (msg.ok) task.resolve(msg.result)
        else task.reject(new Error(msg.error || 'History Worker 计算失败'))
      }

      w.onerror = e => {
        w.__broken = true
        historyWorkerStatus.lastError = e.message || 'historyworker.js 加载失败'

        for (const [, task] of w.__pending) {
          clearTimeout(task.timer)
          task.reject(new Error(historyWorkerStatus.lastError))
        }

        w.__pending.clear()
      }

      return w
    }

    function restart(count) {
      terminateAll()

      const n = Math.max(1, Math.min(64, Math.floor(Number(count) || 10)))

      for (let i = 0; i < n; i++) {
        try {
          workers.push(createOneWorker())
        } catch (err) {
          historyWorkerStatus.lastError = err?.message || 'History Worker 创建失败'
          break
        }
      }

      historyWorkerStatus.alive = workers.length
      return workers.length
    }

    function pickWorker() {
      const alive = workers.filter(w => !w.__broken)
      historyWorkerStatus.alive = alive.length

      if (alive.length === 0) return null

      const w = alive[rr % alive.length]
      rr++
      return w
    }

    async function run(type, payload, fallback) {
      try {
        if (typeof Worker === 'undefined') throw new Error('当前浏览器不支持 Worker')

        const count = payload?.historyWorkerCount || 10

        if (workers.length === 0) restart(count)

        const w = pickWorker()
        if (!w) throw new Error('没有可用 History Worker')

        const id = seq++

        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            w.__pending.delete(id)
            reject(new Error('History Worker 超时，已回退主线程'))
          }, 5000)

          w.__pending.set(id, { resolve, reject, timer })
          w.postMessage({ id, type, payload })
        })
      } catch (err) {
        historyWorkerStatus.lastError = err?.message || String(err)
        if (fallback) return await fallback()
        throw err
      }
    }

    return {
      restart,
      run,
      terminateAll
    }
  })()

  function restartHistoryWorkers(data) {
    const n = fixHistoryWorkerCount(data)
    return HistoryWorkerPool.restart(n)
  }

  async function splitLineByHistoryAsync(line, ptsMap, data, time, timeView, linesMapForIndex = null) {
    normalizeData(data)

    const defaultState = data.defaultStyles?.defaultStaticState || 'operating'

    const pts = line.pts
      .map(pid => ptsMap.get(pid) || ptsMap.get(String(pid)))
      .filter(Boolean)
      .map(p => ({
        id: p.id,
        lng: p.lng,
        lat: p.lat
      }))

    const ownerIdText = String(line.id)

    const ownerRecords = getOwnerRecords(data, false, ownerIdText)
    const historySegments = ownerRecords.map(r => ({
      connector: false,
      ownerId: r.ownerId ?? r.lineId ?? r.connId,
      fromPtId: r.fromPtId,
      toPtId: r.toPtId,
      action: r.action,
      time: evalTime(r.time, data)
    }))

    const recordKey = historySegments.map(r =>
      `${r.fromPtId}>${r.toPtId}:${r.action}:${Number.isFinite(r.time) ? r.time : 'NaN'}`
    ).join(';')
    const topologyRevision = _topologyRevisions.get(data) || 0
    const splitKey = `${ownerIdText}|${topologyRevision}|${line.ring ? 1 : 0}|${line.pts.join(',')}|${+time}|${timeView ? 1 : 0}|${defaultState}|${recordKey}`
    const projectCache = getProjectCache(data)
    let raw = projectCache.splitCache.get(splitKey)

    const payload = {
      historyWorkerCount: fixHistoryWorkerCount(data),
      line: {
        id: line.id,
        ring: !!line.ring,
        pts: [...line.pts]
      },
      pts,
      historySegments,
      time: +time,
      timeView: !!timeView,
      defaultState
    }

    if (!raw) {
      raw = await HistoryWorkerPool.run(
        'splitLineByHistory',
        payload,
        () => Promise.resolve(splitLineByHistory(line, ptsMap, data, time, timeView, linesMapForIndex))
      )
      if (Array.isArray(raw)) {
        projectCache.splitCache.set(splitKey, raw)
        trimSplitCache(projectCache.splitCache)
      }
    }

    if (!Array.isArray(raw)) {
      return splitLineByHistory(line, ptsMap, data, time, timeView, linesMapForIndex)
    }

    return raw.map(s => {
      if (Array.isArray(s.pts)) return s

      return {
        ...s,
        pts: (s.ptIds || []).map(pid => ptsMap.get(pid) || ptsMap.get(String(pid))).filter(Boolean),
        prevNeighborPt: s.prevNeighborPtId != null
          ? (ptsMap.get(s.prevNeighborPtId) || ptsMap.get(String(s.prevNeighborPtId)))
          : null,
        nextNeighborPt: s.nextNeighborPtId != null
          ? (ptsMap.get(s.nextNeighborPtId) || ptsMap.get(String(s.nextNeighborPtId)))
          : null
      }
    })
  }

  function buildStationRuntimeMap(data, lines, ptsMap, time) {
    normalizeData(data)

    const map = new Map()
    const defaultState = data.defaultStyles?.defaultStaticState || 'operating'

    const lineOwnerMap = new Map()
    for (const l of lines || []) {
      if (l && l.id != null) {
        lineOwnerMap.set(l.id, l)
        lineOwnerMap.set(String(l.id), l)
      }
    }

    const connOwnerMap = new Map()
    for (const c of data.connectors || []) {
      if (c && c.id != null) {
        connOwnerMap.set(c.id, c)
        connOwnerMap.set(String(c.id), c)
      }
    }

    const lineSegIndex = buildSegmentIndex(data.historySegments || [], data, false, lineOwnerMap)
    const connSegIndex = buildSegmentIndex(data.historySegments || [], data, true, connOwnerMap)

    function ensurePt(ptId) {
      let info = map.get(ptId)

      if (!info) {
        info = {
          hasAnyLine: false,
          hasExistingLine: false,
          hasOperatingLine: false
        }

        map.set(ptId, info)
      }

      return info
    }

    function getEdgeState(ownerId, edgeIdx, isConn) {
      const segIndex = isConn ? connSegIndex : lineSegIndex
      const arr = segIndex.get(ownerId) || segIndex.get(String(ownerId))

      if (!arr || arr.length === 0) return defaultState

      let hasAnyHistory = false
      let firstT = Infinity
      let bestT = -Infinity
      let bestState = null

      for (const r of arr) {
        if (r.edgeIdx > edgeIdx) break
        if (r.edgeIdx < edgeIdx) continue

        hasAnyHistory = true
        if (r.t < firstT) firstT = r.t

        if (r.t <= time && r.t >= bestT) {
          bestT = r.t
          bestState = r.state
        }
      }

      if (hasAnyHistory && time < firstT) return 'none'
      return bestState || defaultState
    }

    function scanPath(ownerId, ptIds, isConn) {
      if (!Array.isArray(ptIds) || ptIds.length === 0) return

      const lastEdgeIdx = ptIds.length - 2

      for (let i = 0; i < ptIds.length; i++) {
        const pt = ptsMap.get(ptIds[i]) || ptsMap.get(String(ptIds[i]))
        if (!pt || pt.id == null) continue

        const info = ensurePt(pt.id)
        info.hasAnyLine = true

        let leftState = null
        let rightState = null

        if (i > 0) leftState = getEdgeState(ownerId, i - 1, isConn)
        if (i <= lastEdgeIdx) rightState = getEdgeState(ownerId, i, isConn)

        const states = []

        if (leftState !== null) states.push(leftState)
        if (rightState !== null) states.push(rightState)
        if (states.length === 0) states.push(defaultState)

        const hasExisting = states.some(s => s !== 'none')
        const hasOperating = states.some(s => s === 'operating')

        if (hasExisting) info.hasExistingLine = true
        if (hasOperating) info.hasOperatingLine = true
      }
    }

    for (const line of lines || []) {
      if (!line || !Array.isArray(line.pts)) continue
      scanPath(line.id, line.pts, false)
    }

    for (const conn of data.connectors || []) {
      if (!conn || !Array.isArray(conn.pts)) continue
      scanPath(conn.id, conn.pts, true)
    }

    return map
  }

  function edgeStateAt(data, ownerId, edgeIdx, time, isConn, owner) {
    normalizeData(data)

    const defaultState = data.defaultStyles?.defaultStaticState || 'operating'
    const ownerMap = new Map([[ownerId, owner], [String(ownerId), owner]])
    const idx = buildSegmentIndex(data.historySegments || [], data, !!isConn, ownerMap)
    const arr = idx.get(ownerId) || idx.get(String(ownerId))

    if (!arr || !arr.length) return defaultState

    let hasAnyHistory = false
    let firstT = Infinity
    let bestT = -Infinity
    let bestState = null

    for (const r of arr) {
      if (r.edgeIdx > edgeIdx) break
      if (r.edgeIdx < edgeIdx) continue

      hasAnyHistory = true
      if (r.t < firstT) firstT = r.t

      if (r.t <= time && r.t >= bestT) {
        bestT = r.t
        bestState = r.state
      }
    }

    if (hasAnyHistory && time < firstT) return 'none'
    return bestState || defaultState
  }

  function onDeletePoint(data, owner, ptId, connector = false) {
    normalizeData(data)

    if (!owner || !Array.isArray(owner.pts)) return

    const idx = owner.pts.findIndex(x => String(x) === String(ptId))
    if (idx < 0) return

    const prevPtId = owner.pts[idx - 1]
    const nextPtId = owner.pts[idx + 1]

    data.historySegments = (data.historySegments || []).filter(r => {
      if (!!r.connector !== !!connector) return true

      const ownerId = r.ownerId ?? r.lineId ?? r.connId
      if (String(ownerId) !== String(owner.id)) return true

      const fromHit = String(r.fromPtId) === String(ptId)
      const toHit = String(r.toPtId) === String(ptId)

      if (!fromHit && !toHit) return true

      if (fromHit && nextPtId !== undefined) {
        r.fromPtId = nextPtId
        return String(r.fromPtId) !== String(r.toPtId)
      }

      if (toHit && prevPtId !== undefined) {
        r.toPtId = prevPtId
        return String(r.fromPtId) !== String(r.toPtId)
      }

      return false
    })
  }

  function onReverseLine(data, lineOrId) {
    normalizeData(data)

    const lineId = typeof lineOrId === 'object' ? lineOrId.id : lineOrId
    const line = typeof lineOrId === 'object'
      ? lineOrId
      : (data.lines || []).find(l => String(l.id) === String(lineId))

    if (!line || !Array.isArray(line.pts) || line.pts.length < 2) return

    for (const r of data.historySegments || []) {
      if (!!r.connector) continue

      const ownerId = r.ownerId ?? r.lineId
      if (String(ownerId) !== String(lineId)) continue
      if (r.fromPtId == null || r.toPtId == null) continue

      const t = r.fromPtId
      r.fromPtId = r.toPtId
      r.toPtId = t

      normalizeHistoryRecordPtOrder(data, line, r)

      delete r.fromDisplayIdx
      delete r.toDisplayIdx

      r.ownerId = line.id
      r.connector = false
    }
  }

  function onInsertPoint(data, owner, prevPtId, newPtId, connector = false) {
    normalizeData(data)

    if (!owner || !Array.isArray(owner.pts)) return

    const ownerId = String(owner.id)

    for (const r of data.historySegments || []) {
      if (!!r.connector !== !!connector) continue

      const rid = String(r.ownerId ?? r.lineId ?? r.connId)
      if (rid !== ownerId) continue

      delete r.fromIdx
      delete r.toIdx
      delete r.fromDisplayIdx
      delete r.toDisplayIdx
    }
  }

  function normalizeHistoryRecordPtOrder(data, owner, r) {
    if (!owner || !Array.isArray(owner.pts) || !r) return

    let fromIdx = owner.pts.findIndex(x => String(x) === String(r.fromPtId))
    let toIdx = owner.pts.findIndex(x => String(x) === String(r.toPtId))

    if (fromIdx < 0 || toIdx < 0) return

    if (!owner.ring && fromIdx > toIdx) {
      const t = r.fromPtId
      r.fromPtId = r.toPtId
      r.toPtId = t

      const ti = fromIdx
      fromIdx = toIdx
      toIdx = ti
    }

    delete r.fromIdx
    delete r.toIdx
  }

  return {
    ACTIONS,
    ACTION_LABEL,
    STATIC,
    STATIC_LABEL,

    historyWorkerStatus,
    invalidateCaches,
    setTopologyRevision,
    restartHistoryWorkers,

    normalizeData,
    evalTime,
    actionToState,
    colorByRank,

    setSegment,
    eraseSegment,
    setStation,
    eraseStation,

    stationRecordApplies,
    stationStateAt,
    hasStationHistory,

    splitLineByHistory,
    splitLineByHistoryAsync,

    stateAt,
    latestActionTime,
    edgeStateAt,

    buildSegmentIndex,
    buildStationRuntimeMap,
    buildOwnerPtIndexMap,

    historyGetEdgeIndexSet,
    historyGetEdgeIndexSetByPtIds,
    historyGetPointSeqByPtIds,
    historyRingAutoOrder,
    historyRecordAppliesToEdge,

    normalizeHistoryRecordPtOrder,
    onReverseLine,
    onDeletePoint,
    onInsertPoint,

    fixHistoryWorkerCount
  }
})()