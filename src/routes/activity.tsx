import * as React from 'react'
import {
  DownloadIcon,
  SearchIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  Undo2Icon,
  RotateCcwIcon,
  UserRoundPlusIcon,
  WebhookIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LogInIcon,
  ChevronDownIcon,
  LightbulbIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  requestId: string
  timestamp: string
  category: EventCategory
  actor: string
  actorRole: string
  action: string
  target: string
  outcome: EventOutcome
  source: 'Portal' | 'API'
  bank?: 'DBS' | 'CIMB'
  endpoint?: string
  ip?: string
  errorCode?: string
  recommendations?: string[]
  requestPayload?: string
  responsePayload?: string
}

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt_0QXR7M2A01KF',
    requestId: 'req_9F2KX01A7M2Q',
    timestamp: '1 Jun, 2026 · 14:32',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Approved refund',
    target: 'rf_KH2M9AXBECQ3 → txn_01J9KB1C2D3E4',
    outcome: 'SUCCESS',
    source: 'Portal',
    bank: 'DBS',
    endpoint: 'POST /v1/refunds/rf_KH2M9AXBECQ3/approve',
    ip: '203.118.8.4',
    responsePayload: `{
  "id": "rf_KH2M9AXBECQ3",
  "status": "APPROVED",
  "approvedBy": "usr_priya_lim",
  "approvedAt": "2026-06-01T14:32:08+08:00"
}`,
  },
  {
    id: 'evt_0QXR7L8ZV4TN',
    requestId: 'req_4TNV8Z7L0QXR',
    timestamp: '1 Jun, 2026 · 14:28',
    category: 'REFUND',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted refund request',
    target: 'rf_KH2M9AXBECQ3 · Missing beneficiary details · SGD 1,200.00',
    outcome: 'PENDING',
    source: 'Portal',
    bank: 'DBS',
    endpoint: 'POST /v1/refunds',
    ip: '203.118.8.2',
    requestPayload: `{
  "originalTxnId": "txn_01J9KB1C2D3E4",
  "amount": "1200.00",
  "currency": "SGD",
  "reason": "Missing beneficiary details",
  "receiver": {
    "name": "Vivien Tan",
    "bankAccountNumber": "•••• •••• 6833",
    "bic": "DBSS•••XXX"
  }
}`,
    responsePayload: `{
  "id": "rf_KH2M9AXBECQ3",
  "status": "PENDING_APPROVAL",
  "createdAt": "2026-06-01T14:28:41+08:00"
}`,
  },
  {
    id: 'evt_0QXR7K3D9PMH',
    requestId: 'req_9PMH3D7K2QXR',
    timestamp: '1 Jun, 2026 · 13:55',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Rejected retry',
    target: 'rty_3ABCD123 → pmt_failing_002 · Incorrect routing identifier',
    outcome: 'REJECTED',
    source: 'Portal',
    bank: 'CIMB',
    endpoint: 'POST /v1/retries/rty_3ABCD123/reject',
    ip: '203.118.8.4',
    errorCode: 'AC01',
    recommendations: [
      'Verify the receiver account number with the beneficiary before resubmitting.',
      'Check that the local routing identifier matches the receiver bank (DBS: 7171, CIMB: 7986).',
      'If the details are confirmed correct, raise a support request with the Event ID.',
    ],
    responsePayload: `{
  "id": "rty_3ABCD123",
  "status": "REJECTED",
  "errorCode": "AC01",
  "errorMessage": "Account number provided is incorrect",
  "rejectedBy": "usr_priya_lim"
}`,
  },
  {
    id: 'evt_0QXR7J6B2WSD',
    requestId: 'req_2WSD6B7J1QXR',
    timestamp: '1 Jun, 2026 · 13:40',
    category: 'RETRY',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted payment retry',
    target: 'rty_3ABCD123 → pmt_failing_002 · SGD 45,000.00',
    outcome: 'PENDING',
    source: 'Portal',
    bank: 'CIMB',
    endpoint: 'POST /v1/retries',
    ip: '203.118.8.2',
    requestPayload: `{
  "originalPaymentId": "pmt_failing_002",
  "amount": "45000.00",
  "currency": "SGD",
  "receiver": {
    "name": "MR LO CHUN KIT",
    "bankAccountNumber": "•••• •••• 9651",
    "localRoutingIdentifier": "7986"
  }
}`,
  },
  {
    id: 'evt_0QXR6Z4Y8RKC',
    requestId: 'req_8RKC4Y6Z0QXR',
    timestamp: '31 May, 2026 · 11:20',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Approved retry',
    target: 'rty_9XYZ001 → pmt_failing_001 · SGD 12,500.00',
    outcome: 'SUCCESS',
    source: 'Portal',
    bank: 'DBS',
    endpoint: 'POST /v1/retries/rty_9XYZ001/approve',
    ip: '203.118.8.4',
  },
  {
    id: 'evt_0QXR6Y1XM5JV',
    requestId: 'req_M5JV1X6Y9QXR',
    timestamp: '31 May, 2026 · 11:02',
    category: 'RETRY',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted payment retry',
    target: 'rty_9XYZ001 → pmt_failing_001 · INSUFFICIENT_FUNDS',
    outcome: 'PENDING',
    source: 'API',
    bank: 'DBS',
    endpoint: 'POST /v1/retries',
    ip: '203.118.8.2',
    errorCode: 'AM04',
    recommendations: [
      'Top up the sending account before retrying — the original payment failed with insufficient funds.',
      'Check the Operating account balance on the Home dashboard before approving.',
    ],
  },
  {
    id: 'evt_0QXR5V7TQ3GB',
    requestId: 'req_Q3GB7T5V8QXR',
    timestamp: '30 May, 2026 · 16:45',
    category: 'USER',
    actor: 'Ming Miin',
    actorRole: 'ADMIN',
    action: 'Invited user',
    target: 'gary.tan@acmelabs.sg · Role: MAKER · Entity: Acme Labs',
    outcome: 'INFO',
    source: 'Portal',
    endpoint: 'POST /v1/users/invitations',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_0QXR5U9SL7FD',
    requestId: 'req_L7FD9S5U7QXR',
    timestamp: '30 May, 2026 · 09:15',
    category: 'API_KEY',
    actor: 'Ming Miin',
    actorRole: 'ADMIN',
    action: 'Created API key',
    target: 'ak_prod_acme_labs · Production · Live mode',
    outcome: 'INFO',
    source: 'Portal',
    endpoint: 'POST /v1/api-keys',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_0QXR4R2PH9CX',
    requestId: 'req_H9CX2P4R6QXR',
    timestamp: '29 May, 2026 · 14:00',
    category: 'WEBHOOK',
    actor: 'Ming Miin',
    actorRole: 'ADMIN',
    action: 'Enabled webhook endpoint',
    target: 'https://api.acmelabs.sg/webhooks/acme · payment.completed',
    outcome: 'INFO',
    source: 'Portal',
    endpoint: 'PATCH /v1/webhooks/wh_01',
    ip: '203.118.8.2',
  },
  {
    id: 'evt_0QXR3N8MK1ZT',
    requestId: 'req_K1ZT8M3N5QXR',
    timestamp: '28 May, 2026 · 08:52',
    category: 'REFUND',
    actor: 'Alice Wong',
    actorRole: 'MAKER',
    action: 'Submitted refund request',
    target: 'rf_AW002 · Wrong amount · SGD 3,400.00 · doc uploaded: statement_may28.pdf',
    outcome: 'PENDING',
    source: 'Portal',
    bank: 'DBS',
    endpoint: 'POST /v1/refunds',
    ip: '203.118.8.9',
  },
  {
    id: 'evt_0QXR2J5HF8VW',
    requestId: 'req_F8VW5H2J4QXR',
    timestamp: '27 May, 2026 · 17:30',
    category: 'APPROVAL',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Approved refund',
    target: 'rf_AW001 → txn_01J9K82W3X4Y5',
    outcome: 'SUCCESS',
    source: 'Portal',
    bank: 'CIMB',
    endpoint: 'POST /v1/refunds/rf_AW001/approve',
    ip: '203.118.8.4',
  },
  {
    id: 'evt_0QXR1G3DB6QY',
    requestId: 'req_B6QY3D1G3QXR',
    timestamp: '27 May, 2026 · 09:11',
    category: 'AUTH',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Signed in',
    target: 'priya@tryacme.com',
    outcome: 'INFO',
    source: 'Portal',
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
type BankFilter = 'all' | 'DBS' | 'CIMB'

export function ActivityPage() {
  const { entity } = useEntity()
  const [q, setQ] = React.useState('')
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>('all')
  const [bankFilter, setBankFilter] = React.useState<BankFilter>('all')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  if (!entity) return null

  // Search-as-you-type across event id, request id, error code, endpoint,
  // target, actor — mirroring the log search facets.
  const needle = q.trim().toLowerCase()
  const filtered = AUDIT_EVENTS.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (bankFilter !== 'all' && e.bank !== bankFilter) return false
    if (needle) {
      const hay = [
        e.id,
        e.requestId,
        e.errorCode ?? '',
        e.endpoint ?? '',
        e.target,
        e.actor,
        e.action,
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

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
            Every event carries an <span className="font-medium text-foreground">Event ID</span> —
            include it when raising a support request to help Acme Ops pinpoint
            the problem.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <DownloadIcon className="size-3.5" />
          Export logs
        </Button>
      </div>

      {/* Search + facets */}
      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by event ID, request ID, error code, or API endpoint…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
          >
            <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
              <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Service:
              </span>
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
          <Select
            value={bankFilter}
            onValueChange={(v) => setBankFilter(v as BankFilter)}
          >
            <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
              <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Bank:
              </span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All banks</SelectItem>
              <SelectItem value="DBS">DBS</SelectItem>
              <SelectItem value="CIMB">CIMB</SelectItem>
            </SelectContent>
          </Select>
          <Select value="7d" onValueChange={() => {}}>
            <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
              <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Range:
              </span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Past 7 days</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((evt) => {
              const Icon = CATEGORY_ICONS[evt.category]
              const outcome = OUTCOME_BADGE[evt.outcome]
              const isExpanded = expandedId === evt.id
              return (
                <div key={evt.id} className="divide-y">
                  {/* Summary row — always visible */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                  >
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-md ${CATEGORY_COLORS[evt.category]}`}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{evt.action}</span>
                      <OutcomePill className={outcome.className}>
                        {outcome.label === 'Success' ? <CheckCircle2Icon className="size-3" /> : outcome.label === 'Rejected' ? <XCircleIcon className="size-3" /> : null}
                        {outcome.label}
                      </OutcomePill>
                      {evt.errorCode && (
                        <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-mono text-[0.6rem] text-rose-700">
                          {evt.errorCode}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-[0.65rem] text-muted-foreground whitespace-nowrap">{evt.timestamp}</div>
                    <ChevronDownIcon className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded log detail */}
                  {isExpanded && (
                    <div className="space-y-4 border-b bg-muted/20 px-5 py-4 text-sm">
                      {/* Event dimensions */}
                      <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailItem label="Event ID">
                          <Mono>{evt.id}</Mono>
                        </DetailItem>
                        <DetailItem label="Request ID">
                          <Mono>{evt.requestId}</Mono>
                        </DetailItem>
                        <DetailItem label="Source">
                          <span className="text-xs uppercase tracking-wider">
                            {evt.source}
                          </span>
                        </DetailItem>
                        <DetailItem label="Performed by">
                          <span className="font-medium">{evt.actor}</span>
                          <span className="ml-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                            · {evt.actorRole}
                          </span>
                        </DetailItem>
                        {evt.bank && (
                          <DetailItem label="Bank">
                            <span className="text-xs uppercase tracking-wider">
                              {evt.bank}
                            </span>
                          </DetailItem>
                        )}
                        {evt.endpoint && (
                          <DetailItem label="API endpoint">
                            <Mono className="text-[0.7rem]">{evt.endpoint}</Mono>
                          </DetailItem>
                        )}
                        {evt.ip && (
                          <DetailItem label="IP">
                            <Mono>{evt.ip}</Mono>
                          </DetailItem>
                        )}
                        {evt.errorCode && (
                          <DetailItem label="Error code">
                            <Mono className="text-rose-700">{evt.errorCode}</Mono>
                          </DetailItem>
                        )}
                      </div>

                      <DetailItem label="Target">
                        <span className="font-mono text-xs">{evt.target}</span>
                      </DetailItem>

                      {/* Recommendations from the error index */}
                      {evt.recommendations && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-amber-800">
                            <LightbulbIcon className="size-3.5" />
                            Recommendations
                          </div>
                          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-amber-900">
                            {evt.recommendations.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Request / response payloads (redacted) */}
                      {(evt.requestPayload || evt.responsePayload) && (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {evt.requestPayload && (
                            <div>
                              <div className="mb-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                                Request payload
                              </div>
                              <pre className="max-h-56 overflow-auto rounded border bg-background p-2.5 font-mono text-[0.7rem] leading-relaxed">
                                {evt.requestPayload}
                              </pre>
                            </div>
                          )}
                          {evt.responsePayload && (
                            <div>
                              <div className="mb-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                                Response payload
                              </div>
                              <pre className="max-h-56 overflow-auto rounded border bg-background p-2.5 font-mono text-[0.7rem] leading-relaxed">
                                {evt.responsePayload}
                              </pre>
                            </div>
                          )}
                          <p className="text-[0.65rem] text-muted-foreground lg:col-span-2">
                            Sensitive fields are redacted and masked
                            automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No events match your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Logs are retained for 7 days. To change the retention period for your
        organization, contact Acme Ops.
      </p>
    </div>
  )
}

function DetailItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <span className="mr-1.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
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
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  )
}
