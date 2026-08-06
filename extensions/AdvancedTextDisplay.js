// Name: Advanced Text Display
// ID: advancedtextdisplay
// Description: Display and animate text with independent objects, groups, and typewriter effects.
// By: Your Name
// License: MIT

(function (Scratch) {
    'use strict';

    Scratch.translate.setup({});

    class AdvancedTextDisplay {
        constructor() {
            this.texts = new Map();
            this.groups = new Map();
            this.stageObserver = null;
            this._setupStageResizeObserver();
        }

        // ---------- 监听舞台尺寸变化 ----------
        _setupStageResizeObserver() {
            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', () => this._repositionAllTexts());
                return;
            }

            const waitForStage = () => {
                const stageEl = document.getElementById('stage') || document.querySelector('canvas');
                if (stageEl) {
                    this.stageObserver = new ResizeObserver(() => {
                        this._repositionAllTexts();
                    });
                    this.stageObserver.observe(stageEl);
                } else {
                    setTimeout(waitForStage, 100);
                }
            };
            waitForStage();
        }

        _repositionAllTexts() {
            for (const [id, entry] of this.texts) {
                if (entry.div) {
                    this._setPosition(entry.div, entry.x, entry.y);
                }
            }
            for (const [groupId, group] of this.groups) {
                for (const textId of group.members) {
                    this._applyGroupPositionToText(groupId, textId);
                }
            }
        }

        // ---------- 私有辅助方法 ----------
        _isTextExists(id) {
            return this.texts.has(id);
        }

        _cancelAnimation(id) {
            const entry = this.texts.get(id);
            if (entry && entry.animationId) {
                cancelAnimationFrame(entry.animationId);
                entry.animationId = null;
            }
            if (entry && entry.animationResolve) {
                entry.animationResolve();
                entry.animationPromise = null;
                entry.animationResolve = null;
            }
        }

        _cancelTypeTimer(id) {
            const entry = this.texts.get(id);
            if (entry && entry.typeTimer) {
                clearTimeout(entry.typeTimer);
                entry.typeTimer = null;
            }
            if (entry && entry.typeResolve) {
                entry.typeResolve();
                entry.typePromise = null;
                entry.typeResolve = null;
            }
        }

        _removeTextFromGroups(textId) {
            for (const [, group] of this.groups) {
                if (group.members.has(textId)) {
                    group.members.delete(textId);
                }
            }
        }

        _removeText(id) {
            const entry = this.texts.get(id);
            if (entry) {
                this._cancelAnimation(id);
                this._cancelTypeTimer(id);
                if (entry.div && entry.div.parentNode) {
                    entry.div.parentNode.removeChild(entry.div);
                }
                this.texts.delete(id);
                this._removeTextFromGroups(id);
            }
        }

        _createDiv() {
            const div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.zIndex = '99999';
            div.style.pointerEvents = 'none';
            div.style.userSelect = 'none';
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordBreak = 'break-word';
            div.style.maxWidth = '80vw';
            div.style.maxHeight = '80vh';
            div.style.textShadow = '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)';
            div.style.fontSize = '24px';
            div.style.fontFamily = 'Arial, sans-serif';
            div.style.fontWeight = 'normal';
            div.style.color = '#000000';
            div.style.opacity = '1';
            div.style.textAlign = 'center';
            return div;
        }

        _stageToViewport(x, y) {
            let stageEl = document.getElementById('stage');
            if (!stageEl) {
                stageEl = document.querySelector('canvas');
            }
            if (!stageEl) {
                stageEl = document.querySelector('.stage-wrapper, .stage-container');
            }

            if (stageEl) {
                const rect = stageEl.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;
                if (width > 0 && height > 0) {
                    const cx = rect.left + ((x || 0) + 240) / 480 * width;
                    const cy = rect.top + (180 - (y || 0)) / 360 * height;
                    return { left: cx, top: cy };
                }
            }

            console.warn('AdvancedTextDisplay: 未能获取舞台元素，文字将居中显示');
            return { left: window.innerWidth / 2, top: window.innerHeight / 2 };
        }

        _setPosition(div, x, y) {
            const pos = this._stageToViewport(x, y);
            div.style.left = pos.left + 'px';
            div.style.top = pos.top + 'px';
            div.style.transform = 'translate(-50%, -50%)';
        }

        _getTargetTexts(groupId, textId) {
            const group = this.groups.get(groupId);
            if (!group) return [];
            if (textId && group.members.has(textId)) {
                return [textId];
            }
            return Array.from(group.members);
        }

        _applyAlignToText(textId, align) {
            const entry = this.texts.get(textId);
            if (entry) {
                entry.div.style.textAlign = align;
            }
        }

        _applyGroupPositionToText(groupId, textId) {
            const group = this.groups.get(groupId);
            if (!group) return;
            const entry = this.texts.get(textId);
            if (!entry) return;
            const offset = group.offsets.get(textId) || { dx: 0, dy: 0 };
            const x = group.baseX + offset.dx;
            const y = group.baseY + offset.dy;
            this._setPosition(entry.div, x, y);
            entry.x = x;
            entry.y = y;
        }

        // ---------- 积木实现 ----------
        createText(args) {
            const { ID, TEXT } = args;
            const id = ID || 'default';
            if (this._isTextExists(id)) this._removeText(id);
            const div = this._createDiv();
            div.innerText = TEXT || '';
            this._setPosition(div, 0, 0);
            document.body.appendChild(div);
            const entry = {
                div: div,
                animationId: null,
                animationPromise: null,
                animationResolve: null,
                typeTimer: null,
                typePromise: null,
                typeResolve: null,
                typeIndex: 0,
                typeTotal: 0,
                fullText: TEXT || '',
                size: 24,
                font: 'Arial',
                bold: false,
                color: '#000000',
                x: 0,
                y: 0,
                opacity: 1
            };
            this.texts.set(id, entry);
        }

        setStyle(args) {
            const { ID, SIZE, FONT, BOLD, COLOR } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            const entry = this.texts.get(id);
            const div = entry.div;
            if (SIZE !== undefined && SIZE > 0) {
                div.style.fontSize = SIZE + 'px';
                entry.size = SIZE;
            }
            if (FONT !== undefined && FONT !== '') {
                div.style.fontFamily = `"${FONT}", sans-serif`;
                entry.font = FONT;
            }
            if (BOLD !== undefined) {
                div.style.fontWeight = BOLD ? 'bold' : 'normal';
                entry.bold = BOLD;
            }
            if (COLOR !== undefined && COLOR !== '') {
                div.style.color = COLOR;
                entry.color = COLOR;
            }
        }

        setPosition(args) {
            const { ID, X, Y } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            const entry = this.texts.get(id);
            const div = entry.div;
            const x = X !== undefined ? X : entry.x;
            const y = Y !== undefined ? Y : entry.y;
            this._setPosition(div, x, y);
            entry.x = x;
            entry.y = y;
        }

        setOpacity(args) {
            const { ID, OPACITY } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            const entry = this.texts.get(id);
            this._cancelAnimation(id);
            const opacity = Math.max(0, Math.min(1, OPACITY / 100));
            entry.div.style.opacity = opacity;
            entry.opacity = opacity;
        }

        playFade(args) {
            const { ID, START, END, DURATION } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            const entry = this.texts.get(id);
            const div = entry.div;
            this._cancelAnimation(id);

            const startOpacity = Math.max(0, Math.min(1, START / 100));
            const endOpacity = Math.max(0, Math.min(1, END / 100));
            const duration = DURATION > 0 ? DURATION : 0;

            let resolveFn;
            const promise = new Promise((resolve) => { resolveFn = resolve; });
            entry.animationPromise = promise;
            entry.animationResolve = resolveFn;

            if (duration <= 0) {
                div.style.opacity = endOpacity;
                entry.opacity = endOpacity;
                resolveFn();
                entry.animationPromise = null;
                entry.animationResolve = null;
                return;
            }

            div.style.opacity = startOpacity;
            entry.opacity = startOpacity;
            const startTime = performance.now();

            const animate = (currentTime) => {
                const currentEntry = this.texts.get(id);
                if (!currentEntry || currentEntry.div !== div) {
                    if (resolveFn) resolveFn();
                    return;
                }
                const elapsed = (currentTime - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);
                const currentOpacity = startOpacity + (endOpacity - startOpacity) * progress;
                div.style.opacity = currentOpacity;
                entry.opacity = currentOpacity;
                if (progress < 1) {
                    currentEntry.animationId = requestAnimationFrame(animate);
                } else {
                    currentEntry.animationId = null;
                    if (resolveFn) resolveFn();
                    currentEntry.animationPromise = null;
                    currentEntry.animationResolve = null;
                }
            };
            entry.animationId = requestAnimationFrame(animate);
        }

        typeText(args) {
            const { ID, TEXT, INTERVAL } = args;
            const id = ID || 'default';
            let entry = this.texts.get(id);
            if (!entry) {
                const div = this._createDiv();
                div.innerText = '';
                this._setPosition(div, 0, 0);
                document.body.appendChild(div);
                entry = {
                    div: div,
                    animationId: null,
                    animationPromise: null,
                    animationResolve: null,
                    typeTimer: null,
                    typePromise: null,
                    typeResolve: null,
                    typeIndex: 0,
                    typeTotal: 0,
                    fullText: '',
                    size: 24,
                    font: 'Arial',
                    bold: false,
                    color: '#000000',
                    x: 0,
                    y: 0,
                    opacity: 1
                };
                this.texts.set(id, entry);
            }

            this._cancelTypeTimer(id);
            this._cancelAnimation(id);

            const chars = Array.from(TEXT || '');
            const interval = Math.max(0, INTERVAL || 0.1);
            entry.typeTarget = TEXT || '';
            entry.typeTotal = chars.length;
            entry.typeIndex = 0;
            entry.fullText = TEXT || '';
            entry.div.innerText = '';

            let resolveFn;
            const promise = new Promise((resolve) => { resolveFn = resolve; });
            entry.typePromise = promise;
            entry.typeResolve = resolveFn;

            if (interval === 0 || chars.length === 0) {
                entry.div.innerText = TEXT || '';
                entry.typeIndex = entry.typeTotal;
                resolveFn();
                entry.typePromise = null;
                entry.typeResolve = null;
                return;
            }

            const typeNext = () => {
                const currentEntry = this.texts.get(id);
                if (!currentEntry || currentEntry.div !== entry.div) {
                    if (resolveFn) resolveFn();
                    return;
                }
                if (currentEntry.typeIndex < currentEntry.typeTotal) {
                    currentEntry.div.innerText += chars[currentEntry.typeIndex];
                    currentEntry.typeIndex++;
                    currentEntry.typeTimer = setTimeout(typeNext, interval * 1000);
                } else {
                    currentEntry.typeTimer = null;
                    if (resolveFn) resolveFn();
                    currentEntry.typePromise = null;
                    currentEntry.typeResolve = null;
                }
            };
            typeNext();
        }

        stopTypeText(args) {
            const { ID } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            this._cancelTypeTimer(id);
        }

        finishTypeText(args) {
            const { ID } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            const entry = this.texts.get(id);
            this._cancelTypeTimer(id);
            entry.div.innerText = entry.fullText || '';
            entry.typeIndex = entry.typeTotal;
            if (entry.typeResolve) {
                entry.typeResolve();
                entry.typePromise = null;
                entry.typeResolve = null;
            }
        }

        clearTextById(args) {
            const { ID } = args;
            if (ID) this._removeText(ID);
        }

        clearAllTexts() {
            for (const id of this.texts.keys()) {
                this._removeText(id);
            }
            this.groups.clear();
        }

        // ---------- 组操作 ----------
        createGroup(args) {
            const { ID } = args;
            if (!ID) return;
            this.groups.set(ID, {
                members: new Set(),
                align: 'center',
                baseX: 0,
                baseY: 0,
                offsets: new Map()
            });
        }

        addTextToGroup(args) {
            const { GROUP_ID, TEXT_ID } = args;
            if (!GROUP_ID || !TEXT_ID) return;
            const group = this.groups.get(GROUP_ID);
            if (!group) return;
            if (!this._isTextExists(TEXT_ID)) return;
            group.members.add(TEXT_ID);
            if (!group.offsets.has(TEXT_ID)) {
                group.offsets.set(TEXT_ID, { dx: 0, dy: 0 });
            }
            this._applyAlignToText(TEXT_ID, group.align);
            this._applyGroupPositionToText(GROUP_ID, TEXT_ID);
        }

        removeTextFromGroup(args) {
            const { GROUP_ID, TEXT_ID } = args;
            if (!GROUP_ID || !TEXT_ID) return;
            const group = this.groups.get(GROUP_ID);
            if (!group) return;
            group.members.delete(TEXT_ID);
            group.offsets.delete(TEXT_ID);
        }

        setGroupAlign(args) {
            const { GROUP_ID, ALIGN } = args;
            if (!GROUP_ID) return;
            const group = this.groups.get(GROUP_ID);
            if (!group) return;
            const align = ALIGN || 'center';
            group.align = align;
            for (const textId of group.members) {
                this._applyAlignToText(textId, align);
            }
        }

        setGroupBasePosition(args) {
            const { GROUP_ID, X, Y } = args;
            if (!GROUP_ID) return;
            const group = this.groups.get(GROUP_ID);
            if (!group) return;
            group.baseX = X !== undefined ? X : 0;
            group.baseY = Y !== undefined ? Y : 0;
            for (const textId of group.members) {
                this._applyGroupPositionToText(GROUP_ID, textId);
            }
        }

        setTextOffsetInGroup(args) {
            const { GROUP_ID, TEXT_ID, DX, DY } = args;
            if (!GROUP_ID || !TEXT_ID) return;
            const group = this.groups.get(GROUP_ID);
            if (!group) return;
            if (!group.members.has(TEXT_ID)) return;
            let offset = group.offsets.get(TEXT_ID);
            if (!offset) {
                offset = { dx: 0, dy: 0 };
                group.offsets.set(TEXT_ID, offset);
            }
            offset.dx = DX !== undefined ? DX : 0;
            offset.dy = DY !== undefined ? DY : 0;
            this._applyGroupPositionToText(GROUP_ID, TEXT_ID);
        }

        setGroupStyle(args) {
            const { GROUP_ID, TEXT_ID, SIZE, FONT, BOLD, COLOR } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.setStyle({ ID: tid, SIZE, FONT, BOLD, COLOR });
            }
        }

        setGroupPosition(args) {
            const { GROUP_ID, TEXT_ID, X, Y } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.setPosition({ ID: tid, X, Y });
            }
        }

        setGroupOpacity(args) {
            const { GROUP_ID, TEXT_ID, OPACITY } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.setOpacity({ ID: tid, OPACITY });
            }
        }

        playGroupFade(args) {
            const { GROUP_ID, TEXT_ID, START, END, DURATION } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.playFade({ ID: tid, START, END, DURATION });
            }
        }

        typeGroupText(args) {
            const { GROUP_ID, TEXT_ID, TEXT, INTERVAL } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.typeText({ ID: tid, TEXT, INTERVAL });
            }
        }

        waitForAllAnimations() {
            const promises = [];
            for (const [, entry] of this.texts) {
                if (entry.animationPromise) {
                    promises.push(entry.animationPromise);
                }
                if (entry.typePromise) {
                    promises.push(entry.typePromise);
                }
            }
            return Promise.all(promises);
        }

        // ---------- 扩展元数据 ----------
        getInfo() {
            return {
                id: 'advancedtextdisplay',
                name: Scratch.translate('Advanced Text Display'),
                color1: '#FF6B00',
                color2: '#D64B00',
                blocks: [
                    // 单个文字
                    {
                        opcode: 'createText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('create text [ID] with [TEXT]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello!' }
                        }
                    },
                    {
                        opcode: 'setStyle',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set text [ID] size [SIZE] font [FONT] bold? [BOLD] color [COLOR]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 48 },
                            FONT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Arial' },
                            BOLD: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: false },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#FFFFFF' }
                        }
                    },
                    {
                        opcode: 'setPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set text [ID] position x:[X] y:[Y]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setOpacity',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set text [ID] opacity [OPACITY]%'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            OPACITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'playFade',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('fade text [ID] from [START]% to [END]% in [DURATION] seconds'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            DURATION: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 }
                        }
                    },
                    {
                        opcode: 'typeText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('type text [ID] with [TEXT] each [INTERVAL] seconds'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello!' },
                            INTERVAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.2 }
                        }
                    },
                    {
                        opcode: 'stopTypeText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('stop typing text [ID]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'finishTypeText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('finish typing text [ID]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'clearTextById',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('clear text [ID]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'clearAllTexts',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('clear all texts')
                    },
                    '---',
                    // 组操作
                    {
                        opcode: 'createGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('create group [ID]'),
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' }
                        }
                    },
                    {
                        opcode: 'addTextToGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('add text [TEXT_ID] to group [GROUP_ID]'),
                        arguments: {
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' }
                        }
                    },
                    {
                        opcode: 'removeTextFromGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('remove text [TEXT_ID] from group [GROUP_ID]'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'setGroupAlign',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set group [GROUP_ID] align [ALIGN]'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            ALIGN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'center',
                                menu: 'alignMenu'
                            }
                        }
                    },
                    {
                        opcode: 'setGroupBasePosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set group [GROUP_ID] base position x:[X] y:[Y]'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setTextOffsetInGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set text [TEXT_ID] offset in group [GROUP_ID] dx:[DX] dy:[DY]'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            DX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            DY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    '---',
                    // 组批量
                    {
                        opcode: 'setGroupStyle',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set group [GROUP_ID] text [TEXT_ID] size [SIZE] font [FONT] bold? [BOLD] color [COLOR]'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 48 },
                            FONT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Arial' },
                            BOLD: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: false },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#FFFFFF' }
                        }
                    },
                    {
                        opcode: 'setGroupPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set group [GROUP_ID] text [TEXT_ID] position x:[X] y:[Y]'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setGroupOpacity',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('set group [GROUP_ID] text [TEXT_ID] opacity [OPACITY]%'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            OPACITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'playGroupFade',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('fade group [GROUP_ID] text [TEXT_ID] from [START]% to [END]% in [DURATION] seconds'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            DURATION: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 }
                        }
                    },
                    {
                        opcode: 'typeGroupText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('type group [GROUP_ID] text [TEXT_ID] with [TEXT] each [INTERVAL] seconds'),
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello!' },
                            INTERVAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.2 }
                        }
                    },
                    '---',
                    {
                        opcode: 'waitForAllAnimations',
                        blockType: Scratch.BlockType.COMMAND,
                        text: Scratch.translate('wait for all text animations to finish')
                    }
                ],
                menus: {
                    alignMenu: {
                        acceptReporters: true,
                        items: ['left', 'center', 'right']
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new AdvancedTextDisplay());
})(Scratch);