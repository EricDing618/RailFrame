function getColorBrightness(hexColor) {
    let hex = hexColor.replace('#', '')
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    const r = parseInt(hex.substring(0, 2), 16) / 255, g = parseInt(hex.substring(2, 4), 16) / 255, b = parseInt(hex.substring(4, 6), 16) / 255
    return 0.299 * r + 0.587 * g + 0.114 * b
}
function txtBlack(hexColor) { return getColorBrightness(hexColor) > 1-0.32 ? '#000000' : '#ffffff' }
function rdmc() {
    // 生成 0-255 之间的随机整数
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    // 转换为十六进制并补齐两位
    const toHex = (num) => num.toString(16).padStart(2, '0');

    // 返回十六进制颜色代码
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hexToRgba(hex, alpha = 1) {
  if (!hex || hex === 'none') return `rgba(0,0,0,0)`;
  if (hex.startsWith('#')) {
    let h = hex.slice(1);
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    const r = parseInt(h.slice(0,2), 16);
    const g = parseInt(h.slice(2,4), 16);
    const b = parseInt(h.slice(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // 如果已经是 rgba 格式或颜色名，直接返回（简化）
  return hex;
}
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    return {
        r: parseInt(hex.substr(0,2),16),
        g: parseInt(hex.substr(2,2),16),
        b: parseInt(hex.substr(4,2),16)
    };
}
// 使用示例