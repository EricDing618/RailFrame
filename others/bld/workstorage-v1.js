// ==================== work-storage.js — app.js / bshistory.html 共用存档读写 ====================
// 依赖：lz-string.min.js
const BinshuWorkStorage = (() => {
    const DB_NAME = 'BinshuLD3DB'
    const DB_VERSION = 1
    const STORE_NAME = 'works'
    const WORK_LIST_KEY = 'binshubld3WorkList'
    const FORCE_LOAD_KEY = 'binshubld3WorkForceLoad'

    let _db = null

    async function getDB() {
        if (_db) return _db
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION)
            req.onupgradeneeded = e => {
                const db = e.target.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            }
            req.onsuccess = e => {
                _db = e.target.result
                resolve(_db)
            }
            req.onerror = e => reject(e.target.error)
        })
    }

    async function idbSet(key, value) {
        const db = await getDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            tx.objectStore(STORE_NAME).put(value, key)
            tx.oncomplete = () => resolve(true)
            tx.onerror = e => reject(e.target.error)
        })
    }

    async function idbGet(key) {
        const db = await getDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const req = tx.objectStore(STORE_NAME).get(key)
            req.onsuccess = () => resolve(req.result ?? null)
            req.onerror = e => reject(e.target.error)
        })
    }

    async function idbDelete(key) {
        const db = await getDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            tx.objectStore(STORE_NAME).delete(key)
            tx.oncomplete = () => resolve(true)
            tx.onerror = e => reject(e.target.error)
        })
    }

    function compressValue(value) {
        if (!window.LZString) throw new Error('缺少 LZString，请先引用 lz-string.min.js')
        return LZString.compress(JSON.stringify(value))
    }

    function decompressValue(text) {
        if (!text) return null
        if (!window.LZString) throw new Error('缺少 LZString，请先引用 lz-string.min.js')
        const raw = LZString.decompress(text)
        if (!raw) return null
        return JSON.parse(raw)
    }

    async function savef(key, value) {
        const compressed = compressValue(value)
        await idbSet(key, compressed)
        try { localStorage.setItem(key, compressed) } catch { }
        return true
    }

    async function loadf(key) {
        let compressed = await idbGet(key)
        if (compressed) return decompressValue(compressed)

        const old = localStorage.getItem(key)
        if (old) {
            await idbSet(key, old)
            return decompressValue(old)
        }

        return false
    }

    async function deletef(key) {
        await idbDelete(key)
        try { localStorage.removeItem(key) } catch { }
        return true
    }

    async function getWorkList() {
        const list = await loadf(WORK_LIST_KEY)
        return Array.isArray(list) ? list : []
    }

    async function saveWorkList(list) {
        const arr = Array.from(new Set((list || []).filter(Boolean)))
        await savef(WORK_LIST_KEY, arr)
        return arr
    }

    async function addWorkName(name) {
        if (!name) return getWorkList()
        const list = await getWorkList()
        if (!list.includes(name)) list.push(name)
        return saveWorkList(list)
    }

    async function saveWork(work) {
        if (!work || !work.name) throw new Error('存档没有 name')
        await savef('binshubld3Work' + work.name, work)
        await addWorkName(work.name)
        return true
    }

    async function loadWorkByName(name) {
        if (!name) return false
        return loadf('binshubld3Work' + name)
    }

    async function deleteWorkByName(name) {
        if (!name) return false
        await deletef('binshubld3Work' + name)
        const list = (await getWorkList()).filter(x => x !== name)
        await saveWorkList(list)
        return true
    }

    async function setForceLoadName(name) {
        await savef(FORCE_LOAD_KEY, name || '')
        return true
    }

    async function getForceLoadName() {
        return await loadf(FORCE_LOAD_KEY) || ''
    }

    async function importWorkJsonText(text, options = {}) {
        const work = JSON.parse(text)
        if (!work || !Array.isArray(work.lines) || !Array.isArray(work.pts)) {
            throw new Error('这不是有效的滨蜀走向编辑器存档 JSON')
        }
        if (!work.name) {
            if (options.name) work.name = options.name
            else throw new Error('存档没有 name')
        }
        if (options.save !== false) await saveWork(work)
        return work
    }

    async function loadBshistorySettings(defaultSettings) {
        const saved = await loadf('bshistorySettings')
        return Object.assign({}, defaultSettings || {}, saved || {})
    }

    async function saveBshistorySettings(settings) {
        await savef('bshistorySettings', settings || {})
        return true
    }

    return {
        DB_NAME, DB_VERSION, STORE_NAME,
        getDB, idbSet, idbGet, idbDelete,
        savef, loadf, deletef,
        getWorkList, saveWorkList, addWorkName,
        saveWork, loadWorkByName, deleteWorkByName,
        setForceLoadName, getForceLoadName,
        importWorkJsonText,
        loadBshistorySettings, saveBshistorySettings
    }
})()