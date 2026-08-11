// Display formatters shared across the admin pages.

// ISO timestamp → "Aug 11, 2026". Falls back to the raw string when it isn't a
// date the runtime can parse, so fixture oddities stay visible.
export function formatWhen(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${month} ${d.getDate()}, ${d.getFullYear()}`
}
