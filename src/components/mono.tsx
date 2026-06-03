import { cn } from '@/lib/utils'

export function Mono({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <code
      className={cn(
        'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.78rem] text-foreground/90',
        className,
      )}
    >
      {children}
    </code>
  )
}

export function MonoLabel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusPill({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const tone = pillTone(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider',
        tone,
        className,
      )}
    >
      {status}
    </span>
  )
}

function pillTone(status: string) {
  const s = status.toLowerCase()
  if (s.includes('complet') || s.includes('healthy') || s.includes('active'))
    return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  if (s.includes('pending') || s.includes('awaiting') || s.includes('degraded'))
    return 'border-amber-300 bg-amber-50 text-amber-700'
  if (s.includes('fail') || s.includes('timed') || s.includes('frozen'))
    return 'border-red-300 bg-red-50 text-red-700'
  if (s.includes('revers')) return 'border-zinc-300 bg-zinc-100 text-zinc-700'
  return 'border-zinc-300 bg-zinc-100 text-zinc-700'
}
