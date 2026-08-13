// CSV export shared by the data tables. Every field is quoted so embedded
// commas, quotes and newlines survive a round trip through Excel.

export function csvEscape(v: string | number | undefined | null): string {
  const s = (v ?? '').toString()
  return `"${s.replace(/"/g, '""')}"`
}

export function downloadCsv(
  filename: string,
  headers: readonly string[],
  rows: (string | number | undefined | null)[][],
): void {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) lines.push(row.map(csvEscape).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// "transactions" + "Acme Group" -> "transactions-acme-group-20260601.csv"
export function csvFilename(prefix: string, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${prefix}-${slug}-${y}${m}${d}.csv`
}
