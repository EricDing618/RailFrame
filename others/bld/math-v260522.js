function randomChoose(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pointinbd(bd, op) {
    return qujian(bd.w, bd.e, op.lng) && qujian(bd.s, bd.n, op.lat)
}
function qujian(qjmin, qjmax, v) {
    return (qjmax >= v && qjmin <= v) || (qjmin >= v && qjmax <= v)
}
// ==================== 贝塞尔曲线 ====================
const svgPath = (points, command) => {
    if (!points || points.length === 0) return ''
    if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`
    if (command && command._fastBezier) {
        return command._fastBezier(points)
    }

    const out = new Array(points.length)
    out[0] = `M ${points[0][0]},${points[0][1]}`
    for (let i = 1; i < points.length; i++) {
        out[i] = command(points[i], i, points)
    }
    return out.join(' ')
}

const line = (pointA, pointB) => {
    const dx = pointB[0] - pointA[0]
    const dy = pointB[1] - pointA[1]
    return {
        length: Math.hypot(dx, dy),
        angle: Math.atan2(dy, dx)
    }
}

const controlPoint = (current, previous, next, reverse, currentSegLen) => {
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

    const smoothing = 0.35
    const dist = Math.min(len * smoothing, currentSegLen * smoothing * 1.5)
    const k = dist / len

    return [
        current[0] + dx * k,
        current[1] + dy * k
    ]
}

function makeBezierCommand(prevNeighbor, nextNeighbor) {
    const cmd = function(point, i, a) {
        const prevPt = a[i - 1]
        const prevPrev = i >= 2 ? a[i - 2] : (prevNeighbor || null)
        const nextNext = (i < a.length - 1) ? a[i + 1] : (nextNeighbor || null)

        const dx = point[0] - prevPt[0]
        const dy = point[1] - prevPt[1]
        const segLen = Math.hypot(dx, dy)

        const c1 = controlPoint(prevPt, prevPrev, point, false, segLen)
        const c2 = controlPoint(point, prevPt, nextNext, true, segLen)

        return `C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${point[0]},${point[1]}`
    }

    cmd._fastBezier = function(points) {
        const n = points.length
        const out = new Array(n)
        out[0] = `M ${points[0][0]},${points[0][1]}`

        for (let i = 1; i < n; i++) {
            const point = points[i]
            const prevPt = points[i - 1]
            const prevPrev = i >= 2 ? points[i - 2] : (prevNeighbor || null)
            const nextNext = i < n - 1 ? points[i + 1] : (nextNeighbor || null)

            const dx = point[0] - prevPt[0]
            const dy = point[1] - prevPt[1]
            const segLen = Math.hypot(dx, dy)

            const c1 = controlPoint(prevPt, prevPrev, point, false, segLen)
            const c2 = controlPoint(point, prevPt, nextNext, true, segLen)

            out[i] = `C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${point[0]},${point[1]}`
        }

        return out.join(' ')
    }

    return cmd
}

const bezierCommand = makeBezierCommand(null, null)

// ========== 工具函数 ==========
/**
 * 生成站名候选位置（考虑文本框尺寸的极坐标网格，方向分优先级）
 * 优先级规则：
 *   1. 半径越小越优先（scales 参数从前到后）
 *   2. 同一半径下：先正方向（0°, 90°, 180°, 270°），
 *      再 45° 对角线方向，最后其他角度
 *
 * @param {number} cx      站点经度 (km)
 * @param {number} cy      站点纬度 (km)
 * @param {number} r       基础安全半径 (km)，通常是站点圆半径或最小间距
 * @param {number} halfW   文本框半宽 (km)
 * @param {number} halfH   文本框半高 (km)
 * @param {number} angles  圆周等分数，默认 16（建议至少为 8 且为 4 的倍数）
 * @param {number[]} scales 半径倍数数组（从小到大），默认 [1.0, 1.2, 1.4, 1.6]
 * @returns {{x: number, y: number}[]} 候选中心点，按优先顺序排列
 */
function generateCandidates(cx, cy, r1, halfW, halfH, angles = 16, scales = [ 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2]) {
    const r = r1 
    // 生成所有等分角度（弧度）
    const allAngles = Array.from({ length: angles }, (_, i) => (2 * Math.PI * i) / angles);

    // 按优先级重排角度
    const EPS = 1e-9;

    const isCardinal = (a) => {
        const mod = a % (Math.PI / 2);
        return mod < EPS || mod > Math.PI / 2 - EPS;
    };
    const isDiagonal = (a) => {
        const mod = (a + Math.PI / 4) % (Math.PI / 2);
        return mod < EPS || mod > Math.PI / 2 - EPS;
    };

    const cardinal = [], diagonal = [], others = [];
    for (const a of allAngles) {
        if (isCardinal(a)) cardinal.push(a);
        else if (isDiagonal(a)) diagonal.push(a);
        else others.push(a);
    }
    const sortedAngles = [...cardinal, ...diagonal, ...others];

    const result = [];
    for (const scale of scales) {
        const R = r * scale;
        for (const angle of sortedAngles) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // 矩形在 (cos, sin) 方向上的支撑距离：
            // 即矩形朝向圆心一侧的"接触点"到矩形中心的投影距离
            // h(θ) = |halfW·cosθ| + |halfH·sinθ|
            const support = Math.abs(halfW * cos) + Math.abs(halfH * sin);

            // 文本框中心 = 圆心 + 沿角度方向移动 (R + support)
            const offsetX = (R + support) * cos;
            const offsetY = (R + support) * sin;

            result.push({
    x: cx + offsetX,
    y: cy + offsetY,
    scaleRank: scales.indexOf(scale),
    angleRank: isCardinal(angle) ? 0 : isDiagonal(angle) ? 1 : 2
})
        }
    }
    return result;
}

// 线段与轴对齐矩形相交判断（保留原实现）
// 检测线段(x1,y1)-(x2,y2) 与轴对齐矩形(rx1,ry1)-(rx2,ry2) 是否相交
function segmentIntersectsRect(x1, y1, x2, y2, rx1, ry1, rx2, ry2) {
    // ① 任一端点在矩形内 → 直接碰撞
    if (pointInRect(x1, y1, rx1, ry1, rx2, ry2) ||
        pointInRect(x2, y2, rx1, ry1, rx2, ry2)) {
        return true;
    }
    // ② 线段与矩形四条边严格相交（两端均不在矩形内，但跨越矩形）
    return segmentsCross(x1, y1, x2, y2, rx1, ry1, rx2, ry1) ||  // 上边
        segmentsCross(x1, y1, x2, y2, rx1, ry2, rx2, ry2) ||  // 下边
        segmentsCross(x1, y1, x2, y2, rx1, ry1, rx1, ry2) ||  // 左边
        segmentsCross(x1, y1, x2, y2, rx2, ry1, rx2, ry2);    // 右边
}

// 点在矩形内
function pointInRect(px, py, x1, y1, x2, y2) {
    return px >= x1 && px <= x2 && py >= y1 && py <= y2;
}

// 两线段严格相交（跨立测试，排除端点接触）
function segmentsCross(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
    // 快速排斥：外接矩形不重叠则不可能相交
    if (Math.max(ax1, ax2) < Math.min(bx1, bx2) ||
        Math.max(ay1, ay2) < Math.min(by1, by2) ||
        Math.max(bx1, bx2) < Math.min(ax1, ax2) ||
        Math.max(by1, by2) < Math.min(ay1, ay2)) {
        return false;
    }
    // 跨立实验（叉积异号）
    const d1 = cross(bx1 - ax1, by1 - ay1, ax2 - ax1, ay2 - ay1);
    const d2 = cross(bx2 - ax1, by2 - ay1, ax2 - ax1, ay2 - ay1);
    const d3 = cross(ax1 - bx1, ay1 - by1, bx2 - bx1, by2 - by1);
    const d4 = cross(ax2 - bx1, ay2 - by1, bx2 - bx1, by2 - by1);
    return (d1 * d2 < 0) && (d3 * d4 < 0);
}

// 二维向量叉积
function cross(dx1, dy1, dx2, dy2) {
    return dx1 * dy2 - dy1 * dx2;
}

function lineIntersectLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 1e-10) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
// 贝塞尔采样（你原先的逻辑）
function sampleBezierPath(controlPts, stepKm) {
    const n = controlPts?.length || 0
    if (n === 0) return []
    if (n === 1) return [{ x: controlPts[0].lng, y: controlPts[0].lat }]
    if (n === 2) {
        return [
            { x: controlPts[0].lng, y: controlPts[0].lat },
            { x: controlPts[1].lng, y: controlPts[1].lat }
        ]
    }

    const pts = new Array(n)
    for (let i = 0; i < n; i++) {
        pts[i] = { x: controlPts[i].lng, y: controlPts[i].lat }
    }

    const sampled = [pts[0]]
    const smoothing = 0.2
    const safeStep = Math.max(1e-9, stepKm || 0.01)

    function cp(current, previous, next, reverse, segLen) {
        const p = previous || current
        const q = next || current
        let dx = q.x - p.x
        let dy = q.y - p.y

        if (reverse) {
            dx = -dx
            dy = -dy
        }

        const len = Math.hypot(dx, dy)
        if (len < 1e-12) return { x: current.x, y: current.y }

        const dist = Math.min(len * smoothing, segLen * smoothing * 1.5)
        const k = dist / len

        return {
            x: current.x + dx * k,
            y: current.y + dy * k
        }
    }

    for (let i = 0; i < n - 1; i++) {
        const p0 = pts[i]
        const p3 = pts[i + 1]

        const dx = p3.x - p0.x
        const dy = p3.y - p0.y
        const segLen = Math.hypot(dx, dy)
        const steps = Math.max(2, Math.ceil(segLen / safeStep))

        const p1 = cp(p0, i > 0 ? pts[i - 1] : null, p3, false, segLen)
        const p2 = cp(p3, p0, i < n - 2 ? pts[i + 2] : null, true, segLen)

        const inv = 1 / steps
        for (let s = 1; s <= steps; s++) {
            const t = s * inv
            const u = 1 - t
            const uu = u * u
            const tt = t * t

            sampled.push({
                x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
                y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y
            })
        }
    }

    return sampled
}
const earthRadius = 6371000
const earthC = earthRadius * 2 * Math.PI
function BallDistance(lon1, lat1, lon2, lat2) {
    const toRad = d => d * Math.PI / 180
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 全局创建一个隐藏的测量用 SVG 画布（只创建一次，复用）
let measureCanvas = null;

/**
 * 测量文本在 SVG 中的实际渲染尺寸
 * @param {string} text - 文本内容
 * @param {number} fontSize - 字号（与你数据里的 nm.size 单位一致，比如 px）
 * @param {string} fontFamily - 字体族，默认 'Arial, sans-serif'
 * @param {number|string} fontWeight - 字重，默认 'normal'
 * @returns {{width: number, height: number}} 单位与 fontSize 一致
 */
function measureTextSize(text, fontSize, fontFamily = 'Arial, sans-serif', fontWeight = 'normal') {
    // 只创建一次
    if (!measureCanvas) {
        measureCanvas = SVG().addTo(document.body);
        measureCanvas.size(0, 0);           // 不可见
        measureCanvas.node.style.position = 'absolute';
        measureCanvas.node.style.visibility = 'hidden';
        measureCanvas.node.style.pointerEvents = 'none';
    }

    // 创建临时文本
    const tempText = measureCanvas.text(text).font({
        size: fontSize,
        family: fontFamily,
        weight: fontWeight,
        anchor: 'start',
        leading: '1.2em'
    });

    // 获取真实包围盒
    const bbox = tempText.bbox();

    // 销毁临时元素
    tempText.remove();

    return {
        width: bbox.width,
        height: bbox.height
    };
}