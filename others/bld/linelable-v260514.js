const lineLableNames1 = [
    "北京", "上海", "aarc", "aarc空", "竖条", "圆圈", "白底", "黑边", "地铁通",
    "地铁通+文本", "广州", "成都", "重庆", "东京", "纯文本",
    "纯色圆", "纯色方", "纯色方空"
]
function parseLineName(name) {
    if (!name) return { lineNumber: '', suffix: '' }
    const m = name.match(/^([A-Za-z0-9０-９]+)(.*)$/)
    if (m) return { lineNumber: m[1], suffix: m[2].trim() }
    const m2 = name.match(/^(.*?)([A-Za-z0-9]+)\s*$/)
    if (m2) return { lineNumber: m2[2], suffix: m2[1].trim() }
    return { lineNumber: '', suffix: name }
}

function newLableObj(id) {
    return {
        id,
        lng: 0,
        lat: 0,
        scale: 1,
        fixedFont: true,

        mode: 'line', // line / terrain / district

        lineId: null,
        terrainId: null,
        districtId: null,

        styleName: '',
        color: '',
        text: ''
    }
}

// 解析lable的实际颜色/文本/样式（考虑优先级）
// 修复 resolveLable：纯文本颜色为空时走线路色，线路也没有就黑色
function resolveLable(lable, linesMap, defaultStyles, extra = {}) {
    const data = extra.data || null

    let color = lable.color
    let text = lable.text
    let styleName = lable.styleName

    const mode = lable.mode || 'line'

    if (mode === 'terrain') {
        const terrain = data?.terrains?.find?.(x => x.id === lable.terrainId) || null

        let terrainColor = '#d9d9d9'

        if (terrain) {
            if (window.TerrainUtil?.colorOf) {
                terrainColor = TerrainUtil.colorOf(data, terrain)
            } else {
                const tp = data?.terrainTypes?.find?.(x => x.id === terrain.typeId)
                terrainColor = terrain.color || tp?.color || '#d9d9d9'
            }
        }

        if (!color) color = terrainColor

        if (color === 'line') {
            color = typeof txtBlack === 'function'
                ? txtBlack(terrainColor)
                : '#000000'
        }

        if (!text) text = terrain ? terrain.name : '地形'

        if (!styleName) {
            styleName = defaultStyles?.terrainLabelStyle
                || defaultStyles?.labelStyle
                || '纯文本'
        }

        return { color, text, styleName }
    }

    if (mode === 'district') {
        const district = data?.districts?.find?.(x => x.id === lable.districtId) || null

        let districtType = null
        if (district) {
            districtType = data?.districtTypes?.find?.(x => x.id === district.typeId) || null
        }

        if (!color) color = districtType?.color || 'line'

        if (color === 'line') {
            color = '#000000'
        }

        if (!text) text = district ? district.name : '行政区划'

        if (!styleName) {
            styleName = defaultStyles?.districtLabelStyle
                || defaultStyles?.labelStyle
                || '纯文本'
        }

        return { color, text, styleName }
    }

    const line = lable.lineId != null ? linesMap.get(lable.lineId) : null

    if (!color) {
        color = line ? line.color : '#000000'
    }

    if (!text) {
        text = line ? line.name : '空号'
    }

    if (!styleName) {
        styleName = defaultStyles?.lineLabelStyle || defaultStyles?.labelStyle || '北京'
    }

    return { color, text, styleName }
}

// 生成lable的SVG片段（返回SVG字符串，直接嵌入）
// baseUnit: 1个汉字对应的km数 = 100m = 0.1km, 但我们用px，通过BLCY转换
// baseUnitPx = 100 * BLCY * scale

