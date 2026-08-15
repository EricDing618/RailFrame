// style.js — 样式系统

// ==================== 工厂函数 ====================
function newStrokeLayer() {
    return {
        color: 'line',
        thickness: 1,
        opacity: 1,
        dash: '',
        dashRound: 0,
        normalOffset: 0,
        texture: null,            // 纹理样式 id
        textureColor: '#00000084'   // 纹理颜色
    }
}
function generateTextureLines(bbox, angleDeg, spacing, strokeWidth) {
    const rad = (angleDeg % 360) * Math.PI / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const perpX = -sinA;
    const perpY = cosA;          // 垂直于纹理线方向的单位向量

    const { minX, minY, maxX, maxY } = bbox;
    const corners = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];

    // 计算在垂直方向上的投影范围
    let projMin = Infinity, projMax = -Infinity;
    corners.forEach(([x, y]) => {
        const proj = x * perpX + y * perpY;
        if (proj < projMin) projMin = proj;
        if (proj > projMax) projMax = proj;
    });
    projMin -= spacing;
    projMax += spacing;

    const lines = [];
    const diagonal = Math.hypot(maxX - minX, maxY - minY) * 2;  // 足够覆盖整个矩形
    for (let p = projMin; p <= projMax; p += spacing) {
        const px = p * perpX;
        const py = p * perpY;
        const x1 = px + cosA * diagonal;
        const y1 = py + sinA * diagonal;
        const x2 = px - cosA * diagonal;
        const y2 = py - sinA * diagonal;
        lines.push(`M${x1},${y1} L${x2},${y2}`);
    }
    return lines.join(' ');
}
function newTextureLayer() {
  return { 
    thickness: 0.1, 
    parallelToLine: true, 
    angle: 0,
    spacing: 0.2          // 新增：相邻纹理线间距（相对于线宽的倍数）
  }
}

function newStaLayer() {
  return { fillColor: '#ffffff', fillTextureColor: '#ffffff', fillTextureId: null, radius: 1, strokeStyleId: null, strokeThickness: 0.3, strokeColor: 'line' }
}
function newStrokeStyle(id) { return { id, name: '新描边样式', layers: [newStrokeLayer()] } }
function newTextureStyle(id) { return { id, name: '新纹理样式', layers: [newTextureLayer()] } }

function newStaStyle(id) { return { id, name: '新车站样式', layers: [newStaLayer()] } }

function getStylesOrInit(data) {
  if (!data.styles) data.styles = { stroke: [], texture: [], label: [], sta: [], _nextId: 1 }
  return data.styles
}
function stylesNextId(styles) { return styles._nextId++ }

// ==================== 工具 ====================
function resolveColor(colorStr, lineColor) {
    // "line" 或空值 → 使用线路颜色
    if (!colorStr || colorStr === 'line') return lineColor || '#888888'
    return colorStr
}

function parseDash(dashStr) {
    if (!dashStr || !dashStr.trim()) return ''
    return dashStr.trim().split(/[\s,，]+/).map(Number).filter(n => !isNaN(n) && n > 0).join(',')
}
function offsetBezierPts(ptsPx, offsetPx) {
    // ptsPx: 屏幕坐标数组 [{x,y}]，offsetPx: 平移像素（正方向为左侧？默认向上？按需要调整）
    if (!offsetPx) return ptsPx
    return ptsPx.map((p, i) => {
        let nx = 0, ny = 0
        if (i < ptsPx.length - 1) {
            const dx = ptsPx[i+1].x - p.x, dy = ptsPx[i+1].y - p.y
            const len = Math.hypot(dx, dy)
            if (len > 0) { nx += dy / len; ny += -dx / len }
        }
        if (i > 0) {
            const dx = p.x - ptsPx[i-1].x, dy = p.y - ptsPx[i-1].y
            const len = Math.hypot(dx, dy)
            if (len > 0) { nx += dy / len; ny += -dx / len }
        }
        const norm = Math.hypot(nx, ny)
        if (norm > 0) { nx /= norm; ny /= norm }
        return { x: p.x + nx * offsetPx, y: p.y + ny * offsetPx }
    })
}

