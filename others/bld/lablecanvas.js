window.LableCanvasRenderer = (() => {
    function escText(s) {
        return String(s ?? '')
    }

    function estimateTextWidth(ctx, text, u, fs = u * 0.75) {
        ctx.save()
        ctx.font = `${fs}px Arial, "Microsoft YaHei", sans-serif`
        const w = ctx.measureText(escText(text)).width
        ctx.restore()
        return w || [...escText(text)].reduce((a, ch) => a + (ch.charCodeAt(0) > 127 ? u * 0.95 : u * 0.55), 0)
    }

    function parseLineNameLocal(name) {
        if (typeof parseLineName === 'function') return parseLineName(name)

        if (!name) return { lineNumber: '', suffix: '' }

        const m = String(name).match(/^([A-Za-z0-9０-９]+)(.*)$/)
        if (m) return { lineNumber: m[1], suffix: m[2].trim() }

        return { lineNumber: '', suffix: String(name) }
    }

    function textColor(color) {
        if (typeof txtBlack === 'function') return txtBlack(color)
        return '#000'
    }

    function roundedRect(ctx, x, y, w, h, r) {
        r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))

        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
    }

    function fillTextCenter(ctx, text, x, y, fs, color) {
        ctx.save()
        ctx.fillStyle = color
        ctx.font = `${fs}px Arial, "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(escText(text), x, y)
        ctx.restore()
    }

    function fillTextLeft(ctx, text, x, y, fs, color) {
        ctx.save()
        ctx.fillStyle = color
        ctx.font = `${fs}px Arial, "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(escText(text), x, y)
        ctx.restore()
    }

    function drawBJ(ctx, cx, cy, u, color, text, fixedFont) {
        const r = u * 0.2
        const pad = u * 0.25
        const fontSize = u * 0.75

        let rectW
        let rectH
        let fs

        if (fixedFont) {
            fs = fontSize
            rectW = estimateTextWidth(ctx, text, u, fs) + pad * 2
            rectH = u * 1.1
        } else {
            rectH = u * 1.1
            rectW = rectH * 3
            const maxTxtW = rectW - pad * 2
            const naturalW = estimateTextWidth(ctx, text, u, fontSize)
            fs = naturalW > 0 ? Math.min(fontSize, fontSize * maxTxtW / naturalW) : fontSize
        }

        ctx.save()
        ctx.fillStyle = color
        roundedRect(ctx, cx - rectW / 2, cy - rectH / 2, rectW, rectH, r)
        ctx.fill()
        ctx.restore()

        fillTextCenter(ctx, text, cx, cy, fs, textColor(color))
    }

    function drawPlainText(ctx, cx, cy, u, color, text) {
        fillTextCenter(ctx, text, cx, cy, u * 0.85, color)
    }

    function drawSH(ctx, cx, cy, u, color, text, fixedFont) {
        const { lineNumber, suffix } = parseLineNameLocal(text)
        if (!lineNumber) {
            drawBJ(ctx, cx, cy, u, color, text, fixedFont)
            return
        }

        const sqSize = u * 1.1
        const r = u * 0.15
        const numFs = sqSize * 0.65
        const gap = u * 0.2

        let totalW = sqSize
        let suffixFs = u * 0.7
        let suffixW = 0

        if (suffix) {
            suffixW = estimateTextWidth(ctx, suffix, u, suffixFs)
            totalW = sqSize + gap + suffixW
        }

        const left = cx - totalW / 2
        const boxCx = left + sqSize / 2

        ctx.save()
        ctx.fillStyle = color
        roundedRect(ctx, boxCx - sqSize / 2, cy - sqSize / 2, sqSize, sqSize, r)
        ctx.fill()
        ctx.restore()

        fillTextCenter(ctx, lineNumber, boxCx, cy, numFs, textColor(color))

        if (suffix) {
            fillTextLeft(ctx, suffix, boxCx + sqSize / 2 + gap, cy, suffixFs, '#000')
        }
    }

    function drawCircle(ctx, cx, cy, u, color, text) {
        const r = u * 0.55
        const fs = u * 0.7
        const gap = u * 0.2
        const tw = estimateTextWidth(ctx, text, u, fs)
        const totalW = r * 2 + gap + tw
        const circleCx = cx - totalW / 2 + r

        ctx.save()
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(circleCx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        fillTextLeft(ctx, text, circleCx + r + gap, cy, fs, '#000')
    }

    function drawWhiteBg(ctx, cx, cy, u, color, text, fixedFont) {
        const r = u * 0.2
        const pad = u * 0.25
        const fs = u * 0.75
        const rectW = fixedFont ? estimateTextWidth(ctx, text, u, fs) + pad * 2 : u * 3.3
        const rectH = u * 1.1

        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = color
        ctx.lineWidth = u * 0.07
        roundedRect(ctx, cx - rectW / 2, cy - rectH / 2, rectW, rectH, r)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        fillTextCenter(ctx, text, cx, cy, fs, '#000')
    }

    function drawBlackBorder(ctx, cx, cy, u, color, text, fixedFont) {
        const r = u * 0.2
        const pad = u * 0.25
        const fs = u * 0.75
        const rectW = fixedFont ? estimateTextWidth(ctx, text, u, fs) + pad * 2 : u * 3.3
        const rectH = u * 1.1

        ctx.save()
        ctx.fillStyle = color
        ctx.strokeStyle = '#000'
        ctx.lineWidth = u * 0.09
        roundedRect(ctx, cx - rectW / 2, cy - rectH / 2, rectW, rectH, r)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        fillTextCenter(ctx, text, cx, cy, fs, textColor(color))
    }

    function drawSolidCircle(ctx, cx, cy, u, color) {
        ctx.save()
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(cx, cy, u * 0.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }

    function drawSolidSquare(ctx, cx, cy, u, color) {
        const s = u * 1.1
        const r = u * 0.25

        ctx.save()
        ctx.fillStyle = color
        roundedRect(ctx, cx - s / 2, cy - s / 2, s, s, r)
        ctx.fill()
        ctx.restore()
    }

    function drawSolidSquareHollow(ctx, cx, cy, u, color) {
        const s = u * 1.1
        const r = u * 0.25
        const gap = u * 0.08

        drawSolidSquare(ctx, cx, cy, u, color)

        ctx.save()
        ctx.fillStyle = '#fff'
        roundedRect(ctx, cx - s / 2 + gap, cy - s / 2 + gap, s - gap * 2, s - gap * 2, r * 0.7)
        ctx.fill()

        ctx.fillStyle = color
        roundedRect(ctx, cx - s / 2 + gap * 2, cy - s / 2 + gap * 2, s - gap * 4, s - gap * 4, r * 0.5)
        ctx.fill()
        ctx.restore()
    }

    function drawMetro(ctx, cx, cy, u, color, text) {
        const { lineNumber } = parseLineNameLocal(text)
        const barH = u * 0.28
        const barW = u * 3.5
        const circleR = u * 0.62
        const fs = circleR * 1.1

        ctx.save()
        ctx.fillStyle = color
        roundedRect(ctx, cx - barW / 2, cy - barH / 2, barW, barH, barH / 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = u * 0.08
        ctx.stroke()
        ctx.restore()

        fillTextCenter(ctx, lineNumber || text, cx, cy, fs, textColor(color))
    }

    function drawResolvedLabel(ctx, label) {
        if (!ctx || !label) return

        const x = Number(label.x)
        const y = Number(label.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return

        const scale = Number(label.scale || 1)
        const baseUnit = Number(label.baseUnit || 0.1)
        const u = baseUnit * scale
        if (!Number.isFinite(u) || u <= 0) return

        const color = label.color || '#000'
        const text = label.text || ''
        const styleName = label.styleName || '北京'
        const fixedFont = label.fixedFont !== false

        ctx.save()

        switch (styleName) {
            case '北京':
            case 'aarc':
            case 'aarc空':
            case '广州':
            case '成都':
            case '重庆':
            case '东京':
            case '地铁通+文本':
                drawBJ(ctx, x, y, u, color, text, fixedFont)
                break

            case '上海':
                drawSH(ctx, x, y, u, color, text, fixedFont)
                break

            case '竖条':
            case '圆圈':
                drawCircle(ctx, x, y, u, color, text)
                break

            case '白底':
                drawWhiteBg(ctx, x, y, u, color, text, fixedFont)
                break

            case '黑边':
                drawBlackBorder(ctx, x, y, u, color, text, fixedFont)
                break

            case '地铁通':
                drawMetro(ctx, x, y, u, color, text)
                break

            case '纯文本':
                drawPlainText(ctx, x, y, u, color, text)
                break

            case '纯色圆':
                drawSolidCircle(ctx, x, y, u, color)
                break

            case '纯色方':
                drawSolidSquare(ctx, x, y, u, color)
                break

            case '纯色方空':
                drawSolidSquareHollow(ctx, x, y, u, color)
                break

            default:
                drawBJ(ctx, x, y, u, color, text, fixedFont)
        }

        ctx.restore()
    }

    function draw(ctx, labels) {
        if (!labels?.length) return

        for (const lb of labels) {
            drawResolvedLabel(ctx, lb)
        }
    }

    return {
        draw,
        drawResolvedLabel
    }
})()