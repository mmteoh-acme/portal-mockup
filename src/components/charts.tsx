import * as React from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Lightweight, dependency-free SVG charts themed with the app's chart tokens.
// All charts are responsive via viewBox + preserveAspectRatio.
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

// Compact axis labels: 20000000 -> "20M", 4500 -> "4.5K".
function compactTick(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`
  }
  if (v >= 10_000) {
    const k = v / 1_000
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`
  }
  return String(Math.round(v))
}

function niceMax(value: number): number {
  if (value <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const norm = value / pow
  let step
  if (norm <= 1) step = 1
  else if (norm <= 2) step = 2
  else if (norm <= 5) step = 5
  else step = 10
  return step * pow
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-[3px]"
            style={{ background: it.color }}
          />
          <span className="text-xs text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stacked vertical bar chart
// ---------------------------------------------------------------------------

export function StackedBarChart({
  data,
  series,
  height = 240,
  totalFormatter,
}: {
  data: { label: string; values: Record<string, number> }[]
  series: { key: string; label: string; color: string }[]
  height?: number
  /** When provided, renders the stack total above each bar. */
  totalFormatter?: (total: number) => string
}) {
  const W = 720
  const H = height
  const padL = 40
  const padR = 16
  const padT = totalFormatter ? 24 : 12
  const padB = 56

  const totals = data.map((d) =>
    series.reduce((s, ser) => s + (d.values[ser.key] ?? 0), 0),
  )
  const max = niceMax(Math.max(1, ...totals))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const bandW = plotW / data.length
  const barW = Math.min(64, bandW * 0.55)

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 'auto' }}
      role="img"
    >
      {/* gridlines + y labels */}
      {tickVals.map((tv, i) => {
        const y = padT + plotH - (tv / max) * plotH
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {compactTick(tv)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const cx = padL + bandW * i + bandW / 2
        const total = series.reduce((s, ser) => s + (d.values[ser.key] ?? 0), 0)
        let yCursor = padT + plotH
        const barTop = padT + plotH - (total / max) * plotH
        return (
          <g key={d.label}>
            {series.map((ser) => {
              const v = d.values[ser.key] ?? 0
              const h = (v / max) * plotH
              yCursor -= h
              return (
                <rect
                  key={ser.key}
                  x={cx - barW / 2}
                  y={yCursor}
                  width={barW}
                  height={Math.max(0, h)}
                  fill={ser.color}
                  rx={2}
                >
                  <title>{`${d.label} · ${ser.label}: ${v}`}</title>
                </rect>
              )
            })}
            {totalFormatter && total > 0 && (
              <text
                x={cx}
                y={barTop - 6}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {totalFormatter(total)}
              </text>
            )}
            <text
              x={cx}
              y={H - padB + 16}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 11 }}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Horizontal stacked bar chart — one row per item (e.g. API key), segments
// per series, total label on the left and the item name overlaid on the bar.
// ---------------------------------------------------------------------------

function compactCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`
  return String(n)
}

export function HStackedBarChart({
  data,
  series,
}: {
  data: { label: string; values: Record<string, number> }[]
  series: { key: string; label: string; color: string }[]
}) {
  const W = 720
  const rowH = 26
  const gap = 8
  const padL = 56
  const padR = 8
  const padY = 4
  const H = padY * 2 + data.length * (rowH + gap) - gap

  const totals = data.map((d) =>
    series.reduce((s, ser) => s + (d.values[ser.key] ?? 0), 0),
  )
  const max = Math.max(1, ...totals)
  const plotW = W - padL - padR

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img">
      {data.map((d, i) => {
        const y = padY + i * (rowH + gap)
        const total = totals[i]
        let xCursor = padL
        return (
          <g key={d.label}>
            <text
              x={padL - 8}
              y={y + rowH / 2 + 3.5}
              textAnchor="end"
              className="fill-foreground"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {compactCount(total)}
            </text>
            {series.map((ser) => {
              const v = d.values[ser.key] ?? 0
              if (v <= 0) return null
              const w = (v / max) * plotW
              const x = xCursor
              xCursor += w
              return (
                <rect
                  key={ser.key}
                  x={x}
                  y={y}
                  width={w}
                  height={rowH}
                  fill={ser.color}
                >
                  <title>{`${d.label} · ${ser.label}: ${v.toLocaleString()}`}</title>
                </rect>
              )
            })}
            <text
              x={padL + 8}
              y={y + rowH / 2 + 3.5}
              className="fill-foreground"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Simple vertical bar chart (single series), optional value labels
// ---------------------------------------------------------------------------

export function BarChart({
  data,
  height = 240,
  unit = '',
  color = 'var(--chart-2)',
}: {
  data: { label: string; value: number }[]
  height?: number
  unit?: string
  color?: string
}) {
  const W = 720
  const H = height
  const padL = 40
  const padR = 16
  const padT = 12
  const padB = 48

  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const bandW = plotW / data.length
  const barW = Math.min(56, bandW * 0.5)

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img">
      {tickVals.map((tv, i) => {
        const y = padT + plotH - (tv / max) * plotH
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {compactTick(tv)}
              {unit}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const cx = padL + bandW * i + bandW / 2
        const h = (d.value / max) * plotH
        const y = padT + plotH - h
        return (
          <g key={d.label}>
            <rect
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              fill={color}
              rx={2}
            >
              <title>{`${d.label}: ${d.value}${unit}`}</title>
            </rect>
            <text
              x={cx}
              y={y - 5}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {d.value}
              {unit}
            </text>
            <text
              x={cx}
              y={H - padB + 16}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 11 }}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Multi-series line chart with x labels
// ---------------------------------------------------------------------------

export function LineChart({
  xLabels,
  series,
  height = 260,
}: {
  xLabels: string[]
  series: { key: string; label: string; color: string; values: number[] }[]
  height?: number
}) {
  const W = 720
  const H = height
  const padL = 36
  const padR = 16
  const padT = 12
  const padB = 40

  const allVals = series.flatMap((s) => s.values)
  const max = niceMax(Math.max(1, ...allVals))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const n = xLabels.length
  const stepX = n > 1 ? plotW / (n - 1) : plotW

  const xAt = (i: number) => padL + stepX * i
  const yAt = (v: number) => padT + plotH - (v / max) * plotH

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i)

  // Show a subset of x labels if crowded
  const labelEvery = n > 10 ? Math.ceil(n / 8) : 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img">
      {tickVals.map((tv, i) => {
        const y = yAt(tv)
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {compactTick(tv)}
            </text>
          </g>
        )
      })}

      {xLabels.map((lbl, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={xAt(i)}
            y={H - padB + 16}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 10 }}
          >
            {lbl}
          </text>
        ) : null,
      )}

      {series.map((s) => {
        const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
        return (
          <g key={s.key}>
            <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(v)} r={2.5} fill={s.color}>
                <title>{`${s.label} · ${xLabels[i]}: ${v}`}</title>
              </circle>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export function ChartCardShell({
  title,
  legend,
  children,
  className,
}: {
  title: string
  legend?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {legend}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

export { CHART_COLORS }
