import * as React from 'react'
import {
  DownloadIcon,
  SearchIcon,
  BanIcon,
  UserIcon,
  GlobeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  relative: string
  category: EventCategory
  service: string
  // Every portal action is executed through an API key — the actor is the key.
  apiKeyName: string
  actor: string
  actorRole: string
  action: string
  target: string
  outcome: EventOutcome
  source: 'Portal' | 'API'
  bank?: 'DBS' | 'CIMB'
  endpoint: string
  ip?: string
  errorCode?: string
  errorTitle?: string
  recommendations?: string[]
  requestPayload?: string
  responsePayload?: string
}

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt_0QXR7M2A01KF',
    requestId: 'req_9F2KX01A7M2Q',
    timestamp: '1 Jun, 2026 · 14:32',
    relative: '2 minutes',
    category: 'APPROVAL',
    service: 'Payments',
    apiKeyName: 'acme-payment-checker-live-key',
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
  "approvedBy": "ak_checker_acme",
  "approvedAt": "2026-06-01T14:32:08+08:00"
}`,
  },
  {
    id: 'evt_0QXR7L8ZV4TN',
    requestId: 'req_4TNV8Z7L0QXR',
    timestamp: '1 Jun, 2026 · 14:28',
    relative: '6 minutes',
    category: 'REFUND',
    service: 'Payments',
    apiKeyName: 'acme-payment-maker-live-key',
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
    relative: '39 minutes',
    category: 'APPROVAL',
    service: 'Payments',
    apiKeyName: 'acme-payment-checker-live-key',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Rejected retry',
    target: 'rty_3ABCD123 → pmt_failing_002 · Incorrect routing identifier',
    outcome: 'REJECTED',
    source: 'Portal',
    bank: 'CIMB',
    endpoint: 'POST /v1/retries/rty_3ABCD123/reject',
    ip: '203.118.8.4',
    errorCode: 'BANK_AC01',
    errorTitle: 'Account number provided is incorrect',
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
  "rejectedBy": "ak_checker_acme"
}`,
  },
  {
    id: 'evt_0QXR7J6B2WSD',
    requestId: 'req_2WSD6B7J1QXR',
    timestamp: '1 Jun, 2026 · 13:40',
    relative: '54 minutes',
    category: 'RETRY',
    service: 'Payments',
    apiKeyName: 'acme-payment-maker-live-key',
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
    relative: '1 day',
    category: 'APPROVAL',
    service: 'Payments',
    apiKeyName: 'acme-payment-checker-live-key',
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
    relative: '1 day',
    category: 'RETRY',
    service: 'Payments',
    apiKeyName: 'dev-acme-dbs-lv-live-key',
    actor: 'Ming Miin',
    actorRole: 'MAKER',
    action: 'Submitted payment retry',
    target: 'rty_9XYZ001 → pmt_failing_001 · INSUFFICIENT_FUNDS',
    outcome: 'REJECTED',
    source: 'API',
    bank: 'DBS',
    endpoint: 'POST /v1/retries',
    ip: '203.118.8.2',
    errorCode: 'BANK_AM04',
    errorTitle: 'Insufficient funds',
    recommendations: [
      'Top up the sending account before retrying — the original payment failed with insufficient funds.',
      'Check the Operating account balance on the Home dashboard before approving.',
    ],
  },
  {
    id: 'evt_0QXR5V7TQ3GB',
    requestId: 'req_Q3GB7T5V8QXR',
    timestamp: '30 May, 2026 · 16:45',
    relative: '2 days',
    category: 'USER',
    service: 'Identity',
    apiKeyName: 'acme-admin-portal-key',
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
    relative: '2 days',
    category: 'API_KEY',
    service: 'Platform',
    apiKeyName: 'acme-admin-portal-key',
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
    relative: '3 days',
    category: 'WEBHOOK',
    service: 'Platform',
    apiKeyName: 'acme-admin-portal-key',
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
    relative: '4 days',
    category: 'REFUND',
    service: 'Payments',
    apiKeyName: 'acme-payment-maker-live-key',
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
    relative: '5 days',
    category: 'APPROVAL',
    service: 'Payments',
    apiKeyName: 'acme-payment-checker-live-key',
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
    relative: '5 days',
    category: 'AUTH',
    service: 'Identity',
    apiKeyName: 'acme-portal-session',
    actor: 'Priya Lim',
    actorRole: 'CHECKER',
    action: 'Signed in',
    target: 'priya@tryacme.com',
    outcome: 'INFO',
    source: 'Portal',
    endpoint: 'POST /login/default',
    ip: '203.118.8.4',
  },
]

type CategoryFilter = 'all' | EventCategory
type BankFilter = 'all' | 'DBS' | 'CIMB'
type ServiceFilter = 'all' | 'Payments' | 'Identity' | 'Platform'

// Mask an IP the way the reference blurs it: keep first octet only.
function maskIp(ip: string): string {
  const parts = ip.split('.')
  return `${parts[0]}.•••.•.${parts[parts.length - 1]}`
}

