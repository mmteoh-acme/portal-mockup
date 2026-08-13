import type { DateRange } from 'react-day-picker'

// Shared helpers for the data tables. Kept out of the component files so the
// dev server can still hot-reload those.

export const SELECT_ALL_STATE = (
  all: boolean,
  some: boolean,
): boolean | 'indeterminate' => (all ? true : some ? 'indeterminate' : false)

// Page numbers with ellipsis gaps: first, last, and a window around the
// current page — 1 … 4 5 6 … 12.
export function pageNumbers(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('ellipsis')
    out.push(p)
    prev = p
  }
  return out
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

// Parse the display dates the fixtures carry: "1 Jun, 2026" on transactions and
// "17 May, 2026, 02:04" on payments. Only the date part is read.
export function parseDisplayDate(raw: string): Date | null {
  if (!raw) return null
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\w*,\s+(\d{4})/)
  if (!m) return null
  const month = MONTHS[m[2]]
  if (month === undefined) return null
  return new Date(Number(m[3]), month, Number(m[1]))
}

// Display date → ISO "2026-06-01", for sorting and for API payloads.
export function isoDisplayDate(raw: string): string {
  const d = parseDisplayDate(raw)
  if (!d) return raw
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Date range'
  const from = range.from
  const to = range.to ?? range.from
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (fmt(from) === fmt(to)) return fmt(from)
  return `${fmt(from)} → ${fmt(to)}`
}

// Column filter for a display-date string against a picked range. Rows whose
// date can't be parsed stay in rather than silently disappearing.
export function dateInRange(
  dateStr: string,
  range: DateRange | undefined,
): boolean {
  if (!range?.from) return true
  const d = parseDisplayDate(dateStr)
  if (!d) return true
  d.setHours(0, 0, 0, 0)
  const from = new Date(range.from)
  from.setHours(0, 0, 0, 0)
  const to = range.to ? new Date(range.to) : new Date(range.from)
  to.setHours(23, 59, 59, 999)
  return d >= from && d <= to
}
