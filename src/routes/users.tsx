import { UserRoundPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useEntity } from '@/lib/entity-context'

export function UsersPage() {
  const { entity } = useEntity()
  if (!entity) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage team members and roles for{' '}
          <span className="font-medium text-foreground">{entity.name}</span>.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <UserRoundPlusIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No users yet</p>
            <p className="text-xs text-muted-foreground">
              Invite team members to give them access to this entity.
            </p>
          </div>
          <Button size="sm">Invite user</Button>
        </CardContent>
      </Card>
    </div>
  )
}
