import * as React from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Copies text to the clipboard and confirms in place — a tick for two seconds
// rather than a toast, since these sit next to code blocks a user may copy
// several of in a row.
export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Clipboard access can be denied (insecure context, permissions). Fall
      // back to a selection the user can copy by hand.
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-6 gap-1 px-1.5 text-[0.7rem]', className)}
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? (
        <CheckIcon className="size-3 text-emerald-600" />
      ) : (
        <CopyIcon className="size-3" />
      )}
      {copied ? 'Copied' : label}
    </Button>
  )
}