export function ActivityPage() {
  const { entity } = useEntity()
  const [q, setQ] = React.useState('')
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>('all')
  const [bankFilter, setBankFilter] = React.useState<BankFilter>('all')
  const [serviceFilter, setServiceFilter] =
    React.useState<ServiceFilter>('all')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  if (!entity) return null

  // Search-as-you-type across event id, request id, error code, endpoint,
  // API key name, target — mirroring the log search facets.
  const needle = q.trim().toLowerCase()
  const filtered = AUDIT_EVENTS.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (bankFilter !== 'all' && e.bank !== bankFilter) return false
    if (serviceFilter !== 'all' && e.service !== serviceFilter) return false
    if (needle) {
      const hay = [
        e.id,
        e.requestId,
        e.errorCode ?? '',
        e.errorTitle ?? '',
        e.endpoint,
        e.target,
        e.apiKeyName,
        e.actor,
        e.action,
        e.bank ?? '',
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
            Full audit trail for{' '}
            <span className="font-medium text-foreground">{entity.name}</span>.
            Every action is executed as an API call — the actor is the API key
            that made it. Include the{' '}
            <span className="font-medium text-foreground">Event ID</span> when
            raising a support request.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <DownloadIcon className="size-3.5" />
          Export logs
        </Button>
      </div>

      {/* Facets */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <SelectTrigger size="sm" className="h-8 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
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
          <SelectTrigger size="sm" className="h-8 w-32 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Banks</SelectItem>
            <SelectItem value="DBS">DBS</SelectItem>
            <SelectItem value="CIMB">CIMB</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={serviceFilter}
          onValueChange={(v) => setServiceFilter(v as ServiceFilter)}
        >
          <SelectTrigger size="sm" className="h-8 w-36 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="Payments">Payments</SelectItem>
            <SelectItem value="Identity">Identity</SelectItem>
            <SelectItem value="Platform">Platform</SelectItem>
          </SelectContent>
        </Select>
        <Select value="7d" onValueChange={() => {}}>
          <SelectTrigger size="sm" className="h-8 w-36 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Past 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search + pagination */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, URL, API, bank name, or error code"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled>
          <ChevronLeftIcon className="size-3.5" />
          Previous
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" disabled>
          Next
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Column headers */}
          <div className="flex items-center gap-4 border-b px-5 py-2.5">
            <span className="w-5 shrink-0" />
            <span className="flex-1 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              Event
            </span>
            <span className="w-64 shrink-0 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              Actor
            </span>
            <span className="w-24 shrink-0 text-right text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              Timestamp
            </span>
            <span className="w-4 shrink-0" />
          </div>

          <div className="divide-y">
            {filtered.map((evt) => {
              const isExpanded = expandedId === evt.id
              const isFailure = evt.outcome === 'REJECTED'
              return (
                <div key={evt.id} className="divide-y">
                  {/* Log row */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/30"
                    onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                  >
                    <span className="flex w-5 shrink-0 justify-center">
                      {isFailure && (
                        <BanIcon className="size-4 text-red-500" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {evt.errorCode && (
                          <span className="rounded bg-red-500 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-white">
                            {evt.errorCode}
                          </span>
                        )}
                        <span className="text-sm font-medium">
                          {evt.errorTitle ?? evt.action}
                        </span>
                      </div>
                      <div className="truncate font-mono text-[0.72rem] text-muted-foreground">
                        {evt.endpoint}
                      </div>
                    </div>
                    <div className="w-64 shrink-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-[0.72rem]">
                          {evt.apiKeyName}
                        </span>
                      </div>
                      {evt.ip && (
                        <div className="flex items-center gap-1.5">
                          <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="rounded bg-muted px-1.5 font-mono text-[0.68rem] text-muted-foreground">
                            {maskIp(evt.ip)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs text-muted-foreground underline decoration-dotted underline-offset-2">
                      {evt.relative}
                    </span>
                    <ChevronDownIcon
                      className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded log detail */}
                  {isExpanded && (
                    <div className="space-y-4 border-b bg-muted/20 px-5 py-4 text-sm">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailItem label="Event ID">
                          <Mono>{evt.id}</Mono>
                        </DetailItem>
                        <DetailItem label="Request ID">
                          <Mono>{evt.requestId}</Mono>
                        </DetailItem>
                        <DetailItem label="Timestamp">
                          <span className="text-xs">{evt.timestamp}</span>
                        </DetailItem>
                        <DetailItem label="Action">
                          <span className="font-medium">{evt.action}</span>
                        </DetailItem>
                        <DetailItem label="API key">
                          <Mono className="text-[0.7rem]">{evt.apiKeyName}</Mono>
                        </DetailItem>
                        <DetailItem label="Performed by">
                          <span className="font-medium">{evt.actor}</span>
                          <span className="ml-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                            · {evt.actorRole}
                          </span>
                        </DetailItem>
                        <DetailItem label="Source">
                          <span className="text-xs uppercase tracking-wider">
                            {evt.source}
                          </span>
                        </DetailItem>
                        <DetailItem label="Service">
                          <span className="text-xs uppercase tracking-wider">
                            {evt.service}
                          </span>
                        </DetailItem>
                        {evt.bank && (
                          <DetailItem label="Bank">
                            <span className="text-xs uppercase tracking-wider">
                              {evt.bank}
                            </span>
                          </DetailItem>
                        )}
                        {evt.ip && (
                          <DetailItem label="IP">
                            <Mono>{evt.ip}</Mono>
                          </DetailItem>
                        )}
                        {evt.errorCode && (
                          <DetailItem label="Error code">
                            <Mono className="text-rose-700">
                              {evt.errorCode}
                            </Mono>
                          </DetailItem>
                        )}
                      </div>

                      <DetailItem label="Target">
                        <span className="font-mono text-xs">{evt.target}</span>
                      </DetailItem>

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