// 将偏移后的控制点重新生成为贝塞尔路径字符串（与 beisaier 相同逻辑）
function beisaierFromPoints(points) {
    if (points.length < 2) return ''
    return svgPath(
        points.map(p => [p.x, p.y]),
        bezierCommand
    )
}

function applyNormalOffset(pts, offsetPx) {
  if (!offsetPx) return pts
  return pts.map((p, i) => {
    let nx = 0, ny = 0
    if (i < pts.length - 1) { const dx = pts[i+1].x-p.x, dy = pts[i+1].y-p.y, len = Math.hypot(dx,dy); if(len>0){nx+=dy/len;ny+=-dx/len} }
    if (i > 0) { const dx = p.x-pts[i-1].x, dy = p.y-pts[i-1].y, len = Math.hypot(dx,dy); if(len>0){nx+=dy/len;ny+=-dx/len} }
    const norm = Math.hypot(nx,ny); if(norm>0){nx/=norm;ny/=norm}
    return { x: p.x+nx*offsetPx, y: p.y+ny*offsetPx }
  })
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2)
  ctx.beginPath()
  ctx.moveTo(x+r, y)
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

function makeRainbowGradient(ctx, x1, y1, x2, y2) {
  const g = ctx.createLinearGradient(x1,y1,x2,y2)
  g.addColorStop(0,'#ff0000'); g.addColorStop(0.17,'#ff8800'); g.addColorStop(0.33,'#ffff00')
  g.addColorStop(0.5,'#00ff00'); g.addColorStop(0.67,'#0088ff'); g.addColorStop(0.83,'#8800ff'); g.addColorStop(1,'#ff0000')
  return g
}

// ==================== 贝塞尔采样（与主逻辑一致）====================
function sampleBezierPts(screenPts, steps) {
  // screenPts: [{x,y}]，返回更密集的 [{x,y}]
  if (screenPts.length < 2) return screenPts
  const arr = screenPts.map(p => [p.x, p.y])
  const result = []
  for (let i = 0; i < arr.length - 1; i++) {
    const p0 = arr[i], p1 = arr[i+1]
    const prev = i > 0 ? arr[i-1] : null
    const next = i < arr.length-2 ? arr[i+2] : null
    const cp1 = ctrlPt(p0, prev, p1, false)
    const cp2 = ctrlPt(p1, p0, next, true)
    const n = steps || Math.max(8, Math.ceil(Math.hypot(p1[0]-p0[0],p1[1]-p0[1])/4))
    for (let s = 0; s <= n; s++) {
      const t = s/n, u = 1-t
      result.push({ x: u*u*u*p0[0]+3*u*u*t*cp1[0]+3*u*t*t*cp2[0]+t*t*t*p1[0], y: u*u*u*p0[1]+3*u*u*t*cp1[1]+3*u*t*t*cp2[1]+t*t*t*p1[1] })
    }
  }
  return result
}
function ctrlPt(cur, prev, next, reverse) {
  const p = prev||cur, n = next||cur
  const smoothing = 0.35
  const dx = n[0]-p[0], dy = n[1]-p[1]
  const len = Math.hypot(dx,dy)
  const angle = Math.atan2(dy,dx)+(reverse?Math.PI:0)
  const r = len*smoothing
  return [cur[0]+Math.cos(angle)*r, cur[1]+Math.sin(angle)*r]
}

