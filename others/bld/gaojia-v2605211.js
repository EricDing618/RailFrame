// ==================== gaojia.js — 完整替换 ====================

// ---- 新数据结构 ----
// line.segments: [{fromPtId: number, toPtId: number, type: 1|-1}]
// type: 1=高架, -1=地下
// 没有覆盖到的段落视为 'normal'（未定）
// 注意：fromPtId/toPtId 是 pts 数组中相邻点之间的"边"的起止点id
// 一条边由 (pts[i], pts[i+1]) 组成，fromPtId=pts[i], toPtId=pts[i+1]

/**
 * 获取线路中两个ptId之间的所有边（按pts顺序）
 * 返回 [{fromPtId, toPtId}]
 */
function gjGetEdgesBetween(line, idxA, idxB) {
    const n = line.pts.length
    const edges = []
    if (idxA <= idxB) {
        for (let i = idxA; i < idxB; i++) {
            edges.push({ fromPtId: line.pts[i], toPtId: line.pts[i + 1] })
        }
    } else {
        // 跨越式（环线）
        for (let i = idxA; i < n - 1; i++) {
            edges.push({ fromPtId: line.pts[i], toPtId: line.pts[i + 1] })
        }
        // 环线末->首
        edges.push({ fromPtId: line.pts[n - 1], toPtId: line.pts[0] })
        for (let i = 0; i < idxB; i++) {
            edges.push({ fromPtId: line.pts[i], toPtId: line.pts[i + 1] })
        }
    }
    return edges
}

/**
 * 给线路某段区间设置类型（支持环线）
 * @param {object} line
 * @param {number} idxA - 起点在 pts 中的下标
 * @param {number} idxB - 终点在 pts 中的下标
 * @param {number|null} type - 1(高架) | -1(地下) | null(删除/未定)
 */
// ==================== gaojia.js 中需要替换的函数 ====================

// 修复问题2：gjSetSegment 非环线时先规范化 idxA/idxB 顺序
function gjSetSegment(line, idxA, idxB, type) {
    if (!line.segments) line.segments = []
    const n = line.pts.length
    if (n < 2) return

    let fromIdx = idxA, toIdx = idxB

    // 非环线：强制 fromIdx <= toIdx
    if (!line.ring && fromIdx > toIdx) {
        [fromIdx, toIdx] = [toIdx, fromIdx]
    }

    const newEdges = gjGetEdgesBetween(line, fromIdx, toIdx)
    const newEdgeSet = new Set(newEdges.map(e => e.fromPtId + ',' + e.toPtId))

    line.segments = line.segments.filter(seg => {
        const key = seg.fromPtId + ',' + seg.toPtId
        return !newEdgeSet.has(key)
    })

    if (type !== null) {
        for (const edge of newEdges) {
            line.segments.push({ fromPtId: edge.fromPtId, toPtId: edge.toPtId, type })
        }
    }
}

/**
 * 查询某条边（fromPtId->toPtId）的类型
 * @returns {number} 1=高架, -1=地下, 0=normal
 */
function gjGetEdgeType(line, fromPtId, toPtId) {
    if (!line.segments || line.segments.length === 0) return 0
    const seg = line.segments.find(s => s.fromPtId === fromPtId && s.toPtId === toPtId)
    return seg ? seg.type : 0
}

/**
 * 把线路的 pts 按段类型分割为若干段
 * 每段包含连续的点序列、类型、以及首尾的邻居点（用于贝塞尔连续性）
 * @param {object} line
 * @param {Map} ptsMap
 * @returns {Array<{pts: Array, type: number, prevNeighborPt: object|null, nextNeighborPt: object|null}>}
 */
