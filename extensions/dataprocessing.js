(function (Scratch) {
  'use strict';

  const Cast = Scratch.Cast;

  function safeParse(str) {
    if (typeof str !== 'string') return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function toSerializable(value) {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value ?? '';
  }

  class DataProcessing {
    getInfo() {
      return {
        id: 'dataprocessing',
        name: '数据处理 (List + Dict)',
        color1: '#4B8BBE',
        color2: '#306998',
        blocks: [
          // ---------- 列表 (List) ----------
          {
            opcode: 'listEmpty',
            blockType: Scratch.BlockType.REPORTER,
            text: '[] 空列表',
            disableMonitor: true,
          },
          {
            opcode: 'listFromText',
            blockType: Scratch.BlockType.REPORTER,
            text: '从 [TEXT] 用分隔符 [SEP] 创建列表',
            disableMonitor: true,
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'a,b,c' },
              SEP: { type: Scratch.ArgumentType.STRING, defaultValue: ',' },
            },
          },
          {
            opcode: 'listLength',
            blockType: Scratch.BlockType.REPORTER,
            text: '列表 [LIST] 的长度',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,3]' },
            },
          },
          {
            opcode: 'listGet',
            blockType: Scratch.BlockType.REPORTER,
            text: '列表 [LIST] 的第 [INDEX] 项',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '["a","b","c"]' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
            },
          },
          {
            opcode: 'listSlice',
            blockType: Scratch.BlockType.REPORTER,
            text: '切片列表 [LIST] 从 [START] 到 [END]（不含 END）',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,3,4,5]' },
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 4 },
            },
          },
          {
            opcode: 'listContains',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '列表 [LIST] 包含 [ITEM] ？',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,3]' },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: '2' },
            },
          },
          {
            opcode: 'listIndexOf',
            blockType: Scratch.BlockType.REPORTER,
            text: '列表 [LIST] 中 [ITEM] 的索引（1 起始，不存在返回 0）',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '["x","y","z"]' },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: 'y' },
            },
          },
          {
            opcode: 'listCount',
            blockType: Scratch.BlockType.REPORTER,
            text: '列表 [LIST] 中 [ITEM] 出现的次数',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,1,3,1]' },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: '1' },
            },
          },
          '---',
          {
            opcode: 'listAppend',
            blockType: Scratch.BlockType.REPORTER,
            text: '在列表 [LIST] 末尾追加 [ITEM]',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2]' },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: '3' },
            },
          },
          {
            opcode: 'listInsert',
            blockType: Scratch.BlockType.REPORTER,
            text: '在列表 [LIST] 的索引 [INDEX] 处插入 [ITEM]',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,3]' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: '2' },
            },
          },
          {
            opcode: 'listSet',
            blockType: Scratch.BlockType.REPORTER,
            text: '将列表 [LIST] 的第 [INDEX] 项设为 [VALUE]',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,3]' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '99' },
            },
          },
          {
            opcode: 'listRemove',
            blockType: Scratch.BlockType.REPORTER,
            text: '删除列表 [LIST] 中第一个 [ITEM]',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,1,3]' },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: '1' },
            },
          },
          {
            opcode: 'listRemoveAll',
            blockType: Scratch.BlockType.REPORTER,
            text: '删除列表 [LIST] 中所有 [ITEM]',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,1,3,1]' },
              ITEM: { type: Scratch.ArgumentType.STRING, defaultValue: '1' },
            },
          },
          {
            opcode: 'listPop',
            blockType: Scratch.BlockType.REPORTER,
            text: '弹出列表 [LIST] 的第 [INDEX] 项（默认末尾）并返回新列表',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,3]' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: -1 },
            },
          },
          {
            opcode: 'listReverse',
            blockType: Scratch.BlockType.REPORTER,
            text: '反转列表 [LIST]',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2,3]' },
            },
          },
          {
            opcode: 'listSort',
            blockType: Scratch.BlockType.REPORTER,
            text: '排序列表 [LIST] [ORDER]（升序/降序）',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '[3,1,2]' },
              ORDER: {
                type: Scratch.ArgumentType.STRING,
                menu: 'sortOrder',
                defaultValue: 'ascending',
              },
            },
          },
          '---',
          {
            opcode: 'listConcat',
            blockType: Scratch.BlockType.REPORTER,
            text: '连接列表 [LIST1] 和 [LIST2]',
            disableMonitor: true,
            arguments: {
              LIST1: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2]' },
              LIST2: { type: Scratch.ArgumentType.STRING, defaultValue: '[3,4]' },
            },
          },
          {
            opcode: 'listJoin',
            blockType: Scratch.BlockType.REPORTER,
            text: '用 [SEP] 连接列表 [LIST] 为字符串',
            disableMonitor: true,
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '["a","b","c"]' },
              SEP: { type: Scratch.ArgumentType.STRING, defaultValue: ',' },
            },
          },

          // ---------- 字典 (Dict) ----------
          '---',
          {
            opcode: 'dictEmpty',
            blockType: Scratch.BlockType.REPORTER,
            text: '{} 空字典',
            disableMonitor: true,
          },
          {
            opcode: 'dictFromKeysValues',
            blockType: Scratch.BlockType.REPORTER,
            text: '从键列表 [KEYS] 和值列表 [VALUES] 创建字典',
            disableMonitor: true,
            arguments: {
              KEYS: { type: Scratch.ArgumentType.STRING, defaultValue: '["a","b"]' },
              VALUES: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,2]' },
            },
          },
          {
            opcode: 'dictLength',
            blockType: Scratch.BlockType.REPORTER,
            text: '字典 [DICT] 的长度',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
            },
          },
          {
            opcode: 'dictGet',
            blockType: Scratch.BlockType.REPORTER,
            text: '字典 [DICT] 中键 [KEY] 对应的值（不存在返回空）',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'a' },
            },
          },
          {
            opcode: 'dictSet',
            blockType: Scratch.BlockType.REPORTER,
            text: '设置字典 [DICT] 中键 [KEY] 的值为 [VALUE]',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1}' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'b' },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '2' },
            },
          },
          {
            opcode: 'dictDelete',
            blockType: Scratch.BlockType.REPORTER,
            text: '删除字典 [DICT] 中的键 [KEY]',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'a' },
            },
          },
          {
            opcode: 'dictKeys',
            blockType: Scratch.BlockType.REPORTER,
            text: '字典 [DICT] 的所有键（列表）',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
            },
          },
          {
            opcode: 'dictValues',
            blockType: Scratch.BlockType.REPORTER,
            text: '字典 [DICT] 的所有值（列表）',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
            },
          },
          {
            opcode: 'dictItems',
            blockType: Scratch.BlockType.REPORTER,
            text: '字典 [DICT] 的所有项（列表，每项为 [键,值]）',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
            },
          },
          {
            opcode: 'dictContainsKey',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '字典 [DICT] 包含键 [KEY] ？',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1}' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'a' },
            },
          },
          {
            opcode: 'dictContainsValue',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '字典 [DICT] 包含值 [VALUE] ？',
            disableMonitor: true,
            arguments: {
              DICT: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1,"b":2}' },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '2' },
            },
          },
          {
            opcode: 'dictMerge',
            blockType: Scratch.BlockType.REPORTER,
            text: '合并字典 [DICT1] 和 [DICT2]（后者覆盖前者）',
            disableMonitor: true,
            arguments: {
              DICT1: { type: Scratch.ArgumentType.STRING, defaultValue: '{"a":1}' },
              DICT2: { type: Scratch.ArgumentType.STRING, defaultValue: '{"b":2}' },
            },
          },

          // ---------- 类型转换 ----------
          '---',
          {
            opcode: 'convertType',
            blockType: Scratch.BlockType.REPORTER,
            text: '转换 [VALUE] 为 [TYPE]',
            disableMonitor: true,
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '123' },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'typeConversion',
                defaultValue: 'number',
              },
            },
          },
        ],
        menus: {
          sortOrder: {
            items: [
              { text: '升序', value: 'ascending' },
              { text: '降序', value: 'descending' },
            ],
          },
          typeConversion: {
            acceptReporters: true,
            items: [
              { text: '布尔值', value: 'bool' },
              { text: '字符串', value: 'string' },
              { text: '整数', value: 'int' },
              { text: '浮点数', value: 'float' },
            ],
          },
        },
      };
    }

    // ---------- 列表实现 ----------
    listEmpty() { return '[]'; }

    listFromText({ TEXT, SEP }) {
      const parts = Cast.toString(TEXT).split(Cast.toString(SEP));
      return JSON.stringify(parts);
    }

    listLength({ LIST }) {
      const arr = safeParse(LIST);
      return Array.isArray(arr) ? arr.length : 0;
    }

    listGet({ LIST, INDEX }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '';
      const idx = Cast.toNumber(INDEX);
      if (idx === 0) return '';
      const pos = idx > 0 ? idx - 1 : arr.length + idx;
      if (pos < 0 || pos >= arr.length) return '';
      return toSerializable(arr[pos]);
    }

    listSlice({ LIST, START, END }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      let start = Cast.toNumber(START);
      let end = Cast.toNumber(END);
      const len = arr.length;
      const s = start > 0 ? start - 1 : start;
      const e = end > 0 ? end - 1 : end;
      const startIdx = s < 0 ? Math.max(0, len + s) : Math.min(len, s);
      const endIdx = e < 0 ? Math.max(0, len + e + 1) : Math.min(len, e + 1);
      return JSON.stringify(arr.slice(startIdx, endIdx));
    }

    listContains({ LIST, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return false;
      const val = Cast.toString(ITEM);
      return arr.some(v => Cast.toString(v) === val);
    }

    listIndexOf({ LIST, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return 0;
      const val = Cast.toString(ITEM);
      const idx = arr.findIndex(v => Cast.toString(v) === val);
      return idx >= 0 ? idx + 1 : 0;
    }

    listCount({ LIST, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return 0;
      const val = Cast.toString(ITEM);
      return arr.filter(v => Cast.toString(v) === val).length;
    }

    listAppend({ LIST, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      const newArr = arr.slice();
      newArr.push(Cast.toString(ITEM));
      return JSON.stringify(newArr);
    }

    listInsert({ LIST, INDEX, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      let idx = Cast.toNumber(INDEX);
      if (idx < 1) idx = 1;
      if (idx > arr.length + 1) idx = arr.length + 1;
      const newArr = arr.slice();
      newArr.splice(idx - 1, 0, Cast.toString(ITEM));
      return JSON.stringify(newArr);
    }

    listSet({ LIST, INDEX, VALUE }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      const idx = Cast.toNumber(INDEX);
      if (idx < 1 || idx > arr.length) return LIST;
      const newArr = arr.slice();
      newArr[idx - 1] = Cast.toString(VALUE);
      return JSON.stringify(newArr);
    }

    listRemove({ LIST, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      const val = Cast.toString(ITEM);
      const idx = arr.findIndex(v => Cast.toString(v) === val);
      if (idx === -1) return LIST;
      const newArr = arr.slice();
      newArr.splice(idx, 1);
      return JSON.stringify(newArr);
    }

    listRemoveAll({ LIST, ITEM }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      const val = Cast.toString(ITEM);
      const newArr = arr.filter(v => Cast.toString(v) !== val);
      return JSON.stringify(newArr);
    }

    listPop({ LIST, INDEX }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      let idx = Cast.toNumber(INDEX);
      if (idx === 0) idx = -1;
      if (idx > 0) idx = idx - 1;
      else if (idx < 0) idx = arr.length + idx;
      if (idx < 0 || idx >= arr.length) return LIST;
      const newArr = arr.slice();
      newArr.splice(idx, 1);
      return JSON.stringify(newArr);
    }

    listReverse({ LIST }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      return JSON.stringify(arr.slice().reverse());
    }

    listSort({ LIST, ORDER }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '[]';
      const sorted = arr.slice().sort(Cast.compare);
      if (ORDER === 'descending') sorted.reverse();
      return JSON.stringify(sorted);
    }

    listConcat({ LIST1, LIST2 }) {
      const a = safeParse(LIST1);
      const b = safeParse(LIST2);
      if (!Array.isArray(a) || !Array.isArray(b)) return '[]';
      return JSON.stringify(a.concat(b));
    }

    listJoin({ LIST, SEP }) {
      const arr = safeParse(LIST);
      if (!Array.isArray(arr)) return '';
      return arr.map(v => Cast.toString(v)).join(Cast.toString(SEP));
    }

    // ---------- 字典实现 ----------
    dictEmpty() { return '{}'; }

    dictFromKeysValues({ KEYS, VALUES }) {
      const keys = safeParse(KEYS);
      const vals = safeParse(VALUES);
      if (!Array.isArray(keys) || !Array.isArray(vals)) return '{}';
      const dict = {};
      const len = Math.min(keys.length, vals.length);
      for (let i = 0; i < len; i++) {
        dict[Cast.toString(keys[i])] = vals[i];
      }
      return JSON.stringify(dict);
    }

    dictLength({ DICT }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return 0;
      return Object.keys(obj).length;
    }

    dictGet({ DICT, KEY }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return '';
      const key = Cast.toString(KEY);
      return key in obj ? toSerializable(obj[key]) : '';
    }

    dictSet({ DICT, KEY, VALUE }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return '{}';
      const newObj = { ...obj };
      newObj[Cast.toString(KEY)] = Cast.toString(VALUE);
      return JSON.stringify(newObj);
    }

    dictDelete({ DICT, KEY }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return '{}';
      const key = Cast.toString(KEY);
      if (!(key in obj)) return DICT;
      const newObj = { ...obj };
      delete newObj[key];
      return JSON.stringify(newObj);
    }

    dictKeys({ DICT }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return '[]';
      return JSON.stringify(Object.keys(obj));
    }

    dictValues({ DICT }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return '[]';
      return JSON.stringify(Object.values(obj));
    }

    dictItems({ DICT }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return '[]';
      return JSON.stringify(Object.entries(obj));
    }

    dictContainsKey({ DICT, KEY }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
      return Cast.toString(KEY) in obj;
    }

    dictContainsValue({ DICT, VALUE }) {
      const obj = safeParse(DICT);
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
      const val = Cast.toString(VALUE);
      return Object.values(obj).some(v => Cast.toString(v) === val);
    }

    dictMerge({ DICT1, DICT2 }) {
      const a = safeParse(DICT1);
      const b = safeParse(DICT2);
      if (typeof a !== 'object' || a === null || Array.isArray(a)) return '{}';
      if (typeof b !== 'object' || b === null || Array.isArray(b)) return '{}';
      return JSON.stringify({ ...a, ...b });
    }

    // ---------- 类型转换 ----------
    convertType({ VALUE, TYPE }) {
      const val = Cast.toString(VALUE);
      switch (TYPE) {
        case 'bool': {
          const lower = val.trim().toLowerCase();
          if (lower === 'true' || lower === '1') return true;
          if (lower === 'false' || lower === '0') return false;
          // 其他：非空字符串为 true，空字符串为 false（类似 Python 的 bool()）
          return val.trim().length > 0;
        }
        case 'string':
          return val;
        case 'int': {
          const num = Cast.toNumber(val);
          if (Number.isNaN(num)) return 0;
          return Math.trunc(num);
        }
        case 'float': {
          const num = Cast.toNumber(val);
          if (Number.isNaN(num)) return 0;
          return num;
        }
        default:
          return val;
      }
    }
  }

  Scratch.extensions.register(new DataProcessing());
})(Scratch);