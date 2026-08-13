import * as React from 'react'
import { ChevronRightIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CopyButton } from '@/components/copy-button'

// The description-list used by the Transactions and Payments detail sheets.
//
// Follows the shadcn description-list pattern, tightened from its py-6/text-base
// to suit a side sheet carrying ~20 fields rather than a four-row marketing list.

// A description-list row: label in the first column, value in the remaining
// two. `stacked` drops the grid and puts the value under the label, for blocks
// that need the full width — raw payloads, reference tables, the timeline.
export function Field({
  label,
  children,
  stacked,
}: {
  label: string
  children: React.ReactNode
  stacked?: boolean
}) {
  if (stacked) {
    return (
      <div className="space-y-2 py-3">
        <dt className="text-sm font-medium">{label}</dt>
        <dd>{children}</dd>
      </div>
    )
  }
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="mt-1 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  )
}

export function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-foreground/70">
        {title}
      </h3>
      <dl className="mt-2 divide-y border-t">{children}</dl>
    </div>
  )
}

// Raw payloads are long and rarely the reason someone opened this sheet, so
// they start collapsed with a copy button — the common action is "give me this
// to paste into a support ticket", not "read it here".
export function CodeBlockField({
  label,
  code,
}: {
  label: string
  code: string
}) {
  const [open, setOpen] = React.useState(false)
  const lineCount = code.split('\n').length

  return (
    <div className="space-y-2 py-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-sm font-medium">
            <CollapsibleTrigger className="inline-flex items-center gap-1.5 hover:text-foreground/70">
              <ChevronRightIcon
                className={`size-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
              />
              {label}
              <span className="text-[0.7rem] font-normal text-muted-foreground">
                {lineCount} lines
              </span>
            </CollapsibleTrigger>
          </dt>
          <CopyButton value={code} />
        </div>
        <dd>
          <CollapsibleContent>
            <pre className="mt-2 max-h-96 overflow-auto rounded border bg-muted/30 p-3 font-mono text-[0.7rem] leading-relaxed text-foreground/90">
              {code}
            </pre>
          </CollapsibleContent>
        </dd>
      </Collapsible>
    </div>
  )
}
