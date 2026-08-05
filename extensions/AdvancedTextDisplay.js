(function (Scratch) {
    'use strict';

    class AdvancedTextDisplay {
        constructor() {
            // 存储所有文字对象: textId -> { div, animationId, typeTimer, fullText, ... }
            this.texts = new Map();
            // 存储所有组: groupId -> { members: Set<textId>, align, baseX, baseY, offsets: Map<textId, {dx, dy}> }
            this.groups = new Map();
        }

        // ---------- 私有辅助方法 ----------

        // 检查文字是否存在
        _isTextExists(id) {
            return this.texts.has(id);
        }

        // 取消透明度动画
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

        // 取消逐字打印定时器
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

        // 从所有组中移除文字引用
        _removeTextFromGroups(textId) {
            for (const [, group] of this.groups) {
                if (group.members.has(textId)) {
                    group.members.delete(textId);
                }
            }
        }

        // 删除文字
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

        // 创建文字DOM元素
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

        // 将舞台坐标转换为视口坐标
        _stageToViewport(x, y) {
            const stageCanvas = document.getElementById('stage');
            if (stageCanvas) {
                const rect = stageCanvas.getBoundingClientRect();
                // 舞台逻辑尺寸: 480x360, 坐标系: X -240~240, Y -180~180 (Y向上)
                const cx = rect.left + ((x || 0) + 240) / 480 * rect.width;
                const cy = rect.top + (180 - (y || 0)) / 360 * rect.height;
                return { left: cx, top: cy };
            } else {
                // 如果找不到舞台，居中显示
                console.warn('AdvancedTextDisplay: 未找到舞台元素，文字将居中显示');
                return { left: window.innerWidth / 2, top: window.innerHeight / 2 };
            }
        }

        // 设置文字位置
        _setPosition(div, x, y) {
            const pos = this._stageToViewport(x, y);
            div.style.left = pos.left + 'px';
            div.style.top = pos.top + 'px';
            div.style.transform = 'translate(-50%, -50%)';
        }

        // 获取组内目标文字列表
        _getTargetTexts(groupId, textId) {
            const group = this.groups.get(groupId);
            if (!group) return [];
            if (textId && group.members.has(textId)) {
                return [textId];
            }
            return Array.from(group.members);
        }

        // 应用组对齐方式到单个文字
        _applyAlignToText(textId, align) {
            const entry = this.texts.get(textId);
            if (entry) {
                entry.div.style.textAlign = align;
            }
        }

        // 应用组基准位置+偏移到单个文字
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

        // 1. 创建文字
        createText(args) {
            const { ID, TEXT } = args;
            const id = ID || 'default';
            if (this._isTextExists(id)) {
                this._removeText(id);
            }
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

        // 2. 设置文字样式
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

        // 3. 设置文字位置
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

        // 4. 设置文字透明度
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

        // 5. 播放透明度动画
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

        // 6. 逐字打印
        typeText(args) {
            const { ID, TEXT, INTERVAL } = args;
            const id = ID || 'default';
            let entry = this.texts.get(id);
            if (!entry) {
                // 自动创建
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

        // 7. 暂停逐字打印
        stopTypeText(args) {
            const { ID } = args;
            const id = ID || 'default';
            if (!this._isTextExists(id)) return;
            this._cancelTypeTimer(id);
        }

        // 8. 立即显示完整文字
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

        // 9. 清除文字
        clearTextById(args) {
            const { ID } = args;
            if (ID) {
                this._removeText(ID);
            }
        }

        // 10. 清除所有文字
        clearAllTexts() {
            for (const id of this.texts.keys()) {
                this._removeText(id);
            }
            this.groups.clear();
        }

        // ---------- 组操作 ----------

        // 11. 创建组
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

        // 12. 添加文字到组
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

        // 13. 从组移除文字
        removeTextFromGroup(args) {
            const { GROUP_ID, TEXT_ID } = args;
            if (!GROUP_ID || !TEXT_ID) return;
            const group = this.groups.get(GROUP_ID);
            if (!group) return;
            group.members.delete(TEXT_ID);
            group.offsets.delete(TEXT_ID);
        }

        // 14. 设置组对齐方式
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

        // 15. 设置组基准位置
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

        // 16. 设置组内文字偏移
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

        // 17. 组内批量设置样式
        setGroupStyle(args) {
            const { GROUP_ID, TEXT_ID, SIZE, FONT, BOLD, COLOR } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.setStyle({ ID: tid, SIZE, FONT, BOLD, COLOR });
            }
        }

        // 18. 组内批量设置位置
        setGroupPosition(args) {
            const { GROUP_ID, TEXT_ID, X, Y } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.setPosition({ ID: tid, X, Y });
            }
        }

        // 19. 组内批量设置透明度
        setGroupOpacity(args) {
            const { GROUP_ID, TEXT_ID, OPACITY } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.setOpacity({ ID: tid, OPACITY });
            }
        }

        // 20. 组内批量播放透明度动画
        playGroupFade(args) {
            const { GROUP_ID, TEXT_ID, START, END, DURATION } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.playFade({ ID: tid, START, END, DURATION });
            }
        }

        // 21. 组内逐字打印
        typeGroupText(args) {
            const { GROUP_ID, TEXT_ID, TEXT, INTERVAL } = args;
            if (!GROUP_ID) return;
            const targets = this._getTargetTexts(GROUP_ID, TEXT_ID);
            for (const tid of targets) {
                this.typeText({ ID: tid, TEXT, INTERVAL });
            }
        }

        // 22. 等待所有文字动画完成（异步积木）
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
            // 官方异步积木标准写法：返回一个Promise[reference:8]
            return Promise.all(promises);
        }

        // ---------- 扩展元数据 ----------

        getInfo() {
            return {
                id: 'advancedtextdisplay',
                name: '🎨 高级文字（组+打印+并行）',
                color1: '#FF6B00',
                color2: '#D64B00',
                blocks: [
                    // ----- 单个文字操作 -----
                    {
                        opcode: 'createText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '创建文字 ID:[ID] 内容:[TEXT]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: '你好，世界！' }
                        }
                    },
                    {
                        opcode: 'setStyle',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置文字 [ID] 大小[SIZE] 字体[FONT] 粗体?[BOLD] 颜色[COLOR]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 48 },
                            FONT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Arial' },
                            BOLD: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: false },
                            COLOR: { type: Scratch.ArgumentType.STRING, defaultValue: '#FFFFFF' }
                        }
                    },
                    {
                        opcode: 'setPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置文字 [ID] 位置 X:[X] Y:[Y]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setOpacity',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置文字 [ID] 透明度[OPACITY]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            OPACITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'playFade',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '播放文字 [ID] 透明度动画从[START]到[END] 用时[DURATION]秒',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            DURATION: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 }
                        }
                    },
                    {
                        opcode: 'clearTextById',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '清除文字 ID:[ID]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'clearAllTexts',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '清除所有文字'
                    },

                    // ----- 逐字打印（单个） -----
                    {
                        opcode: 'typeText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '逐字打印文字 [ID] 内容:[TEXT] 每个字符间隔[INTERVAL]秒',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: '你好，世界！' },
                            INTERVAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.2 }
                        }
                    },
                    {
                        opcode: 'stopTypeText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '暂停逐字打印 [ID]（保留已显示部分）',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'finishTypeText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '立即显示完整文字 [ID]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },

                    // ----- 组管理 -----
                    {
                        opcode: 'createGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '创建组 ID:[ID]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' }
                        }
                    },
                    {
                        opcode: 'addTextToGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '将文字 [TEXT_ID] 添加到组 [GROUP_ID]',
                        arguments: {
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' }
                        }
                    },
                    {
                        opcode: 'removeTextFromGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '从组 [GROUP_ID] 移除文字 [TEXT_ID]',
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' }
                        }
                    },
                    {
                        opcode: 'setGroupAlign',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置组 [GROUP_ID] 对齐方式 [ALIGN]',
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
                        text: '设置组 [GROUP_ID] 基准位置 X:[X] Y:[Y]',
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'setTextOffsetInGroup',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置组 [GROUP_ID] 内文字 [TEXT_ID] 偏移 DX:[DX] DY:[DY]',
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            DX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            DY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },

                    // ----- 组批量操作 -----
                    {
                        opcode: 'setGroupStyle',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置组 [GROUP_ID] 文字 [TEXT_ID] 大小[SIZE] 字体[FONT] 粗体?[BOLD] 颜色[COLOR]',
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 48 },
                            FONT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Arial' },
                            BOLD: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: false },
                            COLOR: { type: Scratch.ArgumentType.STRING, defaultValue: '#FFFFFF' }
                        }
                    },
                    {
                        opcode: 'setGroupPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '设置组 [GROUP_ID] 文字 [TEXT_ID] 位置 X:[X] Y:[Y]',
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
                        text: '设置组 [GROUP_ID] 文字 [TEXT_ID] 透明度[OPACITY]',
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            OPACITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'playGroupFade',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '播放组 [GROUP_ID] 文字 [TEXT_ID] 透明度动画从[START]到[END] 用时[DURATION]秒',
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
                        text: '组内逐字打印 [GROUP_ID] 文字 [TEXT_ID] 内容:[TEXT] 每个字符间隔[INTERVAL]秒',
                        arguments: {
                            GROUP_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'group1' },
                            TEXT_ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: '你好，世界！' },
                            INTERVAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.2 }
                        }
                    },

                    // ----- 并行等待（异步） -----
                    {
                        opcode: 'waitForAllAnimations',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '等待所有文字动画完成'
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

    // 注册扩展（必须且只能调用一次）[reference:9]
    Scratch.extensions.register(new AdvancedTextDisplay());
})(Scratch);