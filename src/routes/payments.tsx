import * as React from 'react'
import {
  PlusIcon,
  CalendarIcon,
  ChevronDownIcon,
  FileTextIcon,
  LandmarkIcon,
  ShieldCheckIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  AlertCircleIcon,
  CheckIcon,
  RotateCcwIcon,
  XIcon,
  WalletIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  FieldGrid,
  FieldRow,
  FormField,
  FormSection,
} from '@/components/form-section'
import {
  PageHeader,
  PageHeaderAction,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@/components/page-header'
import {
  AttachmentPicker,
  FormPageHeader,
  MakerCheckerPreview,
  ModeOption,
} from '@/components/request-form'
import { Button } from '@/components/ui/button'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { DateRange } from 'react-day-picker'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Mono } from '@/components/mono'
import { CopyButton } from '@/components/copy-button'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/user-context'
import {
  addRefund,
  approveRefund,
  rejectRefund,
  useSubmittedRefunds,
  type SubmittedRefund,
} from '@/lib/refunds-store'
import {
  addRetry,
  approveRetry,
  rejectRetry,
  useSubmittedRetries,
  type SubmittedRetry,
} from '@/lib/retries-store'
import { useUnprocessedDeposits } from '@/lib/unprocessed-deposits-store'
import {
  allPayments,
  ACCOUNTS,
  TRANSACTIONS,
  expiredApprovalsSeed,
  formatMoney,
  LEGAL_ENTITIES,
  paymentRequiresAttention,
  rejectedApprovalsSeed,
  unprocessedRefunds,
  type Account,
  type ApprovalRecord,
  type Payment,
  type Txn,
  type UnprocessedRefund,
} from '@/data/fixtures'

const REFUND_REASONS = [
  'Missing beneficiary details',
  'Wrong amount',
  'Wrong account',
  'Customer requested cancellation',
  'Duplicate transaction',
  'Other',
] as const

type RefundReason = (typeof REFUND_REASONS)[number]

const PAGE_SIZE = 20

// Parse "17 May, 2026, 02:04" or "1 Jun, 2026, 09:12" into a Date
/** ••••••••9523 — how production renders a masked receiver account number. */
function maskTail(value: string, visible = 4): string {
  if (!value) return ''
  if (value.length <= visible) return value
  return '•'.repeat(Math.max(4, value.length - visible)) + value.slice(-visible)
}

/** "2026-05-25 → 2026-06-01", or the placeholder when nothing is picked. */
function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Date range'
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const from = fmt(range.from)
  const to = fmt(range.to ?? range.from)
  return from === to ? from : `${from} → ${to}`
}

