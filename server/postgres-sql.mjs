// Translate the small SQLite statement subset used by the existing domain layer.
// Values remain bound parameters; never interpolate payloads into SQL.
export function postgresSql(input) {
  let sql = input.trim().replace(/ORDER BY rowid DESC/gi, 'ORDER BY created_at DESC, id DESC');
  const ignore = /^INSERT OR IGNORE /i.test(sql);
  sql = sql.replace(/^INSERT OR IGNORE /i, 'INSERT ');
  if (/INSERT OR REPLACE|PRAGMA|sqlite_master/i.test(sql)) throw new Error('Unsupported PostgreSQL statement');
  let quoted = false, index = 0, result = '';
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      if (quoted && sql[i + 1] === "'") { result += "''"; i++; continue; }
      quoted = !quoted;
    }
    result += char === '?' && !quoted ? `$${++index}` : char;
  }
  if (ignore) result = result.replace(/;$/, '') + ' ON CONFLICT DO NOTHING';
  return result;
}