// renderLableToSVG：选中改为发光包边，sel改为传isSelected控制filter
// renderLableToSVG：isSelected = 被多选选中（黄色发光），isEditing = 正在编辑（绿色发光）
function renderLableToSVG(lable, screenX, screenY, BLCY, linesMap, defaultStyles, isSelected, isEditing, uid, extra = {}) {
    const { color, text, styleName } = resolveLable(lable, linesMap, defaultStyles, extra)
    const scale = lable.scale || 1
    const fixedFont = lable.fixedFont !== false
    const u = 100 * BLCY * scale

    let filterDef = ''
    let filterAttr = ''

    if (isEditing) {
        const filterId = `lable-edit-${uid}`
        filterDef = `<defs><filter id="${filterId}" x="-40%" y="-40%" width="180%" height="180%">
  <feMorphology in="SourceGraphic" operator="dilate" radius="3" result="expanded"/>
  <feFlood flood-color="#00ff88" flood-opacity="1" result="glowColor"/>
  <feComposite in="glowColor" in2="expanded" operator="in" result="glow"/>
  <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter></defs>`
        filterAttr = `filter="url(#${filterId})"`
    } else if (isSelected) {
        const filterId = `lable-glow-${uid}`
        filterDef = `<defs><filter id="${filterId}" x="-40%" y="-40%" width="180%" height="180%">
  <feMorphology in="SourceGraphic" operator="dilate" radius="3" result="expanded"/>
  <feFlood flood-color="#ffcc00" flood-opacity="1" result="glowColor"/>
  <feComposite in="glowColor" in2="expanded" operator="in" result="glow"/>
  <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter></defs>`
        filterAttr = `filter="url(#${filterId})"`
    }

    const sel = filterAttr

    let content

    switch (styleName) {
        case '北京':        content = svgBJ(screenX, screenY, u, color, text, fixedFont, sel); break
        case '上海':        content = svgSH(screenX, screenY, u, color, text, fixedFont, sel); break
        case 'aarc':        content = svgAARC(screenX, screenY, u, color, text, false, sel); break
        case 'aarc空':      content = svgAARC(screenX, screenY, u, color, text, true, sel); break
        case '竖条':        content = svgVertBar(screenX, screenY, u, color, text, sel); break
        case '圆圈':        content = svgCircle(screenX, screenY, u, color, text, sel); break
        case '白底':        content = svgWhiteBg(screenX, screenY, u, color, text, fixedFont, sel); break
        case '黑边':        content = svgBlackBorder(screenX, screenY, u, color, text, fixedFont, sel); break
        case '地铁通':      content = svgMetro(screenX, screenY, u, color, text, sel); break
        case '地铁通+文本': content = svgMetroText(screenX, screenY, u, color, text, sel); break
        case '广州':        content = svgGZ(screenX, screenY, u, color, text, sel); break
        case '成都':        content = svgCD(screenX, screenY, u, color, text, sel); break
        case '重庆':        content = svgCQ(screenX, screenY, u, color, text, sel); break
        case '东京':        content = svgTokyo(screenX, screenY, u, color, text, sel); break
        case '纯文本':      content = svgPlainText(screenX, screenY, u, color, text, sel); break
        case '纯色圆':      content = svgSolidCircle(screenX, screenY, u, color, sel); break
        case '纯色方':      content = svgSolidSquare(screenX, screenY, u, color, sel); break
        case '纯色方空':    content = svgSolidSquareHollow(screenX, screenY, u, color, sel); break
        default:            content = svgBJ(screenX, screenY, u, color, text, fixedFont, sel)
    }

    return filterDef + content
}
function escSVG(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 估算文本像素宽（每字符约u*0.9，英文约u*0.55）
function estimateTextWidth(text, u) {
    let w = 0
    for (const ch of text) {
        w += ch.charCodeAt(0) > 127 ? u * 0.95 : u * 0.55
    }
    return w
}

// 北京样式
function svgBJ(cx, cy, u, color, text, fixedFont, sel) {
    const r = u * 0.2
    const pad = u * 0.25
    const fontSize = u * 0.75
    let rectW, rectH, fs
    if (fixedFont) {
        // 字号固定，边界随文本
        fs = fontSize
        rectW = estimateTextWidth(text, u) + pad * 2
        rectH = u * 1.1
    } else {
        // 边界固定 3:1 横纵，字号适应
        rectH = u * 1.1
        rectW = rectH * 3
        const maxTxtW = rectW - pad * 2
        const naturalW = estimateTextWidth(text, u)
        fs = naturalW > 0 ? Math.min(fontSize, fontSize * maxTxtW / naturalW) : fontSize
    }
    const tx = txtBlack(color)
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-rectW/2}" y="${-rectH/2}" width="${rectW}" height="${rectH}" rx="${r}" ry="${r}" fill="${color}" />
  <text x="0" y="0" font-size="${fs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 上海样式
function svgSH(cx, cy, u, color, text, fixedFont, sel) {
    const { lineNumber, suffix } = parseLineName(text)
    if (!lineNumber) return svgBJ(cx, cy, u, color, text, fixedFont, sel)

    const sqSize = u * 1.1
    const r = u * 0.15
    const numFs = sqSize * 0.65
    const gap = u * 0.2   // 0.2个汉字间距
    const tx = txtBlack(color)

    let suffixPart = ''
    let totalW = sqSize
    if (suffix) {
        const sfs = u * 0.7
        const sw = estimateTextWidth(suffix, u)
        // 文本左侧紧贴正方形右侧+gap，text-anchor="start"
        suffixPart = `<text x="${sqSize / 2 + gap}" y="0" font-size="${sfs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(suffix)}</text>`
        totalW = sqSize + gap + sw
    }
    // 整体居中：将组偏移使总体中心在cx,cy
    const offsetX = -totalW / 2

    return `<g ${sel} transform="translate(${cx + offsetX + sqSize / 2},${cy})">
  <rect x="${-sqSize / 2}" y="${-sqSize / 2}" width="${sqSize}" height="${sqSize}" rx="${r}" ry="${r}" fill="${color}" />
  <text x="0" y="0" font-size="${numFs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber)}</text>
  ${suffixPart}
</g>`
}

// aarc 样式（hollow=true 为 aarc空）
function svgAARC(cx, cy, u, color, text, hollow, sel) {
    const { lineNumber } = parseLineName(text)
    const sqSize = u * 1.1
    const r = u * 0.25
    const fs = sqSize * 0.65
    const tx = txtBlack(color)
    let inner = ''
    if (hollow) {
        const gap = u * 0.08
        inner = `<rect x="${-sqSize/2+gap}" y="${-sqSize/2+gap}" width="${sqSize-gap*2}" height="${sqSize-gap*2}" rx="${r*0.7}" ry="${r*0.7}" fill="white" />
  <rect x="${-sqSize/2+gap*2}" y="${-sqSize/2+gap*2}" width="${sqSize-gap*4}" height="${sqSize-gap*4}" rx="${r*0.5}" ry="${r*0.5}" fill="${color}" />`
    }
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-sqSize/2}" y="${-sqSize/2}" width="${sqSize}" height="${sqSize}" rx="${r}" ry="${r}" fill="${color}" />
  ${inner}
  <text x="0" y="0" font-size="${fs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber || text)}</text>
</g>`
}

// 竖条样式
function svgVertBar(cx, cy, u, color, text, sel) {
    const barW = u * 0.35
    const barH = u * 1.1
    const r = u * 0.12
    const fs = u * 0.7
    const gap = u * 0.2
    const tw = estimateTextWidth(text, u)
    const totalW = barW + gap + tw
    const offsetX = -totalW / 2
    return `<g ${sel} transform="translate(${cx + offsetX + barW/2},${cy})">
  <rect x="${-barW/2}" y="${-barH/2}" width="${barW}" height="${barH}" rx="${r}" ry="${r}" fill="${color}" />
  <text x="${barW/2 + gap}" y="0" font-size="${fs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 圆圈样式
function svgCircle(cx, cy, u, color, text, sel) {
    const r = u * 0.55
    const fs = u * 0.7
    const gap = u * 0.2
    const tw = estimateTextWidth(text, u)
    const totalW = r * 2 + gap + tw
    const offsetX = -totalW / 2
    return `<g ${sel} transform="translate(${cx + offsetX + r},${cy})">
  <circle cx="0" cy="0" r="${r}" fill="${color}" />
  <text x="${r + gap}" y="0" font-size="${fs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 白底样式
function svgWhiteBg(cx, cy, u, color, text, fixedFont, sel) {
    const r = u * 0.2
    const pad = u * 0.25
    const fontSize = u * 0.75
    let rectW, rectH, fs
    if (fixedFont) {
        fs = fontSize
        rectW = estimateTextWidth(text, u) + pad * 2
        rectH = u * 1.1
    } else {
        rectH = u * 1.1
        rectW = rectH * 3
        const maxTxtW = rectW - pad * 2
        const naturalW = estimateTextWidth(text, u)
        fs = naturalW > 0 ? Math.min(fontSize, fontSize * maxTxtW / naturalW) : fontSize
    }
    const sw = u * 0.07
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-rectW/2}" y="${-rectH/2}" width="${rectW}" height="${rectH}" rx="${r}" ry="${r}" fill="white" stroke="${color}" stroke-width="${sw}" />
  <text x="0" y="0" font-size="${fs}" fill="#000" text-anchor="middle" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 黑边样式
function svgBlackBorder(cx, cy, u, color, text, fixedFont, sel) {
    const r = u * 0.2
    const pad = u * 0.25
    const fontSize = u * 0.75
    let rectW, rectH, fs
    if (fixedFont) {
        fs = fontSize
        rectW = estimateTextWidth(text, u) + pad * 2
        rectH = u * 1.1
    } else {
        rectH = u * 1.1
        rectW = rectH * 3
        const maxTxtW = rectW - pad * 2
        const naturalW = estimateTextWidth(text, u)
        fs = naturalW > 0 ? Math.min(fontSize, fontSize * maxTxtW / naturalW) : fontSize
    }
    const sw = u * 0.09
    const tx = txtBlack(color)
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-rectW/2}" y="${-rectH/2}" width="${rectW}" height="${rectH}" rx="${r}" ry="${r}" fill="${color}" stroke="#000" stroke-width="${sw}" />
  <text x="0" y="0" font-size="${fs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 地铁通样式
function svgMetro(cx, cy, u, color, text, sel) {
    const { lineNumber } = parseLineName(text)
    const barH = u * 0.28
    const barW = u * 3.5
    const circleR = u * 0.62
    const fs = circleR * 1.1
    const tx = txtBlack(color)
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-barW/2}" y="${-barH/2}" width="${barW}" height="${barH}" rx="${barH/2}" ry="${barH/2}" fill="${color}" />
  <circle cx="0" cy="0" r="${circleR}" fill="${color}" stroke="white" stroke-width="${u*0.08}" />
  <text x="0" y="0" font-size="${fs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber || text)}</text>
</g>`
}
// 新增纯文本样式
function svgPlainText(cx, cy, u, color, text, sel) {
    const fs = u * 0.85
    // 颜色为空/线路颜色已在 resolveLable 处理，但纯文本颜色不走线路色回退，需单独处理
    return `<g ${sel} transform="translate(${cx},${cy})">
  <text x="0" y="0" font-size="${fs}" fill="${color}" text-anchor="middle" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}
// 地铁通+文本
function svgMetroText(cx, cy, u, color, text, sel) {
    const { lineNumber } = parseLineName(text)
    const barH = u * 0.28
    const barW = u * 3.5
    const circleR = u * 0.62
    const fs = circleR * 1.1
    const tx = txtBlack(color)
    const gap = u * 0.2
    const tfs = u * 0.75
    const tw = estimateTextWidth(text, u)
    const totalW = barW + gap + tw
    const offsetX = -totalW / 2
    return `<g ${sel} transform="translate(${cx + offsetX + barW / 2},${cy})">
  <rect x="${-barW / 2}" y="${-barH / 2}" width="${barW}" height="${barH}" rx="${barH / 2}" ry="${barH / 2}" fill="${color}" />
  <circle cx="0" cy="0" r="${circleR}" fill="${color}" stroke="white" stroke-width="${u * 0.08}" />
  <text x="0" y="0" font-size="${fs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber || text)}</text>
  <text x="${barW / 2 + gap}" y="0" font-size="${tfs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}
// 广州样式：圆角矩形内放线路编号，右侧全名
function svgGZ(cx, cy, u, color, text, sel) {
    const { lineNumber, suffix } = parseLineName(text)
    const rh = u * 1.1
    const rw = rh * 1.618
    const r = u * 0.18
    const tx = txtBlack(color)
    const gap = u * 0.2
    const tfs = u * 0.75
    const tw = estimateTextWidth(text, u)
    const totalW = rw + gap + tw
    const offsetX = -totalW / 2
    // 矩形内显示编号（无编号则显示全名）
    const innerText = lineNumber || text
    const numFs = rh * 0.6
    return `<g ${sel} transform="translate(${cx + offsetX + rw / 2},${cy})">
  <rect x="${-rw / 2}" y="${-rh / 2}" width="${rw}" height="${rh}" rx="${r}" ry="${r}" fill="${color}" />
  <text x="0" y="0" font-size="${numFs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(innerText)}</text>
  <text x="${rw / 2 + gap}" y="0" font-size="${tfs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 成都样式：上海但圆圈放大1.4倍，后缀居左紧贴
function svgCD(cx, cy, u, color, text, sel) {
    const { lineNumber, suffix } = parseLineName(text)
    if (!lineNumber) return svgBJ(cx, cy, u, color, text, true, sel)
    const r = u * 0.55 * 1.4
    const numFs = r * 1.1
    const tx = txtBlack(color)
    const gap = u * 0.2
    let suffixPart = ''
    let totalW = r * 2
    if (suffix) {
        const sfs = u * 0.7
        const sw = estimateTextWidth(suffix, u)
        suffixPart = `<text x="${r + gap}" y="0" font-size="${sfs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(suffix)}</text>`
        totalW = r * 2 + gap + sw
    }
    const offsetX = -totalW / 2
    return `<g ${sel} transform="translate(${cx + offsetX + r},${cy})">
  <circle cx="0" cy="0" r="${r}" fill="${color}" />
  <text x="0" y="0" font-size="${numFs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber)}</text>
  ${suffixPart}
</g>`
}

// 重庆样式：上海但直角矩形(1:1.618)，后缀居左紧贴
function svgCQ(cx, cy, u, color, text, sel) {
    const { lineNumber, suffix } = parseLineName(text)
    if (!lineNumber) return svgBJ(cx, cy, u, color, text, true, sel)
    const rh = u * 1.1
    const rw = rh * 1.618
    // 直角矩形 rx=0
    const numFs = rh * 0.6
    const tx = txtBlack(color)
    const gap = u * 0.2
    let suffixPart = ''
    let totalW = rw
    if (suffix) {
        const sfs = u * 0.7
        const sw = estimateTextWidth(suffix, u)
        suffixPart = `<text x="${rw / 2 + gap}" y="0" font-size="${sfs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(suffix)}</text>`
        totalW = rw + gap + sw
    }
    const offsetX = -totalW / 2
    return `<g ${sel} transform="translate(${cx + offsetX + rw / 2},${cy})">
  <rect x="${-rw / 2}" y="${-rh / 2}" width="${rw}" height="${rh}" rx="0" ry="0" fill="${color}" />
  <text x="0" y="0" font-size="${numFs}" fill="${tx}" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber)}</text>
  ${suffixPart}
</g>`
}

// 东京样式：左侧长棒，右端白底颜色描边圆角矩形内写编号，矩形右侧紧贴全名文本居左
function svgTokyo(cx, cy, u, color, text, sel) {
    const { lineNumber } = parseLineName(text)
    const barH = u * 0.28
    const barW = u * 3.5
    const barR = barH / 2
    // 右端圆角矩形：白底颜色描边，1.618:1
    const boxH = u * 1.1
    const boxW = boxH * 1.618
    const boxR = u * 0.25
    const sw = u * 0.07
    const numFs = boxH * 0.6
    // 右侧文本
    const gap = u * 0.2
    const tfs = u * 0.75
    const tw = estimateTextWidth(text, u)
    // 布局：长棒左端为起点
    // 矩形右边超出长棒右端，矩形中心对齐长棒右端
    const barStartX = -barW / 2
    const barEndX = barW / 2
    // 矩形中心x = 长棒右端 - 矩形半宽（矩形右边对齐长棒右端）
    const boxCx = barEndX - boxW / 2
    // 右侧文本起点 = 长棒右端 + gap
    const textX = barEndX + gap
    // 总宽用于居中整体
    const totalW = barW + gap + tw
    const offsetX = -totalW / 2
    return `<g ${sel} transform="translate(${cx + offsetX + barW / 2},${cy})">
  <rect x="${barStartX}" y="${-barH / 2}" width="${barW}" height="${barH}" rx="${barR}" ry="${barR}" fill="${color}" />
  <rect x="${boxCx - boxW / 2}" y="${-boxH / 2}" width="${boxW}" height="${boxH}" rx="${boxR}" ry="${boxR}" fill="white" stroke="${color}" stroke-width="${sw}" />
  <text x="${boxCx}" y="0" font-size="${numFs}" fill="#000" text-anchor="middle" dominant-baseline="middle">${escSVG(lineNumber || text)}</text>
  <text x="${textX}" y="0" font-size="${tfs}" fill="#000" text-anchor="start" dominant-baseline="middle">${escSVG(text)}</text>
</g>`
}

// 纯色圆
function svgSolidCircle(cx, cy, u, color, sel) {
    const r = u * 0.6
    return `<g ${sel} transform="translate(${cx},${cy})">
  <circle cx="0" cy="0" r="${r}" fill="${color}" />
</g>`
}

// 纯色圆角正方形
function svgSolidSquare(cx, cy, u, color, sel) {
    const s = u * 1.1
    const r = u * 0.25
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${r}" ry="${r}" fill="${color}" />
</g>`
}

// 纯色方空（白色间隙+外圈颜色+内圈颜色，类似aarc空）
function svgSolidSquareHollow(cx, cy, u, color, sel) {
    const s = u * 1.1
    const r = u * 0.25
    const gap = u * 0.08
    return `<g ${sel} transform="translate(${cx},${cy})">
  <rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${r}" ry="${r}" fill="${color}" />
  <rect x="${-s / 2 + gap}" y="${-s / 2 + gap}" width="${s - gap * 2}" height="${s - gap * 2}" rx="${r * 0.7}" ry="${r * 0.7}" fill="white" />
  <rect x="${-s / 2 + gap * 2}" y="${-s / 2 + gap * 2}" width="${s - gap * 4}" height="${s - gap * 4}" rx="${r * 0.5}" ry="${r * 0.5}" fill="${color}" />
</g>`
}