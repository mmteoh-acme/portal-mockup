import * as React from 'react'
import {
  DownloadIcon,
  FilterIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  Undo2Icon,
  RotateCcwIcon,
  UserRoundPlusIcon,
  WebhookIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LogInIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mono } from '@/components/mono'
import { useEntity } from '@/lib/entity-context'

type EventCategory =
  | 'REFUND'
  | 'RETRY'
  | 'APPROVAL'
  | 'USER'
  | 'API_KEY'
  | 'WEBHOOK'
  | 'AUTH'

type EventOutcome = 'SUCCESS' | 'REJECTED' | 'PENDING' | 'INFO'

type AuditEvent = {
  id: string
  timestamp: string
  category: EventCategory
  actor: string
  actorRole: string
  action: string
  target: string
  outcome: EventOutcome
  ip?: string
}

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt_001',
    timestamp: '1 Jun, 2026 · 14:32',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Approved refund',
    target: 'rf_KH2M9AXBECQ3 → txn_3FJH2K',
    outcome: 'SUCCESS',
    ip: '203.118.8.4',
  },
  {
    id: 'evt_002',
    timestamp: '1 Jun, 2026 · 14:28',
    category: 'REFUND',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted refund request',
    target: 'rf_KH2M9AXBECQ3 · Missing beneficiary details · SGD 1,200.00',
    outcome: 'PENDING',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_003',
    timestamp: '1 Jun, 2026 · 13:55',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Rejected retry',
    target: 'rty_3ABCD123 → pmt_failing_002 · Incorrect routing identifier',
    outcome: 'REJECTED',
    ip: '203.118.8.4',
  },
  {
    id: 'evt_004',
    timestamp: '1 Jun, 2026 · 13:40',
    category: 'RETRY',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted payment retry',
    target: 'rty_3ABCD123 → pmt_failing_002 · SGD 45,000.00',
    outcome: 'PENDING',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_005',
    timestamp: '31 May, 2026 · 11:20',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Approved retry',
    target: 'rty_9XYZ001 → pmt_failing_001 · SGD 12,500.00',
    outcome: 'SUCCESS',
    ip: '203.118.8.4',
  },
  {
    id: 'evt_006',
    timestamp: '31 May, 2026 · 11:02',
    category: 'RETRY',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted payment retry',
    target: 'rty_9XYZ001 → pmt_failing_001 · INSUFFICIENT_FUNDS',
    outcome: 'PENDING',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_007',
    timestamp: '30 May, 2026 · 16:45',
    category: 'USER',
    actor: 'Ming Miin',
    actorRole: 'ADMIN',
    action: 'Invited user',
    target: 'gary.tan@acmelabs.sg · Role: MAKER · Entity: Acme Labs',
    outcome: 'INFO',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_008',
    timestamp: '30 May, 2026 · 09:15',
    category: 'API_KEY',
    actor: 'Ming Miin',
    actorRole: 'ADMIN',
    action: 'Created API key',
    target: 'ak_prod_acme_labs · Production · Live mode',
    outcome: 'INFO',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_009',
    timestamp: '29 May, 2026 · 14:00',
    category: 'WEBHOOK',
    actor: 'Ming Miin',
    actorRole: 'ADMIN',
    action: 'Enabled webhook endpoint',
    target: 'https://api.acmelabs.sg/webhooks/acme · payment.completed',
    outcome: 'INFO',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_010',
    timestamp: '28 May, 2026 · 08:52',
    category: 'REFUND',
    actor: 'Alice Wong',
    actorRole: 'MAKER',
    action: 'Submitted refund request',
    target: 'rf_AW002 · Wrong amount · SGD 3,400.00 · doc uploaded: statement_may28.pdf',
    outcome: 'PENDING',
    ip: '203.118.8.9',
  },
  {
    id: 'evt_011',
    timestamp: '27 May, 2026 · 17:30',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Approved refund',
    target: 'rf_AW001 → txn_CK9PM1',
    outcome: 'SUCCESS',
    ip: '203.118.8.4',
  },
  {
    id: 'evt_012',
    timestamp: '27 May, 2026 · 09:11',
    category: 'AUTH',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Signed in',
    target: 'priya@tryacme.com',
    outcome: 'INFO',
    ip: '203.118.8.4',
  },
]

