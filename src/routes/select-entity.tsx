import { useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, BuildingIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MonoLabel } from '@/components/mono'
import { useEntity } from '@/lib/entity-context'
import { entityAccounts, type Entity } from '@/data/fixtures'

export function SelectEntityPage() {
  const navigate = useNavigate()
  const { entities, setEntityId } = useEntity()

  const pick = (e: Entity) => {
    setEntityId(e.id)
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-foreground">
            A
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Acme External Portal
          </span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Select an entity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can switch entities at any time from the sidebar.
        </p>

        <div className="mt-8 grid gap-3">
          {entities.map((e) => {
            const accounts = entityAccounts(e)
            const isEmpty = accounts.length === 0
            return (
              <Card
                key={e.id}
                className={
                  'cursor-pointer transition hover:border-primary/40 hover:shadow-sm ' +
                  (isEmpty ? 'opacity-70' : '')
                }
                onClick={() => pick(e)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-md border bg-muted">
                    <BuildingIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{e.name}</div>
                    <div className="mt-1 flex items-center gap-3">
                      <MonoLabel>{e.location}</MonoLabel>
                      {isEmpty ? (
                        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-amber-700">
                          No accounts yet
                        </span>
                      ) : (
                        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                          {e.banks.length} bank{e.banks.length === 1 ? '' : 's'}
                          {' · '}
                          {accounts.length} account
                          {accounts.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="font-normal">
                    Open
                    <ArrowRightIcon />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
