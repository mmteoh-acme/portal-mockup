import { ActivityIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useEntity } from '@/lib/entity-context'

export function ActivityPage() {
  const { entity } = useEntity()
  if (!entity) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maker-checker actions, retriggers, refunds, API key changes, and other
          audit events for{' '}
          <span className="font-medium text-foreground">{entity.name}</span>.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <ActivityIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Activity feed coming soon</p>
            <p className="text-xs text-muted-foreground">
              Columns and filters to be defined.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