const CATEGORY_ICONS: Record<EventCategory, typeof DownloadIcon> = {
  REFUND: Undo2Icon,
  RETRY: RotateCcwIcon,
  APPROVAL: ShieldCheckIcon,
  USER: UserRoundPlusIcon,
  API_KEY: KeyRoundIcon,
  WEBHOOK: WebhookIcon,
  AUTH: LogInIcon,
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  REFUND: 'bg-violet-100 text-violet-700',
  RETRY: 'bg-blue-100 text-blue-700',
  APPROVAL: 'bg-emerald-100 text-emerald-700',
  USER: 'bg-orange-100 text-orange-700',
  API_KEY: 'bg-zinc-100 text-zinc-700',
  WEBHOOK: 'bg-zinc-100 text-zinc-700',
  AUTH: 'bg-zinc-100 text-zinc-700',
}

const OUTCOME_BADGE: Record<
  EventOutcome,
  { label: string; className: string }
> = {
  SUCCESS: {
    label: 'Success',
    className: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-zinc-300 bg-zinc-100 text-zinc-600',
  },
  PENDING: {
    label: 'Pending',
    className: 'border-amber-300 bg-amber-100 text-amber-700',
  },
  INFO: {
    label: 'Info',
    className: 'border-blue-200 bg-blue-50 text-blue-600',
  },
}

type CategoryFilter = 'all' | EventCategory

export function ActivityPage() {
  const { entity } = useEntity()
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>('all')

  if (!entity) return null

  const filtered =
    categoryFilter === 'all'
      ? AUDIT_EVENTS
      : AUDIT_EVENTS.filter((e) => e.category === categoryFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Activity log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full audit trail of all operator actions for{' '}
            <span className="font-medium text-foreground">{entity.name}</span>.
            Immutable — share with auditors directly or export as CSV.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <DownloadIcon className="size-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <FilterIcon className="size-3.5 text-muted-foreground" />
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <SelectTrigger size="sm" className="h-8 w-44 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="REFUND">Refunds</SelectItem>
            <SelectItem value="RETRY">Retries</SelectItem>
            <SelectItem value="APPROVAL">Approvals</SelectItem>
            <SelectItem value="USER">User management</SelectItem>
            <SelectItem value="API_KEY">API keys</SelectItem>
            <SelectItem value="WEBHOOK">Webhooks</SelectItem>
            <SelectItem value="AUTH">Authentication</SelectItem>
          </SelectContent>
        </Select>
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((evt) => {
              const Icon = CATEGORY_ICONS[evt.category]
              const outcome = OUTCOME_BADGE[evt.outcome]
              return (
                <div
                  key={evt.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${CATEGORY_COLORS[evt.category]}`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium">{evt.action}</span>
                      <OutcomePill className={outcome.className}>
                        {outcome.label === 'Success' ? (
                          <CheckCircle2Icon className="size-3" />
                        ) : outcome.label === 'Rejected' ? (
                          <XCircleIcon className="size-3" />
                        ) : null}
                        {outcome.label}
                      </OutcomePill>
                    </div>
                    <div className="truncate font-mono text-[0.7rem] text-muted-foreground">
                      {evt.target}
                    </div>
                    <div className="flex items-center gap-3 pt-0.5">
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {evt.actor}
                        </span>{' '}
                        ·{' '}
                        <span className="font-mono text-[0.65rem] uppercase tracking-wider">
                          {evt.actorRole}
                        </span>
                      </span>
                      {evt.ip && (
                        <Mono className="text-[0.65rem] text-muted-foreground/70">
                          {evt.ip}
                        </Mono>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-[0.65rem] text-muted-foreground whitespace-nowrap">
                    {evt.timestamp}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OutcomePill({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  )
}
