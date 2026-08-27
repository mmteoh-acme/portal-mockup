import type * as React from 'react'
import { ArrowLeftIcon, PaperclipIcon, XIcon } from 'lucide-react'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Heading for a money-movement request form — back link, then the standard
 * production page header. No icon beside the title: production h1s don't
 * carry one.
 */
export function FormPageHeader({
  onBack,
  backLabel = 'Back to Payments',
  title,
  description,
}: {
  onBack: () => void
  backLabel?: string
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> {backLabel}
      </button>
      <PageHeader>
        <PageHeaderTitle>{title}</PageHeaderTitle>
        {description && (
          <PageHeaderDescription>{description}</PageHeaderDescription>
        )}
      </PageHeader>
    </div>
  )
}

/**
 * Selectable card, one of a small set. The selected state uses the same
 * treatment shadcn's FieldLabel gives a checked option in production —
 * `border-primary/30 bg-primary/5` — rather than a bespoke ring.
 */
export function ModeOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean
  onSelect: () => void
  title: React.ReactNode
  description: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'rounded-lg border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary/30 bg-primary/5'
          : 'border-border hover:bg-muted/50',
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
    </button>
  )
}

/** File picker + attached-file list shared by the request forms. */
export function AttachmentPicker({
  files,
  onFiles,
  inputRef,
}: {
  files: File[]
  onFiles: React.Dispatch<React.SetStateAction<File[]>>
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const incoming = Array.from(e.target.files ?? [])
          onFiles((prev) => {
            const names = new Set(prev.map((f) => f.name))
            return [...prev, ...incoming.filter((f) => !names.has(f.name))]
          })
          e.target.value = ''
        }}
      />
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
            >
              <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {f.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() =>
                  onFiles((prev) => prev.filter((x) => x.name !== f.name))
                }
                className="ml-1 rounded p-0.5 hover:bg-muted"
                aria-label={`Remove ${f.name}`}
              >
                <XIcon className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        className="w-fit gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipIcon className="size-4" />
        Attach file
      </Button>
    </div>
  )
}

/** Footer note spelling out where the request goes once submitted. */
export function MakerCheckerPreview({
  requester,
  children,
}: {
  requester: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
      <div className="text-sm font-medium text-foreground">
        Maker-checker preview
      </div>
      <div className="mt-1">
        Submitted by <span className="text-foreground">{requester}</span> →
        awaiting approval from a checker. {children}
      </div>
    </div>
  )
}
