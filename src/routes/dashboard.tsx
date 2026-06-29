import { LandmarkIcon, PlusIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { MonoLabel, StatusPill } from '@/components/mono'
import {
  BarChart,
  StackedBarChart,
  LineChart,
  ChartLegend,
  ChartCardShell,
} from '@/components/charts'
import { useEntity } from '@/lib/entity-context'
import {
  entityAccounts,
  entityKpis,
  paymentAnalytics,
  successRateByType,
} from '@/data/fixtures'

const COLOR_API = 'var(--chart-3)'
const COLOR_BATCH = 'var(--chart-2)'
const COLOR_COMPLETED = 'var(--chart-2)'
const COLOR_PENDING = 'var(--chart-4)'
const COLOR_FAILED = 'var(--chart-1)'

export function DashboardPage() {
  const { entity } = useEntity()
  if (!entity) return null

  const accounts = entityAccounts(entity)
  const isEmpty = accounts.length === 0
  const kpis = entityKpis(entity)
  const analytics = paymentAnalytics()
  const rateByType = successRateByType()

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
          {/* KPI cards */}
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
                    <span className="text-xs text-emerald-700">
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

          {/* Payment volume over time */}
          <ChartCardShell
            title="Payment volume over time"
            legend={
              <ChartLegend
                items={[
                  { label: 'Completed', color: COLOR_COMPLETED },
                  { label: 'Pending', color: COLOR_PENDING },
                  { label: 'Failed', color: COLOR_FAILED },
                ]}
              />
            }
          >
            <LineChart
              xLabels={analytics.byMonth.map((m) => m.label)}
              series={[
                {
                  key: 'completed',
                  label: 'Completed',
                  color: COLOR_COMPLETED,
                  values: analytics.byMonth.map((m) => m.completed),
                },
                {
                  key: 'pending',
                  label: 'Pending',
                  color: COLOR_PENDING,
                  values: analytics.byMonth.map((m) => m.pending),
                },
                {
                  key: 'failed',
                  label: 'Failed',
                  color: COLOR_FAILED,
                  values: analytics.byMonth.map((m) => m.failed),
                },
              ]}
            />
          </ChartCardShell>

          {/* Volume by bank + success rate by type */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCardShell
              title="Total payment volume by bank"
              legend={
                <ChartLegend
                  items={[
                    { label: 'Via API', color: COLOR_API },
                    { label: 'Via Batch', color: COLOR_BATCH },
                  ]}
                />
              }
            >
              <StackedBarChart
                data={analytics.byBank.map((b) => ({
                  label: b.bank,
                  values: { api: b.api, batch: b.batch },
                }))}
                series={[
                  { key: 'api', label: 'Via API', color: COLOR_API },
                  { key: 'batch', label: 'Via Batch', color: COLOR_BATCH },
                ]}
              />
            </ChartCardShell>

            <ChartCardShell title="Success rate by payment type">
              <BarChart
                data={rateByType.map((t) => ({
                  label: t.type,
                  value: t.successRate,
                }))}
                unit="%"
                color="var(--chart-2)"
              />
            </ChartCardShell>
          </div>

          {/* Services & success rates table */}
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">
                Services &amp; success rates
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Payment outcomes broken down by type and channel.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Payment type
                    </TableHead>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Channel
                    </TableHead>
                    <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                      Total
                    </TableHead>
                    <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                      Completed
                    </TableHead>
                    <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                      Failed
                    </TableHead>
                    <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                      Pending
                    </TableHead>
                    <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                      Success rate
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.byType.map((t) => (
                    <TableRow key={`${t.type}-${t.channel}`}>
                      <TableCell className="font-medium">{t.type}</TableCell>
                      <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">
                        {t.channel}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.total}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {t.completed}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600">
                        {t.failed}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {t.pending}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {t.successRate}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Failure reasons table */}
          {analytics.failureReasons.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Failure reasons</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Top error reasons across failed payments.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Payment type
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Bank
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Error reason
                      </TableHead>
                      <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                        Count
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.failureReasons.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{f.type}</TableCell>
                        <TableCell>
                          <StatusPill
                            status={f.bank}
                            className="border-zinc-300 bg-zinc-100 text-zinc-700"
                          />
                        </TableCell>
                        <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                          {f.reason}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