function gjSplitLineByType(line, ptsMap) {
    const ids = line.pts
    const n = ids.length
    if (n < 2) return []

    const ring = !!line.ring

    // ✅ 没有 segments：直接返回整条线，不参与高架/地下解析
    if (!line.segments?.length) {
        const pts = []
        for (let i = 0; i < n; i++) {
            const p = ptsMap.get(ids[i])
            if (p) pts.push(p)
        }

        // 闭环补首点，保持后续路径绘制一致
        if (ring && pts.length > 0) {
            pts.push(pts[0])
        }

        if (pts.length < 2) return []

        return [{
            pts,
            type: 0,
            prevNeighborPt: ring ? ptsMap.get(ids[n - 1]) ?? null : null,
            nextNeighborPt: ring ? ptsMap.get(ids[1]) ?? null : null
        }]
    }

    const edgeCount = ring ? n : n - 1

    const segMap = new Map()
    for (const s of line.segments) {
        segMap.set(s.fromPtId * 2097152 + s.toPtId, s.type)
    }

    const resolvedPts = new Array(n)
    for (let i = 0; i < n; i++) {
        resolvedPts[i] = ptsMap.get(ids[i]) ?? null
    }

    const edgeTypes = new Array(edgeCount)
    for (let i = 0; i < edgeCount; i++) {
        const key = ids[i] * 2097152 + ids[(i + 1) % n]
        edgeTypes[i] = segMap.get(key) ?? 0
    }

    const rawSegs = []
    let curType = edgeTypes[0]
    let startEdge = 0

    for (let i = 1; i < edgeCount; i++) {
        if (edgeTypes[i] !== curType) {
            rawSegs.push({ startEdge, endEdge: i - 1, type: curType, wrapToStart: false })
            startEdge = i
            curType = edgeTypes[i]
        }
    }

    rawSegs.push({ startEdge, endEdge: edgeCount - 1, type: curType, wrapToStart: false })

    if (ring && rawSegs.length > 1) {
        const first = rawSegs[0]
        const last = rawSegs[rawSegs.length - 1]
        if (first.type === last.type) {
            last.endEdge = first.endEdge
            last.wrapToStart = true
            rawSegs.shift()
        }
    }

    const result = []

    for (const seg of rawSegs) {
        const pts = []

        if (ring && seg.wrapToStart) {
            for (let i = seg.startEdge; i < edgeCount; i++) {
                const p = resolvedPts[i]
                if (p) pts.push(p)
            }
            for (let i = 0; i <= seg.endEdge + 1; i++) {
                const p = resolvedPts[i % n]
                if (p) pts.push(p)
            }
        } else {
            for (let i = seg.startEdge; i <= seg.endEdge + 1; i++) {
                const p = resolvedPts[i % n]
                if (p) pts.push(p)
            }
        }

        if (pts.length < 2) continue

        const firstIdx = seg.startEdge
        const lastIdx = (seg.endEdge + 1) % n

        let prevNeighborPt = null
        let nextNeighborPt = null

        if (ring) {
            prevNeighborPt = resolvedPts[(firstIdx - 1 + n) % n]
            nextNeighborPt = resolvedPts[(lastIdx + 1) % n]
        } else {
            if (firstIdx > 0) prevNeighborPt = resolvedPts[firstIdx - 1]
            if (lastIdx < n - 1) nextNeighborPt = resolvedPts[lastIdx + 1]
        }

        result.push({ pts, type: seg.type, prevNeighborPt, nextNeighborPt })
    }

    return result
}

/**
 * 环线笔刷：两点之间选较短的半环
 * 返回 {fromIdx, toIdx}，始终 fromIdx <= toIdx（非跨越式）或 fromIdx > toIdx（跨越式）
 */
function gjRingChooseShortHalf(line, idxA, idxB) {
    const n = line.pts.length
    if (idxA === idxB) return null

    const lo = Math.min(idxA, idxB)
    const hi = Math.max(idxA, idxB)
    const lenForward = hi - lo       // lo→hi 段边数
    const lenWrap = n - hi + lo      // hi→...→0→...→lo 跨越段边数

    if (lenForward <= lenWrap) {
        // 较短的是顺序段
        return { fromIdx: lo, toIdx: hi }
    } else {
        // 较短的是跨越段（从大index跨越到小index）
        return { fromIdx: hi, toIdx: lo }
    }
}

/**
 * 响应删除节点：从 line.segments 中移除含该 ptId 的边，
 * 并合并两侧：若两侧类型一致保留；不一致取前一条边的类型。
 * @param {object} line
 * @param {number} ptId - 被删除的节点id
 */
