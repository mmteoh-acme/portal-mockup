import * as React from 'react'
import {
  PlusIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  Undo2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  PaperclipIcon,
  XIcon,
} from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mono, MonoLabel } from '@/components/mono'
import { cn } from '@/lib/utils'
import { useEntity } from '@/lib/entity-context'
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
import {
  allPayments,
  entityTransactions,
  paymentRequiresAttention,
  unprocessedRefunds,
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

type FilterKey =
  | 'pending'
  | 'failed'
  | 'completed'
  | 'all'

const PAGE_SIZE = 20

function todayDisplay(): string {
  const d = new Date('2026-06-01T00:00:00')
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
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
  const { entity } = useEntity()

  if (search?.action === 'new-refund') {
    const txn = entity
      ? entityTransactions(entity).find((t) => t.id === search.txnId) ?? null
      : null
    return <NewRefundFromTxn txn={txn} />
  }

  if (search?.action === 'retry-payment') {
    const p =
      allPayments.find((x) => x.id === search.paymentId) ?? null
    return <NewRetryFromPayment payment={p} />
  }

  return <PaymentsMain />
}

// ---------------------------------------------------------------------------
// Create payment dialog
// ---------------------------------------------------------------------------

const PAYMENT_TYPES = ['FAST', 'SWIFT', 'SEPA', 'ACH', 'FPS', 'INTERNAL'] as const
const CURRENCIES = ['SGD', 'USD', 'EUR', 'GBP', 'HKD'] as const

function NewPaymentDialog() {
  const { user } = useUser()
  const [open, setOpen] = React.useState(false)
  const [linkedId, setLinkedId] = React.useState('')
  const [receiverName, setReceiverName] = React.useState('')
  const [receiverBic, setReceiverBic] = React.useState('')
  const [receiverAccount, setReceiverAccount] = React.useState('')
  const [receiverRouting, setReceiverRouting] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [currency, setCurrency] = React.useState<string>('SGD')
  const [paymentType, setPaymentType] = React.useState<string>('FAST')
  const [notes, setNotes] = React.useState('')

  const canSubmit = receiverName.trim() !== '' && amount.trim() !== '' && receiverAccount.trim() !== ''

  function reset() {
    setLinkedId('')
    setReceiverName('')
    setReceiverBic('')
    setReceiverAccount('')
    setReceiverRouting('')
    setAmount('')
    setCurrency('SGD')
    setPaymentType('FAST')
    setNotes('')
  }

  function submit() {
    toast.success('Payment submitted for approval', {
      description: `${receiverName} · ${amount} ${currency} — awaiting checker approval.`,
    })
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusIcon className="size-3.5" />
          Create payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create payment</DialogTitle>
          <DialogDescription>
            Submit a new outbound payment for maker-checker approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="np-linked-id">Link to transaction / payment ID</Label>
            <Input
              id="np-linked-id"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              placeholder="Txn_01J9KA2M3X4P5 or PMT-..."
              className="font-mono"
            />
            <p className="text-[0.7rem] text-muted-foreground">Optional — attach this payment to an existing transaction or payment record.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-rcv-name">Receiver name</Label>
            <Input
              id="np-rcv-name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Beneficiary account name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="np-rcv-bic">Receiver bank BIC</Label>
              <Input
                id="np-rcv-bic"
                value={receiverBic}
                onChange={(e) => setReceiverBic(e.target.value)}
                placeholder="DBSSSGSGXXX"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-rcv-acct">Account number</Label>
              <Input
                id="np-rcv-acct"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                placeholder="0123456789"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-rcv-routing">Local routing identifier</Label>
            <Input
              id="np-rcv-routing"
              value={receiverRouting}
              onChange={(e) => setReceiverRouting(e.target.value)}
              placeholder="004"
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 space-y-1.5">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-mono">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-notes">Notes</Label>
            <Textarea
              id="np-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for the checker"
              rows={2}
            />
          </div>
          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="text-[0.65rem] uppercase tracking-wider font-medium">Maker-checker preview</span>
            <div className="mt-1">
              Submitted by{' '}
              <span className="font-medium text-foreground">{user.name}</span> →
              awaiting approval from a checker.
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={submit}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main payments view (filter chips + table + detail sheet + pending refunds)
// ---------------------------------------------------------------------------

function PaymentsMain() {
  const submittedRefunds = useSubmittedRefunds()
  const submittedRetries = useSubmittedRetries()
  const { user } = useUser()
  const navigate = useNavigate()
  const [filter, setFilter] = React.useState<FilterKey>('all')
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Payment | null>(null)
  const [refundOpen, setRefundOpen] = React.useState(false)
  const [refundRow, setRefundRow] = React.useState<UnprocessedRefund | null>(
    null,
  )

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
    switch (filter) {
      case 'pending':
        return combined.filter((p) => p.status === 'PENDING')
      case 'failed':
        return combined.filter((p) => p.status === 'FAILED')
      case 'completed':
        return combined.filter((p) => p.status === 'COMPLETED')
      case 'all':
      default:
        return combined
    }
  }, [combined, filter])

  React.useEffect(() => {
    setPage(1)
  }, [filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const pageRows = filtered.slice(pageStart, pageEnd)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <NewPaymentDialog />
      </div>

      {/* Filter select */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger size="sm" className="h-8 w-48 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
            <SelectItem value="failed">Failed ({counts.failed})</SelectItem>
            <SelectItem value="completed">Completed ({counts.completed})</SelectItem>
            <SelectItem value="all">All ({counts.all})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Payment ID
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Type
                  </TableHead>
                  <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Receiver
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Result
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Created at
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((p) => {
                  const refund = refundMap.get(p.id) ?? null
                  const retry = retryMap.get(p.id) ?? null
                  const isFailed = p.status === 'FAILED'

                  const isPendingRefund =
                    refund?.status === 'Pending approval'
                  const isPendingRetry =
                    retry?.status === 'Pending approval'
                  const canReviewRefund =
                    isPendingRefund &&
                    user.role === 'CHECKER' &&
                    refund?.requester !== user.name
                  const canReviewRetry =
                    isPendingRetry &&
                    user.role === 'CHECKER' &&
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
                      className={cn(
                        'cursor-pointer',
                        isFailed && 'bg-rose-50/40 hover:bg-rose-50/70',
                      )}
                    >
                      <TableCell>
                        <Mono>{p.id}</Mono>
                      </TableCell>
                      <TableCell>
                        {statusPill}
                      </TableCell>
                      <TableCell className="text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {p.type}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {p.amount} {p.currency}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="font-medium">
                          {p.receiverName || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        {p.receiverBankAccountNumber && (
                          <div className="font-mono text-[0.7rem] text-muted-foreground">
                            {p.receiverBankAccountNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {p.resultCode ? (
                          <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                            {p.resultCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.createdAt}
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
                                    role: user.role,
                                  })
                                  toast.success('Retry approved', {
                                    description: `${p.id} — approved by ${user.name}`,
                                  })
                                } else {
                                  approveRefund(p.id, {
                                    name: user.name,
                                    role: user.role,
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
                                    role: user.role,
                                  })
                                  toast.success('Retry rejected', {
                                    description: `${p.id} — rejected by ${user.name}`,
                                  })
                                } else {
                                  rejectRefund(p.id, {
                                    name: user.name,
                                    role: user.role,
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
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Showing {pageStart + 1}–{pageEnd} of {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="size-3.5" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unprocessed deposits awaiting refund (carry-over from old Refunds tab) */}
      {unprocessedRefunds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
                Unprocessed deposits awaiting refund ({unprocessedRefunds.length})
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Beneficiary details missing. Enter bene details to submit a
                refund through maker-checker.
              </p>
            </div>
            <NewRefundDialog
              open={refundOpen && refundRow === null}
              onOpenChange={(o) => {
                if (!o) setRefundRow(null)
                setRefundOpen(o)
              }}
              row={null}
              trigger={
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefundRow(null)
                    setRefundOpen(true)
                  }}
                >
                  <PlusIcon /> New refund
                </Button>
              }
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Original txn
                    </TableHead>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Customer
                    </TableHead>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Amount
                    </TableHead>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Reason
                    </TableHead>
                    <TableHead className="text-[0.7rem] uppercase tracking-wider">
                      Date
                    </TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unprocessedRefunds.map((r) => (
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
                      <TableCell className="text-xs text-muted-foreground">
                        {r.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.date}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRefundRow(r)
                            setRefundOpen(true)
                          }}
                        >
                          Add bene details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {refundRow && (
            <NewRefundDialog
              open={refundOpen && refundRow !== null}
              onOpenChange={(o) => {
                setRefundOpen(o)
                if (!o) setRefundRow(null)
              }}
              row={refundRow}
              trigger={null}
            />
          )}
        </div>
      )}

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

function PaymentStatusPill({ status }: { status: Payment['status'] }) {
  const map: Record<Payment['status'], string> = {
    FAILED:
      'border-rose-300 bg-rose-100 text-rose-700',
    COMPLETED:
      'border-emerald-300 bg-emerald-100 text-emerald-700',
    PENDING:
      'border-amber-300 bg-amber-100 text-amber-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider',
        map[status],
      )}
    >
      {status}
    </span>
  )
}

function RefundStatusPill({
  status,
}: {
  status: SubmittedRefund['status']
}) {
  const map: Record<SubmittedRefund['status'], string> = {
    'Pending approval': 'border-amber-300 bg-amber-100 text-amber-700',
    Approved: 'border-emerald-300 bg-emerald-100 text-emerald-700',
    Rejected: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider whitespace-nowrap',
        map[status],
      )}
    >
      {status}
    </span>
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
  const headerStatusPill = payment
    ? refund
      ? <RefundStatusPill status={refund.status} />
      : retry
        ? <RefundStatusPill status={retry.status} />
        : <PaymentStatusPill status={payment.status} />
    : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-[600px]"
      >
        {payment && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="font-mono text-sm">
                  {payment.id}
                </SheetTitle>
                {headerStatusPill}
              </div>
              <SheetDescription>
                {payment.type} — {payment.amount} {payment.currency}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              {retry && (
                <DetailSection title="Retry of">
                  <DetailRow
                    label="Original payment"
                    value={<Mono>{retry.originalPaymentId}</Mono>}
                  />
                  <DetailRow
                    label="Requester"
                    value={
                      <span className="text-sm">
                        {retry.requester}{' '}
                        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                          · MAKER
                        </span>
                      </span>
                    }
                  />
                  {retry.reviewer && (
                    <DetailRow
                      label="Reviewed by"
                      value={
                        <span className="text-sm">
                          {retry.status === 'Approved'
                            ? 'Approved'
                            : 'Rejected'}{' '}
                          by {retry.reviewer.name}{' '}
                          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                            ({retry.reviewer.role})
                          </span>{' '}
                          —{' '}
                          <span className="text-xs">
                            {retry.reviewer.at}
                          </span>
                        </span>
                      }
                    />
                  )}
                  {retry.notes && (
                    <div className="mt-2 space-y-1">
                      <MonoLabel>Notes</MonoLabel>
                      <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-[0.7rem] text-foreground/90">
                        {retry.notes}
                      </pre>
                    </div>
                  )}
                </DetailSection>
              )}

              {refund?.reviewer && (
                <DetailSection title="Maker-checker">
                  <DetailRow
                    label="Requester"
                    value={
                      <span className="text-sm">
                        {refund.requester}{' '}
                        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                          · MAKER
                        </span>
                      </span>
                    }
                  />
                  <DetailRow
                    label="Reviewed by"
                    value={
                      <span className="text-sm">
                        {refund.status === 'Approved'
                          ? 'Approved'
                          : 'Rejected'}{' '}
                        by {refund.reviewer.name}{' '}
                        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                          ({refund.reviewer.role})
                        </span>{' '}
                        — <span className="text-xs">{refund.reviewer.at}</span>
                      </span>
                    }
                  />
                </DetailSection>
              )}

              <DetailSection title="Payment">
                <DetailRow label="Payment ID" value={<Mono>{payment.id}</Mono>} />
                <DetailRow
                  label="Status"
                  value={
                    refund ? (
                      <RefundStatusPill status={refund.status} />
                    ) : retry ? (
                      <RefundStatusPill status={retry.status} />
                    ) : (
                      <PaymentStatusPill status={payment.status} />
                    )
                  }
                />
                <DetailRow
                  label="Type"
                  value={
                    <span className="text-xs uppercase tracking-wider">
                      {payment.type}
                    </span>
                  }
                />
                <DetailRow
                  label="Amount"
                  value={
                    <span className="text-sm tabular-nums">
                      {payment.amount} {payment.currency}
                    </span>
                  }
                />
                <DetailRow
                  label="Mode"
                  value={
                    <span className="text-xs uppercase tracking-wider">
                      {payment.mode}
                    </span>
                  }
                />
                <DetailRow
                  label="Sender account"
                  value={
                    payment.senderAccountId ? (
                      <Mono>{payment.senderAccountId}</Mono>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
              </DetailSection>

              <DetailSection title="Receiver">
                <DetailRow
                  label="Receiver name"
                  value={
                    payment.receiverName || (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <DetailRow
                  label="Account number"
                  value={
                    payment.receiverBankAccountNumber ? (
                      <Mono>{payment.receiverBankAccountNumber}</Mono>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <DetailRow
                  label="Receiver bank (BIC)"
                  value={
                    payment.receiverBank ? (
                      <Mono>{payment.receiverBank}</Mono>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <DetailRow
                  label="Local routing ID"
                  value={
                    payment.receiverLocalRoutingIdentifier ? (
                      <Mono>{payment.receiverLocalRoutingIdentifier}</Mono>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
              </DetailSection>

              <DetailSection title="Result">
                <DetailRow
                  label="Result code"
                  value={
                    payment.resultCode ? (
                      <span className="text-xs uppercase tracking-wider">
                        {payment.resultCode}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                {payment.underlyingErrorMessage && (
                  <div className="mt-2 space-y-1">
                    <MonoLabel>Underlying error message</MonoLabel>
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-[0.7rem] text-foreground/90">
                      {payment.underlyingErrorMessage}
                    </pre>
                  </div>
                )}
                {payment.paymentDetails && (
                  <div className="mt-2 space-y-1">
                    <MonoLabel>Payment details</MonoLabel>
                    <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-[0.7rem] text-foreground/90">
                      {payment.paymentDetails}
                    </pre>
                  </div>
                )}
              </DetailSection>

              <DetailSection title="References">
                <DetailRow
                  label="Customer reference"
                  value={
                    payment.customerReference ? (
                      <Mono>{payment.customerReference}</Mono>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <DetailRow
                  label="Organization"
                  value={
                    payment.organizationId ? (
                      <Mono>{payment.organizationId}</Mono>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
              </DetailSection>

              <DetailSection title="Metadata">
                <DetailRow
                  label="Created at"
                  value={
                    <span className="text-xs">
                      {payment.createdAt}
                    </span>
                  }
                />
                <DetailRow
                  label="Updated at"
                  value={
                    <span className="text-xs">
                      {payment.updatedAt}
                    </span>
                  }
                />
              </DetailSection>

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
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5 rounded-md border bg-card/40 p-3">
        {children}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="w-40 shrink-0 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-sm">{value}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// New refund from txn (separate code path via ?action=new-refund&txnId=)
// ---------------------------------------------------------------------------

function NewRefundFromTxn({ txn }: { txn: Txn | null }) {
  const navigate = useNavigate()
  const { user } = useUser()

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
    <div className="space-y-6">
      <div>
        <button
          onClick={goBack}
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> Back to Payments
        </button>
        <div className="flex items-center gap-2">
          <Undo2Icon className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">
            New refund payment
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Refunds use the Payments API with a refund flag. Pre-filled from the
          source transaction where available — fill in any missing beneficiary
          details to continue.
        </p>
      </div>

      {user.role === 'CHECKER' && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            You're acting as a{' '}
            <span className="uppercase tracking-wider font-medium">CHECKER</span>.
            Switch to{' '}
            <span className="uppercase tracking-wider font-medium">MAKER</span>{' '}
            from the profile menu to submit a new refund.
          </span>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 px-6 py-5">
          <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Request context
          </div>
          <ContextRow label="Original transaction ID">
            {txn ? <Mono>{txn.id}</Mono> : <span className="text-muted-foreground">—</span>}
          </ContextRow>
          <ContextRow label="Requester">
            <span className="text-sm">
              {user.name}{' '}
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                · {user.role}
              </span>{' '}
              — Acme Operations Team
            </span>
          </ContextRow>
          <ContextRow label="Date of request">
            <span className="text-sm">{todayDisplay()}</span>
          </ContextRow>
          {txn && (
            <>
              <ContextRow label="Original amount">
                <span className="text-sm">
                  {txn.amount} {txn.currency}
                </span>
              </ContextRow>
              <ContextRow label="Original transaction date">
                <Mono>{txn.transactionDate}</Mono>
              </ContextRow>
              <ContextRow label="Original bank reference">
                <Mono>{txn.bankRef || '—'}</Mono>
              </ContextRow>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 px-6 py-5">
          <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Refund details
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Refund amount {txn?.currency ? `(${txn.currency})` : ''}
              </Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Edit for a partial refund.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
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
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">
              Note {noteRequired && <span className="text-destructive">*</span>}
            </Label>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 px-6 py-5">
          <div className="space-y-1">
            <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              Beneficiary details
            </div>
            <p className="text-xs text-muted-foreground">
              Receiver name was pre-filled from the source transaction. BIC and
              account number must be entered manually.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receiver-name">Receiver name</Label>
            <Input
              id="receiver-name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Beneficiary account name"
              disabled
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="receiver-bic">Receiver bank BIC / SWIFT</Label>
              <Input
                id="receiver-bic"
                value={receiverBic}
                onChange={(e) => setReceiverBic(e.target.value)}
                placeholder="DBSSSGSGXXX"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receiver-account">Receiver account number</Label>
              <Input
                id="receiver-account"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                placeholder="0123456789"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street and number"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Singapore"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Singapore"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              Supporting documents
            </div>
            <p className="text-xs text-muted-foreground">
              Attach bank statements or other evidence. Uploaded files become
              part of the audit trail for this refund.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const incoming = Array.from(e.target.files ?? [])
              setAttachedFiles((prev) => {
                const names = new Set(prev.map((f) => f.name))
                return [...prev, ...incoming.filter((f) => !names.has(f.name))]
              })
              e.target.value = ''
            }}
          />
          {attachedFiles.length > 0 && (
            <div className="space-y-1.5">
              {attachedFiles.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-2 rounded border bg-muted/40 px-3 py-2"
                >
                  <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {f.name}
                  </span>
                  <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedFiles((prev) =>
                        prev.filter((x) => x.name !== f.name),
                      )
                    }
                    className="ml-1 rounded p-0.5 hover:bg-muted"
                    aria-label={`Remove ${f.name}`}
                  >
                    <XIcon className="size-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon className="size-3.5" />
            Attach file
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="text-[0.65rem] uppercase tracking-wider font-medium">
          Maker-checker preview
        </span>
        <div className="mt-1">
          Submitted by{' '}
          <span className="font-medium text-foreground">{user.name}</span>{' '}
          → awaiting approval from a checker. Logged automatically as a refund
          payment{attachedFiles.length > 0 ? ` with ${attachedFiles.length} document${attachedFiles.length > 1 ? 's' : ''} attached` : ''}.
        </div>
      </div>

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

function ContextRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="w-56 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NewRefundDialog (used by the unprocessed-deposits add-bene-details flow)
// ---------------------------------------------------------------------------

function NewRefundDialog({
  open,
  onOpenChange,
  row,
  trigger,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  row: UnprocessedRefund | null
  trigger: React.ReactNode
}) {
  const [accountName, setAccountName] = React.useState('')
  const [accountNumber, setAccountNumber] = React.useState('')
  const [bank, setBank] = React.useState('')
  const [swift, setSwift] = React.useState('')
  const [address, setAddress] = React.useState('')

  const submit = () => {
    toast.success('Refund submitted', {
      description: 'Awaiting checker approval.',
    })
    onOpenChange(false)
    setAccountName('')
    setAccountNumber('')
    setBank('')
    setSwift('')
    setAddress('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New refund</DialogTitle>
          <DialogDescription>
            {row ? (
              <>
                Enter beneficiary details for{' '}
                <Mono>{row.originalTxnId}</Mono> · {row.customer} ·{' '}
                <span>{row.amount}</span>
              </>
            ) : (
              'Enter beneficiary details to initiate a refund. Goes through maker-checker before Acme executes.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="acct-name">Account name</Label>
            <Input
              id="acct-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Beneficiary account name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="acct-num">Account number</Label>
            <Input
              id="acct-num"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="font-mono"
              placeholder="123-456789-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bank">Bank</Label>
              <Input
                id="bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="DBS"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="swift">Swift code</Label>
              <Input
                id="swift"
                value={swift}
                onChange={(e) => setSwift(e.target.value)}
                className="font-mono"
                placeholder="DBSSSGSG"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr">Beneficiary address</Label>
            <Input
              id="addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="1 Marina Bay, Singapore"
            />
          </div>
        </div>

        <div className="rounded-md border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-muted-foreground" />
            <MonoLabel>Maker-checker preview</MonoLabel>
          </div>
          <p className="mt-2 text-sm">
            Submitted by <span className="font-medium">Ming Miin</span> → Awaiting
            approval from checker.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// New retry from payment (separate code path via ?action=retry-payment&paymentId=)
// ---------------------------------------------------------------------------

function NewRetryFromPayment({ payment }: { payment: Payment | null }) {
  const navigate = useNavigate()
  const { user } = useUser()

  const goBack = () =>
    navigate({
      to: '/payments',
      search: {
        action: undefined,
        txnId: undefined,
        paymentId: undefined,
      },
    })

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
  const [notes, setNotes] = React.useState('')
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  if (!payment || payment.status !== 'FAILED') {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={goBack}
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" /> Back to Payments
          </button>
          <div className="flex items-center gap-2">
            <RotateCcwIcon className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">
              Retry payment
            </h1>
          </div>
        </div>
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

  const canSubmit =
    amount.trim().length > 0 &&
    receiverName.trim().length > 0 &&
    receiverBic.trim().length > 0 &&
    receiverAccount.trim().length > 0 &&
    receiverRouting.trim().length > 0

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

    addRetry({
      id: retryId,
      originalPaymentId: payment.id,
      amount,
      currency: payment.currency,
      receiverName,
      receiverBankBic: receiverBic,
      receiverAccountNumber: receiverAccount,
      receiverLocalRoutingIdentifier: receiverRouting,
      type: payment.type,
      notes,
      requester: user.name,
      submittedAt,
      status: 'Pending approval',
    })

    toast.success('Retry submitted', {
      description: `${payment.id} — awaiting maker-checker approval`,
    })
    goBack()
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={goBack}
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> Back to Payments
        </button>
        <div className="flex items-center gap-2">
          <RotateCcwIcon className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">
            Retry payment
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Resubmit a failed payment. Edit any beneficiary or routing details
          that need correcting — the resubmission goes through maker-checker
          approval.
        </p>
      </div>

      {user.role === 'CHECKER' && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            You're acting as a{' '}
            <span className="uppercase tracking-wider font-medium">CHECKER</span>{' '}
            — switch to{' '}
            <span className="uppercase tracking-wider font-medium">MAKER</span>{' '}
            to submit retries.
          </span>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 px-6 py-5">
          <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Request context
          </div>
          <ContextRow label="Original payment ID">
            <Mono>{payment.id}</Mono>
          </ContextRow>
          <ContextRow label="Original amount">
            <span className="text-sm">
              {payment.amount} {payment.currency}
            </span>
          </ContextRow>
          <ContextRow label="Original failure reason">
            {payment.resultCode ? (
              <span className="text-xs uppercase tracking-wider">
                {payment.resultCode}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </ContextRow>
          <ContextRow label="Original error message">
            {payment.underlyingErrorMessage ? (
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-2 font-mono text-[0.7rem] text-foreground/90">
                {payment.underlyingErrorMessage}
              </pre>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </ContextRow>
          <ContextRow label="Original created at">
            <span className="text-xs">{payment.createdAt}</span>
          </ContextRow>
          <ContextRow label="Requester">
            <span className="text-sm">
              {user.name}{' '}
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                · {user.role}
              </span>
            </span>
          </ContextRow>
          <ContextRow label="Date of request">
            <span className="text-sm">{todayDisplay()}</span>
          </ContextRow>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 px-6 py-5">
          <div className="space-y-1">
            <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              Fields
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rcv-name">Receiver name</Label>
            <Input
              id="rcv-name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Beneficiary account name"
              disabled
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rcv-bic">Receiver bank BIC</Label>
              <Input
                id="rcv-bic"
                value={receiverBic}
                onChange={(e) => setReceiverBic(e.target.value)}
                placeholder="DBSSSGSGXXX"
                className="font-mono"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcv-acct">Receiver account number</Label>
              <Input
                id="rcv-acct"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                placeholder="0123456789"
                className="font-mono"
                disabled
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rcv-routing">Local routing identifier</Label>
              <Input
                id="rcv-routing"
                value={receiverRouting}
                onChange={(e) => setReceiverRouting(e.target.value)}
                placeholder="004"
                className="font-mono"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rty-amount">
                Amount ({payment.currency})
              </Label>
              <Input
                id="rty-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                disabled
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rty-notes">Notes</Label>
            <Textarea
              id="rty-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for the checker"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              Add Attachments
            </div>
            <p className="text-xs text-muted-foreground">
              Attach supporting evidence for this retry. Files become part of the audit trail.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const incoming = Array.from(e.target.files ?? [])
              setAttachedFiles((prev) => {
                const names = new Set(prev.map((f) => f.name))
                return [...prev, ...incoming.filter((f) => !names.has(f.name))]
              })
              e.target.value = ''
            }}
          />
          {attachedFiles.length > 0 && (
            <div className="space-y-1.5">
              {attachedFiles.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-2 rounded border bg-muted/40 px-3 py-2"
                >
                  <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {f.name}
                  </span>
                  <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedFiles((prev) =>
                        prev.filter((x) => x.name !== f.name),
                      )
                    }
                    className="ml-1 rounded p-0.5 hover:bg-muted"
                    aria-label={`Remove ${f.name}`}
                  >
                    <XIcon className="size-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon className="size-3.5" />
            Attach file
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="text-[0.65rem] uppercase tracking-wider font-medium">
          Maker-checker preview
        </span>
        <div className="mt-1">
          Submitted by{' '}
          <span className="font-medium text-foreground">{user.name}</span> →
          awaiting approval from a checker. Logged automatically as a retry
          payment.
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={goBack}>
          Cancel
        </Button>
        <Button disabled={!canSubmit} onClick={submit}>
          Submit retry request
        </Button>
      </div>
    </div>
  )
}
