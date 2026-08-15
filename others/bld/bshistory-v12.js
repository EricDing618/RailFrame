
const BshistoryApp = (() => {

    // ───────────────────────────────────────────────────────────────────
    const DEFAULT_SETTINGS = Object.freeze({
        legendMaxPerRow: 25,
        mergeSameColorLines: true,
        mergeSameNameLines: false,
        mergeSameNumberLines: false,
        mergePriority1: 'color',
        mergePriority2: 'name',
        mergePriority3: 'number',
        mergePriorityOrder: ['color', 'name', 'number'],
        segmentPriorityOrder: ['planned', 'construction', 'operating', 'suspended', 'abandoned'],
        continuousChainNoGlobal: true,
        onlyYearLastEventGlobal: false,
        minGlobalIntervalEnabled: false,
        minGlobalIntervalDays: 100,
        hideButtonsWhenPlaying: false,
        buildSpeedKmPerSec: 1,
        segmentHoldSec: 1,
        fitGlobalAfterTime: true,
        globalMoveSec: 1.5,
        globalHoldSec: 4,
        maxWorkers: 10,
        renderFps: 60,
        renderCanvas: true,
        renderTerrain: true,
        renderTerrainLabels: true,
        renderDistrictLabels: true,
        // 相机阻尼参数
        camSettleDistKm: 1.0,
        camSettleZoomRatio: 0.20,
        camSettleExtraWaitSec: 0.5,
        camBuildApproach: 3.5,
        camBuildDirBlend: 3.0,
        camBuildMaxSpdMult: 8,
        camGlobalApproach: 12,
        camGlobalDirBlend: 15,
        camGlobalMaxSpdMult: 25,
        camZoomBuildApproach: 4,
        camZoomBuildDirBlend: 5,
        camZoomBuildMaxLogspd: 1.5,
        camZoomGlobalApproach: 12,
        camZoomGlobalDirBlend: 15,
        camZoomGlobalMaxLogspd: 3.0,

        // 显示
        stationNameScale: 1.0,
        minimapHeightRatio: 0.3,
        minimapMaxViewKm: 64,
        camLookAheadSec: 0.5,
        enableCulling: false,
        cullMarginKm: 0.2,
    })



    const ACTION_TEXT = Object.freeze({
        plan: '出现规划',
        cancelPlan: '取消规划',
        start: '开工',
        pause: '停工',
        open: '开通',
        close: '停运',
        abandon: '废弃',
        remove: '拆除'
    })

    function clamp(v, min, max) {
        v = Number(v)
        if (!Number.isFinite(v)) return min
        return Math.max(min, Math.min(max, v))
    }


    // ───────────────────────────────────────────────────────────────────
    function normalizeSettings(s) {
        const x = Object.assign({}, DEFAULT_SETTINGS, s || {})

        return {
            legendMaxPerRow: Math.round(clamp(x.legendMaxPerRow, 1, 80)),
            mergeSameColorLines: x.mergeSameColorLines !== false,
            mergeSameNameLines: !!x.mergeSameNameLines,
            mergeSameNumberLines: !!x.mergeSameNumberLines,
            ...(() => {
                const valid = ['color', 'name', 'number']
                const raw = Array.isArray(x.mergePriorityOrder) ? x.mergePriorityOrder : [x.mergePriority1, x.mergePriority2, x.mergePriority3]
                const out = []
                for (const v of raw) if (valid.includes(v) && !out.includes(v)) out.push(v)
                for (const v of valid) if (!out.includes(v)) out.push(v)
                return { mergePriorityOrder: out, mergePriority1: out[0], mergePriority2: out[1], mergePriority3: out[2] }
            })(),
            ...(() => {
                const valid = ['planned', 'construction', 'operating', 'suspended', 'abandoned']
                const raw = Array.isArray(x.segmentPriorityOrder) ? x.segmentPriorityOrder : valid
                const out = []
                for (const v of raw) if (valid.includes(v) && !out.includes(v)) out.push(v)
                for (const v of valid) if (!out.includes(v)) out.push(v)
                return { segmentPriorityOrder: out }
            })(),
            continuousChainNoGlobal: x.continuousChainNoGlobal !== false,
            onlyYearLastEventGlobal: !!x.onlyYearLastEventGlobal,
            minGlobalIntervalEnabled: !!x.minGlobalIntervalEnabled,
            minGlobalIntervalDays: Math.round(clamp(x.minGlobalIntervalDays, 0, 365000)),
            hideButtonsWhenPlaying: !!x.hideButtonsWhenPlaying,
            buildSpeedKmPerSec: clamp(x.buildSpeedKmPerSec, 0.001, 1000000),
            segmentHoldSec: clamp(x.segmentHoldSec, 0, 3600),
            fitGlobalAfterTime: !!x.fitGlobalAfterTime,
            globalMoveSec: clamp(x.globalMoveSec, 0, 3600),
            globalHoldSec: clamp(x.globalHoldSec, 0, 3600),
            maxWorkers: Math.round(clamp(x.maxWorkers, 1, 32)),
            renderFps: Math.round(clamp(x.renderFps, 1, 120)),
            renderCanvas: !!x.renderCanvas,
            camLookAheadSec: clamp(x.camLookAheadSec, 0, 10),
            renderTerrain: x.renderTerrain !== false,
            renderTerrainLabels: x.renderTerrainLabels !== false,
            renderDistrictLabels: x.renderDistrictLabels !== false,
            // 相机
            camSettleDistKm: clamp(x.camSettleDistKm, 0.01, 1000),
            camSettleZoomRatio: clamp(x.camSettleZoomRatio, 0.01, 1),
            camSettleExtraWaitSec: clamp(x.camSettleExtraWaitSec, 0, 30),
            camBuildApproach: clamp(x.camBuildApproach, 0.1, 200),
            camBuildDirBlend: clamp(x.camBuildDirBlend, 0.1, 200),
            camBuildMaxSpdMult: clamp(x.camBuildMaxSpdMult, 1, 10000),
            camGlobalApproach: clamp(x.camGlobalApproach, 0.1, 200),
            camGlobalDirBlend: clamp(x.camGlobalDirBlend, 0.1, 200),
            camGlobalMaxSpdMult: clamp(x.camGlobalMaxSpdMult, 1, 10000),
            camZoomBuildApproach: clamp(x.camZoomBuildApproach, 0.1, 200),
            camZoomBuildDirBlend: clamp(x.camZoomBuildDirBlend, 0.1, 200),
            camZoomBuildMaxLogspd: clamp(x.camZoomBuildMaxLogspd, 0.01, 20),
            camZoomGlobalApproach: clamp(x.camZoomGlobalApproach, 0.1, 200),
            camZoomGlobalDirBlend: clamp(x.camZoomGlobalDirBlend, 0.1, 200),
            camZoomGlobalMaxLogspd: clamp(x.camZoomGlobalMaxLogspd, 0.01, 20),

            // 显示
            stationNameScale: clamp(x.stationNameScale, 0.1, 10),
            minimapHeightRatio: clamp(x.minimapHeightRatio, 0.05, 0.5),
            minimapMaxViewKm: clamp(x.minimapMaxViewKm, 1, 100000),
            enableCulling: !!x.enableCulling,
            cullMarginKm: clamp(x.cullMarginKm, 0, 1000),
        }
    }


    function fallbackTxtBlack(hexColor) {
        if (typeof window.txtBlack === 'function') return window.txtBlack(hexColor)

        let hex = String(hexColor || '#000').replace('#', '')
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }

        const r = parseInt(hex.substring(0, 2), 16) / 255
        const g = parseInt(hex.substring(2, 4), 16) / 255
        const b = parseInt(hex.substring(4, 6), 16) / 255
        const v = 0.299 * r + 0.587 * g + 0.114 * b

        return v > 1 - 0.32 ? '#000000' : '#ffffff'
    }

    function resolveColor(color, lineColor) {
        if (!color || color === 'line' || color === 'currentColor') return lineColor || '#333'
        return color
    }

    function parseDashArray(dashStr, base = 1) {
        if (!dashStr || !String(dashStr).trim()) return ''

        const arr = String(dashStr)
            .trim()
            .split(/[\s,，]+/)
            .map(Number)
            .filter(n => Number.isFinite(n) && n > 0)

        return arr.length ? arr.map(v => v * base).join(',') : ''
    }

    function formatDate(t) {
        if (!Number.isFinite(t)) return '----/--/--'

        const d = new Date(t)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')

        return `${y}/${m}/${day}`
    }

    function formatDuration(ms) {
        ms = Math.max(0, Math.round(ms || 0))

        const s = Math.floor(ms / 1000)
        const mm = Math.floor(s / 60)
        const ss = String(s % 60).padStart(2, '0')

        return `${mm}:${ss}`
    }

    function lineShortName(name) {
        name = String(name || '')

        const m = name.match(/[A-Za-z]+\d*|\d+/g)
        if (m && m.length) return m.join('')

        return name.slice(0, 2) || '?'
    }

    function legendSortKey(line) {
        const raw = String(line?.name || '')
        const compact = raw.replace(/\s+/g, '')

        if (/^\d+$/.test(compact)) return [0, Number(compact), '']

        const an = compact.match(/^([A-Za-z]+)(\d+)$/)
        if (an) return [1, an[1].toUpperCase(), Number(an[2])]

        if (/^[A-Za-z]+$/.test(compact)) return [2, compact.toUpperCase(), 0]

        // 以数字开头（如"10号线"）：按前导数字大小排，不按字符串
        const np = compact.match(/^(\d+)/)
        if (np) return [0, Number(np[1]), compact.slice(np[1].length)]

        return [3, compact, 0]
    }

    function compareLegendLine(a, b) {
        const ka = legendSortKey(a)
        const kb = legendSortKey(b)

        if (ka[0] !== kb[0]) return ka[0] - kb[0]
        if (ka[1] !== kb[1]) return ka[1] < kb[1] ? -1 : 1
        if (ka[2] !== kb[2]) return ka[2] < kb[2] ? -1 : 1

        return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hans-CN')
    }

    function normalizeLegendMergeColor(color) {
        return String(color || '#888').trim().toLowerCase()
    }

    function chooseMostFrequent(items, valueFn, rankFn = null) {
        const stats = new Map()
        let order = 0
        for (const item of items || []) {
            const value = valueFn(item)
            if (value == null || value === '') continue
            const key = String(value)
            if (!stats.has(key)) stats.set(key, { value, count: 0, first: order++, rank: rankFn ? rankFn(value, item) : 0 })
            stats.get(key).count++
        }
        let best = null
        for (const rec of stats.values()) {
            if (!best || rec.rank > best.rank ||
                (rec.rank === best.rank && rec.count > best.count) ||
                (rec.rank === best.rank && rec.count === best.count && rec.first < best.first)) best = rec
        }
        return best?.value ?? ''
    }

    function mergeLegendCardsBySettings(cards, settings) {
        const src = (cards || []).map((card, index) => ({ ...card, _order: index, _members: card._members || [card] }))
        const enabled = {
            color: settings?.mergeSameColorLines !== false,
            name: !!settings?.mergeSameNameLines,
            number: !!settings?.mergeSameNumberLines
        }
        const valid = ['color', 'name', 'number']
        const rawPriority = Array.isArray(settings?.mergePriorityOrder) ? settings.mergePriorityOrder : [settings?.mergePriority1, settings?.mergePriority2, settings?.mergePriority3]
        const priority = []
        for (const v of rawPriority) if (valid.includes(v) && !priority.includes(v)) priority.push(v)
        for (const v of valid) if (!priority.includes(v)) priority.push(v)

        const keyFor = (card, rule) => {
            if (rule === 'color') return normalizeLegendMergeColor(card.color)
            if (rule === 'name') return String(card.fullName || '').trim() || null
            if (rule === 'number') return String(card.number || '').trim() || null
            return null
        }

        const mergeGroup = (group, rule) => {
            const members = group.flatMap(c => c._members || [c])
            // 展示编号：空线路名忽略；含字母/数字的编号优先；同级取出现次数最多，仍同票取先出现者。
            const chosenNumber = chooseMostFrequent(
                members.filter(m => String(m.fullName || '').trim()),
                m => String(m.number || ''),
                value => /[A-Za-z0-9]/.test(String(value)) ? 1 : 0
            ) || '?'
            // 同名/同编号合并时颜色可能不同，取出现次数最多的历史主线颜色；同票保持原列表顺序。
            const chosenColor = chooseMostFrequent(members, m => normalizeLegendMergeColor(m.color)) || '#888'
            const chosenName = chooseMostFrequent(members, m => String(m.fullName || '').trim()) || ''
            return {
                rootId: `merged:${rule}:${members.map(m => m.rootId).join(',')}`,
                line: group[0]?.line || null,
                fullName: chosenName,
                number: chosenNumber,
                label: chosenNumber,
                color: chosenColor,
                textColor: fallbackTxtBlack(chosenColor),
                existsNow: members.some(m => m.existsNow),
                existsEver: members.some(m => m.existsEver),
                km: members.reduce((sum, m) => sum + (Number(m.km) || 0), 0),
                active: members.some(m => m.active),
                _order: Math.min(...members.map(m => m._order ?? 0)),
                _members: members
            }
        }

        let remaining = src
        const finalized = []
        for (const rule of priority) {
            if (!enabled[rule]) continue
            const buckets = new Map()
            const noKey = []
            for (const card of remaining) {
                const key = keyFor(card, rule)
                if (key == null || key === '') { noKey.push(card); continue }
                if (!buckets.has(key)) buckets.set(key, [])
                buckets.get(key).push(card)
            }
            const next = [...noKey]
            for (const group of buckets.values()) {
                if (group.length >= 2) finalized.push(mergeGroup(group, rule))
                else next.push(group[0])
            }
            remaining = next
        }
        return [...finalized, ...remaining].sort((a,b) => (a._order ?? 0) - (b._order ?? 0))
    }

    function actionToState(action) {
        if (window.HistoryUtil?.actionToState) return HistoryUtil.actionToState(action)

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

    function actionLabel(action) {
        return ACTION_TEXT[action] || window.HistoryUtil?.ACTION_LABEL?.[action] || action || ''
    }

    function haversineKm(a, b, fictionalMode) {
        if (!a || !b) return 0

        if (fictionalMode) {
            return Math.hypot(
                Number(a.lng) - Number(b.lng),
                Number(a.lat) - Number(b.lat)
            )
        }

        const R = 6371
        const lat1 = Number(a.lat) * Math.PI / 180
        const lat2 = Number(b.lat) * Math.PI / 180
        const dLat = (Number(b.lat) - Number(a.lat)) * Math.PI / 180
        const dLng = (Number(b.lng) - Number(a.lng)) * Math.PI / 180

        const s =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
    }

    function mercatorKm(lng, lat) {
        const R = 6371
        const x = R * Number(lng) * Math.PI / 180
        const y = R * Math.log(Math.tan(Math.PI / 4 + Number(lat) * Math.PI / 360))
        return { x, y: -y }
    }

    function pointToWorld(pt, fictionalMode) {
        if (fictionalMode) {
            return {
                x: Number(pt.lng) || 0,
                y: -(Number(pt.lat) || 0)
            }
        }

        return mercatorKm(pt.lng, pt.lat)
    }

    function lerp(a, b, t) {
        return a + (b - a) * t
    }
    function worldNeighborForEdge(line, edgeIdx, dir) {
        const ids = line?.pts || []
        const n = ids.length

        if (n < 2) return null

        let idx

        if (dir < 0) {
            idx = edgeIdx - 1

            if (idx < 0) {
                if (!line.ring) return null
                idx = n - 1
            }
        } else {
            idx = edgeIdx + 2

            if (idx >= n) {
                if (!line.ring) return null
                idx = idx % n
            }
        }

        return worldPts.value.get(ids[idx]) || worldPts.value.get(String(ids[idx])) || null
    }
    function closedBezierPathFromWorldPoints(pts) {
        if (!pts || pts.length === 0) return ''
        if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`

        const n = pts.length
        let d = `M ${pts[0].x},${pts[0].y}`

        for (let i = 1; i <= n; i++) {
            const point = pts[i % n]
            const prevPt = pts[(i - 1 + n) % n]
            const prevPrev = pts[(i - 2 + n) % n]
            const nextNext = pts[(i + 1) % n]

            const p0 = _arrPt(prevPt)
            const p3 = _arrPt(point)
            const prev = _arrPt(prevPrev)
            const next = _arrPt(nextNext)

            const segLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1])
            const c1 = _bezierControlPointCompat(p0, prev, p3, false, segLen)
            const c2 = _bezierControlPointCompat(p3, p0, next, true, segLen)

            d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p3[0]},${p3[1]}`
        }

        return d + ' Z'
    }
    function terrainColorOf(data, terrain) {
        if (window.TerrainUtil?.colorOf) {
            return TerrainUtil.colorOf(data, terrain)
        }

        const types = data?.terrainTypes || []
        const tp = types.find(x => x.id === terrain.typeId)

        return terrain.color || tp?.color || '#d9d9d9'
    }
    function terrainWorldPath(terrain, worldPts) {
        if (!terrain || !worldPts || worldPts.length === 0) return ''

        if (terrain.mode === 'bezier') {
            if (terrain.closed && worldPts.length >= 3) {
                return closedBezierPathFromWorldPoints(worldPts)
            }

            return pathFromWorldPoints(worldPts)
        }

        let d = `M ${worldPts[0].x},${worldPts[0].y}`

        for (let i = 1; i < worldPts.length; i++) {
            d += ` L ${worldPts[i].x},${worldPts[i].y}`
        }

        if (terrain.closed && worldPts.length >= 3) d += ' Z'

        return d
    }
    function pathFromWorldPoints(pts, prevNeighbor = null, nextNeighbor = null) {
        if (!pts || pts.length < 2) return ''

        const arr = pts
            .filter(Boolean)
            .map(p => [Number(p.x) || 0, Number(p.y) || 0])

        if (arr.length < 2) return ''

        const prev = prevNeighbor
            ? [Number(prevNeighbor.x) || 0, Number(prevNeighbor.y) || 0]
            : null

        const next = nextNeighbor
            ? [Number(nextNeighbor.x) || 0, Number(nextNeighbor.y) || 0]
            : null

        // 关键修复：const 声明不在 window 上，必须用 typeof svgPath 而非 typeof window.svgPath
        if (typeof svgPath === 'function') {
            if ((prev || next) && typeof makeBezierCommand === 'function') {
                return svgPath(arr, makeBezierCommand(prev, next)).trim()
            }
            if (typeof bezierCommand !== 'undefined') {
                return svgPath(arr, bezierCommand).trim()
            }
        }

        return 'M ' + arr.map(p => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' L ')
    }
    function _arrPt(p) {
        return [Number(p?.x) || 0, Number(p?.y) || 0]
    }

    function _bezierControlPointCompat(current, previous, next, reverse, currentSegLen) {
        const p = previous || current
        const n = next || current

        let dx = n[0] - p[0]
        let dy = n[1] - p[1]

        if (reverse) {
            dx = -dx
            dy = -dy
        }

        const len = Math.hypot(dx, dy)
        if (len < 1e-12) return [current[0], current[1]]

        // 和 math-v260522.js / makeBezierCommand 保持一致
        const smoothing = 0.35
        const dist = Math.min(len * smoothing, currentSegLen * smoothing * 1.5)
        const k = dist / len

        return [
            current[0] + dx * k,
            current[1] + dy * k
        ]
    }

    function _lerpArrPt(a, b, t) {
        return [
            lerp(a[0], b[0], t),
            lerp(a[1], b[1], t)
        ]
    }

    function partialBezierPathFromWorldEdge(
        aWorld,
        bWorld,
        prevNeighbor = null,
        nextNeighbor = null,
        fraction = 1
    ) {
        if (!aWorld || !bWorld) return ''

        fraction = clamp(fraction, 0, 1)

        const p0 = _arrPt(aWorld)
        const p3 = _arrPt(bWorld)
        const prev = prevNeighbor ? _arrPt(prevNeighbor) : null
        const next = nextNeighbor ? _arrPt(nextNeighbor) : null

        const segLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1])
        if (segLen < 1e-12) return `M ${p0[0]},${p0[1]}`
        if (fraction <= 0) return ''

        const p1 = _bezierControlPointCompat(p0, prev, p3, false, segLen)
        const p2 = _bezierControlPointCompat(p3, p0, next, true, segLen)

        if (fraction >= 0.999999) {
            return `M ${p0[0]},${p0[1]} C ${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`
        }

        const q0 = _lerpArrPt(p0, p1, fraction)
        const q1 = _lerpArrPt(p1, p2, fraction)
        const q2 = _lerpArrPt(p2, p3, fraction)

        const r0 = _lerpArrPt(q0, q1, fraction)
        const r1 = _lerpArrPt(q1, q2, fraction)

        const tip = _lerpArrPt(r0, r1, fraction)

        return `M ${p0[0]},${p0[1]} C ${q0[0]},${q0[1]} ${r0[0]},${r0[1]} ${tip[0]},${tip[1]}`
    }
    function tailBezierPathFromWorldEdge(
        aWorld,
        bWorld,
        prevNeighbor = null,
        nextNeighbor = null,
        remainingFraction = 1
    ) {
        if (!aWorld || !bWorld) return ''

        remainingFraction = clamp(remainingFraction, 0, 1)

        const p0 = _arrPt(aWorld)
        const p3 = _arrPt(bWorld)
        const prev = prevNeighbor ? _arrPt(prevNeighbor) : null
        const next = nextNeighbor ? _arrPt(nextNeighbor) : null

        const segLen = Math.hypot(p3[0] - p0[0], p3[1] - p0[1])
        if (segLen < 1e-12) return `M ${p3[0]},${p3[1]}`
        if (remainingFraction <= 0) return ''

        const p1 = _bezierControlPointCompat(p0, prev, p3, false, segLen)
        const p2 = _bezierControlPointCompat(p3, p0, next, true, segLen)

        if (remainingFraction >= 0.999999) {
            return `M ${p0[0]},${p0[1]} C ${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`
        }

        // 保留原 A -> B 曲线的“尾段”，而不是把整条曲线反向成 B -> A。
        // 这样停运/关闭跨多条边时，擦除前沿会连续地 A -> B -> C -> ... 推进，
        // 不会每到一条新边就呈现 B -> A、C -> B 的反向跳接。
        const t = 1 - remainingFraction
        const q0 = _lerpArrPt(p0, p1, t)
        const q1 = _lerpArrPt(p1, p2, t)
        const q2 = _lerpArrPt(p2, p3, t)
        const r0 = _lerpArrPt(q0, q1, t)
        const r1 = _lerpArrPt(q1, q2, t)
        const tip = _lerpArrPt(r0, r1, t)

        return `M ${tip[0]},${tip[1]} C ${r1[0]},${r1[1]} ${q2[0]},${q2[1]} ${p3[0]},${p3[1]}`
    }

    function offsetPolyline(pts, offset) {
        if (!offset || Math.abs(offset) < 1e-9 || !pts || pts.length < 2) return pts

        const out = []

        for (let i = 0; i < pts.length; i++) {
            const p0 = pts[Math.max(0, i - 1)]
            const p1 = pts[Math.min(pts.length - 1, i + 1)]

            const dx = p1.x - p0.x
            const dy = p1.y - p0.y
            const len = Math.hypot(dx, dy) || 1

            out.push({
                x: pts[i].x - dy / len * offset,
                y: pts[i].y + dx / len * offset
            })
        }

        return out
    }

    function partialWorldPath(points, progress) {
        progress = clamp(progress, 0, 1)

        if (!points || points.length < 2) return { pts: [], tip: null }
        if (progress >= 1) return { pts: points.slice(), tip: points[points.length - 1] }
        if (progress <= 0) return { pts: [points[0]], tip: points[0] }

        const lens = []
        let total = 0

        for (let i = 0; i < points.length - 1; i++) {
            const len = Math.hypot(
                points[i + 1].x - points[i].x,
                points[i + 1].y - points[i].y
            )

            lens.push(len)
            total += len
        }

        if (total <= 0) return { pts: [points[0]], tip: points[0] }

        const target = total * progress
        let acc = 0
        const out = [points[0]]

        for (let i = 0; i < lens.length; i++) {
            const len = lens[i]

            if (acc + len < target) {
                out.push(points[i + 1])
                acc += len
                continue
            }

            const k = len <= 0 ? 1 : (target - acc) / len
            const tip = {
                x: lerp(points[i].x, points[i + 1].x, k),
                y: lerp(points[i].y, points[i + 1].y, k)
            }

            out.push(tip)

            return { pts: out, tip }
        }

        return {
            pts: points.slice(),
            tip: points[points.length - 1]
        }
    }

    function bboxFromPoints(points) {
        const arr = (points || []).filter(Boolean)
        if (!arr.length) return null

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const p of arr) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue

            minX = Math.min(minX, p.x)
            minY = Math.min(minY, p.y)
            maxX = Math.max(maxX, p.x)
            maxY = Math.max(maxY, p.y)
        }

        if (!Number.isFinite(minX)) return null

        return { minX, minY, maxX, maxY }
    }

    function expandBBox(b, ratio = 0.1) {
        if (!b) return null

        const w = Math.max(0.001, b.maxX - b.minX)
        const h = Math.max(0.001, b.maxY - b.minY)

        return {
            minX: b.minX - w * ratio,
            maxX: b.maxX + w * ratio,
            minY: b.minY - h * ratio,
            maxY: b.maxY + h * ratio
        }
    }

    function zoomForBBox(b, viewport) {
        if (!b) return 1

        const w = Math.max(0.001, b.maxX - b.minX)
        const h = Math.max(0.001, b.maxY - b.minY)

        return Math.max(0.0001, Math.min(
            viewport.w / w,
            viewport.h / h
        ))
    }

    function edgeKey(ownerId, edgeIdx) {
        return `${ownerId}:${edgeIdx}`
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    return {
        DEFAULT_SETTINGS,
        normalizeSettings,
        clamp,
        fallbackTxtBlack,
        resolveColor,
        parseDashArray,
        formatDate,
        formatDuration,
        lineShortName,
        compareLegendLine,
        mergeLegendCardsBySettings,
        actionToState,
        actionLabel,
        haversineKm,
        pointToWorld,
        pathFromWorldPoints,
        offsetPolyline,
        partialWorldPath,
        bboxFromPoints,
        expandBBox,
        zoomForBBox,
        edgeKey,
        escapeHtml, partialBezierPathFromWorldEdge, tailBezierPathFromWorldEdge, closedBezierPathFromWorldPoints,
        terrainWorldPath,
        terrainColorOf,
    }
})()



