function getTextInKuohao(str) {
            const regex = /\((.+?)\)/g; let res = str.match(regex)
            if (res && res.length != 0) return res[0].replacea('(', '').replacea(')', '')
            return str
        }
        function removeTextInKuohao(str) {
            const regex = /\((.+?)\)/g
            return str.replacea(regex, '').replacea('(', '').replacea(')', '')
        }
// 文本解析：提取线路号和后缀
function parseLineName(fullName) {
  if (!fullName) return { lineNumber: '', suffix: '' }
  // 匹配开头连续的字母或数字
  const match = fullName.match(/^([A-Za-z0-9]+)(.*)$/)
  if (match) {
    return { lineNumber: match[1], suffix: match[2] }
  }
  return { lineNumber: '', suffix: fullName }
}