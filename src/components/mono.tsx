import { cn } from '@/lib/utils'

export function Mono({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  // Production renders IDs, references and bank rails as plain mono text
  // rather than a chip (see the internal-accounts and api-keys tables in
  // apps/dashboard) — matching that keeps dense tables reading the same.
  return (
    <code className={cn('font-mono text-[0.8rem] break-all', className)}>
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
      // Production labels metadata in sentence-case sans, not mono caps.
      className={cn('text-sm font-medium text-muted-foreground', className)}
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
      // Badge geometry from the production shadcn Badge — h-5, pill radius,
      // text-xs, no letterspacing. The semantic tones are this mockup's
      // extension of it, since production only ships default/secondary.
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
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
