import { LandmarkIcon, PlusIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MonoLabel } from '@/components/mono'
import { useEntity } from '@/lib/entity-context'
import { entityAccounts, entityKpis } from '@/data/fixtures'

export function DashboardPage() {
  const { entity } = useEntity()
  if (!entity) return null

  const accounts = entityAccounts(entity)
  const isEmpty = accounts.length === 0
  const kpis = entityKpis(entity)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, Ming
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operations snapshot for{' '}
          <span className="font-medium text-foreground">{entity.name}</span>.
        </p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-full border bg-muted">
              <LandmarkIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-medium">
                Connect a bank to start seeing activity
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {entity.name} has no accounts yet, so there's no balance,
                transaction, or approval activity to show.
              </p>
            </div>
            <Button>
              <PlusIcon /> Connect a bank
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader>
                  <CardDescription>
                    <MonoLabel>{kpi.label}</MonoLabel>
                  </CardDescription>
                  <CardTitle className="text-3xl font-semibold tabular-nums">
                    {kpi.value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-emerald-700">
                      {kpi.delta}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {kpi.sub}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </>
      )}
    </div>
  )
}
