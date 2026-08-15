// ==================== bshistory-canvas.js ====================
// 主画布 Canvas 渲染器：复用 bshistory.js 已生成的 SVG layer 数据。
// 性能点：Path2D 缓存、DPR 上限、无 Vue 大数组 diff、相机移动时只重绘 canvas。

window.BshistoryCanvasRenderer = (() => {
    const MAX_DPR = 2
    const MAX_PATH_CACHE = 30000
    const pathCache = new Map()

    function clampDpr() {
        return Math.max(1, Math.min(MAX_DPR, window.devicePixelRatio || 1))
    }

    function ensureCanvasSize(canvas, viewport) {
        const cssW = Math.max(1, Math.round(viewport?.w || window.innerWidth || 1))
        const cssH = Math.max(1, Math.round(viewport?.h || window.innerHeight || 1))
        const dpr = clampDpr()
        const bw = Math.max(1, Math.round(cssW * dpr))
        const bh = Math.max(1, Math.round(cssH * dpr))

        if (canvas.width !== bw || canvas.height !== bh) {
            canvas.width = bw
            canvas.height = bh
        }

        if (canvas.style.width !== `${cssW}px`) canvas.style.width = `${cssW}px`
        if (canvas.style.height !== `${cssH}px`) canvas.style.height = `${cssH}px`

        return { cssW, cssH, dpr }
    }

    function getPath(layer) {
        const d = layer?.d
        if (!d || typeof Path2D === 'undefined') return null

        const key = String(layer.key || d)
        const old = pathCache.get(key)
        if (old && old.d === d) return old.path

        let path = null
        try {
            path = new Path2D(d)
        } catch (err) {
            console.warn('[bshistory-canvas] Path2D 解析失败：', err, d)
            return null
        }

        pathCache.set(key, { d, path })

        if (pathCache.size > MAX_PATH_CACHE) {
            const firstKey = pathCache.keys().next().value
            pathCache.delete(firstKey)
        }

        return path
    }

    function parseDash(dash) {
        if (!dash) return []
        if (Array.isArray(dash)) return dash.map(Number).filter(n => Number.isFinite(n) && n > 0)

        return String(dash)
            .split(/[\s,，]+/)
            .map(Number)
            .filter(n => Number.isFinite(n) && n > 0)
    }

    function drawLayers(ctx, layers) {
        if (!layers?.length) return

        ctx.lineJoin = 'round'

        for (const layer of layers) {
            if (!layer) continue

            const opacity = Number(layer.opacity ?? 1)
            const strokeWidth = Number(layer.strokeWidth || 0)

            if (opacity <= 0.001 || strokeWidth <= 0 || !layer.stroke || layer.stroke === 'none') continue

            const path = getPath(layer)
            if (!path) continue

            ctx.globalAlpha = opacity
            ctx.strokeStyle = layer.stroke
            ctx.lineWidth = strokeWidth
            ctx.lineCap = layer.linecap || 'round'
            ctx.setLineDash(parseDash(layer.dash))
            ctx.stroke(path)
        }

        ctx.globalAlpha = 1
        ctx.setLineDash([])
    }

    function isPointVisible(x, y, r, view, viewport, marginPx = 80) {
        const z = Math.max(1e-9, view?.zoom || 1)
        const marginX = marginPx / z
        const marginY = marginPx / z
        const halfW = (viewport.w || 1) / z / 2
        const halfH = (viewport.h || 1) / z / 2
        const cx = view.cx || 0
        const cy = view.cy || 0

        return !(
            x + r < cx - halfW - marginX ||
            x - r > cx + halfW + marginX ||
            y + r < cy - halfH - marginY ||
            y - r > cy + halfH + marginY
        )
    }

    function drawStations(ctx, stations, view, viewport) {
        if (!stations?.length) return

        for (const sta of stations) {
            const x = Number(sta.x)
            const y = Number(sta.y)
            const r = Number(sta.r || 0)
            if (!Number.isFinite(x) || !Number.isFinite(y) || r <= 0) continue
            if (!isPointVisible(x, y, r, view, viewport)) continue

            ctx.globalAlpha = Number(sta.opacity ?? 1)
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = sta.fill || '#fff'
            ctx.fill()

            const sw = Number(sta.strokeWidth || 0)
            if (sw > 0 && sta.stroke && sta.stroke !== 'none') {
                ctx.strokeStyle = sta.stroke
                ctx.lineWidth = sw
                ctx.stroke()
            }
        }

        ctx.globalAlpha = 1
    }

    function defaultParseNameLines(text) {
        return String(text || '').split(/[\\n/／]+/).map(s => s.trim()).filter(Boolean)
    }

    function drawNames(ctx, names, view, viewport, parseNameLines) {
        if (!names?.length) return

        const split = typeof parseNameLines === 'function' ? parseNameLines : defaultParseNameLines

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        for (const name of names) {
            const x = Number(name.x)
            const y = Number(name.y)
            const size = Number(name.size || 0)
            if (!Number.isFinite(x) || !Number.isFinite(y) || size <= 0) continue
            if (!isPointVisible(x, y, size * 4, view, viewport, 120)) continue

            const lines = split(name.text)
            if (!lines.length) continue

            ctx.globalAlpha = Number(name.opacity ?? 1)
            ctx.fillStyle = name.fill || '#111'
            ctx.font = `${size}px Arial, "Microsoft YaHei", sans-serif`

            if (lines.length === 1) {
                ctx.fillText(lines[0], x, y)
            } else {
                let yy = y - (lines.length - 1) * 0.6 * size
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], x, yy)
                    yy += 1.2 * size
                }
            }
        }

        ctx.globalAlpha = 1
    }

    function draw(opts) {
        const canvas = opts?.canvas
        const viewport = opts?.viewport
        const view = opts?.view

        if (!canvas || !viewport || !view) return

        const { cssW, cssH, dpr } = ensureCanvasSize(canvas, viewport)
        const ctx = canvas.getContext('2d', { alpha: true })
        if (!ctx) return

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, cssW, cssH)

        const z = Math.max(1e-9, view.zoom || 1)
        const tx = cssW / 2 - (view.cx || 0) * z
        const ty = cssH / 2 - (view.cy || 0) * z

        ctx.setTransform(z * dpr, 0, 0, z * dpr, tx * dpr, ty * dpr)

        drawTerrains(ctx, opts.terrains || [])
        drawLayers(ctx, opts.stableLayers || [])
        drawLayers(ctx, opts.activeLayers || [])
        drawStations(ctx, opts.stations || [], view, viewport)
        drawNames(ctx, opts.names || [], view, viewport, opts.parseNameLines)
        drawSpecialLabels(ctx, opts.terrainLabels || [], opts.districtLabels || [])
    }

    function clear(canvas) {
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width || 1, canvas.height || 1)
    }

    function clearCache() {
        pathCache.clear()
    }

    function drawSpecialLabels(ctx, terrainLabels, districtLabels) {
        if (window.LableCanvasRenderer?.draw) {
            window.LableCanvasRenderer.draw(ctx, terrainLabels || [])
            window.LableCanvasRenderer.draw(ctx, districtLabels || [])
        }
    }
    function drawTerrains(ctx, terrains) {
        if (!terrains?.length) return

        ctx.save()
        ctx.setLineDash([])
        ctx.lineJoin = 'round'

        for (const tr of terrains) {
            if (!tr || !tr.d) continue

            const path = getPath(tr)
            if (!path) continue

            const opacity = Number(tr.opacity ?? 1)
            if (opacity <= 0.001) continue

            ctx.globalAlpha = opacity

            if (tr.fill && tr.fill !== 'none') {
                ctx.fillStyle = tr.fill
                ctx.fill(path)
            }

            const sw = Number(tr.strokeWidth || 0)
            if (sw > 0 && tr.stroke && tr.stroke !== 'none') {
                ctx.strokeStyle = tr.stroke
                ctx.lineWidth = sw
                ctx.lineCap = tr.linecap || 'round'
                ctx.stroke(path)
            }
        }

        ctx.restore()
    }
    return { draw, clear, clearCache }
})()