// ==================== 描边样式渲染（沿贝塞尔路径）====================
// screenPts: [{x,y}] 原始控制点（屏幕坐标），会自动做贝塞尔采样
function renderStrokeStyle(ctx, screenPts, strokeStyle, lineColor, lineWidthPx) {
  if (!strokeStyle || !screenPts || screenPts.length < 2) return
  // 采样贝塞尔曲线
  const sampledPts = sampleBezierPts(screenPts)
  for (const layer of strokeStyle.layers) {
    ctx.save()
    const isLineColor = !layer.color || layer.color === 'line'
    const thickPx = (layer.thickness ?? 1) * lineWidthPx
    const dashArr = parseDash(layer.dash || '')
    if (dashArr.length > 0) {
      const d = dashArr.length%2===0 ? dashArr : [...dashArr, dashArr[dashArr.length-1]]
      ctx.setLineDash(d.map(v => v*lineWidthPx))
      ctx.lineCap = (layer.dashRound??0) > 0 ? 'round' : 'butt'
      ctx.lineJoin = 'round'
    } else {
      ctx.setLineDash([]); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    }
    ctx.globalAlpha = layer.opacity ?? 1
    ctx.lineWidth = thickPx

    const offset = (layer.normalOffset ?? 0) * lineWidthPx
    const drawPts = offset !== 0 ? applyNormalOffset(sampledPts, offset) : sampledPts

    if (isLineColor) {
      // 彩虹渐变：沿路径方向
      const first = drawPts[0], last = drawPts[drawPts.length-1]
      ctx.strokeStyle = makeRainbowGradient(ctx, first.x, first.y, last.x, last.y)
    } else {
      ctx.strokeStyle = layer.color
    }

    ctx.beginPath()
    ctx.moveTo(drawPts[0].x, drawPts[0].y)
    for (let i = 1; i < drawPts.length; i++) ctx.lineTo(drawPts[i].x, drawPts[i].y)
    ctx.stroke()
    ctx.restore()
  }
}

// ==================== 车站样式渲染 ====================
function renderStaStyle(ctx, cx, cy, staRadiusPx, staStyle, lineColor, strokeStylesArr) {
  if (!staStyle) return
  for (const layer of staStyle.layers) {
    ctx.save()
    const r = (layer.radius ?? 1) * staRadiusPx
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2)
    const fc = resolveColor(layer.fillColor, lineColor)
    ctx.fillStyle = fc; ctx.fill()

    const strokeStyleId = layer.strokeStyleId
    const strokeThick = (layer.strokeThickness ?? 0.3) * staRadiusPx
    const strokeColorRaw = layer.strokeColor

    if (strokeStyleId != null && strokeStylesArr) {
      const ss = strokeStylesArr.find(s => s.id === strokeStyleId)
      if (ss) {
        // 圆形路径采样为多边形，作为"线路"传入
        const circlePts = Array.from({length:65},(_,i)=>({ x:cx+Math.cos(i/64*Math.PI*2)*r, y:cy+Math.sin(i/64*Math.PI*2)*r }))
        // 这里lineWidthPx用strokeThick
        renderStrokeStyle(ctx, circlePts, ss, resolveColor(strokeColorRaw, lineColor), strokeThick)
      }
    } else if (strokeThick > 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2)
      const sc = resolveColor(strokeColorRaw, lineColor)
      if (!strokeColorRaw || strokeColorRaw === 'line') {
        ctx.strokeStyle = makeRainbowGradient(ctx, cx-r, cy, cx+r, cy)
      } else {
        ctx.strokeStyle = sc
      }
      ctx.lineWidth = strokeThick; ctx.stroke()
    }
    ctx.restore()
  }
}

