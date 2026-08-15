// timevar.js — 时间变量系统
// 时间常量格式：2026/05/27
//
// 支持：
// A
// 2026/05/27
// A + 3d
// A - 2m
// A + B
// A - B
//
// 单位：
// d = 天
// m = 月
// y = 年

const TimeVarUtil = (() => {

    // ==================== 正则 ====================

    const DATE_RE = /\b\d{4}\/\d{1,2}\/\d{1,2}\b/
    const DATE_FULL_RE = /^\d{4}\/\d{1,2}\/\d{1,2}$/

    const KEY_RE =
        /^[A-Za-z_\u4e00-\u9fff\u3040-\u30ff][A-Za-z0-9_\u4e00-\u9fff\u3040-\u30ff]*$/


    // ==================== 日期 ====================

    function isDateConst(s) {
        return DATE_FULL_RE.test(String(s || '').trim())
    }

    function parseDate(s) {
        const m = String(s || '')
            .trim()
            .match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)

        if (!m) {
            throw new Error('不是时间常量：' + s)
        }

        const y = +m[1]
        const mo = +m[2]
        const d = +m[3]

        const dt = new Date(y, mo - 1, d)

        if (
            dt.getFullYear() !== y ||
            dt.getMonth() !== mo - 1 ||
            dt.getDate() !== d
        ) {
            throw new Error('无效日期：' + s)
        }

        return dt
    }

    function fmtDate(dt) {
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        const d = String(dt.getDate()).padStart(2, '0')

        return `${y}/${m}/${d}`
    }


    // ==================== key校验 ====================

    function validateKey(key) {
        key = String(key || '').trim()

        if (!key) {
            return 'key不能为空'
        }

        if (DATE_RE.test(key)) {
            return 'key不能包含时间常量格式'
        }

        if (/[+\-*/()]/.test(key)) {
            return 'key不能包含运算符'
        }

        if (/^\d/.test(key)) {
            return 'key不能以数字开头'
        }

        if (!KEY_RE.test(key)) {
            return 'key只能包含字母、数字、下划线、汉字/日文'
        }

        return ''
    }


    // ==================== map ====================

    function getMap(vars) {
        const mp = new Map()

        ;(vars || []).forEach(v => {
            if (v && v.key) {
                mp.set(String(v.key).trim(), v)
            }
        })

        return mp
    }


    // ==================== duration ====================

    function addDate(dt, amount, unit) {
    const r = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())

    if (unit === 'd') {
        r.setDate(r.getDate() + amount)
    } else if (unit === 'm') {
        r.setMonth(r.getMonth() + amount)
    } else if (unit === 'y') {
        r.setFullYear(r.getFullYear() + amount)
    } else {
        throw new Error('未知单位：' + unit)
    }

    return r
}

    function diffDays(a, b) {
    const x = new Date(a.getFullYear(), a.getMonth(), a.getDate())
    const y = new Date(b.getFullYear(), b.getMonth(), b.getDate())

    return Math.round((x.getTime() - y.getTime()) / 86400000)
}


    // ==================== tokenizer ====================

    function tokenizeExpr(expr) {
    expr = String(expr || '').trim()

    const tokens = []
    let i = 0
    let expectAtom = true

    while (i < expr.length) {
        if (/\s/.test(expr[i])) {
            i++
            continue
        }

        const rest = expr.slice(i)

        // 日期常量：必须完整是 yyyy/m/d，不能匹配 3/2/1
        const date = rest.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)
        if (date) {
            tokens.push(date[0])
            i += date[0].length
            expectAtom = false
            continue
        }

        // 运算符：只有在“已经有左值”时才当运算符
        if (!expectAtom && (expr[i] === '+' || expr[i] === '-')) {
            tokens.push(expr[i])
            i++
            expectAtom = true
            continue
        }

        // duration：支持 3d / -3d
        const dur = rest.match(/^-?\d+[dmy]/i)
        if (dur) {
            tokens.push(dur[0])
            i += dur[0].length
            expectAtom = false
            continue
        }

        // 变量名：不能包含 + - / * ( )
        const name = rest.match(/^[^\s+\-/*()]+/)
        if (name) {
            tokens.push(name[0])
            i += name[0].length
            expectAtom = false
            continue
        }

        throw new Error('无法解析：' + rest)
    }

    return tokens
}

    // ==================== atom ====================

    function resolveAtom(atom, vars, stack = []) {

        atom = String(atom || '').trim()

        if (!atom) {
            throw new Error('空值')
        }

        // 日期
        if (isDateConst(atom)) {
            return {
                type: 'date',
                value: parseDate(atom)
            }
        }

        // duration
        const dur = atom.match(/^(-?\d+)([dmy])$/i)

        if (dur) {
            return {
                type: 'duration',
                value: +dur[1],
                unit: dur[2].toLowerCase()
            }
        }

        // 变量
        const mp = getMap(vars)

        const item = mp.get(atom)

        if (!item) {
            throw new Error('找不到时间变量：' + atom)
        }

        if (stack.includes(atom)) {
            throw new Error(
                '循环引用：' +
                stack.concat(atom).join(' -> ')
            )
        }

        return evalExpr(
            item.value,
            vars,
            stack.concat(atom)
        )
    }


    // ==================== expr ====================

    function evalExpr(expr, vars, stack = []) {

    expr = String(expr || '').trim()

    if (!expr) {
        throw new Error('表达式为空')
    }

    const tokens = tokenizeExpr(expr)

    if (tokens.length === 0) {
        throw new Error('表达式为空')
    }

    // 起始值
    let base = resolveAtom(tokens[0], vars, stack)

    // 日期 ± 日期
    if (
        tokens.length === 3 &&
        base.type === 'date'
    ) {
        const op = tokens[1]
        const right = resolveAtom(tokens[2], vars, stack)

        if (
            right.type === 'date' &&
            op === '-'
        ) {
            return {
                type: 'duration',
                value: diffDays(base.value, right.value),
                unit: 'd'
            }
        }
    }

    // 收集 duration
    let addY = 0
    let addM = 0
    let addD = 0

    for (let i = 1; i < tokens.length; i += 2) {

        const op = tokens[i]

        const right = resolveAtom(
            tokens[i + 1],
            vars,
            stack
        )

        if (!op || !right) {
            throw new Error('表达式不完整：' + expr)
        }

        // date ± duration
        if (
            base.type === 'date' &&
            right.type === 'duration'
        ) {

            const sign = op === '+' ? 1 : -1
            const v = right.value * sign

            if (right.unit === 'y') {
                addY += v
            }
            else if (right.unit === 'm') {
                addM += v
            }
            else if (right.unit === 'd') {
                addD += v
            }
        }

        // duration ± duration
        else if (
            base.type === 'duration' &&
            right.type === 'duration'
        ) {

            if (base.unit !== right.unit) {
                throw new Error(
                    '不同单位的时长不能直接运算'
                )
            }

            base = {
                type: 'duration',
                value:
                    op === '+'
                        ? base.value + right.value
                        : base.value - right.value,
                unit: base.unit
            }
        }

        else {
            throw new Error(
                '不支持的运算：' + expr
            )
        }
    }

    // 按固定顺序计算：年 -> 月 -> 日
    if (base.type === 'date') {

        let dt = new Date(
            base.value.getFullYear(),
            base.value.getMonth(),
            base.value.getDate()
        )

        if (addY) {
            dt.setFullYear(
                dt.getFullYear() + addY
            )
        }

        if (addM) {
            dt.setMonth(
                dt.getMonth() + addM
            )
        }

        if (addD) {
            dt.setDate(
                dt.getDate() + addD
            )
        }

        return {
            type: 'date',
            value: dt
        }
    }

    return base
}


    // ==================== format ====================

    function formatResult(r) {

        if (r.type === 'date') {
            return fmtDate(r.value)
        }

        if (r.type === 'duration') {
            return `${r.value}${r.unit}`
        }

        return String(r.value ?? '')
    }


    // ==================== 外部接口 ====================

    function test(expr, vars) {
        return formatResult(
            evalExpr(expr, vars)
        )
    }

    function normalizeVars(data) {

        if (!Array.isArray(data.timeVars)) {
            data.timeVars = []
        }

        data.timeVars.forEach(v => {

            if (v.key === undefined) {
                v.key = ''
            }

            if (v.value === undefined) {
                v.value = ''
            }

            if (v.desc === undefined) {
                v.desc = ''
            }
        })
    }

    return {
        validateKey,
        test,
        normalizeVars,
        isDateConst,
        evalExpr,
        formatResult
    }

})()