/** Selected rows → CSV download, matching the export on the transactions page. */
function exportPaymentsCsv(
  rows: Payment[],
  accountById: Map<string, Account>,
): void {
  const header = [
    'Payment ID',
    'Created',
    'Account',
    'Account number',
    'Amount',
    'Currency',
    'Receiver',
    'Receiver account',
    'Status',
    'Type',
    'Result',
  ]
  const cell = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const lines = [
    header.join(','),
    ...rows.map((p) => {
      const account = accountById.get(p.senderAccountId)
      return [
        p.id,
        p.createdAt,
        account?.name ?? '',
        account?.number ?? '',
        p.amount,
        p.currency,
        p.receiverName,
        p.receiverBankAccountNumber,
        p.status,
        p.type,
        p.resultCode ?? '',
      ]
        .map((v) => cell(String(v)))
        .join(',')
    }),
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payments-${rows.length}-rows.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function parsePaymentDate(s: string): Date | null {
  if (!s) return null
  const match = s.match(/(\d+)\s+(\w+),\s+(\d{4})/)
  if (!match) return null
  const [, day, mon, year] = match
  const months: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }
  const m = months[mon]
  if (m === undefined) return null
  return new Date(Number(year), m, Number(day))
}

function todayDisplay(): string {
  const d = new Date('2026-06-01T00:00:00')
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

// Display date "17 May, 2026, 02:04" → ISO "2026-05-17".
function isoPaymentDate(raw: string): string {
  const d = parsePaymentDate(raw)
  if (!d) return raw
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Reconstruct the POST /payments request body that created this payment.
function buildPaymentRequestPayload(p: Payment): string {
  const payload = {
    type: p.type,
    currency: p.currency,
    amount: Number(p.amount.replace(/,/g, '')) || p.amount,
    customerReference: p.customerReference || null,
    paymentDetails: p.paymentDetails || null,
    senderAccountId: p.senderAccountId || null,
    senderAccountCurrency: p.currency,
    receiver: {
      name: p.receiverName || null,
      bank: p.receiverBank || null,
      bankAccountNumber: p.receiverBankAccountNumber || null,
      address: {
        line1: '21 Central Street',
        city: 'SG',
        country: 'SG',
      },
    },
  }
  return JSON.stringify(payload, null, 2)
}

// Reconstruct the raw API payload for a payment, mirroring the
// GET /payments/{id} response shape surfaced by the Acme API.
function buildPaymentRawPayload(
  p: Payment,
  refund: SubmittedRefund | null,
  retry: SubmittedRetry | null,
): string {
  const created = isoPaymentDate(p.createdAt)
  const updated = isoPaymentDate(p.updatedAt || p.createdAt)
  const pending = refund ?? retry
  const status = pending
    ? pending.status === 'Pending approval'
      ? 'PENDING_APPROVAL'
      : pending.status === 'Approved'
        ? 'COMPLETED'
        : 'REJECTED'
    : p.status
  const payload = {
    id: p.id,
    type: p.type,
    amount: Number(p.amount.replace(/,/g, '')) || p.amount,
    currency: p.currency,
    customerReference: p.customerReference || null,
    bankReference: null,
    paymentDetails: p.paymentDetails || null,
    senderAccountId: p.senderAccountId || null,
    senderAccountCurrency: p.currency,
    bankChargeBearer: 'SENDER',
    receiver: {
      name: p.receiverName || null,
      bank: p.receiverBank || null,
      localRoutingIdentifier: p.receiverLocalRoutingIdentifier || null,
      bankAccountNumber: p.receiverBankAccountNumber || null,
      iban: null,
      proxyType: null,
      proxyValue: null,
      address: {
        line1: null,
        line2: null,
        city: 'Singapore',
        state: '',
        postalCode: null,
        country: 'Singapore',
      },
    },
    currencyExchange: null,
    status,
    ...(pending
      ? {
          review: {
            requestedBy: pending.requester,
            approvedAt:
              pending.status === 'Approved'
                ? (pending.reviewer?.at ?? null)
                : null,
            approvedBy:
              pending.status === 'Approved'
                ? (pending.reviewer?.name ?? null)
                : null,
            rejectedAt:
              pending.status === 'Rejected'
                ? (pending.reviewer?.at ?? null)
                : null,
            rejectedBy:
              pending.status === 'Rejected'
                ? (pending.reviewer?.name ?? null)
                : null,
            rejectionReason: null,
            expiresAt: `${created}T23:59:59Z`,
          },
        }
      : {}),
    paymentAdviceEmails: ['finance@tryacme.com'],
    ...(p.status === 'FAILED' && p.resultCode
      ? { resultCode: p.resultCode }
      : {}),
    createdAt: `${created}T00:00:00.000000Z`,
    updatedAt: `${updated}T00:00:00.000000Z`,
  }
  return JSON.stringify(payload, null, 2)
}

// --- Bank-format payloads -----------------------------------------------
// What Acme actually puts on the wire to the bank, and what comes back. Shape
// follows the DBS GPC message pair; party names and account numbers are
// redacted in the bank logs, so they are redacted here too.

/** "17 May, 2026, 02:02" → "02:02". Falls back to midnight. */
function paymentTimeOfDay(raw: string): string {
  const m = raw.match(/(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : '00:00'
}

/** Deterministic per-payment digits, so a payment always shows the same ids. */
function paymentHash(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000_000
  return h
}

function bankIds(p: Payment) {
  const date = isoPaymentDate(p.createdAt)
  const time = paymentTimeOfDay(p.createdAt)
  const digits = String(paymentHash(p.id)).padStart(9, '0')
  const reference = p.id.replace(/^pymt_/, '')
  // The lifecycle steps are seconds apart, so each message carries its own
  // stamp rather than every payload repeating the same one.
  const stamp = (second: number, millis: string) =>
    `${date}T${time}:${String(second).padStart(2, '0')}.${millis}`
  return {
    date,
    time,
    stamp,
    msgId: `${date.replace(/-/g, '')}${digits}`,
    requestAt: stamp(29, '118'),
    responseAt: stamp(30, '079'),
    settledAt: stamp(34, '031'),
    paymentReference: reference,
    txnRefId: `IRGPC${digits}${reference.slice(-6).toLowerCase()}`,
    mandateId: `ACME-CR-${reference.slice(0, 8)}-F001`,
  }
}

/** The Acme API's own answer to the capture call: id and when it landed. */
function buildCaptureResponsePayload(p: Payment): string {
  const ids = bankIds(p)
  return `Response status=201 body=${JSON.stringify(
    {
      id: p.id,
      status: 'CREATED',
      type: p.type,
      currency: p.currency,
      amount: Number(p.amount.replace(/,/g, '')) || p.amount,
      customerReference: p.customerReference || null,
      createdAt: ids.requestAt,
    },
    null,
    2,
  )}`
}

/** Status enquiry Acme polls the bank with while a payment is in flight. */
function buildBankEnquiryPayload(p: Payment, poll: number): string {
  const ids = bankIds(p)
  return JSON.stringify(
    {
      header: {
        msgId: `${ids.msgId}${poll}`,
        orgId: 'ASWEAPL3',
        timeStamp: ids.stamp(31 + poll, '004'),
      },
      txnEnquiry: {
        customerReference: p.customerReference || ids.paymentReference,
        paymentReference: ids.paymentReference,
        txnType: 'GPC',
      },
    },
    null,
    2,
  )
}

function amountForBank(amount: string): string {
  const n = Number(amount.replace(/,/g, ''))
  return isNaN(n) ? amount : n.toFixed(2)
}

/** The instruction Acme sends to the bank, in the bank's own format. */
function buildBankRequestPayload(p: Payment, account: Account | null): string {
  const ids = bankIds(p)
  return JSON.stringify(
    {
      header: {
        msgId: ids.msgId,
        orgId: 'ASWEAPL3',
        timeStamp: ids.requestAt,
      },
      txnInfo: {
        customerReference: p.customerReference || ids.paymentReference,
        paymentReference: ids.paymentReference,
        txnType: 'GPC',
        txnDate: ids.date,
        txnCcy: p.currency,
        txnAmount: amountForBank(p.amount),
        purposeOfPayment: 'OTHR',
        senderParty: {
          name: 'REDACTED',
          accountNo: 'REDACTED',
          swiftBic: account?.swiftBic || 'DBSSSGSGXXX',
          bankCtryCode: account?.country || 'SG',
          mandateId: ids.mandateId,
        },
        receivingParty: {
          name: 'REDACTED',
          accountNo: 'REDACTED',
          swiftBic: p.receiverBank || account?.swiftBic || 'DBSSSGSGXXX',
          bankCtryCode: account?.country || 'SG',
          addresses: [],
        },
      },
    },
    null,
    2,
  )
}

/**
 * What the bank sends back, logged verbatim including the HTTP status line.
 * `txnStatus` walks the ISO-style codes the rail reports as the payment moves:
 * ACTC on acceptance, PDNG while it is being processed (the ACK2/ACK3 polls),
 * ACCP once it clears, RJCT if it is rejected.
 */
function buildBankResponsePayload(
  p: Payment,
  txnStatus: 'ACTC' | 'PDNG' | 'ACCP' | 'RJCT',
  poll = 0,
): string {
  const ids = bankIds(p)
  const description: Record<typeof txnStatus, string> = {
    ACTC: 'Accepted technical validation',
    PDNG: 'Pending at beneficiary bank',
    ACCP: 'Success',
    RJCT: p.underlyingErrorMessage || 'Rejected by bank',
  }
  const settled = txnStatus === 'ACCP'
  const at =
    txnStatus === 'ACTC'
      ? ids.responseAt
      : txnStatus === 'PDNG'
        ? ids.stamp(31 + poll, '512')
        : ids.stamp(34, '079')
  const body = {
    header: {
      msgId: poll ? `${ids.msgId}${poll}` : ids.msgId,
      timeStamp: at,
    },
    txnResponse: {
      customerReference: p.customerReference || ids.paymentReference,
      paymentReference: ids.paymentReference,
      txnRefId: ids.txnRefId,
      bankReference: ids.txnRefId,
      txnType: 'GPC',
      txnStatus,
      txnRejectCode: txnStatus === 'RJCT' ? (p.resultCode ?? 'OTHERS') : '',
      txnStatusDescription: description[txnStatus],
      txnSettlementAmt: settled ? amountForBank(p.amount) : '',
      txnSettlementDt: settled ? ids.settledAt : '',
    },
  }
  return `Response status=200 body=${JSON.stringify(body, null, 2)}`
}

// Build a synthetic failed Payment from an exception row (return / reversal)
// so it can be processed through the retry-payment page.
function exceptionToPayment(e: UnprocessedRefund): Payment {
  const amount = e.amount.replace(/[^\d.,]/g, '').trim()
  return {
    id: e.originalTxnId,
    amount,
    createdAt: e.date,
    currency: 'SGD',
    senderAccountId: 'intacc_0KT8ZSCRKXP0O',
    status: 'FAILED',
    type: 'FAST',
    updatedAt: e.date,
    organizationId: 'org_0KV2Y7N26Q6JR',
    mode: 'LIVE',
    receiverBank: '',
    receiverName: e.customer,
    receiverBankAccountNumber: '',
    receiverLocalRoutingIdentifier: '',
    resultCode:
      e.kind === 'return' ? 'RETURNED_BY_BANK' : 'REFUND_REVERSAL',
    underlyingErrorMessage: e.reason,
    customerReference: '',
    paymentDetails: '',
  }
}

export function PaymentsPage() {
  const search = useRouterState({
    select: (s) =>
      s.location.search as {
        action?: string
        txnId?: string
        paymentId?: string
      },
  })
  const storeDeposits = useUnprocessedDeposits()

  if (search?.action === 'new-refund') {
    const txn = TRANSACTIONS.find((t) => t.id === search.txnId) ?? null
    return <NewRefundFromTxn txn={txn} />
  }

  if (search?.action === 'retry-payment') {
    let p = allPayments.find((x) => x.id === search.paymentId) ?? null
    if (!p) {
      // Exceptions (returns / reversals) are processed through the same page.
      const exc = [...storeDeposits, ...unprocessedRefunds].find(
        (e) => e.originalTxnId === search.paymentId,
      )
      if (exc) p = exceptionToPayment(exc)
    }
    return <NewRetryFromPayment payment={p} />
  }

  if (search?.action === 'new-payment') {
    return <NewPaymentPage />
  }

  return <PaymentsMain />
}

// ---------------------------------------------------------------------------
// Create payment dialog
// ---------------------------------------------------------------------------

const PAYMENT_TYPES = ['FAST', 'TT', 'SEPA', 'ACH', 'FPS', 'INTERNAL'] as const
const CURRENCIES = ['SGD', 'USD', 'EUR', 'GBP', 'HKD'] as const
// Who bears bank charges on TT payments.
const CHARGE_BEARERS = ['SENDER', 'RECEIVER', 'SHARED'] as const

// ISO purpose-of-payment codes required on outbound payments.
const PAYMENT_PURPOSES = [
  { code: 'SUPP', label: 'SUPP — Supplier payment' },
  { code: 'SALA', label: 'SALA — Salary payment' },
  { code: 'TRAD', label: 'TRAD — Trade settlement' },
  { code: 'INTC', label: 'INTC — Intra-company transfer' },
  { code: 'DIVI', label: 'DIVI — Dividend' },
  { code: 'RFND', label: 'RFND — Refund / return of funds' },
  { code: 'OTHR', label: 'OTHR — Other' },
] as const

const RETURN_REASONS = [
  'Wrong beneficiary account',
  'Duplicate payment',
  'Customer requested return',
  'Funds not expected — unidentified sender',
  'Other',
] as const

// Unique customer reference for a new payment request.
function generateCustomerRef(): string {
  return `ACME-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`
}

const BANK_FILTER_OPTIONS = [
  { value: 'DBS', label: 'DBS', accountIds: ['intacc_0KT8ZSCRKXP0O', 'intacc_0KT8ZSDEKXCAN'] },
  { value: 'CIMB', label: 'CIMB', accountIds: ['intacc_0KERZSCDKXV0O'] },
] as const

// Kept for reference in SelectItems below
const _ACCOUNT_FILTER_IDS = ['intacc_0KT8ZSCRKXP0O', 'intacc_0KT8ZSDEKXCAN', 'intacc_0KERZSCDKXV0O']
void _ACCOUNT_FILTER_IDS

function NewPaymentButton() {
  const navigate = useNavigate()
  return (
    <Button
      size="sm"
      className="gap-1.5"
      onClick={() =>
        navigate({
          to: '/payments',
          search: { action: 'new-payment', txnId: undefined, paymentId: undefined },
        })
      }
    >
      <PlusIcon className="size-3.5" />
      Create payment
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Main payments view (filter chips + table + detail sheet + pending refunds)
// ---------------------------------------------------------------------------

function PaymentsMain() {
  const submittedRefunds = useSubmittedRefunds()
  const submittedRetries = useSubmittedRetries()
  const { user, roles, can } = useUser()
  const navigate = useNavigate()
  const [tab, setTab] = React.useState<
    'payments' | 'exceptions' | 'review' | 'rejected' | 'expired'
  >('payments')
  // Filter axes, in the order the production payments page lays them out.
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [filterBank, setFilterBank] = React.useState('')
  const [filterAccount, setFilterAccount] = React.useState('')
  const [filterAmount, setFilterAmount] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState('')
  const [filterEntity, setFilterEntity] = React.useState('')
  const [filterCurrency, setFilterCurrency] = React.useState('')
  const [filterReceiver, setFilterReceiver] = React.useState('')
  const [filterPaymentId, setFilterPaymentId] = React.useState('')
  // Receiver account numbers are masked until asked for, as in production.
  const [hideSensitive, setHideSensitive] = React.useState(true)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  )
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Payment | null>(null)
  const accountById = React.useMemo(() => {
    const m = new Map<string, Account>()
    for (const a of ACCOUNTS) m.set(a.id, a)
    return m
  }, [])
  const storeDeposits = useUnprocessedDeposits()
  const allUnprocessed = React.useMemo(
    () => [...storeDeposits, ...unprocessedRefunds],
    [storeDeposits],
  )

  // Maker-checker queue: everything submitted by makers still awaiting a
  // checker — refunds, new payments, retries, returns, and reversals.
  const pendingReview = React.useMemo(
    () => [
      ...submittedRefunds
        .filter((r) => r.status === 'Pending approval')
        .map((r) => ({
          id: r.id,
          kind: 'Refund',
          store: 'refund' as const,
          amount: r.amount,
          currency: r.currency,
          receiverName: r.receiverName,
          requester: r.requester,
          submittedAt: r.submittedAt,
        })),
      ...submittedRetries
        .filter((r) => r.status === 'Pending approval')
        .map((r) => ({
          id: r.id,
          kind:
            r.kind === 'payment'
              ? 'Payment'
              : r.kind === 'return'
                ? 'Return'
                : r.kind === 'reversal'
                  ? 'Reversal'
                  : 'Retry',
          store: 'retry' as const,
          amount: r.amount,
          currency: r.currency,
          receiverName: r.receiverName,
          requester: r.requester,
          submittedAt: r.submittedAt,
        })),
    ],
    [submittedRefunds, submittedRetries],
  )

  // Requests rejected by approvers — seeded examples plus live rejections.
  const rejectedApprovals = React.useMemo<ApprovalRecord[]>(
    () => [
      ...submittedRefunds
        .filter((r) => r.status === 'Rejected')
        .map((r) => ({
          id: r.id,
          kind: 'Refund' as const,
          amount: r.amount,
          currency: r.currency,
          receiverName: r.receiverName,
          requester: r.requester,
          submittedAt: r.submittedAt,
          reviewedBy: r.reviewer?.name,
          reviewedAt: r.reviewer?.at,
          rejectionReason: 'Rejected by checker',
        })),
      ...submittedRetries
        .filter((r) => r.status === 'Rejected')
        .map((r) => ({
          id: r.id,
          kind:
            r.kind === 'payment'
              ? ('Payment' as const)
              : r.kind === 'return'
                ? ('Return' as const)
                : ('Retry' as const),
          amount: r.amount,
          currency: r.currency,
          receiverName: r.receiverName,
          requester: r.requester,
          submittedAt: r.submittedAt,
          reviewedBy: r.reviewer?.name,
          reviewedAt: r.reviewer?.at,
          rejectionReason: 'Rejected by checker',
        })),
      ...rejectedApprovalsSeed,
    ],
    [submittedRefunds, submittedRetries],
  )

  const expiredApprovals = expiredApprovalsSeed

  // Lookup map: payment row id -> underlying refund (for refund-specific UI).
  const refundMap = React.useMemo(() => {
    const m = new Map<string, SubmittedRefund>()
    for (const r of submittedRefunds) m.set(r.id, r)
    return m
  }, [submittedRefunds])

  // Lookup map: payment row id -> underlying retry (for retry-specific UI).
  const retryMap = React.useMemo(() => {
    const m = new Map<string, SubmittedRetry>()
    for (const r of submittedRetries) m.set(r.id, r)
    return m
  }, [submittedRetries])

  // Treat submitted refunds + retries as synthetic payment rows.
  const pendingAsPayments: Payment[] = React.useMemo(
    () => [
      ...submittedRefunds.map(refundToPayment),
      ...submittedRetries.map(retryToPayment),
    ],
    [submittedRefunds, submittedRetries],
  )

  const combined: Payment[] = React.useMemo(
    () => [...pendingAsPayments, ...allPayments],
    [pendingAsPayments],
  )

  const counts = React.useMemo(() => {
    const pending = combined.filter((p) => p.status === 'PENDING').length
    const failed = combined.filter((p) => p.status === 'FAILED').length
    const completed = combined.filter((p) => p.status === 'COMPLETED').length
    return {
      pending,
      failed,
      completed,
      all: combined.length,
    }
  }, [combined])

  const filtered = React.useMemo(() => {
    let rows = combined
    if (filterStatus) rows = rows.filter((p) => p.status === filterStatus)
    if (filterCurrency) rows = rows.filter((p) => p.currency === filterCurrency)
    if (filterBank) {
      const ids = BANK_FILTER_OPTIONS.find(b => b.value === filterBank)?.accountIds as readonly string[] | undefined
      rows = rows.filter((p) => ids?.includes(p.senderAccountId))
    }
    if (filterAccount) rows = rows.filter((p) => p.senderAccountId === filterAccount)
    if (filterEntity) {
      rows = rows.filter(
        (p) => accountById.get(p.senderAccountId)?.legalEntity === filterEntity,
      )
    }
    if (filterAmount.trim()) {
      // A number matches on value, so "500" also finds "500.00"; anything else
      // falls back to a substring match on the formatted amount.
      const needle = filterAmount.trim()
      const asNumber = Number(needle.replace(/,/g, ''))
      rows = rows.filter((p) =>
        isNaN(asNumber)
          ? p.amount.toLowerCase().includes(needle.toLowerCase())
          : Number(p.amount.replace(/,/g, '')) === asNumber,
      )
    }
    if (filterReceiver.trim()) {
      const needle = filterReceiver.trim().toLowerCase()
      rows = rows.filter(
        (p) =>
          p.receiverName.toLowerCase().includes(needle) ||
          p.receiverBankAccountNumber.toLowerCase().includes(needle),
      )
    }
    if (filterPaymentId.trim()) {
      const needle = filterPaymentId.trim().toLowerCase()
      rows = rows.filter((p) => p.id.toLowerCase().includes(needle))
    }
    if (dateRange?.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      const to = new Date(dateRange.to ?? dateRange.from)
      to.setHours(23, 59, 59, 999)
      rows = rows.filter((p) => {
        const d = parsePaymentDate(p.createdAt)
        return d ? d >= from && d <= to : true
      })
    }
    return rows
  }, [
    combined,
    accountById,
    filterStatus,
    filterCurrency,
    filterBank,
    filterAccount,
    filterEntity,
    filterAmount,
    filterReceiver,
    filterPaymentId,
    dateRange,
  ])

  const hasFilters =
    Boolean(filterStatus) ||
    Boolean(filterCurrency) ||
    Boolean(filterBank) ||
    Boolean(filterAccount) ||
    Boolean(filterEntity) ||
    filterAmount.trim() !== '' ||
    filterReceiver.trim() !== '' ||
    filterPaymentId.trim() !== '' ||
    Boolean(dateRange?.from)

  const clearFilters = () => {
    setFilterStatus('')
    setFilterCurrency('')
    setFilterBank('')
    setFilterAccount('')
    setFilterEntity('')
    setFilterAmount('')
    setFilterReceiver('')
    setFilterPaymentId('')
    setDateRange(undefined)
  }

  const selectedRows = React.useMemo(
    () => filtered.filter((p) => selectedIds.has(p.id)),
    [filtered, selectedIds],
  )

  React.useEffect(() => {
    setPage(1)
  }, [
    filterStatus,
    filterCurrency,
    filterBank,
    filterAccount,
    filterEntity,
    filterAmount,
    filterReceiver,
    filterPaymentId,
    dateRange,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const pageRows = filtered.slice(pageStart, pageEnd)

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Payments</PageHeaderTitle>
        <PageHeaderDescription>
          Payment orders raised from every account you can see, newest first.
        </PageHeaderDescription>
        <PageHeaderAction>
          <NewPaymentButton />
        </PageHeaderAction>
      </PageHeader>

      {/* The main list carries no status tabs — status is a filter, as in the
          production dashboard. The remaining tabs are the maker-checker
          queues, which are separate datasets rather than payment statuses. */}
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setTab(v as 'payments' | 'exceptions' | 'review' | 'rejected' | 'expired')
        }
      >
        <TabsList>
          <TabsTrigger value="payments">All payments ({counts.all})</TabsTrigger>
          <TabsTrigger value="review">
            Pending approval ({pendingReview.length})
          </TabsTrigger>
          <TabsTrigger value="exceptions">
            Pending review ({allUnprocessed.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected by approvers ({rejectedApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Approval expired ({expiredApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-6 pt-4">
          {/* Filters, toolbar, table and pagination share one surface, the way
              the production payments page arranges them. */}
          <div className="rounded-lg border bg-card">
            <div className="grid gap-4 border-b p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex flex-col gap-1.5">
                <Label>Created</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 font-normal"
                    >
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      <span className="truncate">
                        {formatDateRangeLabel(dateRange)}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <div className="flex flex-col gap-2 p-2">
                      <div className="flex gap-1.5 px-1 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const today = new Date('2026-06-01T00:00:00')
                            const from = new Date(today)
                            from.setDate(from.getDate() - 6)
                            setDateRange({ from, to: today })
                          }}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const today = new Date('2026-06-01T00:00:00')
                            const from = new Date(today)
                            from.setDate(from.getDate() - 29)
                            setDateRange({ from, to: today })
                          }}
                        >
                          Last 30 days
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setDateRange(undefined)}
                        >
                          Clear
                        </Button>
                      </div>
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        defaultMonth={dateRange?.from ?? new Date('2026-06-01')}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Bank</Label>
                <Select
                  value={filterBank || '__all'}
                  onValueChange={(v) => setFilterBank(v === '__all' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All banks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All banks</SelectItem>
                    {BANK_FILTER_OPTIONS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Account</Label>
                <Select
                  value={filterAccount || '__all'}
                  onValueChange={(v) => setFilterAccount(v === '__all' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All accounts</SelectItem>
                    {ACCOUNTS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} · {a.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="flt-amount">Amount</Label>
                <Input
                  id="flt-amount"
                  value={filterAmount}
                  onChange={(e) => setFilterAmount(e.target.value)}
                  placeholder="Amount"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={filterStatus || '__all'}
                  onValueChange={(v) => setFilterStatus(v === '__all' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All statuses</SelectItem>
                    <SelectItem value="COMPLETED">
                      Completed ({counts.completed})
                    </SelectItem>
                    <SelectItem value="PENDING">
                      Pending ({counts.pending})
                    </SelectItem>
                    <SelectItem value="FAILED">
                      Failed ({counts.failed})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Legal entity</Label>
                <Select
                  value={filterEntity || '__all'}
                  onValueChange={(v) => setFilterEntity(v === '__all' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All entities</SelectItem>
                    {LEGAL_ENTITIES.map((e) => (
                      <SelectItem key={e.code} value={e.code}>
                        {e.code} — {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select
                  value={filterCurrency || '__all'}
                  onValueChange={(v) =>
                    setFilterCurrency(v === '__all' ? '' : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All currencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All currencies</SelectItem>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="flt-receiver">Receiver</Label>
                <Input
                  id="flt-receiver"
                  value={filterReceiver}
                  onChange={(e) => setFilterReceiver(e.target.value)}
                  placeholder="Search receiver"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="flt-payment-id">Payment ID</Label>
                <Input
                  id="flt-payment-id"
                  value={filterPaymentId}
                  onChange={(e) => setFilterPaymentId(e.target.value)}
                  placeholder="Search payment ID"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {selectedRows.length > 0 && (
                  <span>{selectedRows.length} selected</span>
                )}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                {selectedRows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => exportPaymentsCsv(selectedRows, accountById)}
                  >
                    <DownloadIcon className="size-4" />
                    Export CSV
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() => setHideSensitive((v) => !v)}
                >
                  {hideSensitive ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                  {hideSensitive
                    ? 'Show sensitive values'
                    : 'Hide sensitive values'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all rows on this page"
                        checked={
                          pageRows.length > 0 &&
                          pageRows.every((p) => selectedIds.has(p.id))
                        }
                        onCheckedChange={(checked) =>
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            for (const p of pageRows) {
                              if (checked) next.add(p.id)
                              else next.delete(p.id)
                            }
                            return next
                          })
                        }
                      />
                    </TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((p) => {
                    const refund = refundMap.get(p.id) ?? null
                    const retry = retryMap.get(p.id) ?? null
                    const account = accountById.get(p.senderAccountId) ?? null

                    const isPendingRefund =
                      refund?.status === 'Pending approval'
                    const isPendingRetry =
                      retry?.status === 'Pending approval'
                    const canReviewRefund =
                      isPendingRefund &&
                      can('Payment Approvals') &&
                      refund?.requester !== user.name
                    const canReviewRetry =
                      isPendingRetry &&
                      can('Payment Approvals') &&
                      retry?.requester !== user.name
                    const canReview = canReviewRefund || canReviewRetry
                    const statusPill = refund ? (
                      <RefundStatusPill status={refund.status} />
                    ) : retry ? (
                      <RefundStatusPill status={retry.status} />
                    ) : (
                      <PaymentStatusPill status={p.status} />
                    )
                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className="cursor-pointer"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${p.id}`}
                            checked={selectedIds.has(p.id)}
                            onCheckedChange={(checked) =>
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (checked) next.add(p.id)
                                else next.delete(p.id)
                                return next
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.createdAt}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {account ? (
                            <>
                              <div>{account.name}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {account.number}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="font-mono tabular-nums">
                              {p.amount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {p.currency}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div>
                            {p.receiverName || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          {p.receiverBankAccountNumber && (
                            <div className="font-mono text-xs text-muted-foreground">
                              {hideSensitive
                                ? maskTail(p.receiverBankAccountNumber)
                                : p.receiverBankAccountNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{statusPill}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canReview ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  if (canReviewRetry) {
                                    approveRetry(p.id, {
                                      name: user.name,
                                      actingAs: roles[0]?.name ?? 'No role',
                                    })
                                    toast.success('Retry approved', {
                                      description: `${p.id} — approved by ${user.name}`,
                                    })
                                  } else {
                                    approveRefund(p.id, {
                                      name: user.name,
                                      actingAs: roles[0]?.name ?? 'No role',
                                    })
                                    toast.success('Refund approved', {
                                      description: `${p.id} — approved by ${user.name}`,
                                    })
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  if (canReviewRetry) {
                                    rejectRetry(p.id, {
                                      name: user.name,
                                      actingAs: roles[0]?.name ?? 'No role',
                                    })
                                    toast.success('Retry rejected', {
                                      description: `${p.id} — rejected by ${user.name}`,
                                    })
                                  } else {
                                    rejectRefund(p.id, {
                                      name: user.name,
                                      actingAs: roles[0]?.name ?? 'No role',
                                    })
                                    toast.success('Refund rejected', {
                                      description: `${p.id} — rejected by ${user.name}`,
                                    })
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-8 p-0"
                                  aria-label="Row actions"
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelected(p)}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={p.status !== 'FAILED'}
                                  onClick={() => {
                                    navigate({
                                      to: '/payments',
                                      search: {
                                        action: 'retry-payment',
                                        paymentId: p.id,
                                      },
                                    })
                                  }}
                                >
                                  <RotateCcwIcon className="size-3.5" />
                                  Retry payment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No payments match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Showing {pageStart + 1}–{pageEnd} of {filtered.length}{' '}
                  payments
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </Button>
                  <span className="min-w-9 rounded-md border px-2 py-1 text-center text-sm">
                    {page}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pending approval — maker-checker queue for the checker role */}
        <TabsContent value="review" className="space-y-3 pt-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Pending approval ({pendingReview.length})
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Payments, refunds, retries, returns, and reversals submitted by
              makers — a checker must approve or reject them. Makers cannot
              approve their own submissions.
            </p>
          </div>
          {!can('Payment Approvals') && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                You're acting as a{' '}
                <span className="font-medium uppercase tracking-wider">
                  {roles[0]?.name ?? 'No role'}
                </span>
                . Switch to{' '}
                <span className="font-medium uppercase tracking-wider">
                  CHECKER
                </span>{' '}
                from the profile menu to approve or reject these requests.
              </span>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Request ID
                    </TableHead>
                    <TableHead>
                      Type
                    </TableHead>
                    <TableHead className="text-right">
                      Amount
                    </TableHead>
                    <TableHead>
                      Receiver
                    </TableHead>
                    <TableHead>
                      Requested by
                    </TableHead>
                    <TableHead>
                      Submitted at
                    </TableHead>
                    <TableHead className="w-[170px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReview.map((r) => {
                    const canAct =
                      can('Payment Approvals') && r.requester !== user.name
                    const approve = () => {
                      if (r.store === 'retry') {
                        approveRetry(r.id, { name: user.name, actingAs: roles[0]?.name ?? 'No role' })
                      } else {
                        approveRefund(r.id, { name: user.name, actingAs: roles[0]?.name ?? 'No role' })
                      }
                      toast.success(`${r.kind} approved`, {
                        description: `${r.id} — approved by ${user.name}`,
                      })
                    }
                    const reject = () => {
                      if (r.store === 'retry') {
                        rejectRetry(r.id, { name: user.name, actingAs: roles[0]?.name ?? 'No role' })
                      } else {
                        rejectRefund(r.id, { name: user.name, actingAs: roles[0]?.name ?? 'No role' })
                      }
                      toast.success(`${r.kind} rejected`, {
                        description: `${r.id} — rejected by ${user.name}`,
                      })
                    }
                    const kindPill =
                      r.kind === 'Retry'
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : r.kind === 'Payment'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : r.kind === 'Return'
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : r.kind === 'Reversal'
                              ? 'border-sky-300 bg-sky-50 text-sky-700'
                              : 'border-violet-300 bg-violet-50 text-violet-700'
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Mono>{r.id}</Mono>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider ${kindPill}`}
                          >
                            {r.kind}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                          {r.amount} {r.currency}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.receiverName || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.requester}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.submittedAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 px-2"
                              disabled={!canAct}
                              title={
                                canAct
                                  ? undefined
                                  : r.requester === user.name
                                    ? 'Makers cannot approve their own submissions'
                                    : 'Only checkers can approve'
                              }
                              onClick={approve}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              disabled={!canAct}
                              onClick={reject}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {pendingReview.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No requests awaiting review.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending review — credit transactions flagged for return */}
        <TabsContent value="exceptions" className="space-y-3 pt-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Pending review ({allUnprocessed.length})
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Credit transactions flagged for return — payment orders the
              bank rejected and returned as a separate credit line. Resubmit
              the payment; processing goes through maker-checker approval.
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Original txn
                    </TableHead>
                    <TableHead>
                      Counterparty
                    </TableHead>
                    <TableHead>
                      Amount
                    </TableHead>
                    <TableHead>
                      Type
                    </TableHead>
                    <TableHead>
                      Date
                    </TableHead>
                    <TableHead className="w-[150px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUnprocessed.map((r) => (
                    <TableRow key={r.originalTxnId}>
                      <TableCell>
                        <Mono>{r.originalTxnId}</Mono>
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.customer}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.amount}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-blue-700">
                          Return
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.date}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: '/payments',
                              search: {
                                action: 'retry-payment',
                                paymentId: r.originalTxnId,
                              },
                            })
                          }
                        >
                          <RotateCcwIcon className="size-3.5" />
                          Initiate return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {allUnprocessed.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Nothing pending review right now.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Rejected by approvers */}
        <TabsContent value="rejected" className="space-y-3 pt-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Rejected by approvers ({rejectedApprovals.length})
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Requests a checker rejected during maker-checker review. Submit a
              new request to try again.
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Request ID
                    </TableHead>
                    <TableHead>
                      Type
                    </TableHead>
                    <TableHead className="text-right">
                      Amount
                    </TableHead>
                    <TableHead>
                      Receiver
                    </TableHead>
                    <TableHead>
                      Requested by
                    </TableHead>
                    <TableHead>
                      Rejected by
                    </TableHead>
                    <TableHead>
                      Rejection reason
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedApprovals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Mono>{r.id}</Mono>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-700">
                          {r.kind}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {r.amount} {r.currency}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.receiverName}
                      </TableCell>
                      <TableCell className="text-sm">{r.requester}</TableCell>
                      <TableCell className="text-sm">
                        {r.reviewedBy ?? '—'}
                        {r.reviewedAt && (
                          <div className="text-[0.7rem] text-muted-foreground">
                            {r.reviewedAt}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                        {r.rejectionReason ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rejectedApprovals.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No rejected requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval expired */}
        <TabsContent value="expired" className="space-y-3 pt-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Approval expired ({expiredApprovals.length})
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Requests that were not reviewed before the approval window
              closed. Submit a new request to try again.
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Request ID
                    </TableHead>
                    <TableHead>
                      Type
                    </TableHead>
                    <TableHead className="text-right">
                      Amount
                    </TableHead>
                    <TableHead>
                      Receiver
                    </TableHead>
                    <TableHead>
                      Requested by
                    </TableHead>
                    <TableHead>
                      Submitted at
                    </TableHead>
                    <TableHead>
                      Expired at
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredApprovals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Mono>{r.id}</Mono>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-700">
                          {r.kind}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {r.amount} {r.currency}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.receiverName}
                      </TableCell>
                      <TableCell className="text-sm">{r.requester}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.submittedAt}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700">
                          {r.expiresAt}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expiredApprovals.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No expired requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <PaymentDetailSheet
        payment={selected}
        refund={selected ? refundMap.get(selected.id) ?? null : null}
        retry={selected ? retryMap.get(selected.id) ?? null : null}
        onOpenChange={(o) => {
          if (!o) setSelected(null)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function retryToPayment(r: SubmittedRetry): Payment {
  const status: Payment['status'] =
    r.status === 'Approved'
      ? 'COMPLETED'
      : r.status === 'Rejected'
        ? 'FAILED'
        : 'PENDING'
  return {
    id: r.id,
    amount: r.amount,
    createdAt: r.submittedAt,
    currency: r.currency,
    senderAccountId: '',
    status,
    type: r.type,
    updatedAt: r.reviewer?.at ?? r.submittedAt,
    organizationId: '',
    mode: 'LIVE',
    receiverBank: r.receiverBankBic,
    receiverName: r.receiverName,
    receiverBankAccountNumber: r.receiverAccountNumber,
    receiverLocalRoutingIdentifier: r.receiverLocalRoutingIdentifier,
    resultCode: '',
    underlyingErrorMessage: '',
    customerReference: r.originalPaymentId,
    paymentDetails: r.notes,
  }
}

function refundToPayment(r: SubmittedRefund): Payment {
  const status: Payment['status'] =
    r.status === 'Approved'
      ? 'COMPLETED'
      : r.status === 'Rejected'
        ? 'FAILED'
        : 'PENDING'
  return {
    id: r.id,
    amount: r.amount,
    createdAt: r.submittedAt,
    currency: r.currency,
    senderAccountId: '',
    status,
    type: 'REFUND',
    updatedAt: r.reviewer?.at ?? r.submittedAt,
    organizationId: '',
    mode: 'LIVE',
    receiverBank: r.receiverBic,
    receiverName: r.receiverName,
    receiverBankAccountNumber: r.receiverAccount,
    receiverLocalRoutingIdentifier: '',
    resultCode: '',
    underlyingErrorMessage: r.note,
    customerReference: r.originalTxnId ?? '',
    paymentDetails: r.reason,
  }
}

// Statuses are not colour-coded: production renders every one in the same
// solid Badge, and the word carries the meaning.
const PAYMENT_STATUS_LABEL: Record<Payment['status'], string> = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  FAILED: 'Failed',
}

function PaymentStatusPill({ status }: { status: Payment['status'] }) {
  return <Badge>{PAYMENT_STATUS_LABEL[status]}</Badge>
}

function RefundStatusPill({
  status,
}: {
  status: SubmittedRefund['status']
}) {
  return <Badge className="whitespace-nowrap">{status}</Badge>
}

// ---------------------------------------------------------------------------
// Lifecycle timeline + event log
// ---------------------------------------------------------------------------

type LifecycleStep = {
  label: string
  at: string | null
  state: 'done' | 'failed' | 'todo'
}

type PaymentEvent = {
  id: string
  title: string
  at: string
  icon: typeof FileTextIcon
  /** Chip shown before the title — the status code the rail reported. */
  tag?: string
  /** Shown under the title on steps that carry no payload of their own. */
  note?: string
  panels: { label: string; body: string }[]
}

function lifecycleSteps(p: Payment): LifecycleStep[] {
  const at = p.createdAt
  if (p.status === 'FAILED') {
    return [
      { label: 'Created', at, state: 'done' },
      { label: 'Pending', at, state: 'done' },
      { label: 'Authorized', at: null, state: 'todo' },
      { label: 'Failed', at: p.updatedAt || at, state: 'failed' },
    ]
  }
  if (p.status === 'PENDING') {
    return [
      { label: 'Created', at, state: 'done' },
      { label: 'Pending', at, state: 'done' },
      { label: 'Authorized', at: null, state: 'todo' },
      { label: 'Succeeded', at: null, state: 'todo' },
    ]
  }
  return [
    { label: 'Created', at, state: 'done' },
    { label: 'Pending', at, state: 'done' },
    { label: 'Authorized', at, state: 'done' },
    { label: 'Succeeded', at: p.updatedAt || at, state: 'done' },
  ]
}

/**
 * The lifecycle in the order it happens, oldest first:
 *   captured → authorized → initiated → processing → completed
 * Capture carries the Acme API pair; initiation onwards carries the messages
 * exchanged with the bank. A failed payment stops at a rejection instead of
 * processing, and a payment still in flight has no completion step yet.
 */
function paymentEvents(p: Payment, account: Account | null): PaymentEvent[] {
  const events: PaymentEvent[] = [
    {
      id: 'captured',
      title: 'Payment captured',
      at: p.createdAt,
      icon: FileTextIcon,
      panels: [
        {
          label: 'API request · POST /payments',
          body: buildPaymentRequestPayload(p),
        },
        {
          label: 'API response',
          body: buildCaptureResponsePayload(p),
        },
      ],
    },
    {
      id: 'authorized',
      title: 'Payment authorized',
      at: p.createdAt,
      icon: ShieldCheckIcon,
      note: 'Approval cleared and the order was released to the bank.',
      panels: [],
    },
    {
      id: 'initiated',
      title: 'Payment initiated',
      at: p.createdAt,
      icon: LandmarkIcon,
      tag: 'ACTC',
      panels: [
        { label: 'Request', body: buildBankRequestPayload(p, account) },
        { label: 'Response', body: buildBankResponsePayload(p, 'ACTC') },
      ],
    },
  ]

  if (p.status === 'FAILED') {
    events.push({
      id: 'failed',
      title: 'Payment failed',
      at: p.updatedAt || p.createdAt,
      icon: XIcon,
      tag: 'RJCT',
      panels: [
        { label: 'Response', body: buildBankResponsePayload(p, 'RJCT') },
        {
          label: `API response · GET /payments/${p.id}`,
          body: buildPaymentRawPayload(p, null, null),
        },
      ],
    })
    return events
  }

  // Processing covers the status polls while the rail still answers PDNG.
  events.push({
    id: 'processing',
    title: 'Payment processing',
    // Row stamps stay in the display format the rest of the sheet uses; the
    // per-message ISO stamps live inside the payloads.
    at: p.createdAt,
    icon: RefreshCwIcon,
    tag: 'PDNG',
    note: 'Status polled until the bank stops answering PDNG.',
    panels: [
      { label: 'Request · poll 1', body: buildBankEnquiryPayload(p, 1) },
      {
        label: 'Response · poll 1 (ACK2)',
        body: buildBankResponsePayload(p, 'PDNG', 1),
      },
      { label: 'Request · poll 2', body: buildBankEnquiryPayload(p, 2) },
      {
        label: 'Response · poll 2 (ACK3)',
        body: buildBankResponsePayload(p, 'PDNG', 2),
      },
    ],
  })

  if (p.status === 'COMPLETED') {
    events.push({
      id: 'completed',
      title: 'Payment completed',
      at: p.updatedAt || p.createdAt,
      icon: CheckIcon,
      tag: 'ACCP',
      panels: [
        { label: 'Response', body: buildBankResponsePayload(p, 'ACCP') },
        {
          label: `API response · GET /payments/${p.id}`,
          body: buildPaymentRawPayload(p, null, null),
        },
      ],
    })
  }

  return events
}

function PaymentLifecycle({ payment }: { payment: Payment }) {
  const steps = lifecycleSteps(payment)
  return (
    <div className="flex items-start">
      {steps.map((step, i) => (
        <div key={step.label} className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center">
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border-2 bg-card',
                step.state === 'done' && 'border-emerald-600 text-emerald-600',
                step.state === 'failed' && 'border-destructive text-destructive',
                step.state === 'todo' && 'border-border text-muted-foreground',
              )}
            >
              {step.state === 'failed' ? (
                <XIcon className="size-3.5" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1',
                  steps[i + 1].state === 'todo'
                    ? 'bg-border'
                    : steps[i + 1].state === 'failed'
                      ? 'bg-destructive'
                      : 'bg-emerald-600',
                )}
              />
            )}
          </div>
          <div className="mt-2 pr-2">
            <div
              className={cn(
                'truncate text-sm font-semibold',
                step.state === 'todo' && 'text-muted-foreground',
              )}
            >
              {step.label}
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {step.at ?? '—'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentEventLog({
  payment,
  account,
}: {
  payment: Payment
  account: Account | null
}) {
  const events = React.useMemo(
    () => paymentEvents(payment, account),
    [payment, account],
  )
  const [openId, setOpenId] = React.useState<string | null>(null)

  return (
    <div className="flex flex-col">
      {events.map((event, i) => {
        const isOpen = openId === event.id
        const hasPanels = event.panels.length > 0
        const Icon = event.icon
        return (
          <div key={event.id} className="flex gap-3">
            {/* Rail: icon, then the line down to the next event. */}
            <div className="flex flex-col items-center">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground">
                <Icon className="size-3.5" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <button
                type="button"
                onClick={() =>
                  hasPanels && setOpenId(isOpen ? null : event.id)
                }
                aria-expanded={hasPanels ? isOpen : undefined}
                disabled={!hasPanels}
                className={cn(
                  'flex w-full items-center gap-2 text-left',
                  !hasPanels && 'cursor-default',
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {event.title}
                </span>
                {event.tag && (
                  <Badge variant="secondary" className="shrink-0 font-mono">
                    {event.tag}
                  </Badge>
                )}
                {hasPanels && (
                  <ChevronDownIcon
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                )}
              </button>
              <div className="font-mono text-xs text-muted-foreground">
                {event.at}
              </div>
              {event.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.note}
                </p>
              )}
              {isOpen && (
                <div className="mt-3 flex flex-col gap-3">
                  {event.panels.map((panel) => (
                    <div key={panel.label} className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                          {panel.label}
                        </span>
                        <CopyButton value={panel.body} />
                      </div>
                      <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                        {panel.body}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail Sheet
// ---------------------------------------------------------------------------

function PaymentDetailSheet({
  payment,
  refund,
  retry,
  onOpenChange,
}: {
  payment: Payment | null
  refund: SubmittedRefund | null
  retry: SubmittedRetry | null
  onOpenChange: (o: boolean) => void
}) {
  const navigate = useNavigate()
  const open = payment !== null
  const account = payment
    ? (ACCOUNTS.find((a) => a.id === payment.senderAccountId) ?? null)
    : null
  const entity = account
    ? (LEGAL_ENTITIES.find((e) => e.code === account.legalEntity) ?? null)
    : null
  const headerStatusPill = payment
    ? refund
      ? <RefundStatusPill status={refund.status} />
      : retry
        ? <RefundStatusPill status={retry.status} />
        : <PaymentStatusPill status={payment.status} />
    : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The width has to be set through the data-[side] variants: the base
          sheet applies `data-[side=right]:sm:max-w-sm`, which outranks a plain
          max-w utility and was squeezing the two-column fields. */}
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        {payment && (
          <>
            {/* Production leads with the amount, not the id: the number is what
                someone opening a payment is here to check. */}
            <SheetHeader className="border-b">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <SheetTitle className="text-2xl font-bold tracking-tight">
                  {payment.amount}
                </SheetTitle>
                <span className="text-sm text-muted-foreground">
                  {payment.currency}
                </span>
                {headerStatusPill}
              </div>
              <SheetDescription className="sr-only">
                Payment {payment.id}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <DetailSection title="Payment">
                <DetailField label="Status">{headerStatusPill}</DetailField>
                <DetailField label="Type">
                  <Badge variant="secondary" className="font-mono">
                    {payment.type}
                  </Badge>
                </DetailField>
                <DetailField label="Payment ID" mono copyValue={payment.id}>
                  {payment.id}
                </DetailField>
              </DetailSection>

              <DetailSection
                title="Sending account"
                description="Where the money left from."
              >
                <DetailField label="Account name">{account?.name}</DetailField>
                <DetailField
                  label="Account number"
                  mono
                  copyValue={account?.number}
                >
                  {account?.number}
                </DetailField>
                <DetailField label="Bank">{account?.bank}</DetailField>
                <DetailField label="SWIFT/BIC" mono copyValue={account?.swiftBic}>
                  {account?.swiftBic}
                </DetailField>
                <DetailField label="Legal entity">
                  {entity ? `${entity.code} · ${entity.name}` : account?.legalEntity}
                </DetailField>
                <DetailField
                  label="Internal account ID"
                  mono
                  copyValue={payment.senderAccountId}
                >
                  {payment.senderAccountId}
                </DetailField>
              </DetailSection>

              <DetailSection
                title="Receiver"
                description="The other side of this payment."
              >
                <DetailField label="Receiver name">
                  {payment.receiverName}
                </DetailField>
                <DetailField
                  label="Receiver bank (BIC)"
                  mono
                  copyValue={payment.receiverBank}
                >
                  {payment.receiverBank}
                </DetailField>
                <DetailField
                  label="Receiver account no."
                  mono
                  copyValue={payment.receiverBankAccountNumber}
                >
                  {payment.receiverBankAccountNumber
                    ? maskTail(payment.receiverBankAccountNumber)
                    : ''}
                </DetailField>
                <DetailField
                  label="Local routing ID"
                  mono
                  copyValue={payment.receiverLocalRoutingIdentifier}
                >
                  {payment.receiverLocalRoutingIdentifier}
                </DetailField>
              </DetailSection>

              <DetailSection
                title="Payment information"
                description="Hover a value to copy it."
              >
                <DetailField
                  label="Customer reference"
                  mono
                  copyValue={payment.customerReference}
                >
                  {payment.customerReference}
                </DetailField>
                <DetailField label="Bank reference" mono>
                  {payment.status === 'COMPLETED'
                    ? bankIds(payment).txnRefId
                    : ''}
                </DetailField>
                {/* The fixtures carry no purpose code on historic payments;
                    it only exists on requests raised in this session. */}
                <DetailField label="Purpose of payment">
                  {retry?.purpose}
                </DetailField>
                <DetailField label="Payment details" className="sm:col-span-2">
                  {payment.paymentDetails}
                </DetailField>
              </DetailSection>

              <DetailSection
                title="Dates"
                description="When Acme first recorded this payment order."
              >
                <DetailField label="Created at">{payment.createdAt}</DetailField>
              </DetailSection>

              {payment.status === 'FAILED' && (
                <DetailSection
                  title="Result"
                  description="Why the bank did not process this payment."
                >
                  <DetailField label="Result code" mono>
                    {payment.resultCode}
                  </DetailField>
                  <DetailField
                    label="Underlying error message"
                    mono
                    className="sm:col-span-2"
                  >
                    {payment.underlyingErrorMessage}
                  </DetailField>
                </DetailSection>
              )}

              {retry && (
                <DetailSection
                  title="Retry of"
                  description="The failed payment this request resubmits."
                >
                  <DetailField
                    label="Original payment"
                    mono
                    copyValue={retry.originalPaymentId}
                  >
                    {retry.originalPaymentId}
                  </DetailField>
                  <DetailField label="Requester">
                    {retry.requester} · Maker
                  </DetailField>
                  {retry.reviewer && (
                    <DetailField label="Reviewed by" className="sm:col-span-2">
                      {retry.status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
                      {retry.reviewer.name} ({retry.reviewer.actingAs}) —{' '}
                      {retry.reviewer.at}
                    </DetailField>
                  )}
                  {retry.notes && (
                    <DetailField label="Notes" className="sm:col-span-2">
                      {retry.notes}
                    </DetailField>
                  )}
                </DetailSection>
              )}

              {refund?.reviewer && (
                <DetailSection
                  title="Maker-checker"
                  description="Who raised this request, and who reviewed it."
                >
                  <DetailField label="Requester">
                    {refund.requester} · Maker
                  </DetailField>
                  <DetailField label="Reviewed by">
                    {refund.status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
                    {refund.reviewer.name} ({refund.reviewer.actingAs}) —{' '}
                    {refund.reviewer.at}
                  </DetailField>
                </DetailSection>
              )}

              <section className="rounded-lg border bg-card">
                <header className="border-b px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Lifecycle
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Every step this payment order went through.
                  </p>
                </header>
                <div className="px-4 py-5">
                  <PaymentLifecycle payment={payment} />
                </div>
                <header className="border-y bg-muted/30 px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    All events
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Open an event to see the API payload and the message
                    exchanged with the bank.
                  </p>
                </header>
                <div className="px-4 py-4">
                  <PaymentEventLog payment={payment} account={account} />
                </div>
              </section>

              {paymentRequiresAttention(payment) && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      onOpenChange(false)
                      navigate({
                        to: '/payments',
                        search: {
                          action: 'retry-payment',
                          paymentId: payment.id,
                        },
                      })
                    }}
                  >
                    <RotateCcwIcon className="size-3.5" />
                    Retry payment
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

/**
 * Label over value, label in small caps — the detail-sheet field as production
 * renders it. `copyValue` reveals a copy button on hover, which is what the
 * "Hover a value to copy it." hint refers to.
 */
function DetailField({
  label,
  mono,
  copyValue,
  className,
  children,
}: {
  label: string
  mono?: boolean
  copyValue?: string
  className?: string
  children?: React.ReactNode
}) {
  const isEmpty =
    children == null || children === '' || children === false
  return (
    <div className={cn('group flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </span>
      <div className="flex min-h-6 items-center gap-1.5">
        {isEmpty ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <>
            <span className={cn('text-sm', mono && 'font-mono break-all')}>
              {children}
            </span>
            {copyValue && (
              <CopyButton
                value={copyValue}
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// New refund from txn (separate code path via ?action=new-refund&txnId=)
// ---------------------------------------------------------------------------

function NewRefundFromTxn({ txn }: { txn: Txn | null }) {
  const navigate = useNavigate()
  const { user, roles, can } = useUser()

  const [amount, setAmount] = React.useState(txn?.amount ?? '')
  const [reason, setReason] = React.useState<RefundReason | ''>('')
  const [note, setNote] = React.useState('')
  const [receiverName, setReceiverName] = React.useState(txn?.senderName ?? '')
  const [receiverBic, setReceiverBic] = React.useState('')
  const [receiverAccount, setReceiverAccount] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [city, setCity] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const goBack = () =>
    navigate({
      to: '/payments',
      search: { action: undefined, txnId: undefined, paymentId: undefined },
    })

  const noteRequired = reason === 'Other'
  const canSubmit =
    !!reason &&
    amount.trim().length > 0 &&
    receiverName.trim().length > 0 &&
    receiverBic.trim().length > 0 &&
    receiverAccount.trim().length > 0 &&
    (!noteRequired || note.trim().length > 0)

  const submit = () => {
    const now = new Date()
    const month = now.toLocaleString('en-US', { month: 'short' })
    const day = now.getDate()
    const year = now.getFullYear()
    const hh = String(((now.getHours() + 11) % 12) + 1).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    const submittedAt = `${month} ${day}, ${year} at ${hh}:${mm} ${ampm}`
    const refundId = `rf_${Math.random().toString(36).slice(2, 14).toUpperCase()}`

    addRefund({
      id: refundId,
      originalTxnId: txn?.id ?? null,
      amount,
      currency: txn?.currency ?? 'SGD',
      reason: reason as string,
      note,
      receiverName,
      receiverBic,
      receiverAccount,
      address,
      city,
      country,
      requester: user.name,
      submittedAt,
      status: 'Pending approval',
    })

    toast.success('Refund request submitted', {
      description: txn
        ? `${txn.id} — awaiting maker-checker approval`
        : 'Awaiting maker-checker approval',
    })
    goBack()
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <FormPageHeader
        onBack={goBack}
        title="New refund payment"
        description="Refunds use the Payments API with a refund flag. Pre-filled from the source transaction where available — fill in any missing beneficiary details to continue."
      />

      {can('Payment Approvals') && (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>You're acting as a checker</AlertTitle>
          <AlertDescription>
            Switch to maker from the profile menu to submit a new refund.
          </AlertDescription>
        </Alert>
      )}

      <FormSection
        title="Request context"
        description="The transaction being refunded, and who is raising the request."
      >
        <FieldGrid>
          <FieldRow
            label="Original transaction ID"
            value={txn?.id}
            mono
          />
          <FieldRow
            label="Requester"
            value={
              <>
                {user.name}
                <span className="text-muted-foreground">
                  {' '}
                  · {roles[0]?.name ?? 'No role'} — Acme Operations Team
                </span>
              </>
            }
          />
          <FieldRow label="Date of request" value={todayDisplay()} />
          {txn && (
            <>
              <FieldRow
                label="Original amount"
                value={`${txn.amount} ${txn.currency}`}
              />
              <FieldRow
                label="Original transaction date"
                value={txn.transactionDate}
                mono
              />
              <FieldRow
                label="Original bank reference"
                value={txn.bankRef}
                mono
              />
            </>
          )}
        </FieldGrid>
      </FormSection>

      <FormSection
        title="Refund details"
        description="Amount and reason. Both are carried into the maker-checker record."
      >
        <FieldGroup>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField
              label={`Refund amount ${txn?.currency ? `(${txn.currency})` : ''}`}
              htmlFor="amount"
              hint="Edit for a partial refund."
            >
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                disabled
              />
            </FormField>
            <FormField label="Reason" htmlFor="reason">
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as RefundReason)}
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Note" required={noteRequired} htmlFor="note">
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                noteRequired
                  ? 'Required when reason is Other'
                  : 'Optional context for the checker'
              }
              rows={3}
            />
          </FormField>
        </FieldGroup>
      </FormSection>

      <FormSection
        title="Receiver details"
        description="Receiver name was pre-filled from the source transaction. BIC and account number must be entered manually."
      >
        <FieldGroup>
          <FormField label="Receiver name" htmlFor="receiver-name">
            <Input
              id="receiver-name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Beneficiary account name"
              disabled
            />
          </FormField>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField
              label="Receiver bank BIC / SWIFT"
              htmlFor="receiver-bic"
            >
              <Input
                id="receiver-bic"
                value={receiverBic}
                onChange={(e) => setReceiverBic(e.target.value)}
                placeholder="DBSSSGSGXXX"
                className="font-mono"
              />
            </FormField>
            <FormField
              label="Receiver account number"
              htmlFor="receiver-account"
            >
              <Input
                id="receiver-account"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                placeholder="0123456789"
                className="font-mono"
              />
            </FormField>
          </div>
          <FormField label="Address" htmlFor="address">
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street and number"
            />
          </FormField>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField label="City" htmlFor="city">
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Singapore"
              />
            </FormField>
            <FormField label="Country" htmlFor="country">
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Singapore"
              />
            </FormField>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection
        title="Attachments"
        description="Attach bank statements or other evidence. Uploaded files become part of the audit trail for this refund."
      >
        <AttachmentPicker
          files={attachedFiles}
          onFiles={setAttachedFiles}
          inputRef={fileInputRef}
        />
      </FormSection>

      <MakerCheckerPreview requester={user.name}>
        Logged automatically as a refund payment
        {attachedFiles.length > 0
          ? ` with ${attachedFiles.length} document${attachedFiles.length > 1 ? 's' : ''} attached`
          : ''}
        .
      </MakerCheckerPreview>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={goBack}>
          Cancel
        </Button>
        <Button disabled={!canSubmit} onClick={submit}>
          Submit refund request
        </Button>
      </div>
    </div>
  )
}



// ---------------------------------------------------------------------------
// New payment (full page, ?action=new-payment)
// ---------------------------------------------------------------------------

function NewPaymentPage() {
  const navigate = useNavigate()
  const { user, roles, can } = useUser()

  // Flat account list — pick any account the user can see, no entity scoping.
  const senderAccounts = React.useMemo(() => ACCOUNTS, [])
  const [senderAccountId, setSenderAccountId] = React.useState('')
  const senderAccount =
    senderAccounts.find((a) => a.id === senderAccountId) ?? null

  const [linkedId, setLinkedId] = React.useState('')
  const [linkQuery, setLinkQuery] = React.useState('')
  const [receiverName, setReceiverName] = React.useState('')
  const [receiverBic, setReceiverBic] = React.useState('')
  const [receiverAccount, setReceiverAccount] = React.useState('')
  const [receiverRouting, setReceiverRouting] = React.useState('')
  // Receiver address — required/optional per the SCB SG payment rules
  // (docs.tryacme.com/guides/scb-sg-api-payments): city + country required.
  const [addrLine1, setAddrLine1] = React.useState('')
  const [addrLine2, setAddrLine2] = React.useState('')
  const [addrCity, setAddrCity] = React.useState('')
  const [addrState, setAddrState] = React.useState('')
  const [addrPostal, setAddrPostal] = React.useState('')
  const [addrCountry, setAddrCountry] = React.useState('SG')
  const [amount, setAmount] = React.useState('')
  const [currency, setCurrency] = React.useState<string>('SGD')
  const [paymentType, setPaymentType] = React.useState<string>('FAST')
  const [chargeBearer, setChargeBearer] = React.useState<string>('SENDER')
  const [purpose, setPurpose] = React.useState('')
  const [customerRef, setCustomerRef] = React.useState(() =>
    generateCustomerRef(),
  )
  const [notes, setNotes] = React.useState('')
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Look up existing transactions and payments to link this payment to.
  const linkResults = React.useMemo(() => {
    const needle = linkQuery.trim().toLowerCase()
    if (!needle) return []
    const txns = TRANSACTIONS
      .filter(
        (t) =>
          t.id.toLowerCase().includes(needle) ||
          t.senderName.toLowerCase().includes(needle),
      )
      .map((t) => ({
        id: t.id,
        kind: 'TXN' as const,
        label: t.senderName,
        amount: `${t.currency} ${t.amount}`,
      }))
    const pymts = allPayments
      .filter(
        (p) =>
          p.id.toLowerCase().includes(needle) ||
          p.receiverName.toLowerCase().includes(needle),
      )
      .map((p) => ({
        id: p.id,
        kind: 'PYMT' as const,
        label: p.receiverName,
        amount: `${p.currency} ${p.amount}`,
      }))
    return [...txns, ...pymts].slice(0, 6)
  }, [linkQuery])

  // Balance is fetched on demand for the selected account only — the
  // balances API is billed per call.
  const [fetchedBalance, setFetchedBalance] = React.useState<Account | null>(
    null,
  )
  const [balancesAsOf, setBalancesAsOf] = React.useState('')
  const [loadingBalances, setLoadingBalances] = React.useState(false)

  const getBalance = () => {
    if (loadingBalances || !senderAccount) return
    setLoadingBalances(true)
    window.setTimeout(() => {
      setFetchedBalance(senderAccount)
      setBalancesAsOf(
        `${new Date().toLocaleString('en-SG', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })} SGT`,
      )
      setLoadingBalances(false)
      toast.success('Balance retrieved', {
        description: `${senderAccount.name} — latest available balance fetched from the bank.`,
      })
    }, 900)
  }

  // Sufficiency check against the entered amount, once a balance is fetched.
  const amountNum = Number(amount.replace(/,/g, ''))
  const sufficiency =
    fetchedBalance && amount.trim() !== '' && !isNaN(amountNum) && amountNum > 0
      ? fetchedBalance.lastBalance >= amountNum
        ? 'sufficient'
        : 'insufficient'
      : null

  const goBack = () =>
    navigate({
      to: '/payments',
      search: { action: undefined, txnId: undefined, paymentId: undefined },
    })

  const canSubmit =
    senderAccountId !== '' &&
    receiverName.trim() !== '' &&
    amount.trim() !== '' &&
    receiverAccount.trim() !== '' &&
    receiverBic.trim() !== '' &&
    addrCity.trim() !== '' &&
    addrCountry.trim() !== '' &&
    purpose !== '' &&
    customerRef.trim() !== ''

  const submit = () => {
    const now = new Date()
    const month = now.toLocaleString('en-US', { month: 'short' })
    const day = now.getDate()
    const year = now.getFullYear()
    const hh = String(((now.getHours() + 11) % 12) + 1).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    const submittedAt = `${month} ${day}, ${year} at ${hh}:${mm} ${ampm}`
    const payId = `pay_${Math.random().toString(36).slice(2, 14).toUpperCase()}`

    addRetry({
      id: payId,
      originalPaymentId: linkedId,
      amount,
      currency,
      receiverName,
      receiverBankBic: receiverBic,
      receiverAccountNumber: receiverAccount,
      receiverLocalRoutingIdentifier: receiverRouting,
      type: paymentType,
      notes,
      requester: user.name,
      submittedAt,
      status: 'Pending approval',
      kind: 'payment',
      purpose,
      customerReference: customerRef,
    })

    toast.success('Payment submitted for approval', {
      description: `${receiverName} · ${amount} ${currency} — awaiting checker approval.`,
    })
    goBack()
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <FormPageHeader
        onBack={goBack}
        title="Create payment"
        description="Submit a new outbound payment. Goes through maker-checker before Acme executes."
      />

      {can('Payment Approvals') && (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>
            You're acting as a checker
          </AlertTitle>
          <AlertDescription>
            Switch to maker from the profile menu to submit a new payment.
          </AlertDescription>
        </Alert>
      )}

      <FormSection
        title="Request context"
        description="Who is raising this payment, and the record it relates to."
      >
        <FieldGrid>
          <FieldRow
            label="Requester"
            value={
              <>
                {user.name}
                <span className="text-muted-foreground">
                  {' '}
                  · {roles[0]?.name ?? 'No role'} — Acme Operations Team
                </span>
              </>
            }
          />
          <FieldRow label="Date of request" value={todayDisplay()} />
          <FormField
            className="sm:col-span-2"
            label="Link to transaction / payment ID"
            hint="Optional — search and select an existing transaction or payment to link this payment to."
          >
            {linkedId ? (
              <div className="flex w-fit items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
                <Mono>{linkedId}</Mono>
                <button
                  type="button"
                  onClick={() => {
                    setLinkedId('')
                    setLinkQuery('')
                  }}
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label="Remove linked record"
                >
                  <XIcon className="size-3 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="max-w-md space-y-1.5">
                <Input
                  value={linkQuery}
                  onChange={(e) => setLinkQuery(e.target.value)}
                  placeholder="Search by txn / payment ID or counterparty name…"
                />
                {linkResults.length > 0 && (
                  <div className="divide-y overflow-hidden rounded-md border bg-card shadow-sm">
                    {linkResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                        onClick={() => {
                          setLinkedId(r.id)
                          setLinkQuery('')
                        }}
                      >
                        <Badge variant="secondary" className="shrink-0">
                          {r.kind}
                        </Badge>
                        <Mono className="shrink-0 text-xs text-muted-foreground">
                          {r.id}
                        </Mono>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {r.label}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {r.amount}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {linkQuery.trim() !== '' && linkResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No matching transactions or payments.
                  </p>
                )}
              </div>
            )}
          </FormField>
        </FieldGrid>
      </FormSection>

      <FormSection
        title="Originating account"
        description="Select the account to pay from, then get its balance to confirm sufficient funds. The balances API is billed per call, so retrieval is on demand."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={senderAccountId}
              onValueChange={(v) => {
                setSenderAccountId(v)
                setFetchedBalance(null)
                const acct = senderAccounts.find((a) => a.id === v)
                if (acct) setCurrency(acct.currency)
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select the account to pay from *" />
              </SelectTrigger>
              <SelectContent>
                {senderAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.bank} · {a.legalEntity} · {a.name} · {a.number} ·{' '}
                    {a.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={getBalance}
              disabled={!senderAccount || loadingBalances}
              title={
                senderAccount
                  ? undefined
                  : 'Select an originating account first'
              }
            >
              {loadingBalances ? (
                <RefreshCwIcon className="size-4 animate-spin" />
              ) : (
                <WalletIcon className="size-4" />
              )}
              {loadingBalances ? 'Retrieving…' : 'Get balance'}
            </Button>
          </div>
          {senderAccount && (
            <p className="font-mono text-xs text-muted-foreground">
              {senderAccount.id} · Acct {senderAccount.number} · BIC{' '}
              {senderAccount.swiftBic || '—'} · IBAN {senderAccount.iban || '—'}
            </p>
          )}
          {fetchedBalance && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {fetchedBalance.name}
                  </span>
                  <Badge variant="secondary">Available balance</Badge>
                </div>
                <span className="text-lg font-semibold tabular-nums whitespace-nowrap">
                  {formatMoney(
                    fetchedBalance.currency,
                    fetchedBalance.lastBalance,
                  )}
                </span>
              </div>
              {sufficiency === 'sufficient' && (
                <Alert>
                  <CheckIcon />
                  <AlertTitle>Sufficient funds</AlertTitle>
                  <AlertDescription>
                    Available balance covers{' '}
                    {formatMoney(fetchedBalance.currency, amountNum)}.
                  </AlertDescription>
                </Alert>
              )}
              {sufficiency === 'insufficient' && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Insufficient funds</AlertTitle>
                  <AlertDescription>
                    The payment amount{' '}
                    {formatMoney(fetchedBalance.currency, amountNum)} exceeds
                    the available balance. Top up the account or reduce the
                    amount.
                  </AlertDescription>
                </Alert>
              )}
              {sufficiency === null && (
                <p className="text-xs text-muted-foreground">
                  Enter a payment amount below to check fund sufficiency.
                </p>
              )}
              <p className="font-mono text-xs text-muted-foreground">
                As of {balancesAsOf}
              </p>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Payment details"
        description={
          senderAccount ? (
            <>
              Paying from{' '}
              <span className="font-medium text-foreground">
                {senderAccount.name}
              </span>{' '}
              <span className="font-mono">({senderAccount.number})</span>
            </>
          ) : (
            'Select an originating account above before submitting.'
          )
        }
      >
        <FieldGroup>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
            <FormField label="Amount" required htmlFor="pay-amount">
              <Input
                id="pay-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </FormField>
            <FormField label="Currency">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Payment type">
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          {paymentType === 'TT' && (
            <FormField
              label="Bank charge bearer"
              hint="Who bears the bank charges for this TT payment — you (SENDER), the beneficiary (RECEIVER), or split (SHARED)."
            >
              <Select value={chargeBearer} onValueChange={setChargeBearer}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARGE_BEARERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField label="Purpose of payment" required>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a purpose code" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_PURPOSES.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Customer reference"
              required
              htmlFor="pay-cust-ref"
              hint="Unique ID for this payment — pre-generated, editable."
            >
              <Input
                id="pay-cust-ref"
                value={customerRef}
                onChange={(e) => setCustomerRef(e.target.value)}
                className="font-mono"
              />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="pay-notes">
            <Textarea
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for the checker"
              rows={3}
            />
          </FormField>
        </FieldGroup>
      </FormSection>

      <FormSection
        title="Receiver details"
        description="Beneficiary name and routing details for the outbound leg."
      >
        <FieldGroup>
          <FormField label="Receiver name" required htmlFor="pay-rcv-name">
            <Input
              id="pay-rcv-name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Beneficiary account name"
            />
          </FormField>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField label="Receiver bank BIC" required htmlFor="pay-rcv-bic">
              <Input
                id="pay-rcv-bic"
                value={receiverBic}
                onChange={(e) => setReceiverBic(e.target.value)}
                placeholder="DBSSSGSGXXX"
                className="font-mono"
              />
            </FormField>
            <FormField label="Account number" required htmlFor="pay-rcv-acct">
              <Input
                id="pay-rcv-acct"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                placeholder="0123456789"
                className="font-mono"
              />
            </FormField>
          </div>
          <FormField label="Local routing identifier" htmlFor="pay-rcv-routing">
            <Input
              id="pay-rcv-routing"
              value={receiverRouting}
              onChange={(e) => setReceiverRouting(e.target.value)}
              placeholder="004"
              className="font-mono"
            />
          </FormField>
        </FieldGroup>
      </FormSection>

      {/* Receiver address — required/optional per the SCB SG payment rules
          (docs.tryacme.com/guides/scb-sg-api-payments): city + country. */}
      <FormSection
        title="Receiver address"
        description="City and country are required. The other fields are optional but improve straight-through processing."
      >
        <FieldGroup>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField label="Address line 1" htmlFor="pay-addr1">
              <Input
                id="pay-addr1"
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="20 Main Street"
                maxLength={70}
              />
            </FormField>
            <FormField label="Address line 2" htmlFor="pay-addr2">
              <Input
                id="pay-addr2"
                value={addrLine2}
                onChange={(e) => setAddrLine2(e.target.value)}
                placeholder="Unit #03-45"
                maxLength={70}
              />
            </FormField>
            <FormField label="City" required htmlFor="pay-city">
              <Input
                id="pay-city"
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                placeholder="Singapore"
                maxLength={35}
              />
            </FormField>
            <FormField label="State" htmlFor="pay-state">
              <Input
                id="pay-state"
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                maxLength={35}
              />
            </FormField>
            <FormField label="Postal code" htmlFor="pay-postal">
              <Input
                id="pay-postal"
                value={addrPostal}
                onChange={(e) => setAddrPostal(e.target.value)}
                placeholder="11111"
                maxLength={16}
                className="font-mono"
              />
            </FormField>
            <FormField
              label="Country"
              required
              htmlFor="pay-country"
              hint="ISO 3166-1 alpha-2 code"
            >
              <Input
                id="pay-country"
                value={addrCountry}
                onChange={(e) => setAddrCountry(e.target.value.toUpperCase())}
                placeholder="SG"
                maxLength={2}
                className="w-24 font-mono uppercase"
              />
            </FormField>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection
        title="Attachments"
        description="Attach supporting documents. Files become part of the audit trail."
      >
        <AttachmentPicker
          files={attachedFiles}
          onFiles={setAttachedFiles}
          inputRef={fileInputRef}
        />
      </FormSection>

      <MakerCheckerPreview requester={user.name}>
        Logged as a new outbound payment.
      </MakerCheckerPreview>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={goBack}>
          Cancel
        </Button>
        <Button disabled={!canSubmit} onClick={submit}>
          Submit for approval
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// New retry from payment (separate code path via ?action=retry-payment&paymentId=)
// ---------------------------------------------------------------------------

function NewRetryFromPayment({ payment }: { payment: Payment | null }) {
  const navigate = useNavigate()
  const { user, roles, can } = useUser()

  const goBack = () =>
    navigate({
      to: '/payments',
      search: {
        action: undefined,
        txnId: undefined,
        paymentId: undefined,
      },
    })

  // Exceptions (returns/reversals) arrive without receiver details — start
  // those in recreate mode so the fields are editable.
  const [retryMode, setRetryMode] = React.useState<'original' | 'recreate'>(
    payment?.receiverBankAccountNumber ? 'original' : 'recreate',
  )
  const [receiverName, setReceiverName] = React.useState(
    payment?.receiverName ?? '',
  )
  const [receiverBic, setReceiverBic] = React.useState(
    payment?.receiverBank ?? '',
  )
  const [receiverAccount, setReceiverAccount] = React.useState(
    payment?.receiverBankAccountNumber ?? '',
  )
  const [receiverRouting, setReceiverRouting] = React.useState(
    payment?.receiverLocalRoutingIdentifier ?? '',
  )
  const [amount, setAmount] = React.useState(payment?.amount ?? '')
  const [currency, setCurrency] = React.useState(payment?.currency ?? 'SGD')
  const [paymentType, setPaymentType] = React.useState(payment?.type ?? 'FAST')
  const [chargeBearer, setChargeBearer] = React.useState<string>('SENDER')
  const [notes, setNotes] = React.useState('')
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Return flow: initiated from the Pending review tab — no failure context,
  // and the operator must give a reason for the return.
  const isReturn = payment?.resultCode === 'RETURNED_BY_BANK'
  const [returnReason, setReturnReason] = React.useState('')
  // Required payment information shared with the create payment page.
  const [purpose, setPurpose] = React.useState(isReturn ? 'RFND' : '')
  const [customerRef, setCustomerRef] = React.useState(() =>
    generateCustomerRef(),
  )

  // Originating account — defaults to the original payment's sender account,
  // but the user can pick a different one (same as the create payment page).
  const senderAccounts = React.useMemo(() => ACCOUNTS, [])
  const [senderAccountId, setSenderAccountId] = React.useState(
    () =>
      senderAccounts.find((a) => a.id === payment?.senderAccountId)?.id ??
      senderAccounts[0]?.id ??
      '',
  )
  const senderAccount =
    senderAccounts.find((a) => a.id === senderAccountId) ?? null
  const [fetchedBalance, setFetchedBalance] = React.useState<Account | null>(
    null,
  )
  const [balancesAsOf, setBalancesAsOf] = React.useState('')
  const [loadingBalances, setLoadingBalances] = React.useState(false)

  const getBalance = () => {
    if (loadingBalances || !senderAccount) return
    setLoadingBalances(true)
    window.setTimeout(() => {
      setFetchedBalance(senderAccount)
      setBalancesAsOf(
        `${new Date().toLocaleString('en-SG', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })} SGT`,
      )
      setLoadingBalances(false)
      toast.success('Balance retrieved', {
        description: `${senderAccount.name} — latest available balance fetched from the bank.`,
      })
    }, 900)
  }

  const effectiveAmount =
    retryMode === 'original' ? (payment?.amount ?? '') : amount
  const effAmountNum = Number(effectiveAmount.replace(/,/g, ''))
  const sufficiency =
    fetchedBalance &&
    effectiveAmount.trim() !== '' &&
    !isNaN(effAmountNum) &&
    effAmountNum > 0
      ? fetchedBalance.lastBalance >= effAmountNum
        ? 'sufficient'
        : 'insufficient'
      : null

  if (!payment || payment.status !== 'FAILED') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <FormPageHeader onBack={goBack} title="Retry payment" />
        <Card>
          <CardContent className="space-y-4 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Payment not found or not in a failed state.
            </p>
            <div className="flex justify-center">
              <Button variant="outline" onClick={goBack}>
                Back to Payments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const detailsOk = retryMode === 'original'
    ? true
    : (
      amount.trim().length > 0 &&
      receiverName.trim().length > 0 &&
      receiverBic.trim().length > 0 &&
      receiverAccount.trim().length > 0 &&
      receiverRouting.trim().length > 0
    )
  const canSubmit =
    detailsOk &&
    purpose !== '' &&
    customerRef.trim() !== '' &&
    (!isReturn || returnReason !== '')

  const submit = () => {
    const now = new Date()
    const month = now.toLocaleString('en-US', { month: 'short' })
    const day = now.getDate()
    const year = now.getFullYear()
    const hh = String(((now.getHours() + 11) % 12) + 1).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
    const submittedAt = `${month} ${day}, ${year} at ${hh}:${mm} ${ampm}`
    const retryId = `rty_${Math.random().toString(36).slice(2, 14).toUpperCase()}`

    const finalName = retryMode === 'original' ? payment.receiverName : receiverName
    const finalBic = retryMode === 'original' ? payment.receiverBank : receiverBic
    const finalAcct = retryMode === 'original' ? payment.receiverBankAccountNumber : receiverAccount
    const finalRouting = retryMode === 'original' ? payment.receiverLocalRoutingIdentifier : receiverRouting
    const finalAmount = retryMode === 'original' ? payment.amount : amount
    const finalCurrency = retryMode === 'original' ? payment.currency : currency
    const finalType = retryMode === 'original' ? payment.type : paymentType
    // Flag-derived payments carry their origin in resultCode.
    const kind =
      payment.resultCode === 'RETURNED_BY_BANK'
        ? ('return' as const)
        : payment.resultCode === 'REFUND_REVERSAL'
          ? ('reversal' as const)
          : ('retry' as const)

    addRetry({
      id: retryId,
      originalPaymentId: payment.id,
      amount: finalAmount,
      currency: finalCurrency,
      receiverName: finalName,
      receiverBankBic: finalBic,
      receiverAccountNumber: finalAcct,
      receiverLocalRoutingIdentifier: finalRouting,
      type: finalType,
      notes,
      requester: user.name,
      submittedAt,
      status: 'Pending approval',
      kind,
      purpose,
      customerReference: customerRef,
      ...(isReturn ? { returnReason } : {}),
    })

    toast.success(
      kind === 'return'
        ? 'Return submitted'
        : kind === 'reversal'
          ? 'Reversal submitted'
          : 'Retry submitted',
      {
        description: `${payment.id} — awaiting maker-checker approval`,
      },
    )
    goBack()
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <FormPageHeader
        onBack={goBack}
        title={isReturn ? 'Initiate return' : 'Retry payment'}
        description={
          isReturn
            ? 'Return the funds from a flagged credit transaction. Provide the reason for the return — the request goes through maker-checker approval.'
            : 'Resubmit a failed payment. Edit any beneficiary or routing details that need correcting — the resubmission goes through maker-checker approval.'
        }
      />

      {can('Payment Approvals') && (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>You're acting as a checker</AlertTitle>
          <AlertDescription>
            Switch to maker from the profile menu to submit{' '}
            {isReturn ? 'returns' : 'retries'}.
          </AlertDescription>
        </Alert>
      )}

      <FormSection
        title="Request context"
        description={
          isReturn
            ? 'The transaction being returned, and who is raising the request.'
            : 'The failed payment being resubmitted, and who is raising the retry.'
        }
      >
        <FieldGrid>
          <FieldRow
            label={isReturn ? 'Original transaction ID' : 'Original payment ID'}
            value={payment.id}
            mono
          />
          <FieldRow
            label="Original amount"
            value={`${payment.amount} ${payment.currency}`}
          />
          {!isReturn && (
            <>
              <FieldRow
                label="Original failure reason"
                value={payment.resultCode}
                mono
              />
              <FieldRow label="Original created at" value={payment.createdAt} />
              {payment.underlyingErrorMessage && (
                <div className="sm:col-span-2">
                  <Field>
                    <FieldLabel>Original error message</FieldLabel>
                    <pre className="rounded-md border bg-muted/40 p-2.5 font-mono text-xs whitespace-pre-wrap text-foreground">
                      {payment.underlyingErrorMessage}
                    </pre>
                  </Field>
                </div>
              )}
            </>
          )}
          {isReturn && (
            <FieldRow label="Original created at" value={payment.createdAt} />
          )}
          <FieldRow
            label="Requester"
            value={
              <>
                {user.name}
                <span className="text-muted-foreground">
                  {' '}
                  · {roles[0]?.name ?? 'No role'}
                </span>
              </>
            }
          />
          <FieldRow label="Date of request" value={todayDisplay()} />
        </FieldGrid>
      </FormSection>

      {/* Originating account — same flow as the create payment page */}
      <FormSection
        title="Originating account"
        description="Defaults to the original payment's account — change it if the retry should pay from a different account. Get its balance to confirm sufficient funds (billed per call)."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={senderAccountId}
              onValueChange={(v) => {
                setSenderAccountId(v)
                setFetchedBalance(null)
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select the account to pay from *" />
              </SelectTrigger>
              <SelectContent>
                {senderAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.bank} · {a.legalEntity} · {a.name} · {a.number} ·{' '}
                    {a.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={getBalance}
              disabled={!senderAccount || loadingBalances}
            >
              {loadingBalances ? (
                <RefreshCwIcon className="size-4 animate-spin" />
              ) : (
                <WalletIcon className="size-4" />
              )}
              {loadingBalances ? 'Retrieving…' : 'Get balance'}
            </Button>
          </div>
          {senderAccount && (
            <p className="font-mono text-xs text-muted-foreground">
              {senderAccount.id} · Acct {senderAccount.number} · BIC{' '}
              {senderAccount.swiftBic || '—'} · IBAN {senderAccount.iban || '—'}
              {senderAccount.id === payment.senderAccountId
                ? ' · original account'
                : ''}
            </p>
          )}
          {fetchedBalance && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {fetchedBalance.name}
                  </span>
                  <Badge variant="secondary">Available balance</Badge>
                </div>
                <span className="text-lg font-semibold tabular-nums whitespace-nowrap">
                  {formatMoney(
                    fetchedBalance.currency,
                    fetchedBalance.lastBalance,
                  )}
                </span>
              </div>
              {sufficiency === 'sufficient' && (
                <Alert>
                  <CheckIcon />
                  <AlertTitle>Sufficient funds</AlertTitle>
                  <AlertDescription>
                    Available balance covers{' '}
                    {formatMoney(fetchedBalance.currency, effAmountNum)}.
                  </AlertDescription>
                </Alert>
              )}
              {sufficiency === 'insufficient' && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Insufficient funds</AlertTitle>
                  <AlertDescription>
                    The retry amount{' '}
                    {formatMoney(fetchedBalance.currency, effAmountNum)} exceeds
                    the available balance. Top up the account or reduce the
                    amount.
                  </AlertDescription>
                </Alert>
              )}
              {sufficiency === null && (
                <p className="text-xs text-muted-foreground">
                  Enter a retry amount to check fund sufficiency.
                </p>
              )}
              <p className="font-mono text-xs text-muted-foreground">
                As of {balancesAsOf}
              </p>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        title={isReturn ? 'Return options' : 'Retry options'}
        description={
          isReturn
            ? 'Reason for the return and the payment information Acme needs to execute it.'
            : 'Payment information Acme needs to execute the resubmission.'
        }
      >
        <FieldGroup>
          {isReturn && (
            <FormField label="Reason of return" required>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select why the funds are being returned" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField label="Purpose of payment" required>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a purpose code" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_PURPOSES.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Customer reference"
              required
              htmlFor="rty-cust-ref"
              hint="Unique ID for this payment — pre-generated, editable."
            >
              <Input
                id="rty-cust-ref"
                value={customerRef}
                onChange={(e) => setCustomerRef(e.target.value)}
                className="font-mono"
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModeOption
              selected={retryMode === 'original'}
              onSelect={() => setRetryMode('original')}
              title="Use original details"
              description={
                isReturn
                  ? 'Return using the same routing and receiver details from the original transaction.'
                  : 'Resubmit with the same routing and receiver details from the failed payment.'
              }
            />
            <ModeOption
              selected={retryMode === 'recreate'}
              onSelect={() => setRetryMode('recreate')}
              title="Recreate new payment"
              description="Edit receiver, routing, amount, or type before resubmitting."
            />
          </div>

          {retryMode === 'original' ? (
            <div className="rounded-lg border bg-muted/30 px-4 py-4">
              <FieldGrid>
                <FieldRow
                  label="Receiver name"
                  value={payment.receiverName}
                />
                <FieldRow
                  label="Account number"
                  value={payment.receiverBankAccountNumber}
                  mono
                />
                <FieldRow label="Bank BIC" value={payment.receiverBank} mono />
                <FieldRow
                  label="Routing ID"
                  value={payment.receiverLocalRoutingIdentifier}
                  mono
                />
                <FieldRow
                  label="Amount"
                  value={`${payment.amount} ${payment.currency}`}
                  mono
                />
                <FieldRow label="Type" value={payment.type} mono />
              </FieldGrid>
            </div>
          ) : (
            <FieldGroup>
              <FormField label="Receiver name" required htmlFor="rcv-name">
                <Input
                  id="rcv-name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Beneficiary account name"
                />
              </FormField>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <FormField label="Receiver bank BIC" required htmlFor="rcv-bic">
                  <Input
                    id="rcv-bic"
                    value={receiverBic}
                    onChange={(e) => setReceiverBic(e.target.value)}
                    placeholder="DBSSSGSGXXX"
                    className="font-mono"
                  />
                </FormField>
                <FormField label="Account number" required htmlFor="rcv-acct">
                  <Input
                    id="rcv-acct"
                    value={receiverAccount}
                    onChange={(e) => setReceiverAccount(e.target.value)}
                    placeholder="0123456789"
                    className="font-mono"
                  />
                </FormField>
                <FormField
                  label="Local routing identifier"
                  required
                  htmlFor="rcv-routing"
                >
                  <Input
                    id="rcv-routing"
                    value={receiverRouting}
                    onChange={(e) => setReceiverRouting(e.target.value)}
                    placeholder="004"
                    className="font-mono"
                  />
                </FormField>
                <FormField label="Amount" required htmlFor="rcv-amount">
                  <Input
                    id="rcv-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="font-mono"
                  />
                </FormField>
                <FormField label="Currency">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Payment type">
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              {paymentType === 'TT' && (
                <FormField
                  label="Bank charge bearer"
                  hint="Who bears the bank charges for this TT payment — you (SENDER), the beneficiary (RECEIVER), or split (SHARED)."
                >
                  <Select value={chargeBearer} onValueChange={setChargeBearer}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARGE_BEARERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </FieldGroup>
          )}

          <FormField label="Notes" htmlFor="rty-notes">
            <Textarea
              id="rty-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for the checker"
              rows={3}
            />
          </FormField>
        </FieldGroup>
      </FormSection>

      <FormSection
        title="Attachments"
        description="Attach supporting evidence for this retry. Files become part of the audit trail."
      >
        <AttachmentPicker
          files={attachedFiles}
          onFiles={setAttachedFiles}
          inputRef={fileInputRef}
        />
      </FormSection>

      <MakerCheckerPreview requester={user.name}>
        Logged as a{' '}
        {isReturn
          ? 'return of funds'
          : retryMode === 'original'
            ? 'retry with original details'
            : 'retry with updated details'}
        .
      </MakerCheckerPreview>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={goBack}>
          Cancel
        </Button>
        <Button disabled={!canSubmit} onClick={submit}>
          {isReturn ? 'Submit return request' : 'Submit retry request'}
        </Button>
      </div>
    </div>
  )
}
