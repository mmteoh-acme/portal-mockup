import type * as React from 'react'
import { CardAction, CardDescription, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Page heading block — same composition as the production dashboard
 * (apps/dashboard/src/components/page-header.tsx): the grid and the action
 * column come from stock CardHeader and CardAction, `px-0` drops the Card
 * surface padding since a page heading has no card around it.
 *
 * Only the title is ours: CardTitle renders a `div`, and a page needs an `h1`.
 */
function PageHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn('gap-1.5 px-0', className)} {...props} />
}

function PageHeaderTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="page-header-title"
      className={cn('min-w-0 text-2xl font-bold tracking-tight', className)}
      {...props}
    />
  )
}

export {
  PageHeader,
  PageHeaderTitle,
  CardAction as PageHeaderAction,
  CardDescription as PageHeaderDescription,
}
