import fs from 'node:fs'

// Reads phpMyAdmin/MariaDB INSERT statements as data. It never executes dump SQL.
export function readLegacyDump(path, wantedTables = null) {
  const sql = fs.readFileSync(path, 'utf8')
  const tables = new Map()
  const headers = /INSERT INTO `([^`]+)` \(([^\n]+)\) VALUES\s*/g
  let match
  while ((match = headers.exec(sql))) {
    const name = match[1]
    const columns = [...match[2].matchAll(/`([^`]+)`/g)].map((m) => m[1])
    let position = headers.lastIndex
    const selected = !wantedTables || wantedTables.has(name)
    const rows = selected ? (tables.get(name) ?? []) : null

    while (position < sql.length) {
      while (/\s|,/.test(sql[position])) position++
      if (sql[position] === ';') { position++; break }
      if (sql[position] !== '(') throw new Error(`Expected tuple for ${name} at ${position}`)
      position++
      const values = []
      let token = ''
      let quoted = false
      let escaped = false
      while (position < sql.length) {
        const ch = sql[position++]
        if (escaped) { token += '\\' + ch; escaped = false; continue }
        if (quoted && ch === '\\') { escaped = true; continue }
        if (ch === "'") { quoted = !quoted; token += ch; continue }
        if (!quoted && (ch === ',' || ch === ')')) {
          values.push(decodeValue(token.trim()))
          token = ''
          if (ch === ')') break
          continue
        }
        token += ch
      }
      if (quoted || values.length !== columns.length) {
        throw new Error(`Invalid ${name} tuple: ${values.length} values for ${columns.length} columns`)
      }
      if (selected) rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])))
    }
    if (selected) tables.set(name, rows)
    headers.lastIndex = position
  }
  return tables
}

function decodeValue(value) {
  if (value === 'NULL') return null
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\([0nrtbZ'"\\])/g, (_, escaped) => ({
      0: '\0', n: '\n', r: '\r', t: '\t', b: '\b', Z: '\x1a', "'": "'", '"': '"', '\\': '\\',
    })[escaped])
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : value
}