// ==================== 预览渲染 ====================
// 统一入口：type='stroke'|'sta'|'label'|'texture'
function renderStylePreview(canvasEl, type, styleObj, allStyles) {
  if (!canvasEl || !styleObj) return
  const ctx = canvasEl.getContext('2d')
  const W = canvasEl.width, H = canvasEl.height
  ctx.clearRect(0, 0, W, H)

  // 背景
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0,0,W,H)

  const previewLineColor = '#4488cc'
  const lineWidthPx = H * 0.18

  if (type === 'stroke') {
    // 画一条S形贝塞尔预览路径
    const pts = [
      {x: W*0.05, y: H*0.5},
      {x: W*0.28, y: H*0.2},
      {x: W*0.5,  y: H*0.5},
      {x: W*0.72, y: H*0.8},
      {x: W*0.95, y: H*0.5}
    ]
    // 先画灰色背景线（表示线路本体）
    ctx.save()
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = lineWidthPx; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const sampled = sampleBezierPts(pts)
    ctx.beginPath(); ctx.moveTo(sampled[0].x, sampled[0].y)
    for(let i=1;i<sampled.length;i++) ctx.lineTo(sampled[i].x,sampled[i].y)
    ctx.stroke(); ctx.restore()
    // 渲染样式
    renderStrokeStyle(ctx, pts, styleObj, previewLineColor, lineWidthPx)
    // 在两端各画一个普通站圆点作为参考
    const staR = lineWidthPx * 1.06
    ;[pts[0], pts[pts.length-1]].forEach(p => {
      ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,staR,0,Math.PI*2)
      ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle=previewLineColor; ctx.lineWidth=lineWidthPx*0.2; ctx.stroke(); ctx.restore()
    })
  }

  else if (type === 'sta') {
    // 画一段横向直线 + 中间一个车站
    const midX = W/2, midY = H/2
    const staRadiusPx = Math.min(W,H) * 0.28
    // 背景线
    ctx.save(); ctx.strokeStyle='#cccccc'; ctx.lineWidth=lineWidthPx; ctx.lineCap='round'
    ctx.beginPath(); ctx.moveTo(W*0.1, midY); ctx.lineTo(W*0.9, midY); ctx.stroke(); ctx.restore()
    // 渲染车站样式
    renderStaStyle(ctx, midX, midY, staRadiusPx, styleObj, previewLineColor, allStyles?.stroke||[])
  }

  else if (type === 'label') {
    const unitPx = Math.min(W,H)*0.18
    for (const layer of styleObj.layers) {
      ctx.save()
      const lw = (layer.width??2)*unitPx, lh = (layer.height??1)*unitPx
      const x = W/2-lw/2, y = H/2-lh/2
      const cr = (layer.cornerRadius??0.3)*Math.min(lw,lh)/2
      roundRectPath(ctx, x, y, lw, lh, cr)
      const fc = (!layer.fillColor||layer.fillColor==='line') ? makeRainbowGradient(ctx,x,y,x+lw,y) : layer.fillColor
      ctx.fillStyle=fc; ctx.fill()
      if ((layer.strokeThickness??0)>0) {
        roundRectPath(ctx,x,y,lw,lh,cr)
        ctx.strokeStyle='#333'; ctx.lineWidth=(layer.strokeThickness??0.1)*unitPx; ctx.stroke()
      }
      ctx.restore()
    }
    ctx.save(); ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font=`bold ${Math.min(W,H)*0.13}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'
    const npos=styleObj.lineNumberPos||{x:0,y:0}
    const unitPx2=Math.min(W,H)*0.18
    ctx.fillText('1号',W/2+npos.x*unitPx2, H/2-npos.y*unitPx2)
    ctx.restore()
  }

  else if (type === 'texture') {

    // 背景
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, W, H);
    // 绘制一个示意形状（线路条）来展示纹理效果
    const midY = H / 2;
    const lineW = W * 0.8;
    const lineH = H * 0.5;
    const x0 = W * 0.1, y0 = midY - lineH / 2;

    // 绘制一条灰色背景条（代表线路或填充区域）
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(x0, y0, lineW, lineH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, lineW, lineH);
    ctx.clip(); // 纹理裁剪到该区域内

    for (const layer of styleObj.layers) {
          if(layer.spacing<0.001){
      layer.spacing=0.001
    }
        const spacing = (layer.spacing ?? 0.2) * lineH; // 间距缩放
        const angle = (layer.angle ?? 0) * Math.PI / 180;
        const thick = (layer.thickness ?? 0.1) * lineH * 0.5;
        const lineLength = Math.hypot(lineW, lineH) * 1.5;

        ctx.save();
        ctx.translate(x0 + lineW / 2, y0 + lineH / 2);
        ctx.rotate(angle);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = thick;
        ctx.beginPath();

        const half = lineLength / 2;
        for (let d = -half; d <= half; d += spacing) {
            ctx.moveTo(d, -half);
            ctx.lineTo(d, half);
        }
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // 标签
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = `${H*0.12}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('纹理预览', W/2, H - 6);
}
}