createApp({
    setup() {
        function clampLocal(v, min, max) {
            v = Number(v)
            if (!Number.isFinite(v)) return min
            return Math.max(min, Math.min(max, v))
        }

        const data = ref(null)
        const workList = ref([])
        const selectedWorkName = ref('')
        const settingsOpen = ref(false)
        const debugOpen = ref(false)
        const settings = ref(BshistoryApp.normalizeSettings())

        const playing = ref(false)
        const playheadMs = ref(0)
const playSpeed = ref(1)
        const viewport = ref({
            w: window.innerWidth,
            h: window.innerHeight
        })

        const view = ref({
            cx: 0,
            cy: 0,
            zoom: 1
        })

        const runtimeReady = ref(false)
        const runtimeBuilding = ref(false)

        const runtime = ref({
            rootLines: [],
            lineHasAnyHistory: {},
            rootHasAnyHistory: {},
            edgeRecords: {},
            events: [],
            phases: [],
            totalMs: 0,
            debug: null
        })

        const events = shallowRef([])

        const debugHistory = computed(() => {
            const d = data.value || {}
            const loaded = Array.isArray(events.value) ? events.value : []
            const defs = [
                { key: 'line', label: '线路时间', raw: Array.isArray(d.historySegments) ? d.historySegments : [], match: ev => !ev.eventType || ev.eventType === 'line' },
                { key: 'station', label: '单点站时间', raw: Array.isArray(d.historyStations) ? d.historyStations : [], match: ev => ev.eventType === 'station' },
                { key: 'stationName', label: '站改名', raw: Array.isArray(d.historyStationNames) ? d.historyStationNames : [], match: ev => ev.eventType === 'stationName' },
                { key: 'lineName', label: '线路历史名称', raw: Array.isArray(d.historyLineNames) ? d.historyLineNames : [], match: ev => ev.eventType === 'lineMeta' && ev.hasRename },
                { key: 'lineColor', label: '线路历史颜色', raw: Array.isArray(d.historyLineColors) ? d.historyLineColors : [], match: ev => ev.eventType === 'lineMeta' && ev.hasRecolor }
            ]
            const labelOf = action => action === 'rename' ? '改名' : (BshistoryApp.actionLabel(action) || action || '未知')
            const groups = defs.map(def => {
                const arr = loaded.filter(def.match)
                const counts = new Map()
                for (const ev of arr) {
                    const action = String(ev.action || 'unknown')
                    counts.set(action, (counts.get(action) || 0) + 1)
                }
                const actions = [...counts.entries()]
                    .map(([action, count]) => ({ action, label: labelOf(action), count }))
                    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hans-CN'))
                return { key: def.key, label: def.label, raw: def.raw.length, loaded: arr.length, actions }
            })
            return {
                total: loaded.length,
                rawTotal: groups.reduce((n, g) => n + g.raw, 0),
                groups
            }
        })

        const stableRenderLayers = shallowRef([])  // 稳定边（很少变化）
        const renderTerrains = shallowRef([])
        const activeRenderLayers = shallowRef([]) // 活跃边（每帧变化，但元素极少）

        const renderStations = shallowRef([])
        const renderNames = shallowRef([])
        const legendCards = shallowRef([])
        const renderTerrainLabels = shallowRef([])
        const renderDistrictLabels = shallowRef([])
        const currentEvent = ref(null)
        const currentDateText = ref('----/--/--')
        const totalOperatingKm = ref(0)
        const totalOperatingStations = ref(0)

        const stepProgress = ref({
            stage: '未打开存档',
            detail: '',
            step: 0,
            total: 0,
            phase: '',
            percent: 0,
            renderMs: 0,
            layers: 0,
            stations: 0,
            names: 0
        })

        let runtimeWorkerMsgId = 1
        let runtimeWorker = null
        let progressEl = null
        let raf = 0
        let lastTs = 0
        let lastRenderTs = 0
        let edgeItemByLineEdgeKey = new Map()
        let edgeItems = []
        let recolorLineRangesCache = new Map()
        let eventByPlaySeq = new Map()
        // 线路名称/颜色历史索引：避免每帧、每条边重复扫描全部 runtime.events。
        let lineMetaEventsIndex = new Map()
        let stationEventsByPointIndex = new Map()
        let stationNameEventsIndex = new Map()
        let lineMetaStaticFrameCache = { key: '', names: new Map(), colors: new Map() }

        function rebuildLineMetaEventsIndex() {
            const idx = new Map()
            const stationIdx = new Map()
            const stationNameIdx = new Map()
            for (const ev of (runtime.value?.events || [])) {
                if (ev?.eventType === 'lineMeta' && ev.ownerId != null) {
                    const k = String(ev.ownerId)
                    if (!idx.has(k)) idx.set(k, [])
                    idx.get(k).push(ev)
                } else if (ev?.eventType === 'station') {
                    for (const id of (ev.pointIds || [])) {
                        const k = String(id)
                        if (!stationIdx.has(k)) stationIdx.set(k, [])
                        stationIdx.get(k).push(ev)
                    }
                } else if (ev?.eventType === 'stationName' && ev.staid != null) {
                    const k = String(ev.staid)
                    if (!stationNameIdx.has(k)) stationNameIdx.set(k, [])
                    stationNameIdx.get(k).push(ev)
                }
            }
            const sorter = (a,b)=>a.time!==b.time?a.time-b.time:a.playSeq-b.playSeq
            for (const arr of idx.values()) arr.sort(sorter)
            for (const arr of stationIdx.values()) arr.sort(sorter)
            for (const arr of stationNameIdx.values()) arr.sort(sorter)
            lineMetaEventsIndex = idx
            stationEventsByPointIndex = stationIdx
            stationNameEventsIndex = stationNameIdx
            lineMetaStaticFrameCache = { key: '', names: new Map(), colors: new Map() }
        }

        function lineMetaFrameKey(frame) {
            if (!frame) return 'none'
            // 动画帧的颜色会随 progress 连续变化，不放进静态缓存。
            return `${frame.time}|${frame.seqCutoff}|${frame.type}|${frame.currentEvent?.playSeq ?? ''}`
        }
        let bboxCache = new Map()

        const maps = computed(() => {
            const d = data.value
            const lines = new Map()
            const pts = new Map()
            const names = new Map()

            if (!d) {
                return {
                    lines,
                    pts,
                    names,
                    rootLines: []
                }
            }

            for (const l of d.lines || []) {
                lines.set(l.id, l)
                lines.set(String(l.id), l)
            }

            for (const p of d.pts || []) {
                pts.set(p.id, p)
                pts.set(String(p.id), p)
            }

            for (const n of d.names || []) {
                names.set(n.staid, n)
                names.set(String(n.staid), n)
            }

            const rootLines = (d.lines || [])
                .filter(l => !(l.parent > 0))
                .slice()
                .sort(BshistoryApp.compareLegendLine)

            return {
                lines,
                pts,
                names,
                rootLines
            }
        })

        const worldPts = computed(() => {
            const d = data.value
            const mp = new Map()

            if (!d) return mp

            for (const p of d.pts || []) {
                mp.set(p.id, BshistoryApp.pointToWorld(p, !!d.fictionalMode))
                mp.set(String(p.id), BshistoryApp.pointToWorld(p, !!d.fictionalMode))
            }

            return mp
        })

        const totalMs = computed(() => runtime.value.totalMs || 0)

        const legendGridStyle = computed(() => {
            const count = Math.max(1, legendCards.value.length)
            const cols = Math.max(1, Math.min(settings.value.legendMaxPerRow || 25, count))
            const cellW = Math.max(26, Math.floor((viewport.value.w * 0.96) / cols))
            const gap = Math.max(2, Math.min(10, Math.round(cellW * 0.08)))
            const font = Math.max(9, Math.min(18, Math.round(cellW * 0.28)))

            return {
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                columnGap: `${gap}px`,
                rowGap: `${Math.max(3, Math.round(gap * 0.75))}px`,
                fontSize: `${font}px`
            }
        })


        const stageTransform = computed(() => {
            const z = Math.max(0.000001, view.value.zoom || 1)
            const tx = viewport.value.w / 2 - view.value.cx * z
            const ty = viewport.value.h / 2 - view.value.cy * z

            return `matrix(${z} 0 0 ${z} ${tx} ${ty})`
        })
        function setStepProgress(patch) {
            stepProgress.value = Object.assign({}, stepProgress.value, patch || {})
            updateProgressPanel()
        }

        function ensureToolProgressPanel() {
            if (progressEl) return

            const tool = document.querySelector('.tool')
            if (!tool) return

            progressEl = document.createElement('div')
            progressEl.className = 'small-tip'
            progressEl.style.borderTop = '1px solid rgba(80,120,160,.25)'
            progressEl.style.paddingTop = '6px'
            progressEl.style.marginTop = '2px'
            progressEl.style.fontFamily = 'Consolas, "Microsoft YaHei", monospace'
            tool.appendChild(progressEl)

            updateProgressPanel()
        }

        function updateProgressPanel() {
            if (!progressEl) return

            const p = stepProgress.value
            const percent = Number.isFinite(p.percent) ? `${Math.round(p.percent * 100)}%` : '-'
            const stepText = p.total ? `${p.step || 0}/${p.total}` : '-'

            progressEl.innerHTML =
                `阶段：${BshistoryApp.escapeHtml(p.stage || '')}<br>` +
                `步骤：${BshistoryApp.escapeHtml(stepText)}　进度：${BshistoryApp.escapeHtml(percent)}<br>` +
                `片段：${BshistoryApp.escapeHtml(p.phase || '')}<br>` +
                `渲染：${Number(p.renderMs || 0).toFixed(1)}ms　图层：${p.layers || 0}<br>` +
                `站点：${p.stations || 0}　站名：${p.names || 0}<br>` +
                `${BshistoryApp.escapeHtml(p.detail || '')}`
        }

        function rootLineOf(line) {
            if (!line) return null
            return line.parent > 0
                ? maps.value.lines.get(line.parent) || maps.value.lines.get(String(line.parent)) || line
                : line
        }

        function rootIdOf(line) {
            const r = rootLineOf(line)
            return r?.id ?? line?.id ?? null
        }

        function effectiveLine(line) {
            return rootLineOf(line) || line
        }

        function stationText(pt) {
            if (!pt || pt.staid == null || pt.staid < 0) return ''
            const nm = maps.value.names.get(pt.staid) || maps.value.names.get(String(pt.staid))
            return nm?.name || ''
        }


        function badgeStyle(line) {
            const eff = effectiveLine(line) || line
            const c = eff?.color || '#888'
            return {
                background: c,
                color: BshistoryApp.fallbackTxtBlack(c)
            }
        }


        function legendCardStyle(card) {
            const base = { background: card.color, color: card.textColor }
            if (card.active) {
                const c = card.color || '#888'
                // 白色隔离环 + 彩色描边 + 扩散光晕 + 原有投影
                base.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${c}, 0 0 18px 6px ${c}99, 0 6px 20px rgba(0,0,0,.35)`
            }
            return base
        }


        function getBshistoryWorkerCount() {
            const hc = navigator.hardwareConcurrency || 4
            const hardwareSafe = Math.max(1, hc - 1)

            return Math.max(1, Math.min(
                hardwareSafe,
                settings.value.maxWorkers || 10
            ))
        }

        function askRuntimeWorker(msg) {
    if (!runtimeWorker) {
        runtimeWorker = new Worker('./bshistoryworkere.js?v=20260731-global-policy-1')
    }

    const id = runtimeWorkerMsgId++

    return new Promise((resolve, reject) => {
        const onMessage = e => {
            const res = e.data
            if (!res || res.id !== id) return

            if (res.progress) {
                setStepProgress({
                    stage: res.stage || 'worker',
                    detail: res.detail || '',
                    step: res.step || 0,
                    total: res.total || 0,
                    percent: res.total ? (res.step || 0) / res.total : 0
                })
                return
            }

            runtimeWorker.removeEventListener('message', onMessage)
            runtimeWorker.removeEventListener('error', onError)

            if (res.ok) {
                resolve(res)
            } else {
                reject(new Error(res.message || 'Worker 计算失败'))
            }
        }

        const onError = e => {
            runtimeWorker.removeEventListener('message', onMessage)
            runtimeWorker.removeEventListener('error', onError)
            reject(new Error(e?.message || 'bshistory.worker.js 加载或执行失败'))
        }

        runtimeWorker.addEventListener('message', onMessage)
        runtimeWorker.addEventListener('error', onError)

        runtimeWorker.postMessage({
            ...msg,
            id
        })
    })
}

        function normalizeRuntimeFromWorker(rt) {
            const out = rt || {
                rootLines: [],
                lineHasAnyHistory: {},
                rootHasAnyHistory: {},
                edgeRecords: {},
                events: [],
                phases: [],
                totalMs: 0,
                debug: null
            }

            for (const key of Object.keys(out.edgeRecords || {})) {
                const arr = out.edgeRecords[key] || []

                arr.sort((a, b) => {
                    if (a.t !== b.t) return a.t - b.t
                    return (a.playSeq ?? Infinity) - (b.playSeq ?? Infinity)
                })
            }

            return out
        }

        function normalizeTimeExprForBshistory(expr) {
            if (expr === null || expr === undefined) return ''

            if (typeof expr === 'number' && Number.isFinite(expr)) {
                return expr
            }

            let s = String(expr).trim()

            s = s.replace(
                /\b(\d{4})-(\d{1,2})-(\d{1,2})(?:T[^\s+\-*/()]*)?\b/g,
                (_, y, m, day) => `${y}/${m}/${day}`
            )

            return s
        }

        function makeRuntimeWorkerData(src) {
            function edgeIndexSetByPtIds(line, fromPtId, toPtId) {
                const ids = line?.pts || []
                const n = ids.length
                const out = []

                if (n < 2) return out

                const fromIdx = ids.findIndex(x => String(x) === String(fromPtId))
                const toIdx = ids.findIndex(x => String(x) === String(toPtId))

                if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return out

                if (!line.ring) {
                    const a = Math.min(fromIdx, toIdx)
                    const b = Math.max(fromIdx, toIdx)

                    for (let i = a; i < b; i++) out.push(i)

                    return out
                }

                if (fromIdx < toIdx) {
                    for (let i = fromIdx; i < toIdx; i++) out.push(i)
                } else {
                    for (let i = fromIdx; i < n - 1; i++) out.push(i)
                    out.push(n - 1)
                    for (let i = 0; i < toIdx; i++) out.push(i)
                }

                return out
            }
            function ensureRecordPtIds(line, r) {
    if (!line || !Array.isArray(line.pts)) return null

    let fromPtId = r.fromPtId
    let toPtId = r.toPtId

    if (
        (fromPtId === undefined || toPtId === undefined) &&
        r.fromIdx !== undefined &&
        r.toIdx !== undefined
    ) {
        fromPtId = line.pts[Number(r.fromIdx)]
        toPtId = line.pts[Number(r.toIdx)]
    }

    if (fromPtId === undefined || toPtId === undefined) return null
    if (String(fromPtId) === String(toPtId)) return null

    return { fromPtId, toPtId }
}
            const d = JSON.parse(JSON.stringify(src))

            if (window.HistoryUtil?.normalizeData) {
                HistoryUtil.normalizeData(d)
            }

            if (window.TimeVarUtil?.normalizeVars) {
                TimeVarUtil.normalizeVars(d)
            }

            function makeTimeEvalData() {
                const x = JSON.parse(JSON.stringify(d))

                if (!Array.isArray(x.timeVars)) x.timeVars = []

                for (const v of x.timeVars) {
                    if (!v) continue

                    if (v.key === undefined) v.key = ''
                    if (v.value === undefined) v.value = ''
                    if (v.desc === undefined) v.desc = ''

                    v.key = String(v.key).trim()
                    v.value = normalizeTimeExprForBshistory(v.value)
                }

                return x
            }

            const timeEvalData = makeTimeEvalData()

            function parseDateLocal(s) {
                s = normalizeTimeExprForBshistory(s)

                const m = String(s).trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
                if (!m) return null

                const y = +m[1]
                const mo = +m[2]
                const day = +m[3]

                const dt = new Date(y, mo - 1, day)

                if (
                    dt.getFullYear() !== y ||
                    dt.getMonth() !== mo - 1 ||
                    dt.getDate() !== day
                ) {
                    return null
                }

                return dt
            }

            function addDateLocal(dt, amount, unit) {
                const r = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())

                if (unit === 'y') {
                    r.setFullYear(r.getFullYear() + amount)
                } else if (unit === 'm') {
                    r.setMonth(r.getMonth() + amount)
                } else if (unit === 'd') {
                    r.setDate(r.getDate() + amount)
                }

                return r
            }

            function getTimeVarValueByKeyLoose(key) {
                key = String(key || '').trim()

                const vars = timeEvalData.timeVars || []

                let item = vars.find(v => String(v?.key || '').trim() === key)
                if (item) return item.value

                const low = key.toLowerCase()
                item = vars.find(v => String(v?.key || '').trim().toLowerCase() === low)

                if (item) return item.value

                return undefined
            }

            function evalTimeExprLoose(expr, stack = []) {
                expr = normalizeTimeExprForBshistory(expr)

                if (typeof expr === 'number' && Number.isFinite(expr)) {
                    return expr
                }

                expr = String(expr || '').trim()
                if (!expr) return NaN

                if (/^\d{10,}$/.test(expr)) {
                    const n = Number(expr)
                    if (Number.isFinite(n)) return n
                }

                const directDate = parseDateLocal(expr)
                if (directDate) {
                    return new Date(
                        directDate.getFullYear(),
                        directDate.getMonth(),
                        directDate.getDate()
                    ).getTime()
                }

                const m = expr.match(/^(.+?)([+\-])\s*(\d+)\s*([dmy])$/i)

                if (m) {
                    const left = String(m[1]).trim()
                    const op = m[2]
                    const amount = Number(m[3]) * (op === '+' ? 1 : -1)
                    const unit = m[4].toLowerCase()

                    const baseTime = evalTimeExprLoose(left, stack)

                    if (!Number.isFinite(baseTime)) return NaN

                    const base = new Date(baseTime)
                    const r = addDateLocal(base, amount, unit)

                    return new Date(
                        r.getFullYear(),
                        r.getMonth(),
                        r.getDate()
                    ).getTime()
                }

                if (stack.includes(expr)) {
                    console.warn('[bshistory] 时间变量循环引用：', stack.concat(expr).join(' -> '))
                    return NaN
                }

                const varValue = getTimeVarValueByKeyLoose(expr)

                if (varValue !== undefined) {
                    return evalTimeExprLoose(varValue, stack.concat(expr))
                }

                return NaN
            }

            function evalTimeSafe(expr) {
                const fixedExpr = normalizeTimeExprForBshistory(expr)

                if (window.HistoryUtil?.evalTime) {
                    const t = HistoryUtil.evalTime(fixedExpr, timeEvalData)
                    if (Number.isFinite(t)) return t
                }

                const t2 = evalTimeExprLoose(fixedExpr)
                if (Number.isFinite(t2)) return t2

                return NaN
            }

            const linesMap = new Map()
            const ptsMap = new Map()

            for (const line of d.lines || []) {
                linesMap.set(line.id, line)
                linesMap.set(String(line.id), line)
            }

            for (const pt of d.pts || []) {
                ptsMap.set(pt.id, pt)
                ptsMap.set(String(pt.id), pt)
            }

            // 点本身并不可靠地携带 lineid；按线路的 pts 建立反向索引。
            // 站改名事件需要据此找到该站在事件时刻真正运营的所有线路。
            const pointLinesMap = new Map()
            for (const line of d.lines || []) {
                for (const pid of line.pts || []) {
                    const key = String(pid)
                    if (!pointLinesMap.has(key)) pointLinesMap.set(key, [])
                    pointLinesMap.get(key).push(line)
                }
            }

            function actionToState(action) {
                return window.HistoryUtil?.actionToState
                    ? HistoryUtil.actionToState(action)
                    : BshistoryApp.actionToState(action)
            }

            function edgeIndexSet(line, fromPtId, toPtId) {
                if (window.HistoryUtil?.historyGetEdgeIndexSetByPtIds) {
                    return [...HistoryUtil.historyGetEdgeIndexSetByPtIds(
                        line,
                        fromPtId,
                        toPtId
                    )].sort((a, b) => a - b)
                }

                const ids = line?.pts || []
                const n = ids.length
                const out = []

                if (n < 2) return out

                const fromIdx = ids.findIndex(x => String(x) === String(fromPtId))
                const toIdx = ids.findIndex(x => String(x) === String(toPtId))

                if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return out

                if (!line.ring) {
                    const a = Math.min(fromIdx, toIdx)
                    const b = Math.max(fromIdx, toIdx)

                    for (let i = a; i < b; i++) out.push(i)

                    return out
                }

                if (fromIdx < toIdx) {
                    for (let i = fromIdx; i < toIdx; i++) out.push(i)
                } else {
                    for (let i = fromIdx; i < n - 1; i++) out.push(i)
                    out.push(n - 1)
                    for (let i = 0; i < toIdx; i++) out.push(i)
                }

                return out
            }

            function pointSeqForRecord(line, r) {
    if (window.HistoryUtil?.historyGetPointSeqByPtIds) {
        return HistoryUtil.historyGetPointSeqByPtIds(
            line,
            r.fromPtId,
            r.toPtId
        )
    }

    const ids = line?.pts || []
    const n = ids.length

    if (n < 2) return []

    const fromIdx = ids.findIndex(x => String(x) === String(r.fromPtId))
    const toIdx = ids.findIndex(x => String(x) === String(r.toPtId))

    if (fromIdx < 0 || toIdx < 0) return []

    if (!line.ring) {
        const a = Math.min(fromIdx, toIdx)
        const b = Math.max(fromIdx, toIdx)
        const out = []

        for (let i = a; i <= b; i++) out.push(ids[i])

        return out
    }

    const out = []
    let i = fromIdx
    let guard = 0

    out.push(ids[i])

    while (i !== toIdx && guard < n) {
        i = (i + 1) % n
        out.push(ids[i])
        guard++
    }

    return out
}

            function distKm(a, b) {
                return BshistoryApp.haversineKm(a, b, !!d.fictionalMode)
            }

            function rootLineId(line) {
                if (!line) return null
                return line.parent > 0 ? line.parent : line.id
            }

            const eventsOut = []

            let skippedNoLine = 0
            let skippedBadTime = 0
            let skippedBadEdge = 0

            const badTimeSamples = []
            const total = (d.historySegments || []).length

            for (let i = 0; i < total; i++) {
                if (i % 25 === 0) {
                    setStepProgress({
                        stage: '解析发展史',
                        detail: `正在解析 historySegments：${i}/${total}`,
                        step: i,
                        total,
                        percent: total ? i / total : 0
                    })
                }

                const r = d.historySegments[i]

                if (!!r.connector) continue

                const ownerId = r.ownerId ?? r.lineId
                const line = linesMap.get(ownerId) || linesMap.get(String(ownerId))

                if (!line) {
                    skippedNoLine++
                    continue
                }

                const t = evalTimeSafe(r.time)

                if (!Number.isFinite(t)) {
                    skippedBadTime++

                    if (badTimeSamples.length < 10) {
                        badTimeSamples.push({
                            index: i,
                            id: r.id,
                            raw: r.time,
                            fixed: normalizeTimeExprForBshistory(r.time)
                        })
                    }

                    continue
                }
const idsInfo = ensureRecordPtIds(line, r)

if (!idsInfo) {
    skippedBadEdge++
    continue
}

const edgeIdxs = window.HistoryUtil?.historyGetEdgeIndexSetByPtIds
    ? [...HistoryUtil.historyGetEdgeIndexSetByPtIds(line, idsInfo.fromPtId, idsInfo.toPtId)].sort((a, b) => a - b)
    : edgeIndexSetByPtIds(line, idsInfo.fromPtId, idsInfo.toPtId)

if (!edgeIdxs.length) {
    skippedBadEdge++
    continue
}

const pointIds = pointSeqForRecord(line, {
    ...r,
    fromPtId: idsInfo.fromPtId,
    toPtId: idsInfo.toPtId
})

                if (pointIds.length < 2) {
                    skippedBadEdge++
                    continue
                }


                let km = 0

                for (let k = 0; k < pointIds.length - 1; k++) {
                    const a = ptsMap.get(pointIds[k]) || ptsMap.get(String(pointIds[k]))
                    const b = ptsMap.get(pointIds[k + 1]) || ptsMap.get(String(pointIds[k + 1]))

                    km += distKm(a, b)
                }

                eventsOut.push({
                    id: r.id ?? i,
                    srcIndex: i,
                    ownerId: line.id,
                    rootId: rootLineId(line),
                    action: r.action,
                    state: actionToState(r.action),
                    time: t,
                    rawTime: r.time,
                    fixedTimeExpr: normalizeTimeExprForBshistory(r.time),
                  fromPtId: idsInfo.fromPtId,
toPtId: idsInfo.toPtId,
                    pointIds,
                    edgeIdxs,
                    km
                })
            }

            // 单点车站时间记录也必须进入演示器时间轴。
            // 旧版这里只解析 historySegments，导致 historyStations 只能在时间跳变后静态生效，
            // 没有独立事件、动画和停顿。
            const stationRecords = Array.isArray(d.historyStations) ? d.historyStations : []
            for (let i = 0; i < stationRecords.length; i++) {
                const r = stationRecords[i]
                const t = evalTimeSafe(r.time)
                if (!Number.isFinite(t)) continue

                let pointIds = []
                if (r.ptId !== undefined && r.ptId !== null) {
                    const p = ptsMap.get(r.ptId) || ptsMap.get(String(r.ptId))
                    if (p?.sta) pointIds = [p.id]
                } else {
                    pointIds = (d.pts || [])
                        .filter(p => p?.sta && String(p.staid) === String(r.staid))
                        .map(p => p.id)
                }
                if (!pointIds.length) continue

                const firstPt = ptsMap.get(pointIds[0]) || ptsMap.get(String(pointIds[0]))
                const line = firstPt
                    ? (linesMap.get(firstPt.lineid) || linesMap.get(String(firstPt.lineid)))
                    : null
                const ownerId = line?.id ?? `station-${r.staid}`
                const rootId = line ? rootLineId(line) : ownerId

                eventsOut.push({
                    id: r.id ?? `station-${i}`,
                    srcIndex: total + i,
                    eventType: 'station',
                    ownerId,
                    rootId,
                    action: r.action,
                    state: actionToState(r.action),
                    time: t,
                    rawTime: r.time,
                    fixedTimeExpr: normalizeTimeExprForBshistory(r.time),
                    staid: r.staid,
                    ptId: r.ptId ?? null,
                    pointIds,
                    edgeIdxs: [],
                    km: 0
                })
            }

            // 站团历史名称：记录表示旧名称使用至该时间，播放时切换为下一名称。
            const nameRecords = Array.isArray(d.historyStationNames) ? d.historyStationNames : []
            const namesByStaid = new Map()
            for (const r of nameRecords) {
                const t = evalTimeSafe(r.time)
                if (!Number.isFinite(t)) continue
                const key = String(r.staid)
                if (!namesByStaid.has(key)) namesByStaid.set(key, [])
                namesByStaid.get(key).push({ ...r, _resolvedTime: t })
            }
            const currentNameByStaid = new Map((d.names || []).map(n => [String(n.staid), n.name || '']))

            function stationPointStateBefore(p, time) {
                const recs = stationRecords.filter(r => {
                    if (r.ptId !== undefined && r.ptId !== null) return String(r.ptId) === String(p.id)
                    return String(r.staid) === String(p.staid)
                }).map(r => ({ r, t: evalTimeSafe(r.time) })).filter(x => Number.isFinite(x.t)).sort((a,b) => a.t-b.t)
                if (!recs.length) return d.defaultStyles?.defaultStaticState || 'operating'
                if (time < recs[0].t) return 'none'
                let state = d.defaultStyles?.defaultStaticState || 'operating'
                for (const x of recs) {
                    if (x.t > time) break
                    state = actionToState(x.r.action)
                }
                return state
            }

            function stationGroupExistsBefore(staid, time) {
                const lineRuntime = window.HistoryUtil?.buildStationRuntimeMap
                    ? HistoryUtil.buildStationRuntimeMap(d, d.lines || [], ptsMap, time)
                    : null
                for (const p of (d.pts || [])) {
                    if (!p?.sta || String(p.staid) !== String(staid)) continue
                    const li = lineRuntime?.get(p.id) || lineRuntime?.get(String(p.id))
                    if (li && !li.hasExistingLine) continue
                    if (stationPointStateBefore(p, time) !== 'none') return true
                }
                return false
            }

            let nameSrcIndex = total + stationRecords.length
            for (const [staid, arr] of namesByStaid) {
                arr.sort((a,b) => a._resolvedTime !== b._resolvedTime ? a._resolvedTime-b._resolvedTime : Number(a.id||0)-Number(b.id||0))
                for (let i = 0; i < arr.length; i++) {
                    const r = arr[i]
                    const fromName = String(r.name || '').trim()
                    const toName = String(i + 1 < arr.length ? (arr[i+1].name || '') : (currentNameByStaid.get(staid) || '')).trim()
                    if (fromName === toName) continue
                    // 严格检查事件发生前一刻；同一时刻刚出现的站团不会生成改名动画。
                    if (!stationGroupExistsBefore(staid, r._resolvedTime - 1)) continue
                    const groupPts = (d.pts || []).filter(p => p?.sta && String(p.staid) === staid)
                    const pointIds = groupPts.map(p => p.id)
                    if (!pointIds.length) continue
                    const eventTimeBefore = r._resolvedTime - 1
                    const activeRoots = new Map()

                    function lineOperatingAtPoint(line, pointId, time) {
                        if (!line || !window.HistoryUtil?.splitLineByHistory) return false
                        const segs = HistoryUtil.splitLineByHistory(line, ptsMap, d, time, false, linesMap)
                        return (segs || []).some(seg => {
                            if (seg.state !== 'operating') return false
                            return (seg.pts || []).some(sp => String(sp?.id) === String(pointId))
                        })
                    }

                    for (const p of groupPts) {
                        // 单点本身在改名前必须已经运营。
                        if (stationPointStateBefore(p, eventTimeBefore) !== 'operating') continue

                        // 再逐条核对经过该具体点的线路，而不是依赖不存在/不稳定的 p.lineid。
                        for (const li of (pointLinesMap.get(String(p.id)) || [])) {
                            if (!lineOperatingAtPoint(li, p.id, eventTimeBefore)) continue
                            const rid = rootLineId(li)
                            const root = linesMap.get(rid) || linesMap.get(String(rid)) || li
                            activeRoots.set(String(rid), {
                                id: rid,
                                name: root.name || li.name || '',
                                color: root.color || li.color || '#888'
                            })
                        }
                    }
                    const activeLines = [...activeRoots.values()]
                    const firstLine = activeLines[0] || null
                    const ownerId = firstLine?.id ?? `station-name-${staid}`
                    eventsOut.push({
                        id: r.id ?? `station-name-${staid}-${i}`, srcIndex: nameSrcIndex++,
                        eventType: 'stationName', ownerId, rootId: firstLine?.id ?? ownerId,
                        action: 'rename', state: null, time: r._resolvedTime, rawTime: r.time,
                        fixedTimeExpr: normalizeTimeExprForBshistory(r.time), staid: r.staid,
                        pointIds, edgeIdxs: [], km: 0, fromName, toName, activeLines
                    })
                }
            }

            // 线路历史名称 / 颜色：和站名历史一样，记录表示旧值使用至该时间。
            // 同一线路、同一时刻的改名与改色合并成一个 lineMeta 事件。
            const lineNameRecords = Array.isArray(d.historyLineNames) ? d.historyLineNames : []
            const lineColorRecords = Array.isArray(d.historyLineColors) ? d.historyLineColors : []
            const metaEventsByKey = new Map()
            let lineMetaSrcIndex = nameSrcIndex + 100000

            function addLineMetaPart(line, t, rawTime, part) {
                const key = `${String(line.id)}|${t}`
                let x = metaEventsByKey.get(key)
                if (!x) {
                    x = {
                        id: `line-meta-${line.id}-${t}`, srcIndex: lineMetaSrcIndex++, eventType: 'lineMeta',
                        ownerId: line.id, rootId: rootLineId(line), action: 'lineMeta', state: null,
                        time: t, rawTime, fixedTimeExpr: normalizeTimeExprForBshistory(rawTime),
                        pointIds: (line.pts || []).slice(), edgeIdxs: [], km: 0,
                        fromName: null, toName: null, fromColor: null, toColor: null,
                        hasRename: false, hasRecolor: false
                    }
                    // 用完整线路长度作为改色动画时长依据。
                    for (let k = 0; k < x.pointIds.length - 1; k++) {
                        const a = ptsMap.get(x.pointIds[k]) || ptsMap.get(String(x.pointIds[k]))
                        const b = ptsMap.get(x.pointIds[k+1]) || ptsMap.get(String(x.pointIds[k+1]))
                        x.km += distKm(a, b)
                    }
                    metaEventsByKey.set(key, x)
                }
                Object.assign(x, part)
            }

            const nameByLine = new Map()
            for (const r of lineNameRecords) {
                const t = evalTimeSafe(r.time); if (!Number.isFinite(t)) continue
                const key = String(r.lineId ?? r.ownerId)
                if (!nameByLine.has(key)) nameByLine.set(key, [])
                nameByLine.get(key).push({ ...r, _resolvedTime: t })
            }
            for (const [lineId, arr] of nameByLine) {
                const line = linesMap.get(lineId) || linesMap.get(String(lineId)); if (!line) continue
                arr.sort((a,b)=>a._resolvedTime!==b._resolvedTime?a._resolvedTime-b._resolvedTime:Number(a.id||0)-Number(b.id||0))
                for (let i=0;i<arr.length;i++) {
                    const r=arr[i]
                    const fromName=String(r.name||'').trim()
                    const toName=String(i+1<arr.length?(arr[i+1].name||''):(line.name||'')).trim()
                    if (fromName===toName) continue
                    addLineMetaPart(line, r._resolvedTime, r.time, { hasRename:true, fromName, toName })
                }
            }

            const colorByLine = new Map()
            for (const r of lineColorRecords) {
                const t = evalTimeSafe(r.time); if (!Number.isFinite(t)) continue
                const key = String(r.lineId ?? r.ownerId)
                if (!colorByLine.has(key)) colorByLine.set(key, [])
                colorByLine.get(key).push({ ...r, _resolvedTime: t })
            }
            for (const [lineId, arr] of colorByLine) {
                const line = linesMap.get(lineId) || linesMap.get(String(lineId)); if (!line) continue
                arr.sort((a,b)=>a._resolvedTime!==b._resolvedTime?a._resolvedTime-b._resolvedTime:Number(a.id||0)-Number(b.id||0))
                for (let i=0;i<arr.length;i++) {
                    const r=arr[i]
                    const fromColor=String(r.color||line.color||'#888888')
                    const toColor=String(i+1<arr.length?(arr[i+1].color||line.color):(line.color||'#888888'))
                    if (fromColor.toLowerCase()===toColor.toLowerCase()) continue
                    addLineMetaPart(line, r._resolvedTime, r.time, { hasRecolor:true, fromColor, toColor })
                }
            }
            eventsOut.push(...metaEventsByKey.values())

            d._bshistoryEvents = eventsOut
            d._bshistoryDebug = {
                historySegments: total,
                timeVars: (timeEvalData.timeVars || []).map(v => ({
                    key: v.key,
                    value: v.value
                })),
                events: eventsOut.length,
                skippedNoLine,
                skippedBadTime,
                skippedBadEdge,
                badTimeSamples
            }

            console.log('[bshistory] runtime input', d._bshistoryDebug)

            return d
        }

        function getLineEffectiveStrokeStyleId(line) {
            const d = data.value
            const eff = effectiveLine(line)

            if (eff?.settings?.strokeStyleId != null) {
                return eff.settings.strokeStyleId
            }

            for (const tagObj of d?.tags || []) {
                if (tagObj.name === 'all') continue
                if (!eff?.tag?.includes?.(tagObj.name)) continue
                if (tagObj.strokeStyleId != null) return tagObj.strokeStyleId
            }

            return d?.defaultStyles?.strokeStyleId ?? null
        }

        function getGjTypeByEdgeIndex(line, edgeIdx) {
            const ids = line?.pts || []
            const n = ids.length

            if (n < 2) return 0

            const fromPtId = ids[edgeIdx % n]
            const toPtId = ids[(edgeIdx + 1) % n]

            if (typeof window.gjGetEdgeType === 'function') {
                const t = gjGetEdgeType(line, fromPtId, toPtId)

                if (t === 1 || t === '1' || t === 'elevated') return 1
                if (t === -1 || t === '-1' || t === 'underground') return -1

                return 0
            }

            const seg = (line.segments || []).find(s =>
                s.fromPtId === fromPtId && s.toPtId === toPtId
            )

            if (seg?.type === 1 || seg?.type === 'elevated') return 1
            if (seg?.type === -1 || seg?.type === 'underground') return -1

            return 0
        }

        function getGjStyleId(line, type) {
            if (!type) return null

            if (typeof window.gjGetStyleId === 'function') {
                return gjGetStyleId(
                    line,
                    type,
                    data.value?.defaultStyles || {},
                    maps.value.lines
                )
            }

            const eff = effectiveLine(line)
            const key = type === 1 ? 'elevatedStyleId' : 'undergroundStyleId'

            return eff?.settings?.[key] ??
                data.value?.defaultStyles?.[key] ??
                getLineEffectiveStrokeStyleId(line)
        }


        function buildStyleLayers(line, worldPoints, styleId, keyBase, extra = {}) {
            if (!styleId || !worldPoints || worldPoints.length < 2) return []

            const strokeStyle = styleByIdMap.get(String(styleId))
            if (!strokeStyle?.layers?.length) return []

            const baseWidth = extra.baseWidth ?? worldLineWidth(line)
            const lineColor = extra.lineColor ?? (effectiveLine(line)?.color || line?.color || '#333')

            const layers = []
            const prevNeighbor = extra.prevNeighbor || null
            const nextNeighbor = extra.nextNeighbor || null
            const activeEdge = extra.activeEdge || null

            for (let i = 0; i < strokeStyle.layers.length; i++) {
                const layer = strokeStyle.layers[i]

                const resolvedStroke = extra.stroke || BshistoryApp.resolveColor(layer.color, lineColor)
                const opacity = (layer.opacity ?? 1) * (extra.opacity ?? 1)
                const thick = (layer.thickness ?? 1) * baseWidth

                if (resolvedStroke === 'none' || opacity <= 0.001 || thick <= 0.000001) continue

                const offset = (layer.normalOffset ?? 0) * baseWidth
                let path = ''

                if (activeEdge && activeEdge.fraction < 0.999999) {
                    path = activePartialPathWithOffset(activeEdge, prevNeighbor, nextNeighbor, 0)
                } else {
                    const pts = BshistoryApp.offsetPolyline(worldPoints, offset)

                    const prev = prevNeighbor
                        ? BshistoryApp.offsetPolyline([prevNeighbor, worldPoints[0]], offset)[0]
                        : null

                    const next = nextNeighbor
                        ? BshistoryApp.offsetPolyline([worldPoints[worldPoints.length - 1], nextNeighbor], offset)[1]
                        : null

                    path = BshistoryApp.pathFromWorldPoints(pts, prev, next)
                }

                if (!path) continue

                layers.push({
                    key: `${keyBase}-${i}-${extra.suffix || ''}`,
                    d: path,
                    stroke: resolvedStroke,
                    strokeWidth: thick,
                    dash: BshistoryApp.parseDashArray(layer.dash || '', baseWidth),
                    opacity,
                    // 关键：动画段起点不能 round，否则会和上一段半透明叠加；
                    // 但不能裁剪，否则会出现白色空区。
                    linecap: activeEdge && activeEdge.fraction < 0.999999 ? 'butt' : 'butt'
                })

                // if (activeEdge && activeEdge.fraction < 0.999999) {
                //     const tip = fastPathCursor(
                //         { world: [activeEdge.fromWorld, activeEdge.toWorld], worldTotal: 1, worldCumLen: [0, 1] },
                //         activeEdge.fraction
                //     ).tip

                //     if (tip) {
                //         layers.push({
                //             key: `${keyBase}-${i}-${extra.suffix || ''}-tipcap`,
                //             d: `M ${tip.x},${tip.y} L ${tip.x},${tip.y}`,
                //             stroke: resolvedStroke,
                //             strokeWidth: thick,
                //             dash: '',
                //             opacity,
                //             linecap: 'round'
                //         })
                //     }
                // }
            }

            return layers
        }
        function buildFallbackLayer(edgeItem, pts, key, prevNeighbor = null, nextNeighbor = null, opacity = 1, pathD = '', frame = null) {
            return {
                key: `fallback-${key}`,
                d: pathD || BshistoryApp.pathFromWorldPoints(pts, prevNeighbor, nextNeighbor),
                stroke: frame ? lineColorForEdgeAtFrame(edgeItem, frame) : (edgeItem.lineColor || '#333'),
                strokeWidth: edgeItem.lineWidth,
                dash: '',
                opacity,
                linecap: 'butt'
            }
        }


        // 顶部 Action/HUD 也必须消费与地图相同的时态数据。
        // 名称永远通过 staid 解析；改名涉及线路永远通过站团索引 + 当时实际运营状态解析。
        function hudEventNameFrame(ev) {
            return {
                type: 'empty',
                time: ev?.time ?? 0,
                // HUD 描述“该日期/事件时刻的名称”。同一时刻若站出现并改名，直接使用新名称。
                seqCutoff: Infinity,
                currentEvent: null,
                progress: 1
            }
        }

        function historicalStationTextForEvent(staid, ev) {
            if (staid == null || staid < 0) return ''
            return effectiveStationNameAtFrame(staid, hudEventNameFrame(ev))
        }

        function resolveLineForStationEvent(ev, firstPt) {
            let line = maps.value.lines.get(ev?.ownerId) || maps.value.lines.get(String(ev?.ownerId))
            if (!line) line = maps.value.lines.get(ev?.rootId) || maps.value.lines.get(String(ev?.rootId))
            if (line || !firstPt) return line || null

            const seen = new Set()
            for (const li of maps.value.lines.values()) {
                if (!li || seen.has(li)) continue
                seen.add(li)
                if ((li.pts || []).some(id => String(id) === String(firstPt.id))) return li
            }
            return null
        }

        // HUD 不再自行扫描 edgeItems 反推线路。
        // 所有“该站团当时有哪些运营线路”的信息统一由 temporal snapshot 产出。
        function operatingRootLinesForStationAtFrame(staid, frame) {
            const snapshot = resolveStationTemporalSnapshot(frame)
            const group = snapshot.stationStates.get(staid) || snapshot.stationStates.get(String(staid))
            if (!group) return []
            return (group.operatingRootLineIds || []).map(id => {
                const line = maps.value.lines.get(id) || maps.value.lines.get(String(id))
                return {
                    id,
                    name: line?.name || '',
                    color: line?.color || '#888'
                }
            }).filter(x => x.name)
        }

        function hydrateRuntimeEvent(ev) {
            if (!ev) return null

            if (ev.eventType === 'lineMeta') {
                const line = maps.value.lines.get(ev.ownerId) || maps.value.lines.get(String(ev.ownerId))
                if (!line) return null
                const rootLine = rootLineOf(line)
                const pointIds = (line.pts || []).filter(id => worldPts.value.has(id) || worldPts.value.has(String(id)))
                const world = pointIds.map(id => worldPts.value.get(id) || worldPts.value.get(String(id))).filter(Boolean)
                const beforeFrame = { type:'empty', time:ev.time, seqCutoff:ev.playSeq, currentEvent:null, progress:1 }
                const oldName = ev.fromName || effectiveLineNameAtFrame(line.id, beforeFrame)
                const newName = ev.toName || oldName
                let rangeText = ''
                if (ev.hasRename && ev.hasRecolor) rangeText = `改名：${oldName}→${newName}；改色`
                else if (ev.hasRename) rangeText = `改名：${oldName}→${newName}`
                else rangeText = `线路改色`
                return { ...ev, line, rootLine, pointIds, world, pointProgress:{}, edgeProgress:{},
                    rangeText, lineBadgeName: oldName || line.name || '', lineBadgeColor: ev.fromColor || effectiveLineColorAtFrame(line.id,beforeFrame),
                    worldCumLen:new Float64Array(Math.max(1,world.length)), worldTotal:Math.max(0,ev.km||0) }
            }

            if (ev.eventType === 'stationName') {
                const pointIds = (ev.pointIds || []).filter(id => maps.value.pts.has(id) || maps.value.pts.has(String(id)))
                const world = pointIds.map(id => worldPts.value.get(id) || worldPts.value.get(String(id))).filter(Boolean)
                const beforeFrame = { type: 'empty', time: ev.time, seqCutoff: ev.playSeq, currentEvent: null, progress: 1 }
                const activeLines = operatingRootLinesForStationAtFrame(ev.staid, beforeFrame)
                return { ...ev, pointIds, world, pointProgress: {}, edgeProgress: {},
                    rangeText: `改名：${ev.fromName || ''}→${ev.toName || ''}`,
                    lineBadgeText: activeLines.map(x => x.name).filter(Boolean).join(' / ') || '未开通车站',
                    lineBadgeColor: activeLines[0]?.color || '#888',
                    activeLines,
                    worldCumLen: new Float64Array(Math.max(1, pointIds.length)), worldTotal: 0 }
            }

            if (ev.eventType === 'station') {
                const pointIds = (ev.pointIds || []).filter(id =>
                    maps.value.pts.has(id) || maps.value.pts.has(String(id))
                )
                const firstPt = pointIds.length
                    ? (maps.value.pts.get(pointIds[0]) || maps.value.pts.get(String(pointIds[0])))
                    : null
                const line = resolveLineForStationEvent(ev, firstPt)
                const rootLine = line ? rootLineOf(line) : null
                const staid = ev.staid ?? firstPt?.staid
                const label = historicalStationTextForEvent(staid, ev) || `车站 ${staid ?? ''}`
                return {
                    ...ev,
                    line,
                    lineId: line?.id ?? null,
                    rootLine,
                    rootId: rootLine?.id ?? ev.rootId,
                    pointIds,
                    world: pointIds.map(id => worldPts.value.get(id) || worldPts.value.get(String(id))).filter(Boolean),
                    pointProgress: Object.fromEntries(pointIds.flatMap(id => [[id, 0], [String(id), 0]])),
                    edgeProgress: {},
                    rangeText: `（${label || '单点车站'}）`,
                    lineBadgeName: line ? effectiveLineNameAtFrame(line.id, hudEventNameFrame(ev)) : '',
                    lineBadgeColor: line ? effectiveLineColorAtFrame(line.id, hudEventNameFrame(ev)) : '#888',
                    worldCumLen: new Float64Array(Math.max(1, pointIds.length)),
                    worldTotal: 0
                }
            }

            const line = maps.value.lines.get(ev.ownerId) || maps.value.lines.get(String(ev.ownerId))
            if (!line) return null

            const rootLine = rootLineOf(line)
            const rawPointIds = Array.isArray(ev.pointIds) ? ev.pointIds : []

            const pairs = rawPointIds
                .map(id => ({
                    id,
                    p: worldPts.value.get(id) || worldPts.value.get(String(id))
                }))
                .filter(x => !!x.p)

            const pointIds = pairs.map(x => x.id)
            const world = pairs.map(x => x.p)

            const firstPt = maps.value.pts.get(pointIds[0]) || maps.value.pts.get(String(pointIds[0]))
            const lastPt = maps.value.pts.get(pointIds[pointIds.length - 1]) || maps.value.pts.get(String(pointIds[pointIds.length - 1]))

            const aName = historicalStationTextForEvent(firstPt?.staid, ev) || '起点'
            const bName = historicalStationTextForEvent(lastPt?.staid, ev) || '终点'

            const pointProgress = {}
            let total = 0
            const lens = []

            for (let i = 0; i < world.length - 1; i++) {
                const len = Math.hypot(
                    world[i + 1].x - world[i].x,
                    world[i + 1].y - world[i].y
                )

                lens.push(len)
                total += len
            }

            let acc = 0

            if (pointIds.length) {
                pointProgress[pointIds[0]] = 0
                pointProgress[String(pointIds[0])] = 0
            }

            for (let i = 0; i < lens.length; i++) {
                acc += lens[i]
                const k = total > 0 ? acc / total : 1
                pointProgress[pointIds[i + 1]] = k
                pointProgress[String(pointIds[i + 1])] = k
            }

            const edgeProgress = {}
            const ptIndex = new Map()

            for (let i = 0; i < (line.pts || []).length; i++) {
                ptIndex.set(line.pts[i], i)
                ptIndex.set(String(line.pts[i]), i)
            }

            const n = line.pts?.length || 0

            for (let i = 0; i < pointIds.length - 1; i++) {
                const aId = pointIds[i]
                const bId = pointIds[i + 1]
                const ia = ptIndex.get(aId) ?? ptIndex.get(String(aId))
                const ib = ptIndex.get(bId) ?? ptIndex.get(String(bId))

                if (!Number.isFinite(ia) || !Number.isFinite(ib)) continue

                let edgeIdx = -1

                if (ib === ia + 1) {
                    edgeIdx = ia
                } else if (ia === ib + 1) {
                    edgeIdx = ib
                } else if (line.ring && ia === n - 1 && ib === 0) {
                    edgeIdx = n - 1
                } else if (line.ring && ia === 0 && ib === n - 1) {
                    edgeIdx = n - 1
                }

                if (edgeIdx < 0) continue

                const start = pointProgress[aId] ?? pointProgress[String(aId)] ?? 0
                const end = pointProgress[bId] ?? pointProgress[String(bId)] ?? 1

                edgeProgress[BshistoryApp.edgeKey(line.id, edgeIdx)] = {
                    start: Math.min(start, end),
                    end: Math.max(start, end),
                    fromPtId: aId,
                    toPtId: bId
                }
            }
            const worldCumLen = new Float64Array(world.length)
            let worldTotal = 0
            for (let i = 0; i < world.length - 1; i++) {
                worldTotal += Math.hypot(world[i + 1].x - world[i].x, world[i + 1].y - world[i].y)
                worldCumLen[i + 1] = worldTotal
            }
            return {
                ...ev,
                line,
                lineId: line.id,
                rootLine,
                rootId: rootLine?.id ?? line.id,
                pointIds,
                world,
                pointProgress,
                edgeProgress,
                rangeText: `（${aName}-${bName}）`,
                lineBadgeName: effectiveLineNameAtFrame(line.id, hudEventNameFrame(ev)),
                lineBadgeColor: effectiveLineColorAtFrame(line.id, hudEventNameFrame(ev)),
                worldCumLen,
                worldTotal,
            }
        }



        let rootHasAnyHistoryCache = {}     // normedRuntime.rootHasAnyHistory 的非响应式副本
        let defaultStaticState = 'operating' // data.defaultStyles.defaultStaticState 的一次性缓存

        function buildTerrainLayers() {
            if (!settings.value.renderTerrain) return []

            const d = data.value
            if (!d || !Array.isArray(d.terrains)) return []

            if (window.TerrainUtil?.normalizeData) {
                TerrainUtil.normalizeData(d)
            }

            const maxOpacity = Number.isFinite(+d.terrainMaxOpacity)
                ? Math.max(0, Math.min(1, +d.terrainMaxOpacity))
                : 1

            const out = []

            for (const t of d.terrains) {
                if (!t || t.visible === false) continue
                if (!Array.isArray(t.pts) || t.pts.length === 0) continue

                const world = t.pts.map(p => BshistoryApp.pointToWorld(p, !!d.fictionalMode))
                const path = BshistoryApp.terrainWorldPath(t, world)
                if (!path) continue

                const color = BshistoryApp.terrainColorOf(d, t)
                const opacity = Math.min(Number(t.opacity ?? 0.55), maxOpacity)

                out.push({
                    key: `terrain-${t.id}`,
                    id: t.id,
                    d: path,
                    fill: t.closed ? color : 'none',
                    stroke: t.closed ? 'none' : color,
                    strokeWidth: t.closed ? 0 : Math.max(0.001, Number(t.strokeWidth || 80) / 1000),
                    opacity,
                    linecap: 'round',
                    closed: !!t.closed
                })
            }

            return out
        }
        function terrainWorldPointsForBBox() {
            const d = data.value
            const out = []

            for (const t of d?.terrains || []) {
                if (!t || t.visible === false) continue
                if (!Array.isArray(t.pts)) continue

                for (const p of t.pts) {
                    out.push(BshistoryApp.pointToWorld(p, !!d.fictionalMode))
                }
            }

            return out
        }
        function buildStaticCache() {
            prevStableLayerCount = -1   // 强制下次渲染刷新稳定层
            defaultStaticState = Vue.toRaw(data.value)?.defaultStyles?.defaultStaticState || 'operating'
            edgeStateSnapshot = null  // 重置快照，让下一帧重新分配
            edgeItems = []
            recolorLineRangesCache = new Map()
            edgeItemByLineEdgeKey = new Map()
            bboxCache = new Map()

            const d = data.value
            if (!d) return

            // ── 一次性构建全局样式缓存 ─────────────────────────────────────
            styleByIdMap = new Map()
            for (const s of (d.styles?.stroke || [])) {
                styleByIdMap.set(String(s.id), s)
            }
            stateStyleIds = {}
            for (const [st, info] of Object.entries(d.defaultStyles?.timeStyles || {})) {
                stateStyleIds[st] = info?.styleId ?? null
            }

            let edgeCounter = 0
            const totalLines = (d.lines || []).length

            for (let li = 0; li < totalLines; li++) {
                const line = d.lines[li]
                const ids = line.pts || []
                const edgeCount = line.ring ? ids.length : ids.length - 1

                // ── 线路级：只算一次，所有边共用 ─────────────────────────
                const root = rootLineOf(line)
                const eff = effectiveLine(line)
                const rootId = root?.id ?? line.id
                    const lineColor = eff?.color || line?.color || '#333'
                const lineWidth = (eff?.settings?.width || 50) / 1000
                const strokeStyleId = getLineEffectiveStrokeStyleId(line)

                for (let i = 0; i < edgeCount; i++) {
                    const aId = ids[i]
                    const bId = ids[(i + 1) % ids.length]

                    const aPt = maps.value.pts.get(aId) || maps.value.pts.get(String(aId))
                    const bPt = maps.value.pts.get(bId) || maps.value.pts.get(String(bId))
                    const aWorld = worldPts.value.get(aId) || worldPts.value.get(String(aId))
                    const bWorld = worldPts.value.get(bId) || worldPts.value.get(String(bId))

                    if (!aPt || !bPt || !aWorld || !bWorld) continue

                    // ── 边级：gjType 因边而异（高架/地下/普通） ──────────
                    const gjType = getGjTypeByEdgeIndex(line, i)   // 仅在此调用一次
                    const gjStyleId = gjType ? getGjStyleId(line, gjType) : null

                    const edgeItem = {
                        index: edgeCounter++,
                        key: BshistoryApp.edgeKey(line.id, i),
                        line,
                        lineId: line.id,
                        rootId,
                        edgeIdx: i,
                        aPtId: aId,
                        bPtId: bId,
                        aPt,
                        bPt,
                        aWorld,
                        bWorld,
                        km: BshistoryApp.haversineKm(aPt, bPt, !!d.fictionalMode),
                        gjType,
                        gjStyleId,
                        strokeStyleId,
                        lineColor,
                        lineWidth,
                    }

                    edgeItems.push(edgeItem)
                    edgeItemByLineEdgeKey.set(edgeLookupKey(line.id, i), edgeItem)
                }

                if (li % 20 === 0) {
                    if (edgeItems.length) {
                        let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
                        for (const ei of edgeItems) {
                            if (ei.aWorld.x < mnX) mnX = ei.aWorld.x
                            if (ei.aWorld.x > mxX) mxX = ei.aWorld.x
                            if (ei.aWorld.y < mnY) mnY = ei.aWorld.y
                            if (ei.aWorld.y > mxY) mxY = ei.aWorld.y
                            if (ei.bWorld.x < mnX) mnX = ei.bWorld.x
                            if (ei.bWorld.x > mxX) mxX = ei.bWorld.x
                            if (ei.bWorld.y < mnY) mnY = ei.bWorld.y
                            if (ei.bWorld.y > mxY) mxY = ei.bWorld.y
                        }
                        cachedWorldBBox = Number.isFinite(mnX) ? { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY } : null
                    } else {
                        cachedWorldBBox = null
                    }
                    setStepProgress({
                        stage: '建立边缓存',
                        detail: `线路 ${li}/${totalLines}，边 ${edgeCounter}`,
                        step: li,
                        total: totalLines,
                        percent: totalLines ? li / totalLines : 0
                    })
                }
            }

            setStepProgress({
                stage: '建立边缓存',
                detail: `完成：${edgeItems.length} 条边，样式表 ${styleByIdMap.size} 条`,
                step: totalLines,
                total: totalLines,
                percent: 1
            })
        }




        function getRecordsForEdge(edgeItem) {
            return edgeRecordsRaw[edgeItem.key] || []
        }



        function stateAtCutoff(edgeItem, time, playSeqCutoff = Infinity) {
            const arr = edgeRecordsRaw[edgeItem.key] || []  // 非响应式
            const rootId = edgeItem.rootId

            if (!arr.length) {
                // 非响应式缓存：rootHasAnyHistoryCache 和 defaultStaticState
                if (rootHasAnyHistoryCache[rootId]) return 'none'
                return defaultStaticState
            }

            let firstT = Infinity, bestT = -Infinity, bestSeq = -Infinity, bestState = null

            for (const r of arr) {
                if (r.t < firstT) firstT = r.t
                const seq = Number.isFinite(r.playSeq) ? r.playSeq
                    : Number.isFinite(r.seq) ? r.seq : Infinity
                const ok = r.t < time || (r.t === time && seq < playSeqCutoff)
                if (ok && (r.t > bestT || (r.t === bestT && seq > bestSeq))) {
                    bestT = r.t; bestSeq = seq; bestState = r.state
                }
            }

            if (time < firstT) return 'none'
            return bestState || 'none'
        }

       function stableRenderState(state) {
    return {
        state,
        fraction: state === 'none' ? 0 : 1,
        current: false,
        operatingFraction: state === 'operating' ? 1 : 0,
        local: 1,
        edgeProgressInfo: null,
        trimFromStart: false
    }
}

        function edgeRenderState(edgeItem, frame) {
    const cur = frame.currentEvent
    const curInfo = cur?.edgeProgress?.[edgeItem.key]

    if (
        cur &&
        cur.lineId === edgeItem.lineId &&
        curInfo &&
        frame.type === 'segment'
    ) {
        const prev = stateAtCutoff(edgeItem, frame.time, cur.playSeq)
        const next = cur.state
        const span = Math.max(0.000001, curInfo.end - curInfo.start)
        const local = clampLocal((frame.progress - curInfo.start) / span, 0, 1)
        const destructive = isDestructivePlaybackAction(cur.action)

        if (local <= 0.0001) {
            return stableRenderState(prev)
        }

        if (local >= 0.9999) {
            const full = stableRenderState(next)

            if (prev !== 'operating' && next === 'operating') {
                full.operatingFraction = 1
            }

            return full
        }

        // 停运 / 废弃 / 拆除 / 取消规划：
        // 旧状态按 from -> to 的方向被擦掉。
        // 关键是 trimFromStart: true，后面绘制会保留尾段，而不是保留头段。
        if (destructive && prev !== 'none' && next !== prev) {
            return {
                state: prev,
                fraction: 1 - local,
                current: true,
                operatingFraction: prev === 'operating' ? 1 - local : 0,
                local,
                edgeProgressInfo: curInfo,
                trimFromStart: true,
                nextState: next
            }
        }

        if (prev === 'none' && next !== 'none') {
            return {
                state: next,
                fraction: local,
                current: true,
                operatingFraction: next === 'operating' ? local : 0,
                local,
                edgeProgressInfo: curInfo,
                trimFromStart: false
            }
        }

        if (next === 'construction' || next === 'planned') {
            return {
                state: next,
                fraction: local,
                current: true,
                operatingFraction: 0,
                local,
                edgeProgressInfo: curInfo,
                trimFromStart: false
            }
        }

        if (prev !== 'none' && next === 'none') {
            return {
                state: prev,
                fraction: 1 - local,
                current: true,
                operatingFraction: prev === 'operating' ? 1 - local : 0,
                local,
                edgeProgressInfo: curInfo,
                trimFromStart: true
            }
        }

        if (prev !== 'operating' && next === 'operating') {
            return {
                state: next,
                fraction: 1,
                current: true,
                operatingFraction: local,
                local,
                edgeProgressInfo: curInfo,
                trimFromStart: false
            }
        }

        if (prev === 'operating' && next !== 'operating') {
            return {
                state: next,
                fraction: 1,
                current: true,
                operatingFraction: 1 - local,
                local,
                edgeProgressInfo: curInfo,
                trimFromStart: false
            }
        }

        return {
            state: next,
            fraction: 1,
            current: true,
            operatingFraction: next === 'operating' ? 1 : 0,
            local,
            edgeProgressInfo: curInfo,
            trimFromStart: false
        }
    }

    const st = stateAtCutoff(edgeItem, frame.time, frame.seqCutoff)
    return stableRenderState(st)
}

        function edgeWorldPoints(edgeItem, rs) {
    if (rs.state === 'none' || rs.fraction <= 0.001) return []

    if (rs.current && rs.edgeProgressInfo) {
        const fromW = worldPts.value.get(rs.edgeProgressInfo.fromPtId) ||
            worldPts.value.get(String(rs.edgeProgressInfo.fromPtId))

        const toW = worldPts.value.get(rs.edgeProgressInfo.toPtId) ||
            worldPts.value.get(String(rs.edgeProgressInfo.toPtId))

        if (!fromW || !toW) return []

        if (rs.fraction >= 0.999) return [fromW, toW]

        if (rs.trimFromStart) {
            const cut = 1 - rs.fraction
            const p = {
                x: fromW.x + (toW.x - fromW.x) * cut,
                y: fromW.y + (toW.y - fromW.y) * cut
            }

            return [p, toW]
        }

        const p = {
            x: fromW.x + (toW.x - fromW.x) * rs.fraction,
            y: fromW.y + (toW.y - fromW.y) * rs.fraction
        }

        return [fromW, p]
    }

    if (rs.fraction >= 0.999) {
        return [edgeItem.aWorld, edgeItem.bWorld]
    }

    const p = {
        x: edgeItem.aWorld.x + (edgeItem.bWorld.x - edgeItem.aWorld.x) * rs.fraction,
        y: edgeItem.aWorld.y + (edgeItem.bWorld.y - edgeItem.aWorld.y) * rs.fraction
    }

    return [edgeItem.aWorld, p]
}


        function buildLineEdgeLayers(edgeItem, rs, frame) {
    if (rs.state === 'none' || rs.fraction <= 0.001) {
        return { gj: [], line: [], state: [] }
    }

    const line = edgeItem.line
    const pts = edgeWorldPoints(edgeItem, rs)
    if (pts.length < 2) return { gj: [], line: [], state: [] }

    const key = rs.current
        ? `${line.id}-${edgeItem.edgeIdx}-anim`
        : `${line.id}-${edgeItem.edgeIdx}-${rs.state}`

    const gjOut = []
    const lineOut = []
    const stateOut = []

    let prevNeighbor = worldNeighborForEdge(line, edgeItem.edgeIdx, -1)
    let nextNeighbor = worldNeighborForEdge(line, edgeItem.edgeIdx, 1)

    // 线路换色不是颜色插值，而是和普通线路建设/拆除一样的空间推进：
    // 旧色从线路起点向终点退场，新色在一个很短的空隙后沿同方向出现。
    // 这里只改变绘制层，不修改线路/车站的真实运营状态。
    const recolor = recolorFractionsForEdge(edgeItem, frame)
    if (recolor) {
        const ev = frame.currentEvent
        const addColorPart = (color, fraction, trimFromStart, suffix) => {
            if (fraction <= 0.001) return
            const ae = fraction < 0.999999 ? {
                fromWorld: edgeItem.aWorld, toWorld: edgeItem.bWorld, fraction,
                trimFromStart: !!trimFromStart, tailConnected: false
            } : null
            const exPart = { prevNeighbor, nextNeighbor, baseWidth: edgeItem.lineWidth, lineColor: color, activeEdge: ae, suffix }
            gjOut.push(...buildStyleLayers(line, [edgeItem.aWorld, edgeItem.bWorld], edgeItem.gjStyleId, `gj-${key}-${suffix}`, exPart))
            lineOut.push(...buildStyleLayers(line, [edgeItem.aWorld, edgeItem.bWorld], edgeItem.strokeStyleId, `ln-${key}-${suffix}`, exPart))
            if (!edgeItem.gjStyleId && !edgeItem.strokeStyleId) {
                const d = ae ? activePartialPathWithOffset(ae, prevNeighbor, nextNeighbor, 0)
                             : BshistoryApp.pathFromWorldPoints([edgeItem.aWorld, edgeItem.bWorld], prevNeighbor, nextNeighbor)
                if (d) lineOut.push({ key:`fallback-${key}-${suffix}`, d, stroke:color, strokeWidth:edgeItem.lineWidth, dash:'', opacity:1, linecap:'butt' })
            }
        }
        addColorPart(ev.fromColor || effectiveLineColorAtFrame(edgeItem.lineId, frame), recolor.oldFraction, recolor.oldTrimFromStart, 'old')
        addColorPart(ev.toColor || edgeItem.line?.color || '#888', recolor.newFraction, false, 'new')

        // 非运营状态样式保持原状态；换色本身不产生 none，也不改变换乘站。
        const stateStyleId = stateStyleIds[rs.state]
        if (stateStyleId && stateStyleId !== '__grayscale__') {
            stateOut.push(...buildStyleLayers(line, [edgeItem.aWorld, edgeItem.bWorld], stateStyleId, `st-${key}-recolor`, {
                prevNeighbor, nextNeighbor, baseWidth: edgeItem.lineWidth, lineColor: ev.fromColor || '#888'
            }))
        } else if (stateStyleId === '__grayscale__' && rs.state !== 'operating') {
            stateOut.push({ key:`gray-${key}-recolor`, d:BshistoryApp.pathFromWorldPoints([edgeItem.aWorld, edgeItem.bWorld], prevNeighbor, nextNeighbor), stroke:'#777', strokeWidth:edgeItem.lineWidth*1.2, dash:'', opacity:0.55, linecap:'butt' })
        }
        return { gj: gjOut, line: lineOut, state: stateOut }
    }

    let activeEdge = null

    if (rs.current && rs.edgeProgressInfo) {
        const fromW = worldPts.value.get(rs.edgeProgressInfo.fromPtId)
            || worldPts.value.get(String(rs.edgeProgressInfo.fromPtId))

        const toW = worldPts.value.get(rs.edgeProgressInfo.toPtId)
            || worldPts.value.get(String(rs.edgeProgressInfo.toPtId))

        if (fromW && toW) {
            const directed = directedNeighborsForActiveEdge(
                line,
                edgeItem.edgeIdx,
                rs.edgeProgressInfo.fromPtId,
                rs.edgeProgressInfo.toPtId
            )

            // 始终保持事件定义的 from -> to 方向。
            // 消失型动画不再把路径反转成 to -> from，而是在绘制函数中截取原曲线尾段。
            prevNeighbor = directed.prevNeighbor
            nextNeighbor = directed.nextNeighbor

            if (rs.fraction < 0.999999) {
                activeEdge = {
                    fromWorld: fromW,
                    toWorld: toW,
                    fraction: rs.fraction,
                    trimFromStart: !!rs.trimFromStart,
                    tailConnected: activeTailConnected(edgeItem, rs, frame)
                }
            }
        }
    }

    const ex = {
        prevNeighbor,
        nextNeighbor,
        baseWidth: edgeItem.lineWidth,
        lineColor: lineColorForEdgeAtFrame(edgeItem, frame),
        activeEdge
    }

    gjOut.push(...buildStyleLayers(line, pts, edgeItem.gjStyleId, `gj-${key}`, ex))
    lineOut.push(...buildStyleLayers(line, pts, edgeItem.strokeStyleId, `ln-${key}`, ex))

    const stateStyleId = stateStyleIds[rs.state]

    const grayPathD = activeEdge
        ? activePartialPathWithOffset(
            activeEdge,
            prevNeighbor,
            nextNeighbor,
            0,
            activeEdge.tailConnected ? edgeItem.lineWidth * 1.2 : 0
        )
        : ''

    if (stateStyleId && stateStyleId !== '__grayscale__') {
        stateOut.push(...buildStyleLayers(line, pts, stateStyleId, `st-${key}`, ex))
    } else if (stateStyleId === '__grayscale__' && rs.state !== 'operating') {
        if (grayPathD || !activeEdge) {
            stateOut.push({
                key: `gray-${key}`,
                d: grayPathD || BshistoryApp.pathFromWorldPoints(pts, prevNeighbor, nextNeighbor),
                stroke: '#777',
                strokeWidth: edgeItem.lineWidth * 1.2,
                dash: '',
                opacity: 0.55,
                linecap: 'butt'
            })
        }
    }

    if (!gjOut.length && !lineOut.length && !stateOut.length) {
        const fallbackPathD = activeEdge
            ? activePartialPathWithOffset(
                activeEdge,
                prevNeighbor,
                nextNeighbor,
                0,
                activeEdge.tailConnected ? edgeItem.lineWidth : 0
            )
            : ''

        if (fallbackPathD || !activeEdge) {
            lineOut.push(buildFallbackLayer(
                edgeItem,
                pts,
                key,
                prevNeighbor,
                nextNeighbor,
                rs.state === 'operating' ? 1 : 0.65,
                fallbackPathD,
                frame
            ))
        }
    }

    return { gj: gjOut, line: lineOut, state: stateOut }
}

        function buildStationRenderItem(p, rt, transferCount, frame) {
            const wp = worldPts.value.get(p.id) || worldPts.value.get(String(p.id))
            if (!wp) return null
            const line = maps.value.lines.get(p.lineid) || maps.value.lines.get(String(p.lineid))
            const eff = effectiveLine(line)
            const isTransfer = (transferCount.get(p.staid) || 0) > 1
            // 普通非换乘站必须使用当前演示帧对应的线路历史颜色。
            const lineColor = effectiveLineColorAtFrame(p.lineid, frame) || eff?.color || line?.color || '#333'
            const w = eff?.settings?.width || 50
            const rby = eff?.settings?.staRbyWidth || 0.55

            // 全部世界坐标 km，对应 bld.html：
            // r  = lineWidth*BLCY*1.45*rby  = w/1000 * rby * 1.45
            // sw = lineWidth*BLCY/3.5*rby*2 = w/1000 * rby/3.5 * 2
            const r = (w / 1000) * rby * (isTransfer ? 1.45 : 1.06) * (rt.animationScale || 1)
            const sw = (w / 1000) * rby * (isTransfer ? 2 / 3.5 : 2 / 5)

            return {
                key: `sta-${p.id}`,
                x: wp.x, y: wp.y,
                r,
                fill: rt.operating ? '#ffffff' : '#d0d0d0',
                stroke: rt.operating ? (isTransfer ? '#111' : lineColor) : '#777',
                strokeWidth: sw,
                opacity: (rt.operating ? 1 : 0.6) * (rt.animationOpacity ?? 1)
            }
        }

        function phaseLabel(type) {
            return {
                empty: '空',
                segment: '线路段更新',
                station: '车站事件更新',
                lineMeta: '线路名称/颜色更新',
                segmentHold: '事件停顿',
                globalMove: '移动到全局视图',
                globalHold: '全局停顿'
            }[type] || type || ''
        }

        function getFrameAt(ms) {
            const phs = runtime.value.phases || []

            if (!phs.length) {
                return {
                    type: 'empty',
                    time: Date.now(),
                    seqCutoff: Infinity,
                    currentEvent: null,
                    progress: 1,
                    local: 1,
                    phaseIndex: -1
                }
            }

            ms = clampLocal(ms, 0, totalMs.value || 0)

            let lo = 0
            let hi = phs.length - 1
            let idx = phs.length - 1

            while (lo <= hi) {
                const mid = (lo + hi) >> 1
                const ph = phs[mid]

                if (ms < ph.start) {
                    hi = mid - 1
                } else if (ms >= ph.end) {
                    lo = mid + 1
                } else {
                    idx = mid
                    break
                }
            }

            const ph = phs[idx] || phs[phs.length - 1]
            const local = ph.end > ph.start ? (ms - ph.start) / (ph.end - ph.start) : 1

            const ev = Number.isFinite(ph.eventPlaySeq)
                ? eventByPlaySeq.get(ph.eventPlaySeq)
                : null

            if (ph.type === 'segment' || ph.type === 'station' || ph.type === 'lineMeta') {
                return {
                    type: ph.type,
                    time: ph.time,
                    seqCutoff: ev ? ev.playSeq : Infinity,
                    currentEvent: ev,
                    progress: clampLocal(local, 0, 1),
                    local: clampLocal(local, 0, 1),
                    phaseIndex: idx
                }
            }

            if (ph.type === 'segmentHold') {
                return {
                    type: ph.type,
                    time: ph.time,
                    seqCutoff: ev ? ev.playSeq + 1 : Infinity,
                    currentEvent: ev,
                    progress: 1,
                    local: clampLocal(local, 0, 1),
                    phaseIndex: idx
                }
            }

            return {
                type: ph.type,
                time: ph.time,
                seqCutoff: Infinity,
                currentEvent: null,
                progress: 1,
                local: clampLocal(local, 0, 1),
                phaseIndex: idx
            }
        }

        function pointReachedByCurrentEvent(ev, ptId, progress) {
            if (!ev) return true

            const v = ev.pointProgress?.[ptId] ?? ev.pointProgress?.[String(ptId)]
            if (!Number.isFinite(v)) return true

            return v <= progress + 0.0001
        }
function isDestructivePlaybackAction(action) {
    return action === 'close' ||
        action === 'abandon' ||
        action === 'remove' ||
        action === 'cancelPlan'
}

function pointStillAheadInCurrentEvent(ev, ptId, progress) {
    if (!ev) return true

    const v = ev.pointProgress?.[ptId] ?? ev.pointProgress?.[String(ptId)]
    if (!Number.isFinite(v)) return true

    return v >= progress - 0.0001
}

function markCurrentEdgeStations(pointInfoMap, frame, rs, op) {
    if (!rs?.edgeProgressInfo) return

    const fid = rs.edgeProgressInfo.fromPtId
    const tid = rs.edgeProgressInfo.toPtId

    // 消失型动画：方向是 from -> to 消失，
    // 所以 from 端先变成非运营，to 端在本小段没消失完前仍保持运营。
    if (rs.trimFromStart) {
        if (rs.local <= 0.0001) {
            markPoint(
                pointInfoMap,
                fid,
                true,
                op > 0.001 && pointStillAheadInCurrentEvent(frame.currentEvent, fid, frame.progress)
            )
        } else {
            markPoint(pointInfoMap, fid, true, false)
        }

        if (rs.local < 0.999) {
            markPoint(
                pointInfoMap,
                tid,
                true,
                op > 0.001 && pointStillAheadInCurrentEvent(frame.currentEvent, tid, frame.progress)
            )
        } else {
            markPoint(pointInfoMap, tid, true, false)
        }

        return
    }

    // 原来的新增 / 开通型动画逻辑：from -> to 出现。
    if (rs.local > 0.0001) {
        markPoint(
            pointInfoMap,
            fid,
            true,
            op > 0.001 && pointReachedByCurrentEvent(frame.currentEvent, fid, frame.progress)
        )
    }

    if (rs.local >= 0.999) {
        markPoint(
            pointInfoMap,
            tid,
            true,
            op > 0.001 && pointReachedByCurrentEvent(frame.currentEvent, tid, frame.progress)
        )
    }
}
        function ensurePointInfo(map, ptId) {
            let item = map.get(ptId) || map.get(String(ptId))

            if (!item) {
                item = {
                    visible: false,
                    operating: false,
                    existing: false
                }

                map.set(ptId, item)
                map.set(String(ptId), item)
            }

            return item
        }

        function markPoint(map, ptId, existing, operating) {
            const item = ensurePointInfo(map, ptId)

            if (existing) {
                item.visible = true
                item.existing = true
            }

            if (operating) {
                item.operating = true
            }
        }

        function stationEventsForPoint(p) {
            return stationEventsByPointIndex.get(String(p?.id)) || []
        }

        function eventAppliedAtFrame(ev, frame) {
            return ev.time < frame.time || (ev.time === frame.time && ev.playSeq < frame.seqCutoff)
        }

        // 单点车站状态只从已经规范化、排好播放顺序的运行时事件计算。
        // 这样原始记录字段、时间变量、旧版 staid 记录都只在事件构建阶段处理一次。
        function stationStateAtCutoff(p, frame) {
            const events = stationEventsForPoint(p)
            if (!events.length) return data.value?.defaultStyles?.defaultStaticState || 'operating'

            let state = 'none'
            for (const ev of events) {
                if (!eventAppliedAtFrame(ev, frame)) break
                state = ev.state || BshistoryApp.actionToState(ev.action)
            }
            return state
        }

        // 站名同样只从运行时改名事件计算：最早事件之前使用最早事件的 fromName，
        // 每执行一条事件后切换为该事件的 toName。普通帧和动画帧因此不会再分裂。
        function effectiveStationNameAtFrame(staid, frame) {
            const events = stationNameEventsIndex.get(String(staid)) || []

            if (!events.length) {
                const cur = maps.value.names.get(staid) || maps.value.names.get(String(staid))
                return cur?.name || ''
            }

            let name = String(events[0].fromName || '')
            for (const ev of events) {
                if (!eventAppliedAtFrame(ev, frame)) break
                name = String(ev.toName || '')
            }
            return name
        }

        function lineMetaEventsFor(lineId) {
            const direct = lineMetaEventsIndex.get(String(lineId))
            if (direct?.length) return direct
            // 子线没有自己的历史时，继承根线路的名称/颜色历史。
            const line = maps.value.lines.get(lineId) || maps.value.lines.get(String(lineId))
            const root = rootLineOf(line)
            if (root && String(root.id) !== String(lineId)) return lineMetaEventsIndex.get(String(root.id)) || []
            return []
        }
        function effectiveLineNameAtFrame(lineId, frame) {
            const line = maps.value.lines.get(lineId) || maps.value.lines.get(String(lineId))
            const root = rootLineOf(line) || line
            const ownerId = lineMetaEventsIndex.has(String(lineId)) ? lineId : (root?.id ?? lineId)
            const cur = frame?.currentEvent
            if (frame?.type === 'lineMeta' && cur?.eventType === 'lineMeta' && cur.hasRename && String(cur.ownerId) === String(ownerId)) {
                return frame.progress < 0.5 ? String(cur.fromName || root?.name || '') : String(cur.toName || root?.name || '')
            }
            const key = lineMetaFrameKey(frame)
            if (lineMetaStaticFrameCache.key !== key) lineMetaStaticFrameCache = { key, names:new Map(), colors:new Map() }
            const ck = String(ownerId)
            if (lineMetaStaticFrameCache.names.has(ck)) return lineMetaStaticFrameCache.names.get(ck)
            const evs = lineMetaEventsFor(ownerId)
            const renameEvs = evs.filter(e=>e.hasRename)
            let v = root?.name || line?.name || ''
            if (renameEvs.length) {
                v = String(renameEvs[0].fromName || v)
                for (const ev of renameEvs) { if (!eventAppliedAtFrame(ev, frame)) break; v = String(ev.toName || v) }
            }
            lineMetaStaticFrameCache.names.set(ck, v)
            return v
        }
        function effectiveLineColorAtFrame(lineId, frame) {
            const line = maps.value.lines.get(lineId) || maps.value.lines.get(String(lineId))
            const root = rootLineOf(line) || line
            const ownerId = lineMetaEventsIndex.has(String(lineId)) ? lineId : (root?.id ?? lineId)
            const key = lineMetaFrameKey(frame)
            if (lineMetaStaticFrameCache.key !== key) lineMetaStaticFrameCache = { key, names:new Map(), colors:new Map() }
            const ck = String(ownerId)
            if (lineMetaStaticFrameCache.colors.has(ck)) return lineMetaStaticFrameCache.colors.get(ck)
            const evs = lineMetaEventsFor(ownerId)
            const colorEvs = evs.filter(e=>e.hasRecolor)
            let v = root?.color || line?.color || '#888888'
            if (colorEvs.length) {
                v = String(colorEvs[0].fromColor || v)
                for (const ev of colorEvs) { if (!eventAppliedAtFrame(ev, frame)) break; v = String(ev.toColor || v) }
            }
            lineMetaStaticFrameCache.colors.set(ck, v)
            return v
        }
        function mixHexColor(a,b,t) {
            const parse=c=>{ const m=String(c||'').trim().match(/^#([0-9a-f]{6})$/i); if(!m)return null; const n=parseInt(m[1],16); return [(n>>16)&255,(n>>8)&255,n&255] }
            const A=parse(a), B=parse(b); if(!A||!B) return t<0.5?a:b
            t=clampLocal(t,0,1); const q=A.map((x,i)=>Math.round(x+(B[i]-x)*t)); return '#'+q.map(x=>x.toString(16).padStart(2,'0')).join('')
        }
        function lineMetaOwnerIdForLine(lineId) {
            const line = maps.value.lines.get(lineId) || maps.value.lines.get(String(lineId))
            const root = rootLineOf(line) || line
            return lineMetaEventsIndex.has(String(lineId)) ? lineId : (root?.id ?? lineId)
        }
        function recolorEventAppliesToEdge(ev, edgeItem) {
            return !!(ev?.eventType === 'lineMeta' && ev.hasRecolor &&
                String(ev.ownerId) === String(lineMetaOwnerIdForLine(edgeItem.lineId)))
        }
        function recolorRangeForEdge(edgeItem) {
            const ownerId = String(lineMetaOwnerIdForLine(edgeItem.lineId))
            let cache = recolorLineRangesCache.get(ownerId)
            if (!cache) {
                const members = edgeItems
                    .filter(e => String(lineMetaOwnerIdForLine(e.lineId)) === ownerId)
                    .slice()
                    .sort((a,b) => String(a.lineId).localeCompare(String(b.lineId)) || a.edgeIdx - b.edgeIdx)
                let total = 0
                const ranges = new Map()
                for (const e of members) {
                    const start = total
                    total += Math.max(0, Number(e.km) || 0)
                    ranges.set(e.key, { start, end: total })
                }
                cache = { total: Math.max(total, 1e-9), ranges }
                recolorLineRangesCache.set(ownerId, cache)
            }
            const r = cache.ranges.get(edgeItem.key) || { start: 0, end: Math.max(0, Number(edgeItem.km)||0) }
            return { start: r.start / cache.total, end: r.end / cache.total, totalKm: cache.total }
        }
        function recolorFronts(progress) {
            const gap = 0.028
            const lead = clampLocal(progress, 0, 1) * (1 + gap)
            return {
                disappear: clampLocal(lead, 0, 1),
                appear: clampLocal(lead - gap, 0, 1),
                gap
            }
        }
        function recolorFractionsForEdge(edgeItem, frame) {
            const ev = frame?.currentEvent
            if (!(frame?.type === 'lineMeta' && recolorEventAppliesToEdge(ev, edgeItem))) return null
            const r = recolorRangeForEdge(edgeItem)
            const span = Math.max(1e-9, r.end - r.start)
            const f = recolorFronts(frame.progress)
            let oldFraction = 1
            let oldTrimFromStart = false
            if (r.end <= f.disappear) oldFraction = 0
            else if (r.start < f.disappear) {
                oldFraction = clampLocal((r.end - f.disappear) / span, 0, 1)
                oldTrimFromStart = true
            }
            let newFraction = 0
            if (r.end <= f.appear) newFraction = 1
            else if (r.start < f.appear) newFraction = clampLocal((f.appear - r.start) / span, 0, 1)
            return { oldFraction, oldTrimFromStart, newFraction, fronts:f }
        }
        function lineColorForEdgeAtFrame(edgeItem, frame) {
            return effectiveLineColorAtFrame(edgeItem.lineId, frame)
        }

        function stationAnimationRuntime(p, frame, lineExists, lineOperating) {
            const ev = frame.currentEvent
            const applies = frame.type === 'station' && ev?.eventType === 'station' &&
                (ev.pointIds || []).some(id => String(id) === String(p.id))

            if (!applies) {
                const state = stationStateAtCutoff(p, frame)
                return {
                    visible: lineExists && state !== 'none',
                    operating: lineOperating && state === 'operating',
                    animationScale: 1,
                    animationOpacity: 1,
                    state
                }
            }

            const prevFrame = { ...frame, seqCutoff: ev.playSeq }
            const prev = stationStateAtCutoff(p, prevFrame)
            const next = ev.state || BshistoryApp.actionToState(ev.action)
            const k = clampLocal(frame.progress, 0, 1)
            const appearing = prev === 'none' && next !== 'none'
            const disappearing = prev !== 'none' && next === 'none'
            const opening = prev !== 'operating' && next === 'operating'
            const closing = prev === 'operating' && next !== 'operating'

            if (appearing) return {
                visible: lineExists && k > 0.001,
                operating: lineOperating && next === 'operating' && k > 0.5,
                animationScale: 0.25 + 0.75 * k,
                animationOpacity: k,
                state: k > 0.001 ? next : 'none'
            }
            if (disappearing) return {
                visible: lineExists && k < 0.999,
                operating: lineOperating && prev === 'operating' && k < 0.5,
                animationScale: Math.max(0.25, 1 - 0.75 * k),
                animationOpacity: 1 - k,
                state: k < 0.999 ? prev : 'none'
            }
            return {
                visible: lineExists && next !== 'none',
                operating: lineOperating && (opening ? k >= 0.5 : closing ? k < 0.5 : next === 'operating'),
                animationScale: 1 + Math.sin(Math.PI * k) * 0.35,
                animationOpacity: 1,
                state: next
            }
        }

        function buildPointInfoMapForFrame(frame) {
            const pointInfoMap = new Map()
            for (const edgeItem of edgeItems) {
                const rs = edgeRenderState(edgeItem, frame)
                const visible = rs.state !== 'none' && rs.fraction > 0.001
                if (!visible) continue
                const op = rs.operatingFraction ?? (rs.state === 'operating' ? 1 : 0)
                // HUD/静态快照不会把“当前动画”作为 currentEvent 传入；若未来传入，沿用主渲染同一规则。
                if (rs.current) markCurrentEdgeStations(pointInfoMap, frame, rs, op)
                else {
                    markPoint(pointInfoMap, edgeItem.aPtId, true, op > 0.001)
                    markPoint(pointInfoMap, edgeItem.bPtId, true, op > 0.001)
                }
            }
            return pointInfoMap
        }

        // 每一帧先建立唯一的车站时态快照，SVG、Canvas、站名、换乘判断、HUD 均只读取它。
        // pointInfoMap 可由主渲染传入；HUD 单独查询某个历史时刻时会在这里用同一线路状态逻辑重建。
        function resolveStationTemporalSnapshot(frame, pointInfoMap = null) {
            const resolvedPointInfoMap = pointInfoMap || buildPointInfoMapForFrame(frame)
            const pointStates = new Map()
            const stationStates = new Map()

            for (const p of data.value?.pts || []) {
                if (!p?.sta || p.staid == null || p.staid < 0) continue
                const lineInfo = resolvedPointInfoMap.get(p.id) || resolvedPointInfoMap.get(String(p.id))
                const rt = stationAnimationRuntime(p, frame, !!lineInfo?.visible, !!lineInfo?.operating)
                const item = {
                    visible: !!rt.visible,
                    operating: !!rt.operating,
                    existing: !!rt.visible,
                    state: rt.state,
                    animationScale: rt.animationScale,
                    animationOpacity: rt.animationOpacity
                }
                pointStates.set(p.id, item)
                pointStates.set(String(p.id), item)

                if (!item.visible) continue
                const key = String(p.staid)
                let group = stationStates.get(key)
                if (!group) {
                    group = {
                        staid: p.staid,
                        visible: false,
                        operating: false,
                        visiblePointIds: [],
                        operatingPointIds: [],
                        operatingRootLineIds: [],
                        effectiveName: effectiveStationNameAtFrame(p.staid, frame)
                    }
                    stationStates.set(key, group)
                    stationStates.set(p.staid, group)
                }
                group.visible = true
                group.visiblePointIds.push(p.id)
                if (item.operating) {
                    group.operating = true
                    group.operatingPointIds.push(p.id)
                }
            }

            // 将“运营线路归属”也作为快照的一部分。这里按 staid/ptId 关联，不按站名。
            // 只有线路边在该帧运营、且该具体站点在该帧也 operating，才计入该站团的运营根线路。
            const rootsByStaid = new Map()
            for (const edgeItem of edgeItems) {
                const rs = edgeRenderState(edgeItem, frame)
                const op = rs.operatingFraction ?? (rs.state === 'operating' ? 1 : 0)
                if (rs.state !== 'operating' || op <= 0.001 || rs.fraction <= 0.001) continue

                for (const p of [edgeItem.aPt, edgeItem.bPt]) {
                    if (!p?.sta || p.staid == null || p.staid < 0) continue
                    const ps = pointStates.get(p.id) || pointStates.get(String(p.id))
                    if (!ps?.operating) continue
                    const rid = edgeItem.rootId ?? edgeItem.lineId
                    const skey = String(p.staid)
                    if (!rootsByStaid.has(skey)) rootsByStaid.set(skey, new Set())
                    rootsByStaid.get(skey).add(String(rid))
                }
            }

            for (const [skey, roots] of rootsByStaid) {
                const group = stationStates.get(skey)
                if (!group) continue
                group.operatingRootLineIds = [...roots]
            }

            return { pointStates, stationStates }
        }

        function renderFrameSnapshot(force = false) {
            if (!data.value || !runtimeReady.value) return

            const canvasMode = !!settings.value.renderCanvas

            if (canvasMode !== lastMainCanvasMode) {
                lastMainCanvasMode = canvasMode
                force = true

                if (canvasMode) {
                    if (stableRenderLayers.value.length) stableRenderLayers.value = []
                    if (activeRenderLayers.value.length) activeRenderLayers.value = []
                    if (renderStations.value.length) renderStations.value = []
                    if (renderNames.value.length) renderNames.value = []
                } else {
                    resetMainCanvasBuffers()
                    clearMainCanvas()
                }
            }

            const now = performance.now()
            const minInterval = 1000 / Math.max(1, settings.value.renderFps || 24)
            if (!force && now - lastRenderTs < minInterval) return
            lastRenderTs = now

            const d = data.value
            const frame = getFrameAt(playheadMs.value)
            currentEvent.value = frame.currentEvent
            if (currentEvent.value?.eventType === 'lineMeta') {
                const ev = currentEvent.value
                if (ev.hasRecolor && frame.type === 'lineMeta') ev.lineBadgeColor = frame.progress < 0.5 ? (ev.fromColor || ev.lineBadgeColor) : (ev.toColor || ev.lineBadgeColor)
                else if (ev.hasRecolor && frame.type === 'segmentHold') ev.lineBadgeColor = ev.toColor || ev.lineBadgeColor
                if (ev.hasRename && frame.type === 'lineMeta') ev.lineBadgeName = frame.progress < 0.5 ? ev.fromName : ev.toName
                else if (ev.hasRename && frame.type === 'segmentHold') ev.lineBadgeName = ev.toName || ev.lineBadgeName
            }
            currentDateText.value = BshistoryApp.formatDate(frame.time)

            if (frame.phaseIndex !== lastPhaseForLayerCache) {
                layerCache.clear()
                lastPhaseForLayerCache = frame.phaseIndex
            }

            const animSig = mainAnimSignature(frame)

            const layersChanged = force
                || frame.phaseIndex !== prevLayerPhaseIndex
                || (
                    frame.type === 'segment'
                        ? animSig !== prevLayerAnimSig
                        : Math.abs(frame.progress - prevLayerProgress) > 0.001
                )

            if (!layersChanged) {
                if (settings.value.renderCanvas) drawMainCanvas()
                drawMinimap()
                return
            }

            const start = performance.now()
            const gjLayers = []
            const lineLayers = []
            const stateLayers = []
            const activeGjLayers = []
            const activeLineLayers = []
            const activeStateLayers = []

            let stableLayersDirty = force || frame.phaseIndex !== prevLayerPhaseIndex

            if (!edgeStateSnapshot || edgeStateSnapshot.length < edgeItems.length) {
                edgeStateSnapshot = new Array(edgeItems.length).fill('none')
            }

            const pointInfoMap = new Map()
            const stats = new Map()
            const recolorTransferByRoot = new Map()

            for (const root of maps.value.rootLines) {
                stats.set(root.id, {
                    root,
                    existsNow: false,
                    existsEver: !!rootHasAnyHistoryCache[root.id],
                    km: 0,
                    active: false
                })
            }

            const curRoot = frame.currentEvent?.rootId

            let currentGroup = null
            const flushGroup = () => {
                if (!currentGroup || currentGroup.pts.length < 2) {
                    currentGroup = null
                    return
                }

                const g = currentGroup
                currentGroup = null

                const key = `merged-${g.line.id}-${g.firstIdx}-${g.lastIdx}-${g.state}`
                let cached = layerCache.get(key)

                if (!cached) {
                    stableLayersDirty = true

                    const pN = worldNeighborForEdge(g.line, g.firstIdx, -1)
                    const nN = worldNeighborForEdge(g.line, g.lastIdx, 1)

                    cached = buildMergedLayersFromGroup(g, pN, nN, key)
                    layerCache.set(key, cached)
                }

                gjLayers.push(...cached.gj)
                lineLayers.push(...cached.line)
                stateLayers.push(...cached.state)
            }

            const _doCull = settings.value.enableCulling
            const _vpCx = view.value.cx
            const _vpCy = view.value.cy
            const _vpZoom = Math.max(1e-9, view.value.zoom)
            const _vpHW = viewport.value.w / _vpZoom / 2
            const _vpHH = viewport.value.h / _vpZoom / 2
            const _cm = settings.value.cullMarginKm || 0
            const _cW = _vpHW + _cm
            const _cH = _vpHH + _cm

            for (const edgeItem of edgeItems) {
                const item = stats.get(edgeItem.rootId)
                    || {
                    root: null,
                    existsNow: false,
                    existsEver: !!rootHasAnyHistoryCache[edgeItem.rootId],
                    km: 0,
                    active: false
                }

                const records = getRecordsForEdge(edgeItem)
                if (records.some(r => r.state !== 'none')) item.existsEver = true

                const rs = edgeRenderState(edgeItem, frame)
                edgeStateSnapshot[edgeItem.index] = rs.state

                const visible = rs.state !== 'none' && rs.fraction > 0.001
                let op = 0

                if (visible) {
                    item.existsNow = true
                    op = rs.operatingFraction ?? (rs.state === 'operating' ? 1 : 0)
                    item.km += edgeItem.km * op

                    const cev = frame.currentEvent
                    if (frame.type === 'lineMeta' && recolorEventAppliesToEdge(cev, edgeItem) && op > 0.000001) {
                        const rf = recolorFractionsForEdge(edgeItem, frame)
                        const rk = String(edgeItem.rootId)
                        const tr = recolorTransferByRoot.get(rk) || { targetKm:0, oldKm:0, newKm:0, fromColor:cev.fromColor, toColor:cev.toColor, ev:cev }
                        const km = edgeItem.km * op
                        tr.targetKm += km
                        tr.oldKm += km * (rf?.oldFraction ?? 1)
                        tr.newKm += km * (rf?.newFraction ?? 0)
                        recolorTransferByRoot.set(rk, tr)
                    }
                }

                if (curRoot === edgeItem.rootId) item.active = true
                stats.set(edgeItem.rootId, item)

                if (!visible) {
                    flushGroup()
                    continue
                }

                if (_doCull && !rs.current) {
                    const mx = (edgeItem.aWorld.x + edgeItem.bWorld.x) * 0.5
                    const my = (edgeItem.aWorld.y + edgeItem.bWorld.y) * 0.5
                    const hx = Math.abs(edgeItem.bWorld.x - edgeItem.aWorld.x) * 0.5
                    const hy = Math.abs(edgeItem.bWorld.y - edgeItem.aWorld.y) * 0.5

                    if (
                        mx - hx > _vpCx + _cW ||
                        mx + hx < _vpCx - _cW ||
                        my - hy > _vpCy + _cH ||
                        my + hy < _vpCy - _cH
                    ) {
                        flushGroup()
                        continue
                    }
                }

                const isMetaTarget = frame.type === 'lineMeta' && frame.currentEvent?.eventType === 'lineMeta' && ((frame.currentEvent.hasRename && String(frame.currentEvent.ownerId) === String(edgeItem.lineId)) || recolorEventAppliesToEdge(frame.currentEvent, edgeItem))
                if (isMetaTarget) {
                    flushGroup()
                    markPoint(pointInfoMap, edgeItem.aPtId, true, op > 0.001)
                    markPoint(pointInfoMap, edgeItem.bPtId, true, op > 0.001)
                    const ar = buildLineEdgeLayers(edgeItem, rs, frame)
                    activeGjLayers.push(...ar.gj)
                    activeLineLayers.push(...ar.line)
                    activeStateLayers.push(...ar.state)
                } else if (rs.current) {
                    flushGroup()

                    markCurrentEdgeStations(pointInfoMap, frame, rs, op)

                    const ar = buildLineEdgeLayers(edgeItem, rs, frame)
                    activeGjLayers.push(...ar.gj)
                    activeLineLayers.push(...ar.line)
                    activeStateLayers.push(...ar.state)
                } else {
                    markPoint(pointInfoMap, edgeItem.aPtId, true, op > 0.001)
                    markPoint(pointInfoMap, edgeItem.bPtId, true, op > 0.001)

                    const gjType = edgeItem.gjType
                    const dynamicLineColor = lineColorForEdgeAtFrame(edgeItem, frame)
                    const canExtend = currentGroup
                        && currentGroup.line.id === edgeItem.lineId
                        && currentGroup.state === rs.state
                        && currentGroup.gjType === gjType
                        && currentGroup.lineColor === dynamicLineColor
                        && currentGroup.lastIdx + 1 === edgeItem.edgeIdx
                        && currentGroup.lastIdx - currentGroup.firstIdx < MAX_STABLE_GROUP_EDGES

                    if (canExtend) {
                        currentGroup.pts.push(edgeItem.bWorld)
                        currentGroup.lastIdx = edgeItem.edgeIdx
                    } else {
                        flushGroup()

                        currentGroup = {
                            line: edgeItem.line,
                            state: rs.state,
                            gjType,
                            gjStyleId: edgeItem.gjStyleId,
                            strokeStyleId: edgeItem.strokeStyleId,
                            lineColor: dynamicLineColor,
                            lineWidth: edgeItem.lineWidth,
                            op,
                            pts: [edgeItem.aWorld, edgeItem.bWorld],
                            firstIdx: edgeItem.edgeIdx,
                            lastIdx: edgeItem.edgeIdx
                        }
                    }
                }
            }

            flushGroup()

            // 线路改名（无改色）时高亮该线路；改色事件本身由逐边颜色动画承担视觉重点。
            const metaEv = frame.currentEvent
            if ((frame.type === 'lineMeta' || frame.type === 'segmentHold') && metaEv?.eventType === 'lineMeta' && metaEv.hasRename && !metaEv.hasRecolor) {
                for (const edgeItem of edgeItems) {
                    if (String(edgeItem.lineId) !== String(metaEv.ownerId)) continue
                    const rs = edgeRenderState(edgeItem, frame)
                    if (rs.state === 'none' || rs.fraction <= 0.001) continue
                    activeLineLayers.push({ key:`line-meta-hi-${edgeItem.key}`, d:BshistoryApp.pathFromWorldPoints([edgeItem.aWorld,edgeItem.bWorld]), stroke:effectiveLineColorAtFrame(edgeItem.lineId, frame), strokeWidth:edgeItem.lineWidth*2.2, dash:'', opacity:0.9, linecap:'round' })
                }
            }

            const temporalSnapshot = resolveStationTemporalSnapshot(frame, pointInfoMap)
            const stationRuntime = temporalSnapshot.pointStates
            const transferCount = new Map()
            for (const group of new Set(temporalSnapshot.stationStates.values())) {
                transferCount.set(group.staid, group.operatingPointIds.length)
            }

            const stations = []

            for (const p of d.pts || []) {
                const rt = stationRuntime.get(p.id)
                if (!rt?.visible) continue

                const si = buildStationRenderItem(p, rt, transferCount, frame)
                if (si) stations.push(si)
            }

            const staidInfo = temporalSnapshot.stationStates
            const names = []

            for (const nm of d.names || []) {
                const info = staidInfo.get(nm.staid)
                if (!info?.visible) continue

                const wp = BshistoryApp.pointToWorld(nm, !!d.fictionalMode)

                let displayName = info.effectiveName
                let nameOpacity = 1
                let nameScale = 1
                const nev = frame.currentEvent
                if (frame.type === 'station' && nev?.eventType === 'stationName' && String(nev.staid) === String(nm.staid)) {
                    const k = clampLocal(frame.progress, 0, 1)
                    displayName = k < 0.5 ? nev.fromName : nev.toName
                    nameOpacity = Math.abs(k - 0.5) * 2
                    nameScale = 0.92 + 0.08 * nameOpacity
                }
                names.push({
                    key: `name-${nm.staid}`, x: wp.x, y: wp.y, text: displayName,
                    size: worldNameSize(nm) * nameScale, fill: info.operating ? '#111' : '#999', opacity: nameOpacity
                })
            }

            const rawCards = []
            maps.value.rootLines.forEach((root, cardIndex) => {
                const st = stats.get(root.id) || { root, existsNow:false, existsEver:false, km:0, active:false }
                const histName = effectiveLineNameAtFrame(root.id, frame) ?? root.name ?? ''
                const histColor = effectiveLineColorAtFrame(root.id, frame) || root.color || '#888'
                const fullName = String(histName || '')
                const number = fullName.trim() ? BshistoryApp.lineShortName(fullName) : ''
                const baseCard = (id, name, color, km, orderBias=0) => {
                    const fn = String(name || '')
                    const no = fn.trim() ? BshistoryApp.lineShortName(fn) : ''
                    return {
                        rootId:id, line:root, fullName:fn, number:no, label:no || '?', color,
                        textColor:BshistoryApp.fallbackTxtBlack(color), existsNow:st.existsNow, existsEver:st.existsEver,
                        km:Math.max(0,km), active:st.active, _order:cardIndex*10+orderBias
                    }
                }
                const tr = recolorTransferByRoot.get(String(root.id))
                if (!tr) {
                    rawCards.push(baseCard(root.id, fullName, histColor, st.km, 0))
                    return
                }

                // 未参与本次改色的同一主线/支线里程仍保持原图标；参与部分拆成旧色和新色两个连续变化的里程。
                const untouchedKm = Math.max(0, st.km - tr.targetKm)
                if (untouchedKm > 0.00001) rawCards.push(baseCard(`${root.id}:base`, fullName, histColor, untouchedKm, 0))
                const ev = tr.ev
                const oldName = ev?.hasRename ? (ev.fromName || fullName) : fullName
                const newName = ev?.hasRename ? (ev.toName || fullName) : fullName
                rawCards.push(baseCard(`${root.id}:recolor-old`, oldName, tr.fromColor || histColor, tr.oldKm, 1))
                rawCards.push(baseCard(`${root.id}:recolor-new`, newName, tr.toColor || histColor, tr.newKm, 2))
            })
            const cards = BshistoryApp.mergeLegendCardsBySettings(rawCards, settings.value)

            let totalKm = 0
            for (const st of stats.values()) totalKm += st.km || 0

            const stableLayers = [...gjLayers, ...lineLayers, ...stateLayers]
            const activeLayers = [...activeGjLayers, ...activeLineLayers, ...activeStateLayers]
            const terrainLayers = buildTerrainLayers()
            const specialLabels = buildSpecialLabelLayers()

            if (canvasMode) {
                mainCanvasTerrainLayers = terrainLayers
                mainCanvasTerrainLabels = specialLabels.terrainLabels
                mainCanvasDistrictLabels = specialLabels.districtLabels

                if (stableLayersDirty) mainCanvasStableLayers = stableLayers
                mainCanvasActiveLayers = activeLayers
                mainCanvasStations = stations
                mainCanvasNames = names

                if (renderTerrains.value.length) renderTerrains.value = []
                if (renderTerrainLabels.value.length) renderTerrainLabels.value = []
                if (renderDistrictLabels.value.length) renderDistrictLabels.value = []
                if (stableRenderLayers.value.length) stableRenderLayers.value = []
                if (activeRenderLayers.value.length) activeRenderLayers.value = []
                if (renderStations.value.length) renderStations.value = []
                if (renderNames.value.length) renderNames.value = []

                drawMainCanvas()
            } else {
                renderTerrains.value = terrainLayers
                renderTerrainLabels.value = specialLabels.terrainLabels
                renderDistrictLabels.value = specialLabels.districtLabels

                if (stableLayersDirty) stableRenderLayers.value = stableLayers

                activeRenderLayers.value = activeLayers
                renderStations.value = stations
                renderNames.value = names
            }
            legendCards.value = cards
            totalOperatingKm.value = Math.round(totalKm * 10) / 10
            totalOperatingStations.value = transferCount.size
            prevLayerPhaseIndex = frame.phaseIndex
            prevLayerProgress = frame.progress
            prevLayerAnimSig = animSig

            const cost = performance.now() - start
            const ev = frame.currentEvent
            const step = ev
                ? ev.playSeq + 1
                : Math.min(events.value.length, Math.max(0, frame.phaseIndex + 1))

            const layerCount = canvasMode
                ? mainCanvasStableLayers.length + mainCanvasActiveLayers.length
                : stableRenderLayers.value.length + activeRenderLayers.value.length

            setStepProgress({
                stage: playing.value ? '播放中' : '已暂停',
                detail: ev ? `${BshistoryApp.actionLabel(ev.action)} ${ev.rangeText || ''}` : '',
                step,
                total: events.value.length,
                phase: `${phaseLabel(frame.type)} ${Math.round((frame.local || frame.progress || 0) * 100)}%`,
                percent: totalMs.value ? playheadMs.value / totalMs.value : 0,
                renderMs: cost,
                layers: layerCount,
                stations: stations.length,
                names: names.length
            })

            drawMinimap()
        }

        function existingBBoxAt(time, seqCutoff = Infinity) {
            const cacheKey = `${time}:${seqCutoff}`
            if (bboxCache.has(cacheKey)) return bboxCache.get(cacheKey)

            const points = []

            for (const edgeItem of edgeItems) {
                const st = stateAtCutoff(edgeItem, time, seqCutoff)

                if (st === 'none') continue

                points.push(edgeItem.aWorld, edgeItem.bWorld)
            }

            const b = BshistoryApp.expandBBox(
                BshistoryApp.bboxFromPoints(points),
                0.1
            )

            bboxCache.set(cacheKey, b)

            return b
        }


        function allBBox() {
            const points = []

            if (cachedWorldBBox) {
                points.push(
                    { x: cachedWorldBBox.minX, y: cachedWorldBBox.minY },
                    { x: cachedWorldBBox.maxX, y: cachedWorldBBox.maxY }
                )
            }

            points.push(...terrainWorldPointsForBBox())

            return BshistoryApp.expandBBox(
                BshistoryApp.bboxFromPoints(points),
                0.1
            )
        }

        function applyInitialView() {
            const firstPhase = runtime.value.phases?.[0]
            let b = null

            if (firstPhase) {
                b = existingBBoxAt(firstPhase.time, 0)
            }

            if (!b) b = allBBox()
            if (!b) return

            view.value.cx = (b.minX + b.maxX) / 2
            view.value.cy = (b.minY + b.maxY) / 2
            view.value.zoom = BshistoryApp.zoomForBBox(b, viewport.value)
            camVelX = 0; camVelY = 0; camVelLogZoom = 0
        }
        //6666666666666666
        // ================================================================
        // 相机到位判定与弹簧参数（全部用变量，方便随时调整）
        // ================================================================
        // ── 到位判定阈值 ──────────────────────────────────────────────────
        const CAM_SETTLE_DIST_KM = 1.0   // 位置到位阈值（km）
        const CAM_SETTLE_ZOOM_RATIO = 0.20  // 缩放到位阈值（目标 ±20%）
        const CAM_SETTLE_EXTRA_WAIT_SEC = 0.5   // 到位后额外等待（秒），才开始建设演示

        // ── 建设演示阶段（跟随施工尖端）─────────────────────────────────
        const CAM_BUILD_APPROACH = 3.5   // 理想速度 = 距离 × 此值（s⁻¹，越大收敛越快）
        const CAM_BUILD_DIR_BLEND = 3.0   // 方向混合速率（越小方向惯性越强）
        const CAM_BUILD_MAX_SPD_MULT = 8     // 最大速度 = buildSpeedKmPerSec × 此值

        // ── 全局移动 / hold / 到位等待阶段（快几倍）─────────────────────
        const CAM_GLOBAL_APPROACH = 12    // 收敛倍率（更快）
        const CAM_GLOBAL_DIR_BLEND = 15    // 方向混合速率（高 ≈ 无方向惯性，急速响应）
        const CAM_GLOBAL_MAX_SPD_MULT = 25    // 最大速度倍率

        // ── 缩放阻尼（对数空间）─────────────────────────────────────────
        const CAM_ZOOM_BUILD_APPROACH = 4     // 缩放理想速度 = |logDist| × 此值（oct/s per oct）
        const CAM_ZOOM_BUILD_DIR_BLEND = 5     // 缩放方向混合速率
        const CAM_ZOOM_BUILD_MAX_LOGSPD = 1.5  // 最大缩放速度（oct/s）
        const CAM_ZOOM_GLOBAL_APPROACH = 12   // 全局阶段缩放理想速度倍率
        const CAM_ZOOM_GLOBAL_DIR_BLEND = 15   // 全局阶段缩放方向混合速率
        const CAM_ZOOM_GLOBAL_MAX_LOGSPD = 3.0  // 全局阶段最大缩放速度


        // ───────────────────────────────────────────────────────────────────
        // 替换④ updateCamera（读 settings，移除常量引用）
        // ───────────────────────────────────────────────────────────────────
        function updateCamera(dt, timeScale = 1) {
    if (!runtimeReady.value) return
    const frame = getFrameAt(playheadMs.value)
    const target = getCameraTarget(frame)
    if (!target) return

    const d = Math.max(0.001, Math.min(dt, 0.05))
    const speed = clampLocal(timeScale, 0.01, 100)
    const s = settings.value
    const buildSpd = s.buildSpeedKmPerSec || 2

    const isGlobal =
        frame.type === 'globalMove' ||
        frame.type === 'globalHold' ||
        frame.type === 'segmentHold' ||
        ((frame.type === 'segment' || frame.type === 'station' || frame.type === 'lineMeta') && frame.phaseIndex !== segmentReleasedPhaseIdx)

    const approach = (isGlobal ? s.camGlobalApproach : s.camBuildApproach) * speed
    const dirBlend = (isGlobal ? s.camGlobalDirBlend : s.camBuildDirBlend) * speed
    const maxSpd = buildSpd * (isGlobal ? s.camGlobalMaxSpdMult : s.camBuildMaxSpdMult) * speed

    const dx = target.cx - view.value.cx
    const dy = target.cy - view.value.cy
    const dist = Math.hypot(dx, dy)
    const idealSpd = Math.min(dist * approach, maxSpd)
    const idealVelX = dist > 1e-9 ? dx / dist * idealSpd : 0
    const idealVelY = dist > 1e-9 ? dy / dist * idealSpd : 0

    if (dist > 1e-9) {
        const velR = (camVelX * dx + camVelY * dy) / dist
        if (velR > idealSpd) {
            const excess = velR - idealSpd
            camVelX -= excess * dx / dist
            camVelY -= excess * dy / dist
        }
    }

    const blend = Math.min(dirBlend * d, 1)
    camVelX += (idealVelX - camVelX) * blend
    camVelY += (idealVelY - camVelY) * blend
    view.value.cx += camVelX * d
    view.value.cy += camVelY * d

    const zA = (isGlobal ? s.camZoomGlobalApproach : s.camZoomBuildApproach) * speed
    const zB = (isGlobal ? s.camZoomGlobalDirBlend : s.camZoomBuildDirBlend) * speed
    const zM = (isGlobal ? s.camZoomGlobalMaxLogspd : s.camZoomBuildMaxLogspd) * speed

    const logCur = Math.log(view.value.zoom)
    const logTgt = Math.log(target.zoom)
    const logDist = logTgt - logCur
    const idealLogSpd = Math.sign(logDist) * Math.min(Math.abs(logDist) * zA, zM)

    if (Math.sign(camVelLogZoom) === Math.sign(idealLogSpd) &&
        Math.abs(camVelLogZoom) > Math.abs(idealLogSpd)) {
        camVelLogZoom = idealLogSpd
    }

    camVelLogZoom += (idealLogSpd - camVelLogZoom) * Math.min(zB * d, 1)
    view.value.zoom = Math.exp(logCur + camVelLogZoom * d)
}



        async function rebuildRuntime() {
            if (!data.value) return

            runtimeReady.value = false
            runtimeBuilding.value = true
            playing.value = false
            renderTerrains.value = []
            stableRenderLayers.value = []
            activeRenderLayers.value = []
            renderStations.value = []
            renderNames.value = []
            legendCards.value = []
            renderTerrainLabels.value = []
            renderDistrictLabels.value = []
            resetMainCanvasBuffers()
            clearMainCanvas()

            setStepProgress({
                stage: '开始预计算',
                detail: '',
                step: 0,
                total: 0,
                percent: 0,
                renderMs: 0,
                layers: 0,
                stations: 0,
                names: 0
            })

            try {
                const res = await askRuntimeWorker({
                    type: 'buildRuntime',
                    data: makeRuntimeWorkerData(data.value),
                    settings: BshistoryApp.normalizeSettings(settings.value),
                    workerCount: getBshistoryWorkerCount()
                })

                const normedRuntime = normalizeRuntimeFromWorker(res.runtime)
                edgeRecordsRaw = normedRuntime.edgeRecords || {}  // Vue 包裹前保留原始引用
                rootHasAnyHistoryCache = normedRuntime.rootHasAnyHistory || {}

                runtime.value = normedRuntime
                rebuildLineMetaEventsIndex()

                console.log('[bshistory] runtime output', runtime.value.debug)

                // HUD 的 hydrateRuntimeEvent() 会查询历史时刻下站团的运营线路。
                // 这些信息依赖 buildStaticCache() 构建的 edgeItems/rootId 关系，
                // 因此必须先完成静态线路缓存，再生成顶部 Action/HUD 文本。
                buildStaticCache()

                events.value = (runtime.value.events || [])
                    .map(hydrateRuntimeEvent)
                    .filter(Boolean)

                eventByPlaySeq = new Map()
                for (const ev of events.value) {
                    eventByPlaySeq.set(ev.playSeq, ev)
                }
                const stationSeqById = new Map(
                    events.value
                        .filter(ev => ev.eventType === 'station')
                        .map(ev => [String(ev.id), ev.playSeq])
                )
                for (const r of (data.value.historyStations || [])) {
                    const seq = stationSeqById.get(String(r.id))
                    if (Number.isFinite(seq)) r._bshistoryPlaySeq = seq
                }

                playheadMs.value = 0

                await nextTick()

                applyInitialView()

                runtimeReady.value = true
                runtimeBuilding.value = false

                renderFrameSnapshot(true)

                setStepProgress({
                    stage: '就绪',
                    detail: `事件 ${events.value.length} 个，总时长 ${BshistoryApp.formatDuration(totalMs.value)}`,
                    step: 0,
                    total: events.value.length,
                    percent: 0
                })
            } catch (err) {
                runtimeBuilding.value = false
                console.error(err)

                setStepProgress({
                    stage: '预计算失败',
                    detail: err?.message || String(err)
                })

                alert('演示器预计算失败：' + (err?.message || err))
            }
        }


function normalizePlaySpeed() {
    const v = Number(playSpeed.value)
    if (!Number.isFinite(v) || v <= 0) return 1
    return clampLocal(v, 0.01, 100)
}

function onPlaySpeedInput() {
    playSpeed.value = normalizePlaySpeed()
    lastTs = 0
}
        // ───────────────────────────────────────────────────────────────────
        function tick(ts) {
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0.016
    lastTs = ts

    const speed = playing.value ? normalizePlaySpeed() : 1
    const playDt = dt * speed

    updateCamera(dt, speed)

    if (playing.value) {
        const frame = getFrameAt(playheadMs.value)

        if (frame.phaseIndex !== lastSettlePhaseIndex) {
            lastSettlePhaseIndex = frame.phaseIndex
            cameraSettledSince = null
        }

        let canAdvance = true

        if (frame.type === 'segmentHold' || frame.type === 'globalHold') {
            if (!isCameraSettled()) {
                cameraSettledSince = null
                canAdvance = false
            }
        } else if ((frame.type === 'segment' || frame.type === 'station' || frame.type === 'lineMeta') && frame.phaseIndex !== segmentReleasedPhaseIdx) {
            if (isCameraSettled()) {
                if (cameraSettledSince === null) cameraSettledSince = ts

                const settleWaitMs = settings.value.camSettleExtraWaitSec * 1000 / speed

                if ((ts - cameraSettledSince) >= settleWaitMs) {
                    segmentReleasedPhaseIdx = frame.phaseIndex
                } else {
                    canAdvance = false
                }
            } else {
                cameraSettledSince = null
                canAdvance = false
            }
        }

        if (canAdvance) playheadMs.value += playDt * 1000

        if (playheadMs.value >= totalMs.value) {
            playheadMs.value = totalMs.value
            playing.value = false
        }
    }

    if (runtimeReady.value) renderFrameSnapshot(false)
    raf = requestAnimationFrame(tick)
}



        function togglePlay() {
    if (!data.value || !runtimeReady.value || !totalMs.value) return

    playSpeed.value = normalizePlaySpeed()

    if (playheadMs.value >= totalMs.value) {
        playheadMs.value = 0
        cameraSettledSince = null
        lastSettlePhaseIndex = -1
        segmentReleasedPhaseIdx = -1
        applyInitialView()
    }

    lastTs = 0
    lastRenderTs = 0
    renderFrameSnapshot(true)
    playing.value = !playing.value
}



        function stopPlay() {
            playing.value = false
            playheadMs.value = 0
            cameraSettledSince = null
            lastSettlePhaseIndex = -1
            segmentReleasedPhaseIdx = -1
            applyInitialView()
            renderFrameSnapshot(true)
        }




        function seekBySlider() {
            playheadMs.value = clampLocal(playheadMs.value, 0, totalMs.value || 0)
            lastRenderTs = 0
            camVelX = 0; camVelY = 0; camVelLogZoom = 0
            cameraSettledSince = null
            lastSettlePhaseIndex = -1
            segmentReleasedPhaseIdx = -1
            renderFrameSnapshot(true)
        }



        function getEventStartPoints() {
            const firstStartBySeq = new Map()
            for (const ph of (runtime.value.phases || [])) {
                if (!Number.isFinite(ph?.eventPlaySeq)) continue
                if (ph.type !== 'segment' && ph.type !== 'station' && ph.type !== 'lineMeta') continue
                const seq = ph.eventPlaySeq
                const start = Number(ph.start)
                if (!Number.isFinite(start)) continue
                if (!firstStartBySeq.has(seq) || start < firstStartBySeq.get(seq)) {
                    firstStartBySeq.set(seq, start)
                }
            }
            return events.value
                .map(ev => ({ ev, start: firstStartBySeq.get(ev.playSeq) }))
                .filter(x => Number.isFinite(x.start))
                .sort((a, b) => a.ev.playSeq - b.ev.playSeq)
        }

        function nudgeEvent(direction) {
            if (!runtimeReady.value) return
            const points = getEventStartPoints()
            if (!points.length) return
            const dir = direction < 0 ? -1 : 1
            const frame = getFrameAt(playheadMs.value)
            let idx = -1

            if (frame?.currentEvent && Number.isFinite(frame.currentEvent.playSeq)) {
                idx = points.findIndex(x => x.ev.playSeq === frame.currentEvent.playSeq)
                if (idx >= 0) idx += dir
            } else if (dir > 0) {
                idx = points.findIndex(x => x.start > playheadMs.value + 0.5)
                if (idx < 0) idx = points.length - 1
            } else {
                for (let i = points.length - 1; i >= 0; i--) {
                    if (points[i].start < playheadMs.value - 0.5) { idx = i; break }
                }
                if (idx < 0) idx = 0
            }

            idx = Math.max(0, Math.min(points.length - 1, idx))
            playing.value = false
            playheadMs.value = points[idx].start
            lastTs = 0
            lastRenderTs = 0
            camVelX = 0; camVelY = 0; camVelLogZoom = 0
            cameraSettledSince = null
            lastSettlePhaseIndex = -1
            segmentReleasedPhaseIdx = -1
            renderFrameSnapshot(true)
        }

        async function refreshWorkList() {
            const localNames = await BinshuWorkStorage.getWorkList()
            workList.value = buildWorkOptions(localNames)

            if (
                selectedWorkName.value &&
                !workList.value.some(w => w.key === selectedWorkName.value)
            ) {
                selectedWorkName.value = ''
            }
        }

        async function loadWorkByName(keyOrName) {
            if (!keyOrName) return

            const parsed = parseWorkKey(keyOrName)
            let work = null
            let selectedKey = ''

            if (parsed.type === 'builtin') {
                const list = builtinWorks()
                const src = list[parsed.index]

                if (!src) {
                    alert('没有找到默认存档：' + parsed.index)
                    return
                }

                work = cloneBuiltinWork(src)
                if (!work.name) work.name = builtinWorkName(src, parsed.index)

                selectedKey = builtinWorkKey(parsed.index)
            } else {
                work = await BinshuWorkStorage.loadWorkByName(parsed.name)

                if (!work) {
                    alert('没有找到存档：' + parsed.name)
                    return
                }

                selectedKey = localWorkKey(work.name || parsed.name)
            }

            playing.value = false
            runtimeReady.value = false
            runtimeBuilding.value = false
            playheadMs.value = 0

            data.value = work

            if (window.HistoryUtil?.normalizeData) {
                HistoryUtil.normalizeData(data.value)
            }

            selectedWorkName.value = selectedKey

            await nextTick()
            await rebuildRuntime()
        }

        async function openSelectedWork() {
            await loadWorkByName(selectedWorkName.value)
        }

        async function importJsonFile(e) {
            const file = e.target.files?.[0]
            if (!file) return

            const text = await file.text()
            const work = await BinshuWorkStorage.importWorkJsonText(text, {
                save: true
            })

            await refreshWorkList()
            await loadWorkByName(localWorkKey(work.name))

            e.target.value = ''
        }

        async function setCurrentAsCommon() {
            const opt = currentWorkOption()

            if (!opt) {
                alert('请先打开或选择一个存档')
                return
            }

            setBshistoryCommonWorkKey(opt.key)
            alert('已设为常用：' + opt.label)
        }


        // ───────────────────────────────────────────────────────────────────
        const priorityDrag = Vue.ref({ kind: '', index: -1 })
        const mergePriorityLabels = Object.freeze({ color:'同色', name:'同名', number:'同编号' })
        const segmentPriorityLabels = Object.freeze({ planned:'规划', construction:'开工', operating:'运营', suspended:'停运', abandoned:'废弃（拆除）' })

        function priorityDragStart(kind, index, e) {
            priorityDrag.value = { kind, index }
            try { e?.dataTransfer?.setData('text/plain', `${kind}:${index}`); if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'move' } catch (_) {}
        }
        function priorityDragOver(e) { e?.preventDefault?.() }
        function priorityDrop(kind, index, e) {
            e?.preventDefault?.()
            const d = priorityDrag.value
            if (!d || d.kind !== kind || d.index < 0 || d.index === index) return
            const field = kind === 'merge' ? 'mergePriorityOrder' : 'segmentPriorityOrder'
            const arr = Array.isArray(settings.value[field]) ? [...settings.value[field]] : []
            if (d.index >= arr.length || index >= arr.length) return
            const [item] = arr.splice(d.index, 1)
            arr.splice(index, 0, item)
            settings.value[field] = arr
            if (kind === 'merge') {
                settings.value.mergePriority1 = arr[0]
                settings.value.mergePriority2 = arr[1]
                settings.value.mergePriority3 = arr[2]
            }
            priorityDrag.value = { kind: '', index: -1 }
        }

        async function saveSettings() {
            const prev = settings.value
            const fixed = BshistoryApp.normalizeSettings(settings.value)
            settings.value = fixed

            await BinshuWorkStorage.saveBshistorySettings(fixed)

            const timelineChanged =
                prev.buildSpeedKmPerSec !== fixed.buildSpeedKmPerSec ||
                prev.segmentHoldSec !== fixed.segmentHoldSec ||
                prev.fitGlobalAfterTime !== fixed.fitGlobalAfterTime ||
                prev.globalMoveSec !== fixed.globalMoveSec ||
                prev.globalHoldSec !== fixed.globalHoldSec ||
                prev.continuousChainNoGlobal !== fixed.continuousChainNoGlobal ||
                JSON.stringify(prev.segmentPriorityOrder || []) !== JSON.stringify(fixed.segmentPriorityOrder || [])

            const renderModeChanged = prev.renderCanvas !== fixed.renderCanvas

            if (data.value) {
                // 设置页包含会改变事件顺序/分链/时间轴结构的选项。由于 v-model 会直接修改
                // settings 响应式对象，不能再可靠地用 prev===当前对象判断“是否变化”；保存后统一
                // 重建 runtime，确保拖拽优先级和连续事件规则立即进入 Worker 预计算。
                playing.value = false
                playheadMs.value = 0
                if (renderModeChanged) lastMainCanvasMode = null
                await rebuildRuntime()
            }

            settingsOpen.value = false
        }

        function onKey(e) {
            if (e.code === 'Space') {
                const tag = String(e.target?.tagName || '').toLowerCase()

                if (tag === 'input' || tag === 'textarea' || tag === 'select') return

                e.preventDefault()
                togglePlay()
            }
        }

        function onResize() {
            viewport.value = {
                w: window.innerWidth,
                h: window.innerHeight
            }

            renderFrameSnapshot(true)
        }

        onMounted(async () => {
            window.addEventListener('resize', onResize)
            window.addEventListener('keydown', onKey)

            ensureToolProgressPanel()

            settings.value = BshistoryApp.normalizeSettings(
                await BinshuWorkStorage.loadBshistorySettings(BshistoryApp.DEFAULT_SETTINGS)
            )

            await refreshWorkList()

            const common = getBshistoryCommonWorkKey()

            if (common) {
                await loadWorkByName(common)
            } else {
                const firstBuiltin = firstBuiltinWorkKey()

                if (firstBuiltin) {
                    await loadWorkByName(firstBuiltin)
                }
            }

            raf = requestAnimationFrame(tick)
        })

        onBeforeUnmount(() => {
            cancelAnimationFrame(raf)

            window.removeEventListener('resize', onResize)
            window.removeEventListener('keydown', onKey)

            if (runtimeWorker) {
                runtimeWorker.terminate()
                runtimeWorker = null
            }
        })
        function worldNeighborForEdge(line, edgeIdx, dir) {
            const ids = line?.pts || []
            const n = ids.length

            if (n < 2) return null

            let idx

            if (dir < 0) {
                idx = edgeIdx - 1

                if (idx < 0) {
                    if (!line.ring) return null
                    idx = n - 1
                }
            } else {
                idx = edgeIdx + 2

                if (idx >= n) {
                    if (!line.ring) return null
                    idx = idx % n
                }
            }

            return worldPts.value.get(ids[idx]) || worldPts.value.get(String(ids[idx])) || null
        }
        function edgeLookupKey(lineId, edgeIdx) {
            return `${lineId}:${edgeIdx}`
        }

        function normalizeEdgeIdxForLine(line, edgeIdx) {
            const ids = line?.pts || []
            const n = ids.length
            if (n < 2) return null

            const ec = line.ring ? n : n - 1
            if (ec <= 0) return null

            edgeIdx = Number(edgeIdx)

            if (!Number.isFinite(edgeIdx)) return null

            if (line.ring) {
                return ((edgeIdx % ec) + ec) % ec
            }

            return edgeIdx >= 0 && edgeIdx < ec ? edgeIdx : null
        }

        function getEdgeItemByLineEdge(line, edgeIdx) {
            const idx = normalizeEdgeIdxForLine(line, edgeIdx)
            if (idx == null) return null

            return edgeItemByLineEdgeKey.get(edgeLookupKey(line.id, idx)) || null
        }

        function directedNeighborsForActiveEdge(line, edgeIdx, fromPtId, toPtId) {
            const ids = line?.pts || []
            const n = ids.length

            if (n < 2) {
                return {
                    prevNeighbor: null,
                    nextNeighbor: null,
                    forward: true
                }
            }

            const aId = ids[edgeIdx]
            const bId = ids[(edgeIdx + 1) % n]

            const from = String(fromPtId)
            const to = String(toPtId)

            const forward = String(aId) === from && String(bId) === to
            const reverse = String(bId) === from && String(aId) === to

            if (reverse) {
                return {
                    prevNeighbor: worldNeighborForEdge(line, edgeIdx, 1),
                    nextNeighbor: worldNeighborForEdge(line, edgeIdx, -1),
                    forward: false
                }
            }

            return {
                prevNeighbor: worldNeighborForEdge(line, edgeIdx, -1),
                nextNeighbor: worldNeighborForEdge(line, edgeIdx, 1),
                forward: true
            }
        }

        function activeTailConnected(edgeItem, rs, frame) {
            if (!rs?.current || !rs.edgeProgressInfo || !frame) return false

            const line = edgeItem.line
            const ids = line?.pts || []
            const n = ids.length

            if (n < 2) return false

            const fromPtId = rs.edgeProgressInfo.fromPtId
            const aId = ids[edgeItem.edgeIdx]
            const bId = ids[(edgeItem.edgeIdx + 1) % n]

            let neighborIdx = null

            if (String(fromPtId) === String(aId)) {
                neighborIdx = edgeItem.edgeIdx - 1
            } else if (String(fromPtId) === String(bId)) {
                neighborIdx = edgeItem.edgeIdx + 1
            } else {
                return false
            }

            const neighbor = getEdgeItemByLineEdge(line, neighborIdx)
            if (!neighbor || neighbor.key === edgeItem.key) return false

            const neighborState = edgeRenderState(neighbor, frame)

            return neighborState.state !== 'none' && neighborState.fraction > 0.001
        }
        function bshistoryBlcY() {
            // transform 模式下，stroke-width 搭配 vector-effect="non-scaling-stroke"
            // 可以直接使用屏幕像素级粗细。
            return 0.12
        }

        // bshistoryBlcY 不再单独使用，worldLineWidth 直接返回世界坐标 km
        // 对应 bld.html 中 width * BLCY = width * ficViewScale/1000
        // 经 scale(zoom) 变换后：screen = width/1000 * zoom = width * BLCY  ✓
        function worldLineWidth(line) {
            const eff = effectiveLine(line)
            return (eff?.settings?.width || 50) / 1000   // world km，固定值，transform 负责缩放
        }

        function worldStationBaseRadius(line) {
            const eff = effectiveLine(line)

            return Math.max(
                2.5 / Math.max(0.000001, view.value.zoom || 1),
                ((eff?.settings?.width || 50) * 0.12 / Math.max(0.000001, view.value.zoom || 1)) *
                (eff?.settings?.staRbyWidth || 0.55)
            )
        }


        // ───────────────────────────────────────────────────────────────────
        // 替换⑥ worldNameSize（乘 stationNameScale）
        // ───────────────────────────────────────────────────────────────────
        function worldNameSize(nm) {
            return (nm?.size || 120) / 1000 * (settings.value.stationNameScale || 1)
        }

        let layerCache = new Map()          // 稳定边的图层缓存，phase 切换时清空
        let lastPhaseForLayerCache = -1     // 上次渲染时的 phaseIndex，用于判断是否要清缓存
        // 新增：多行站名解析（与 bld.html 一致，支持 /n 和 \n 换行）
        function parseStaNameLines(name) {
            if (!name) return ['']
            return String(name).split(/\/n|\\n/)
        }
        let worldNamesData = []          // 世界坐标站名，24fps 更新可见性
        let prevLayerPhaseIndex = -1     // 用于条件重建：跳过 Vue diff
        let prevLayerProgress = -1
        let prevLayerAnimSig = ''
        // 新增函数（放在 setup() 内）
        // 60fps 将 worldNamesData 转为屏幕坐标，更新 renderNames.value
        function updateScreenNames() {
            if (!worldNamesData.length) {
                if (renderNames.value.length) renderNames.value = []
                return
            }
            const z = Math.max(0.001, view.value.zoom || 1)
            const tx = viewport.value.w / 2 - view.value.cx * z
            const ty = viewport.value.h / 2 - view.value.cy * z
            renderNames.value = worldNamesData.map(nm => ({
                key: nm.key,
                x: nm.wx * z + tx,
                y: nm.wy * z + ty,
                text: nm.name,
                size: Math.max(8, nm.sizeKm * z),   // 屏幕像素，与 bld 的 nm.size*BLCY 一致
                fill: nm.fill,
                opacity: nm.opacity ?? 1
            }))
        }
        // 相机速度状态（位置弹簧 + 缩放弹簧）
        let camVelX = 0, camVelY = 0, camVelLogZoom = 0
        // 计算当前帧的相机目标（供 updateCamera 和 isCameraSettled 共用）


        function getCameraTarget(frame) {
            if ((frame.type === 'lineMeta' || (frame.type === 'segmentHold' && frame.currentEvent?.eventType === 'lineMeta')) && frame.currentEvent) {
                const ev = frame.currentEvent
                const pts = []
                for (const ei of edgeItems) {
                    if (String(ei.lineId) !== String(ev.ownerId)) continue
                    const rs = edgeRenderState(ei, frame)
                    if (rs.state === 'none' || rs.fraction <= 0.001) continue
                    pts.push(ei.aWorld, ei.bWorld)
                }
                if (!pts.length) pts.push(...(ev.world || []))
                if (pts.length) {
                    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity
                    for (const p of pts) { minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y) }
                    const pad = Math.max(0.4, Math.max(maxX-minX,maxY-minY)*0.08)
                    const b={minX:minX-pad,minY:minY-pad,maxX:maxX+pad,maxY:maxY+pad}
                    return { cx:(b.minX+b.maxX)/2, cy:(b.minY+b.maxY)/2, zoom:BshistoryApp.zoomForBBox(b, viewport.value) }
                }
            }
            if ((frame.type === 'station' || (frame.type === 'segmentHold' && (frame.currentEvent?.eventType === 'station' || frame.currentEvent?.eventType === 'stationName'))) && frame.currentEvent) {
                const wp = frame.currentEvent.world?.[0]
                if (wp) {
                    const demoZoom = Math.max(
                        viewport.value.w / DEMO_VIEW_KM,
                        viewport.value.h / DEMO_VIEW_KM
                    )
                    return { cx: wp.x, cy: wp.y, zoom: demoZoom }
                }
            }
            if ((frame.type === 'segment' || frame.type === 'segmentHold') && frame.currentEvent) {
                const ev = frame.currentEvent
                const buildSpd = settings.value.buildSpeedKmPerSec || 2
                const lookSec = settings.value.camLookAheadSec ?? 0.5

                const lookProg = ev.km > 0
                    ? Math.min(1, frame.progress + lookSec * buildSpd / ev.km)
                    : frame.progress

                // 关键：只取尖端，不创建 pts.slice(...)
                const cur = fastPathCursor(ev, lookProg)
                const tipX = cur.tip?.x ?? view.value.cx
                const tipY = cur.tip?.y ?? view.value.cy

                const demoZoom = Math.max(
                    viewport.value.w / DEMO_VIEW_KM,
                    viewport.value.h / DEMO_VIEW_KM
                )

                return { cx: tipX, cy: tipY, zoom: demoZoom }
            }

            if (frame.type === 'globalMove' || frame.type === 'globalHold') {
                const b = existingBBoxAt(frame.time, Infinity) || allBBox()

                if (b) {
                    return {
                        cx: (b.minX + b.maxX) / 2,
                        cy: (b.minY + b.maxY) / 2,
                        zoom: BshistoryApp.zoomForBBox(b, viewport.value)
                    }
                }
            }

            return null
        }
        // ───────────────────────────────────────────────────────────────────
        function isCameraSettled() {
            if (!runtimeReady.value) return true
            const frame = getFrameAt(playheadMs.value)
            const target = getCameraTarget(frame)
            if (!target) return true
            const dist = Math.hypot(view.value.cx - target.cx, view.value.cy - target.cy)
            const logZoomDiff = Math.abs(Math.log(view.value.zoom / target.zoom))
            return dist < settings.value.camSettleDistKm &&
                logZoomDiff < Math.log(1 + settings.value.camSettleZoomRatio)
        }


        // 合并连续同状态边的样式图层（避免半透明接缝）

        function buildMergedLayersFromGroup(group, prevNeighbor, nextNeighbor, key) {
            const { line, pts, state, gjStyleId, strokeStyleId, lineColor, lineWidth, op } = group
            if (pts.length < 2) return { gj: [], line: [], state: [] }

            const gjOut = [], lineOut = [], stateOut = []
            const ex = { prevNeighbor, nextNeighbor, baseWidth: lineWidth, lineColor }

            gjOut.push(...buildStyleLayers(line, pts, gjStyleId, `gj-${key}`, ex))
            lineOut.push(...buildStyleLayers(line, pts, strokeStyleId, `ln-${key}`, ex))

            const stateStyleId = stateStyleIds[state]  // ← 无响应式访问
            if (stateStyleId && stateStyleId !== '__grayscale__') {
                stateOut.push(...buildStyleLayers(line, pts, stateStyleId, `st-${key}`, ex))
            } else if (stateStyleId === '__grayscale__' && state !== 'operating') {
                stateOut.push({
                    key: `gray-${key}`,
                    d: BshistoryApp.pathFromWorldPoints(pts, prevNeighbor, nextNeighbor),
                    stroke: '#777',
                    strokeWidth: lineWidth * 1.2,
                    dash: '', opacity: 0.55, linecap: 'butt'
                })
            }
            if (!gjOut.length && !lineOut.length && !stateOut.length) {
                lineOut.push({
                    key: `fallback-${key}`,
                    d: BshistoryApp.pathFromWorldPoints(pts, prevNeighbor, nextNeighbor),
                    stroke: lineColor,
                    strokeWidth: lineWidth,
                    dash: '', opacity: op >= 1 ? 1 : 0.65, linecap: 'butt'
                })
            }
            return { gj: gjOut, line: lineOut, state: stateOut }
        }


        // ================================================================
        // 演示建设时的视野范围（km）
        // 这是建设动画期间相机缩放的固定值——最小值 = 最大值 = DEMO_VIEW_KM
        // 修改此处即可调整演示时的缩放级别
        // ================================================================
        const DEMO_VIEW_KM = 10

        let cameraSettledSince = null  // 相机物理到位的开始时间戳（ms），null = 未到位

        let lastSettlePhaseIndex = -1  // 上次做过到位判定的相位索引，切换时重置计时器
        let segmentReleasedPhaseIdx = -1 // 已完成等待并释放动画的 segment 相位索引

        // ───────────────────────────────────────────────────────────────────
        // 新增① 放到 ref / computed 定义区（和 viewport、view 等同层）
        // ───────────────────────────────────────────────────────────────────
        const minimapCanvas = ref(null)

        const minimapSize = computed(() =>
            Math.round(Math.max(60, viewport.value.h * (settings.value.minimapHeightRatio || 0.25)))
        )


        // ───────────────────────────────────────────────────────────────────
        // 新增② drawMinimap()（放在 renderFrameSnapshot 附近）
        // ───────────────────────────────────────────────────────────────────

        let minimapCx = NaN  // 缩略图中心世界坐标，NaN = 未初始化（首帧自动居中 bbox）
        let minimapCy = NaN



        function drawMinimap() {
            const canvas = minimapCanvas.value
            if (!canvas || !runtimeReady.value || !data.value || !edgeItems.length) return

            const sz = minimapSize.value
            if (canvas.width !== sz || canvas.height !== sz) {
                canvas.width = sz
                canvas.height = sz
            }

            const ctx = canvas.getContext('2d')
            const frame = getFrameAt(playheadMs.value)
            const isGlobal = frame.type === 'globalMove' || frame.type === 'globalHold'
            const curEv = frame.currentEvent

            // ── 世界坐标 bbox ───────────────────────────────────────────────
            const bbox = cachedWorldBBox
            if (!bbox) return

            const maxViewKm = settings.value.minimapMaxViewKm || 64
            const span = Math.min(Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY, 0.001), maxViewKm)
            const halfSpan = span / 2
            const sc = sz / span
            const bboxCx = (bbox.minX + bbox.maxX) / 2
            const bboxCy = (bbox.minY + bbox.maxY) / 2

            // ── 缩略图中心追踪 ──────────────────────────────────────────────
            if (isGlobal || !Number.isFinite(minimapCx)) {
                minimapCx = bboxCx
                minimapCy = bboxCy
            } else if (frame.type === 'segment' || frame.type === 'segmentHold') {
                const thr = halfSpan * 0.9
                const cx = view.value.cx
                const cy = view.value.cy
                if (cx < minimapCx - thr) minimapCx = cx + thr
                if (cx > minimapCx + thr) minimapCx = cx - thr
                if (cy < minimapCy - thr) minimapCy = cy + thr
                if (cy > minimapCy + thr) minimapCy = cy - thr
            }

            const tx = wx => (wx - minimapCx) * sc + sz / 2
            const ty = wy => (wy - minimapCy) * sc + sz / 2

            // ── 背景 ────────────────────────────────────────────────────────
            ctx.clearRect(0, 0, sz, sz)
            ctx.fillStyle = 'rgba(238, 244, 250, 0.96)'
            ctx.fillRect(0, 0, sz, sz)
            for (const tr of buildTerrainLayers()) {
                if (!tr || !tr.d) continue

                const path = new Path2D(tr.d)

                ctx.save()
                ctx.translate(sz / 2 - minimapCx * sc, sz / 2 - minimapCy * sc)
                ctx.scale(sc, sc)

                ctx.globalAlpha = Math.min(Number(tr.opacity ?? 0.5), 0.5)

                if (tr.fill && tr.fill !== 'none') {
                    ctx.fillStyle = tr.fill
                    ctx.fill(path)
                }

                if (tr.stroke && tr.stroke !== 'none' && Number(tr.strokeWidth || 0) > 0) {
                    ctx.strokeStyle = tr.stroke
                    ctx.lineWidth = Number(tr.strokeWidth || 0)
                    ctx.lineCap = 'round'
                    ctx.lineJoin = 'round'
                    ctx.stroke(path)
                }

                ctx.restore()
            }
            // ── 分类本时间点的边 ────────────────────────────────────────────
            const completedGroupKeys = new Set()
            const curEventKeys = new Set()
            const futureGroupKeys = new Set()

            if (Number.isFinite(frame.time)) {
                for (const ev of events.value) {
                    if (ev.time !== frame.time) continue
                    const done = !curEv || ev.playSeq < curEv.playSeq || frame.type === 'segmentHold' || isGlobal
                    const isCurrent = curEv && ev.playSeq === curEv.playSeq
                    const target = done ? completedGroupKeys : (isCurrent ? curEventKeys : futureGroupKeys)
                    for (const idx of ev.edgeIdxs || []) target.add(BshistoryApp.edgeKey(ev.ownerId, idx))
                }
            }

            const allGroupKeys = new Set([...completedGroupKeys, ...curEventKeys, ...futureGroupKeys])

            // ── 按颜色批量收集（用 edgeStateSnapshot 取状态，无响应式访问） ──
            const normalBatch = new Map()
            const groupBatch = new Map()
            const snap = edgeStateSnapshot  // 本帧由 renderFrameSnapshot 已填充

            for (const ei of edgeItems) {
                const inGroup = allGroupKeys.has(ei.key)
                // 优先用已计算的快照，回退到 stateAtCutoff（首帧或强制时）
                const st = snap
                    ? (snap[ei.index] || 'none')
                    : stateAtCutoff(ei, frame.time, frame.seqCutoff)

                if (frame.type === 'lineMeta' && recolorEventAppliesToEdge(curEv, ei)) {
                    if (st === 'none') continue
                    const rf = recolorFractionsForEdge(ei, frame)
                    const addMiniPart = (color, fraction, trimFromStart) => {
                        if (fraction <= 0.001) return
                        let ax = ei.aWorld.x, ay = ei.aWorld.y, bx = ei.bWorld.x, by = ei.bWorld.y
                        if (fraction < 0.999999) {
                            if (trimFromStart) {
                                const cut = 1 - fraction
                                ax = ax + (bx - ax) * cut
                                ay = ay + (by - ay) * cut
                            } else {
                                bx = ax + (bx - ax) * fraction
                                by = ay + (by - ay) * fraction
                            }
                        }
                        if (!groupBatch.has(color)) groupBatch.set(color, [])
                        groupBatch.get(color).push(tx(ax), ty(ay), tx(bx), ty(by))
                    }
                    addMiniPart(curEv.fromColor || '#888', rf?.oldFraction ?? 1, rf?.oldTrimFromStart)
                    addMiniPart(curEv.toColor || '#888', rf?.newFraction ?? 0, false)
                    continue
                }

                if (inGroup) {
                    if (!completedGroupKeys.has(ei.key) || st === 'none') continue
                    const color = lineColorForEdgeAtFrame(ei, frame)
                    if (!groupBatch.has(color)) groupBatch.set(color, [])
                    groupBatch.get(color).push(tx(ei.aWorld.x), ty(ei.aWorld.y), tx(ei.bWorld.x), ty(ei.bWorld.y))
                } else {
                    if (st === 'none') continue
                    const color = lineColorForEdgeAtFrame(ei, frame)
                    if (!normalBatch.has(color)) normalBatch.set(color, [])
                    normalBatch.get(color).push(tx(ei.aWorld.x), ty(ei.aWorld.y), tx(ei.bWorld.x), ty(ei.bWorld.y))
                }
            }

            const normalLW = Math.max(1, sz / 120)
            ctx.lineCap = 'butt'

            // Pass 1：既有线路（细 1×）
            ctx.lineWidth = normalLW
            for (const [color, coords] of normalBatch) {
                ctx.strokeStyle = color
                ctx.beginPath()
                for (let i = 0; i < coords.length; i += 4) {
                    ctx.moveTo(coords[i], coords[i + 1])
                    ctx.lineTo(coords[i + 2], coords[i + 3])
                }
                ctx.stroke()
            }

            // Pass 2：本时间点已完成的边（粗 2×）
            ctx.lineWidth = normalLW * 2
            for (const [color, coords] of groupBatch) {
                ctx.strokeStyle = color
                ctx.beginPath()
                for (let i = 0; i < coords.length; i += 4) {
                    ctx.moveTo(coords[i], coords[i + 1])
                    ctx.lineTo(coords[i + 2], coords[i + 3])
                }
                ctx.stroke()
            }

            // Pass 3：当前事件动态建设尖端（粗 2×，与主画布进度同步）
            if (frame.type === 'segment' && curEv?.world?.length >= 2) {
                const color = curEv?.eventType === 'lineMeta' ? (curEv.toColor || curEv.fromColor || curEv.line?.color || '#888') : (curEv.rootLine?.color || curEv.line?.color || '#888')

                ctx.strokeStyle = color
                ctx.lineWidth = normalLW * 2
                drawEventPartialPathOnCanvas(ctx, curEv, frame.progress, tx, ty, 80)
            }

            // ── 当前主画布视野范围矩形（黑色描边）────────────────────────
            const zoom = Math.max(1e-9, view.value.zoom)
            const vpW = viewport.value.w / zoom   // 视野宽度（世界 km）
            const vpH = viewport.value.h / zoom   // 视野高度（世界 km）
            const rx = tx(view.value.cx - vpW / 2)
            const ry = ty(view.value.cy - vpH / 2)
            const rw = vpW * sc
            const rh = vpH * sc

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)'
            ctx.lineWidth = 1.5
            ctx.strokeRect(rx, ry, rw, rh)

            // ── 边框 ─────────────────────────────────────────────────────
            ctx.strokeStyle = 'rgba(80,120,160,0.30)'
            ctx.lineWidth = 1
            ctx.strokeRect(0.5, 0.5, sz - 1, sz - 1)
        }

        let styleByIdMap = new Map()  // styleId → 原始 stroke 样式对象（非响应式，O(1) 查询）
        let stateStyleIds = {}        // state 字符串 → styleId，消除每帧的响应式访问

        let edgeRecordsRaw = {}       // edgeRecords 的非响应式原始引用，消除响应式开销
        let edgeStateSnapshot = null  // 每帧由 renderFrameSnapshot 填充，drawMinimap 直接复用

        let cachedWorldBBox = null   // 一次性计算，drawMinimap / allBBox 复用，不再每帧展开 worldPts
        function fastPathCursor(ev, progress) {
            const pts = ev?.world
            const cum = ev?.worldCumLen
            const total = Number(ev?.worldTotal || 0)

            if (!pts || pts.length < 2) {
                return { idx: 0, local: 0, target: 0, tip: pts?.[0] || null, from: null, to: null }
            }

            progress = BshistoryApp.clamp(progress, 0, 1)

            if (progress <= 0) {
                return { idx: 0, local: 0, target: 0, tip: pts[0], from: pts[0], to: pts[1] }
            }

            if (progress >= 1) {
                const lastIdx = pts.length - 2
                return {
                    idx: lastIdx,
                    local: 1,
                    target: total,
                    tip: pts[pts.length - 1],
                    from: pts[lastIdx],
                    to: pts[pts.length - 1]
                }
            }

            // 正常路径：O(log n)，不 slice，不分配长数组
            if (cum && cum.length === pts.length && total > 0) {
                const target = total * progress

                let lo = 0
                let hi = pts.length - 2

                while (lo < hi) {
                    const mid = (lo + hi + 1) >> 1
                    if (cum[mid] <= target) lo = mid
                    else hi = mid - 1
                }

                const segLen = cum[lo + 1] - cum[lo]
                const local = segLen > 0 ? BshistoryApp.clamp((target - cum[lo]) / segLen, 0, 1) : 1

                const from = pts[lo]
                const to = pts[lo + 1]
                const tip = {
                    x: from.x + (to.x - from.x) * local,
                    y: from.y + (to.y - from.y) * local
                }

                return { idx: lo, local, target, tip, from, to }
            }

            // 兼容旧数据：无 cum 时也不创建 lens 数组
            let fallbackTotal = 0
            for (let i = 0; i < pts.length - 1; i++) {
                fallbackTotal += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
            }

            if (fallbackTotal <= 0) {
                return { idx: 0, local: 0, target: 0, tip: pts[0], from: pts[0], to: pts[1] }
            }

            const target = fallbackTotal * progress
            let acc = 0

            for (let i = 0; i < pts.length - 1; i++) {
                const from = pts[i]
                const to = pts[i + 1]
                const len = Math.hypot(to.x - from.x, to.y - from.y)

                if (acc + len >= target) {
                    const local = len > 0 ? BshistoryApp.clamp((target - acc) / len, 0, 1) : 1
                    const tip = {
                        x: from.x + (to.x - from.x) * local,
                        y: from.y + (to.y - from.y) * local
                    }

                    return { idx: i, local, target, tip, from, to }
                }

                acc += len
            }

            const lastIdx = pts.length - 2
            return {
                idx: lastIdx,
                local: 1,
                target: fallbackTotal,
                tip: pts[pts.length - 1],
                from: pts[lastIdx],
                to: pts[pts.length - 1]
            }
        }
        function mainAnimSignature(frame) {
            if (frame?.type !== 'segment' || !frame.currentEvent) return ''

            const cur = fastPathCursor(frame.currentEvent, frame.progress)
            if (!cur.tip) return `${frame.phaseIndex}:empty`

            // 以屏幕 0.25px 等价的世界距离做量化：
            // 既避免无意义的超高频重建，又不会让长线路尖端按 0.001 总进度跳格。
            const z = Math.max(1e-9, view.value.zoom || 1)
            const worldStep = Math.max(1e-9, 0.25 / z)

            return [
                frame.phaseIndex,
                frame.currentEvent.playSeq,
                cur.idx,
                Math.round(cur.tip.x / worldStep),
                Math.round(cur.tip.y / worldStep)
            ].join(':')
        }
        function drawEventPartialPathOnCanvas(ctx, ev, progress, tx, ty, maxSegments = 80) {
            const pts = ev?.world
            if (!pts || pts.length < 2) return

            const cur = fastPathCursor(ev, progress)
            if (!cur.tip) return

            const endIdx = Math.max(0, Math.min(cur.idx, pts.length - 2))
            const skip = Math.max(1, Math.floor(Math.max(1, endIdx + 1) / maxSegments))

            ctx.beginPath()
            ctx.moveTo(tx(pts[0].x), ty(pts[0].y))

            for (let i = skip; i <= endIdx; i += skip) {
                ctx.lineTo(tx(pts[i].x), ty(pts[i].y))
            }

            ctx.lineTo(tx(cur.tip.x), ty(cur.tip.y))
            ctx.stroke()
        }

        function fastPartialPath(ev, progress) {
            const pts = ev?.world

            if (!pts || pts.length < 2) return { pts: [], tip: null }

            progress = BshistoryApp.clamp(progress, 0, 1)

            if (progress <= 0) return { pts: [pts[0]], tip: pts[0] }
            if (progress >= 1) return { pts: pts.slice(), tip: pts[pts.length - 1] }

            const cur = fastPathCursor(ev, progress)
            if (!cur.tip) return { pts: [], tip: null }

            // 只有真正需要“整段已完成路径”的地方才 slice；
            // 相机跟随、动画签名、缩略图都不要调用这个来取 tip。
            return {
                pts: [...pts.slice(0, cur.idx + 1), cur.tip],
                tip: cur.tip
            }
        }

        const MAX_STABLE_GROUP_EDGES = 40


        function getBshistoryCommonWorkName() {
            try {
                return localStorage.getItem(BSHISTORY_COMMON_WORK_KEY) || ''
            } catch (err) {
                console.warn('[bshistory] 读取常用存档失败：', err)
                return ''
            }
        }

        async function setBshistoryCommonWorkName(name) {
            try {
                localStorage.setItem(BSHISTORY_COMMON_WORK_KEY, String(name || ''))
            } catch (err) {
                console.error('[bshistory] 保存常用存档失败：', err)
                throw err
            }
        }
        const mainCanvas = ref(null)
        let mainCanvasStableLayers = []
        let mainCanvasActiveLayers = []
        let mainCanvasStations = []
        let mainCanvasNames = []
        let mainCanvasTerrainLabels = []
        let mainCanvasDistrictLabels = []
        let lastMainCanvasMode = null
        let mainCanvasTerrainLayers = []

        function resetMainCanvasBuffers() {
            mainCanvasTerrainLayers = []
            mainCanvasStableLayers = []
            mainCanvasActiveLayers = []
            mainCanvasStations = []
            mainCanvasNames = []
            mainCanvasTerrainLabels = []
            mainCanvasDistrictLabels = []
            window.BshistoryCanvasRenderer?.clearCache?.()
        }

        function clearMainCanvas() {
            window.BshistoryCanvasRenderer?.clear?.(mainCanvas.value)
        }

        function drawMainCanvas() {
            if (!settings.value.renderCanvas) return
            if (!mainCanvas.value || !window.BshistoryCanvasRenderer?.draw) return

            window.BshistoryCanvasRenderer.draw({
                canvas: mainCanvas.value,
                viewport: viewport.value,
                view: view.value,
                terrains: mainCanvasTerrainLayers,
                stableLayers: mainCanvasStableLayers,
                activeLayers: mainCanvasActiveLayers,
                stations: mainCanvasStations,
                names: mainCanvasNames,
                terrainLabels: mainCanvasTerrainLabels,
                districtLabels: mainCanvasDistrictLabels,
                parseNameLines: parseStaNameLines
            })
        }
        function activePartialPathWithOffset(activeEdge, prevNeighbor, nextNeighbor, offset) {
            if (!activeEdge?.fromWorld || !activeEdge?.toWorld) return ''

            const base = BshistoryApp.offsetPolyline(
                [activeEdge.fromWorld, activeEdge.toWorld],
                offset
            )

            if (!base || base.length < 2) return ''

            const prev = prevNeighbor
                ? BshistoryApp.offsetPolyline([prevNeighbor, activeEdge.fromWorld], offset)[0]
                : null

            const next = nextNeighbor
                ? BshistoryApp.offsetPolyline([activeEdge.toWorld, nextNeighbor], offset)[1]
                : null

            if (activeEdge.trimFromStart) {
                return BshistoryApp.tailBezierPathFromWorldEdge(
                    base[0],
                    base[1],
                    prev,
                    next,
                    activeEdge.fraction
                )
            }

            return BshistoryApp.partialBezierPathFromWorldEdge(
                base[0],
                base[1],
                prev,
                next,
                activeEdge.fraction
            )
        }

        const BUILTIN_WORK_PREFIX = 'builtin:'
        const LOCAL_WORK_PREFIX = 'local:'
        const BSHISTORY_COMMON_WORK_KEY = 'jb:forceLoadName'

        function builtinWorks() {
            return Array.isArray(window.BSHISTORY_ZIDAI_WORKS)
                ? window.BSHISTORY_ZIDAI_WORKS.filter(Boolean)
                : []
        }

        function builtinWorkName(work, index) {
            return String(work?.name || `自带存档 ${index + 1}`)
        }

        function localWorkKey(name) {
            return LOCAL_WORK_PREFIX + String(name || '')
        }

        function builtinWorkKey(index) {
            return BUILTIN_WORK_PREFIX + String(index)
        }

        function parseWorkKey(key) {
            key = String(key || '')

            if (key.startsWith(BUILTIN_WORK_PREFIX)) {
                const index = Number(key.slice(BUILTIN_WORK_PREFIX.length))
                return {
                    type: 'builtin',
                    index: Number.isInteger(index) && index >= 0 ? index : -1,
                    name: ''
                }
            }

            if (key.startsWith(LOCAL_WORK_PREFIX)) {
                return {
                    type: 'local',
                    index: -1,
                    name: key.slice(LOCAL_WORK_PREFIX.length)
                }
            }

            // 兼容旧常用值：以前保存的是纯本地存档名
            return {
                type: 'local',
                index: -1,
                name: key
            }
        }

        function getBshistoryCommonWorkKey() {
            try {
                return localStorage.getItem(BSHISTORY_COMMON_WORK_KEY) || ''
            } catch (err) {
                console.warn('[bshistory] 读取常用存档失败：', err)
                return ''
            }
        }

        function setBshistoryCommonWorkKey(key) {
            try {
                localStorage.setItem(BSHISTORY_COMMON_WORK_KEY, String(key || ''))
            } catch (err) {
                console.error('[bshistory] 保存常用存档失败：', err)
                throw err
            }
        }

        function cloneBuiltinWork(work) {
            return JSON.parse(JSON.stringify(work || {}))
        }

        function buildWorkOptions(localNames) {
            const out = []

            for (const w of builtinWorks().entries()) {
                const index = w[0]
                const work = w[1]

                out.push({
                    key: builtinWorkKey(index),
                    type: 'builtin',
                    index,
                    name: builtinWorkName(work, index),
                    label: `默认存档：${builtinWorkName(work, index)}`
                })
            }

            for (const name of localNames || []) {
                out.push({
                    key: localWorkKey(name),
                    type: 'local',
                    index: -1,
                    name,
                    label: String(name || '')
                })
            }

            return out
        }

        function currentWorkOption() {
            const key = selectedWorkName.value

            return workList.value.find(w => w.key === key) || null
        }

        function firstBuiltinWorkKey() {
            return builtinWorks().length ? builtinWorkKey(0) : ''
        }
        function buildSpecialLabelLayers() {
            const d = data.value

            if (!d || !Array.isArray(d.lables)) {
                return {
                    terrainLabels: [],
                    districtLabels: []
                }
            }

            if (window.TerrainLableUtil?.normalizeData) {
                TerrainLableUtil.normalizeData(d)
            }

            const terrainLabels = []
            const districtLabels = []

            for (const lb of d.lables) {
                if (!lb) continue

                const mode = lb.mode || 'line'

                if (mode === 'terrain' && !settings.value.renderTerrainLabels) continue
                if (mode === 'district' && !settings.value.renderDistrictLabels) continue
                if (mode !== 'terrain' && mode !== 'district') continue

                const p = BshistoryApp.pointToWorld(lb, !!d.fictionalMode)

                let resolved

                try {
                    resolved = resolveLable(
                        lb,
                        maps.value.lines,
                        d.defaultStyles || {},
                        { data: d }
                    )
                } catch (err) {
                    console.warn('[bshistory] 图例解析失败：', lb, err)
                    continue
                }

                const item = {
                    key: `${mode}-label-${lb.id}`,
                    id: lb.id,
                    mode,
                    x: p.x,
                    y: p.y,
                    color: resolved.color,
                    text: resolved.text,
                    styleName: resolved.styleName,
                    scale: Number(lb.scale || 1),
                    fixedFont: lb.fixedFont !== false,
                    baseUnit: 0.1
                }

                if (mode === 'terrain') terrainLabels.push(item)
                else districtLabels.push(item)
            }

            return {
                terrainLabels,
                districtLabels
            }
        }
        ///rrrrrrr
        return {
            data, parseStaNameLines, mainCanvas,
            workList,
            selectedWorkName,
            settingsOpen,
            debugOpen,
            debugHistory,
            settings,

            playing,
            playheadMs,
            viewport,
            stageTransform,

            runtimeReady,
            runtimeBuilding,

            events,
            totalMs,
            currentEvent,
            currentDateText,
            totalOperatingKm,
            totalOperatingStations,

            stableRenderLayers, activeRenderLayers,
            renderStations,
            renderNames,
            legendCards,
            legendGridStyle,

            BshistoryApp,

            formatDuration: BshistoryApp.formatDuration,
            actionLabel: BshistoryApp.actionLabel,
            lineShortName: BshistoryApp.lineShortName,

            badgeStyle,
            legendCardStyle,

            togglePlay,
            stopPlay,
            seekBySlider,
            nudgeEvent,
            refreshWorkList,
            openSelectedWork,
            importJsonFile,
            setCurrentAsCommon, renderTerrains,
            saveSettings, minimapCanvas, minimapSize,
            priorityDragStart, priorityDragOver, priorityDrop, mergePriorityLabels, segmentPriorityLabels,
            renderTerrainLabels,
            renderDistrictLabels,playSpeed,onPlaySpeedInput,
        }
    }
}).mount('#app')