function gjOnDeletePoint(line, ptId) {
    if (!line.segments || line.segments.length === 0) return

    // 找到与被删节点相关的边（前边：?->ptId，后边：ptId->?）
    const prevSeg = line.segments.find(s => s.toPtId === ptId)
    const nextSeg = line.segments.find(s => s.fromPtId === ptId)

    // 删除这两条边
    line.segments = line.segments.filter(s => s.fromPtId !== ptId && s.toPtId !== ptId)

    // 如果前后都有类型，合并为一条边
    if (prevSeg && nextSeg) {
        const mergedType = prevSeg.type // 两侧一致用一致值，不一致取前边
        // 其实直接用 prevSeg.type 即可（两侧一致时相同，不一致时取前）
        line.segments.push({ fromPtId: prevSeg.fromPtId, toPtId: nextSeg.toPtId, type: mergedType })
    } else if (prevSeg) {
        // 只有前边，后面没有标注，什么都不做（前边消失了，不补）
    } else if (nextSeg) {
        // 只有后边，前面没有标注，什么都不做
    }
}

/**
 * 响应在区间内插入节点：找到 fromPtId->toPtId 这条边，
 * 拆分为 fromPtId->newPtId 和 newPtId->toPtId，类型不变。
 * @param {object} line
 * @param {number} prevPtId - 插入点的前一个节点id
 * @param {number} nextPtId - 插入点的后一个节点id
 * @param {number} newPtId  - 新插入的节点id
 */
function gjOnInsertPoint(line, prevPtId, nextPtId, newPtId) {
    if (!line.segments || line.segments.length === 0) return

    const idx = line.segments.findIndex(s => s.fromPtId === prevPtId && s.toPtId === nextPtId)
    if (idx === -1) return

    const origType = line.segments[idx].type
    line.segments.splice(idx, 1,
        { fromPtId: prevPtId, toPtId: newPtId, type: origType },
        { fromPtId: newPtId, toPtId: nextPtId, type: origType }
    )
}

/**
 * 获取某段的有效样式ID
 */
function gjGetStyleId(line, type, defaultStyles, linesMap) {
    const effLine = (line.parent > 0 ? linesMap.get(line.parent) : null) || line
    const key = type === 1 ? 'elevatedStyleId' : 'undergroundStyleId'

    if (effLine.settings && effLine.settings[key] != null) return effLine.settings[key]
    if (defaultStyles && defaultStyles[key] != null) return defaultStyles[key]
    if (effLine.settings && effLine.settings.strokeStyleId != null) return effLine.settings.strokeStyleId
    if (defaultStyles && defaultStyles.strokeStyleId != null) return defaultStyles.strokeStyleId
    return null
}

/**
 * 兼容旧存档：将旧的 index-based segments 迁移为 ptId-based
 * 在 fixData 中调用一次即可
 */
function gjMigrateSegments(data) {
    for (const line of data.lines) {
        if (!line.segments || line.segments.length === 0) continue
        const newSegs = []
        for (const seg of line.segments) {
            // 旧格式有 fromIdx/toIdx，新格式有 fromPtId/toPtId
            if (seg.fromPtId !== undefined) {
                // 已经是新格式，但检查 type 是否是字符串（旧版用字符串）
                if (seg.type === 'elevated') { seg.type = 1 }
                else if (seg.type === 'underground') { seg.type = -1 }
                newSegs.push(seg)
                continue
            }
            // 旧格式：fromIdx/toIdx，需要转换
            const from = seg.fromIdx
            const to = seg.toIdx
            const type = seg.type === 'elevated' ? 1 : (seg.type === 'underground' ? -1 : null)
            if (type === null) continue
            if (from === undefined || to === undefined) continue
            // 生成这段的所有边
            const n = line.pts.length
            if (from <= to) {
                for (let i = from; i < to; i++) {
                    if (i < n - 1) {
                        newSegs.push({ fromPtId: line.pts[i], toPtId: line.pts[i + 1], type })
                    }
                }
            } else {
                // 跨越式
                for (let i = from; i < n - 1; i++) {
                    newSegs.push({ fromPtId: line.pts[i], toPtId: line.pts[i + 1], type })
                }
                if (n > 0) newSegs.push({ fromPtId: line.pts[n - 1], toPtId: line.pts[0], type })
                for (let i = 0; i < to; i++) {
                    if (i < n - 1) {
                        newSegs.push({ fromPtId: line.pts[i], toPtId: line.pts[i + 1], type })
                    }
                }
            }
        }
        line.segments = newSegs
    }
}
function gjOnReverseLine(line) {
    if (!line || !Array.isArray(line.segments) || line.segments.length === 0) return

    line.segments = line.segments.map(s => ({
        fromPtId: s.toPtId,
        toPtId: s.fromPtId,
        type: s.type
    }))
}