import * as React from 'react'
import { PlusIcon, LockIcon, XIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HStackedBarChart, ChartLegend } from '@/components/charts'
import {
  API_USAGE_PATHS,
  apiKeyUsage,
  apiKeys,
  type ApiKey,
} from '@/data/fixtures'

// Canonical-path colors for the API volume chart.
const PATH_COLORS = [
  'var(--chart-3)', // get:/transactions
  '#c084fc', // get:/payments/:id
  '#f87171', // post:/payments
  '#fb923c', // post:/payments/:id/approve
  '#facc15', // post:/accounts/:id/balance
  'var(--chart-2)', // get:/internal-accounts
]

// API key usage by canonical path — key names match the table above.
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

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const hour12 = ((d.getHours() + 11) % 12) + 1
  const minute = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${month} ${day}, ${year} at ${String(hour12).padStart(2, '0')}:${minute} ${ampm}`
}

function maskKeyShort(key: string): string {
  // 'sk_live_WtVVg4*******************************DCg2' → 'sk_live_WtVVg4******…DCg2'
  const lastFour = key.slice(-4)
  const prefix = key.match(/^sk_(live|test)_[A-Za-z0-9]{6}/)?.[0] ?? key.slice(0, 12)
  return `${prefix}******…${lastFour}`
}

function ModePill({ mode }: { mode: 'LIVE' | 'TEST' }) {
  const cls =
    mode === 'LIVE'
      ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
      : 'bg-amber-100 text-amber-700 ring-amber-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {mode}
    </span>
  )
}

function EnabledPill({ enabled }: { enabled: boolean }) {
  const cls = enabled
    ? 'bg-sky-100 text-sky-700 ring-sky-200'
    : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset ${cls}`}
    >
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  )
}

function AuthorityChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border bg-card px-2 py-1 text-xs text-foreground">
      {children}
    </span>
  )
}

function AccessSummary({ access }: { access: ApiKey['access'] }) {
  const flat = access.flatMap((g) => g.authorities)
  const head = flat.slice(0, 3)
  const overflow = flat.length - head.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {head.map((a) => (
        <AuthorityChip key={a}>{a}</AuthorityChip>
      ))}
      {overflow > 0 && (
        <span className="rounded-md border bg-muted px-2 py-1 font-mono text-[0.7rem] text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
          <LockIcon className="size-3" /> Read-only
        </span>
      </div>
      <Input value={value} readOnly className="bg-muted/40 font-mono text-sm" />
    </div>
  )
}

function ApiKeyDetailSheet({
  apiKey,
  onClose,
}: {
  apiKey: ApiKey | null
  onClose: () => void
}) {
  return (
    <Sheet open={!!apiKey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        {apiKey && (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <SheetTitle className="text-lg font-semibold">
                  {apiKey.name}
                </SheetTitle>
                <div className="flex items-center gap-1.5">
                  <ModePill mode={apiKey.mode} />
                  <EnabledPill enabled={apiKey.enabled} />
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-8 px-6 py-6">
              <section className="space-y-4">
                <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Key details
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <ReadOnlyField label="Mode" value={apiKey.mode} />
                  <ReadOnlyField label="Key" value={apiKey.key} />
                  <div className="col-span-2">
                    <ReadOnlyField label="Name" value={apiKey.name} />
                  </div>
                  <ReadOnlyField
                    label="Last used"
                    value={formatDateTime(apiKey.lastUsed)}
                  />
                  <ReadOnlyField
                    label="Updated At"
                    value={formatDateTime(apiKey.updatedAt)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Access
                </div>
                <p className="text-xs text-muted-foreground">
                  Read-only: authority names on this key from the server, shown
                  by product group.
                </p>
                <div className="space-y-4">
                  {apiKey.access.map((g) => (
                    <div key={g.group} className="space-y-2">
                      <div className="text-sm font-medium">{g.group}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.authorities.map((a) => (
                          <AuthorityChip key={a}>{a}</AuthorityChip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="border-t px-6 py-4 text-right">
              <Button variant="outline" onClick={onClose}>
                <XIcon className="size-3.5" /> Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function ApiKeysPage() {
  const [openKey, setOpenKey] = React.useState<ApiKey | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage machine-to-machine API keys for your organization. At most 15
            keys per organization.
          </p>
        </div>
        <Button>
          <PlusIcon className="size-4" /> Create API Key
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((k) => (
                <TableRow
                  key={k.id}
                  className="cursor-pointer"
                  onClick={() => setOpenKey(k)}
                >
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {maskKeyShort(k.key)}
                  </TableCell>
                  <TableCell>
                    <ModePill mode={k.mode} />
                  </TableCell>
                  <TableCell>
                    <EnabledPill enabled={k.enabled} />
                  </TableCell>
                  <TableCell>
                    <AccessSummary access={k.access} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(k.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApiVolumeCard />

      <ApiKeyDetailSheet apiKey={openKey} onClose={() => setOpenKey(null)} />
    </div>
  )
}
