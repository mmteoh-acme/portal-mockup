import type * as React from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * Sectioned surface used by the production dashboard for every grouped block
 * of fields (see the internal-account detail sheet in apps/dashboard): a
 * bordered card with a titled header rule and a padded body. Replaces the
 * uppercase mono section labels this mockup used to carry, so the payment
 * forms read the same as the real app.
 */
export function FormSection({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned control in the header rule (e.g. a button). */
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('rounded-lg border bg-card', className)}>
      <header className="flex items-start gap-4 border-b px-5 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn('px-5 py-4', contentClassName)}>{children}</div>
    </section>
  )
}

/** Two-column body grid, matching the detail sheets in production. */
export function FieldGrid({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('grid gap-x-6 gap-y-5 sm:grid-cols-2', className)}>
      {children}
    </div>
  )
}

/**
 * Read-only label/value pair. Same markup as the production `FieldRow`:
 * a Field wrapper, a FieldLabel, and a min-height value row so empty values
 * don't collapse the grid.
 */
export function FieldRow({
  label,
  value,
  mono,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  /** Render the value in the mono face — IDs, account numbers, references. */
  mono?: boolean
  className?: string
}) {
  const isEmpty = value == null || value === ''
  return (
    <Field className={cn('group', className)}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex min-h-6 items-center gap-1.5">
        {isEmpty ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <span className={mono ? 'font-mono text-sm break-all' : 'text-sm'}>
            {value}
          </span>
        )}
      </div>
    </Field>
  )
}

/** Editable field: label (with optional required marker), control, hint. */
export function FormField({
  label,
  required,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: React.ReactNode
  required?: boolean
  hint?: React.ReactNode
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={htmlFor}>
        {/* One flex child, so FieldLabel's gap doesn't open a space before the
            asterisk. Marker markup matches production's RequiredMark. */}
        <span>
          {label}
          {required && (
            <>
              <span aria-hidden className="text-destructive">
                {' *'}
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </span>
      </FieldLabel>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Field>
  )
}
