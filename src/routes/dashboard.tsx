import * as React from 'react'
import { LandmarkIcon, PlusIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  HStackedBarChart,
  LineChart,
  ChartLegend,
  ChartCardShell,
} from '@/components/charts'
import { useEntity } from '@/lib/entity-context'
import {
  API_USAGE_PATHS,
  apiKeyUsage,
  entityAccounts,
  entityBalanceHistory,
  entityBalancesByCurrency,
  entityKpis,
  formatCompactMoney,
  formatMoney,
  paymentAnalytics,
  successRateByType,
  type Entity,
} from '@/data/fixtures'

const COLOR_API = 'var(--chart-3)'
const COLOR_BATCH = 'var(--chart-2)'
const COLOR_COMPLETED = 'var(--chart-2)'
const COLOR_PENDING = 'var(--chart-4)'
const COLOR_FAILED = 'var(--chart-1)'

const BANK_COLORS = [
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const BALANCES_AS_OF = 'Jun 1, 2026, 09:00 AM SGT'

// Canonical-path colors for the API volume chart.
const PATH_COLORS = [
  'var(--chart-3)', // get:/transactions
  '#c084fc', // get:/payments/:id
  '#f87171', // post:/payments
  '#fb923c', // post:/payments/:id/approve
  '#facc15', // post:/accounts/:id/balance
  'var(--chart-2)', // get:/internal-accounts
]

// API key usage by canonical path — same card format as the Balances chart.
function ApiVolumeCard() {
  const [range, setRange] = React.useState<'10d' | '1m'>('10d')
  const rows = React.useMemo(() => apiKeyUsage(range), [range])
  const series = API_USAGE_PATHS.map((p, i) => ({
    key: p,
    label: p,
    color: PATH_COLORS[i % PATH_COLORS.length],
  }))

  return (
    <Card className="py-0">
      <CardContent className="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">API volume</h2>
            <p className="text-xs text-muted-foreground">
              API key usage by service (canonical path)
            </p>
          </div>
          <Select
            value={range}
            onValueChange={(v) => setRange(v as '10d' | '1m')}
          >
            <SelectTrigger size="sm" className="h-8 font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10d">Past 10 Days</SelectItem>
              <SelectItem value="1m">Past 1 Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <HStackedBarChart
            data={rows.map((r) => ({ label: r.key, values: r.counts }))}
            series={series}
          />
        </div>
        <div className="mt-3">
          <ChartLegend
            items={series.map((s) => ({ label: s.label, color: s.color }))}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Balance Stats + daily Balances chart, grouped by currency and bank.
// `sideChart` renders next to the Balances chart in a 2-up grid.
function BalancesModule({
  entity,
  sideChart,
}: {
  entity: Entity
  sideChart?: React.ReactNode
}) {
  const groups = React.useMemo(() => entityBalancesByCurrency(entity), [entity])
  const history = React.useMemo(() => entityBalanceHistory(entity), [entity])
  const [currency, setCurrency] = React.useState(
    () => groups[0]?.currency ?? 'SGD',
  )
  const [bankFilter, setBankFilter] = React.useState('all')
  const [balanceType, setBalanceType] = React.useState<'available' | 'ledger'>(
    'available',
  )
  // As-of balances are fetched on demand — the balances API is billed per
  // call, so refresh is an explicit user action rather than a poll.
  const [asOf, setAsOf] = React.useState(BALANCES_AS_OF)
  const [refreshing, setRefreshing] = React.useState(false)

  const refreshBalances = () => {
    if (refreshing) return
    setRefreshing(true)
    window.setTimeout(() => {
      const now = new Date()
      const formatted = `${now.toLocaleString('en-SG', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })} SGT`
      setAsOf(formatted)
      setRefreshing(false)
      toast.success('Balances refreshed', {
        description: 'Retrieved the latest as-of balances from the bank.',
      })
    }, 900)
  }

  const group = groups.find((g) => g.currency === currency) ?? groups[0]
  const hist = history.find((h) => h.currency === currency) ?? history[0]
  if (!group || !hist) return null

  const bankNames = hist.bankNames
  const visibleBanks =
    bankFilter === 'all'
      ? bankNames
      : bankNames.filter((b) => b === bankFilter)
  const series = visibleBanks.map((b) => ({
    key: b,
    label: b,
    color: BANK_COLORS[bankNames.indexOf(b) % BANK_COLORS.length],
  }))
  const chartData = hist.days.map((d) => {
    const source = balanceType === 'ledger' ? d.perBankLedger : d.perBank
    return {
      label: d.label,
      values: Object.fromEntries(
        visibleBanks.map((b) => [b, source[b] ?? 0]),
      ),
    }
  })

  const currencySelect = (
    <Select
      value={currency}
      onValueChange={(v) => {
        setCurrency(v)
        setBankFilter('all')
      }}
    >
      <SelectTrigger size="sm" className="h-8 w-24 font-normal">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.currency} value={g.currency}>
            {g.currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <>
      {/* Balance Stats */}
      <Card className="py-0">
        <CardContent className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Balance Stats</h2>
              <p className="text-xs text-muted-foreground">As of: {asOf}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={refreshBalances}
                disabled={refreshing}
                title="Retrieves live as-of balances. The balances API is billed per call, so refresh on demand."
              >
                <RefreshCwIcon
                  className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
              {currencySelect}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Available balance
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {formatMoney(group.currency, group.available)}
              </div>
            </div>
            <div className="sm:border-l sm:pl-6">
              <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Prior-day balance
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {formatMoney(group.currency, group.priorDay)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balances chart — side by side with the companion chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardContent className="px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Balances</h2>
                <p className="text-xs text-muted-foreground">As of: {asOf}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={balanceType}
                  onValueChange={(v) =>
                    setBalanceType(v as 'available' | 'ledger')
                  }
                >
                  <SelectTrigger size="sm" className="h-8 font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Closing Available</SelectItem>
                    <SelectItem value="ledger">Closing Ledger</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bankFilter} onValueChange={setBankFilter}>
                  <SelectTrigger size="sm" className="h-8 font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All banks</SelectItem>
                    {bankNames.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value="past10" onValueChange={() => {}}>
                  <SelectTrigger size="sm" className="h-8 font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past10">Past 10 Days</SelectItem>
                  </SelectContent>
                </Select>
                {currencySelect}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <StackedBarChart
                data={chartData}
                series={series}
                height={280}
                totalFormatter={(total) =>
                  formatCompactMoney(group.currency, total)
                }
              />
            </div>
            <div className="mt-2">
              <ChartLegend
                items={bankNames.map((b) => ({
                  label: b,
                  color: BANK_COLORS[bankNames.indexOf(b) % BANK_COLORS.length],
                }))}
              />
            </div>
          </CardContent>
        </Card>
        {sideChart}
      </div>
    </>
  )
}

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
          <div className="grid gap-4 md:grid-cols-3">
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

          {/* Balances (stats + chart) with payment volume alongside */}
          <BalancesModule
            entity={entity}
            sideChart={
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
                  height={360}
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
            }
          />

          {/* API volume by key and canonical path */}
          <ApiVolumeCard />

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
