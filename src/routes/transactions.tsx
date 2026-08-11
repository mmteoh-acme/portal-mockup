import * as React from 'react'
import {
  SearchIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  FlagIcon,
  DownloadIcon,
  ArrowDownIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { parse as parseDate } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { Mono, MonoLabel, StatusPill } from '@/components/mono'
import { addUnprocessedDeposit } from '@/lib/unprocessed-deposits-store'
import {
  ACCOUNTS,
  CLIENT_GROUP,
  LEGAL_ENTITIES,
  TRANSACTIONS,
  bankNames as allBankNames,
  formatAmountWithCurrency,
  getAccount,
  formatDirectionalAmount,
  sortTransactionsByDateDesc,
  txnDetail,
  type Account,
  type Txn,
  type TxnDetail,
} from '@/data/fixtures'
import type { DateRange } from 'react-day-picker'

type DirectionFilter = 'all' | 'CREDIT' | 'DEBIT'
type CurrencyFilter = 'all' | string

const PAGE_SIZE = 20

// Mirrors the transaction view's field set: the main columns first, then the
// detail fields. organization_id and statement_entry_id stay out of the export.
const CSV_HEADERS = [
  'Date',
  'Account number',
  'Account name',
  'Internal account ID',
  'Amount',
  'Currency',
  'Direction',
  'Counterparty name',
  'Counterparty bank',
  'Counterparty account no.',
  'Transaction ID',
  'Bank reference',
  'Customer reference',
  'Type',
  'Virtual account',
  'Remittance information',
  'Additional information',
  'Other references',
  'Bank message ID',
  'Data source',
  'Statement ID',
  'Reconciled at',
  'Description',
  'Created at',
  'Last updated',
] as const

function csvEscape(v: string | undefined | null): string {
  const s = (v ?? '').toString()
  return `"${s.replace(/"/g, '""')}"`
}

function downloadTransactionsCsv(rows: Txn[], entityName: string): void {
  const lines = [CSV_HEADERS.map(csvEscape).join(',')]
  for (const t of rows) {
    const account = getAccount(t.internalAccountId)
    const d = txnDetail(t, account)
    lines.push(
      [
        t.transactionDate,
        account?.number,
        account?.name,
        t.internalAccountId,
        t.amount,
        t.currency,
        t.direction,
        t.senderName,
        t.senderBank,
        d.senderBankAccountNumber,
        t.id,
        t.bankRef,
        t.customerRef,
        t.transactionType,
        d.virtualAccountNumber,
        t.remittanceInfo,
        t.additionalInformation,
        d.transactionReferences
          .map((r) => `${r.name}=${r.value}`)
          .join('; '),
        d.messageId,
        t.dataSource,
        d.statementId,
        d.reconciledWithStatementAt,
        d.description,
        t.createdAt,
        d.updatedAt,
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  a.href = url
  a.download = `transactions-${slug}-${y}${m}${d}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Date range'
  const from = range.from
  const to = range.to ?? range.from
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (fmt(from) === fmt(to)) return fmt(from)
  return `${fmt(from)} → ${fmt(to)}`
}

// Parse the CSV-style display date "1 Jun, 2026" into a Date.
function parseTxnDate(raw: string): Date | null {
  if (!raw) return null
  const d = parseDate(raw, 'd MMM, yyyy', new Date())
  return isNaN(d.getTime()) ? null : d
}

// Display date "1 Jun, 2026" → ISO "2026-06-01".
function isoTxnDate(raw: string): string {
  const d = parseTxnDate(raw)
  if (!d) return raw
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Reconstruct the raw API payload for a transaction, mirroring the
// GET /transactions response shape surfaced by the Acme API.
function buildRawPayload(
  t: Txn,
  origin: { number: string; bic: string } | undefined,
  d: TxnDetail,
): string {
  const date = isoTxnDate(t.transactionDate)
  const payload = {
    data: [
      {
        id: t.id,
        dataSource: t.dataSource,
        transactionType: t.transactionType,
        transactionStatus: 'BOOKED',
        bankReference: t.bankRef,
        messageId: d.messageId,
        transactionReferences: d.transactionReferences,
        customerReference: t.customerRef,
        description: d.description,
        remittanceInformation: t.remittanceInfo,
        additionalInformation: t.additionalInformation,
        amount: Number(t.amount.replace(/,/g, '')),
        currency: t.currency,
        direction: t.direction,
        currencyExchange: {
          sourceCurrency: t.currency,
          targetCurrency: 'USD',
          exchangeRate: 0.770742,
        },
        counterparty: {
          name: t.senderName,
          bank: t.senderBank || null,
          localRoutingIdentifier: '003',
          bankName: t.senderBank || null,
          bankAccountNumber: d.senderBankAccountNumber,
        },
        bankAccount: {
          id: t.internalAccountId,
          bank: origin?.bic ?? null,
          bankAccountNumber: origin?.number ?? null,
        },
        virtualAccountNumber: d.virtualAccountNumber,
        transactionDate: date,
        bookingDate: {
          date,
          time: '12:34:56.789',
          offset: '+08:00',
          tz: 'Asia/Singapore',
        },
        statementId: d.statementId,
        reconciledWithStatementAt: d.reconciledWithStatementAt,
        createdAt: `${date}T00:00:00.000000Z`,
        updatedAt: `${date}T00:00:00.000000Z`,
      },
    ],
    hasMore: true,
  }
  return JSON.stringify(payload, null, 2)
}

function inRange(dateStr: string, range: DateRange | undefined): boolean {
  if (!range?.from) return true
  const d = parseTxnDate(dateStr)
  if (!d) return true
  d.setHours(0, 0, 0, 0)
  const from = new Date(range.from)
  from.setHours(0, 0, 0, 0)
  const to = range.to ? new Date(range.to) : new Date(range.from)
  to.setHours(23, 59, 59, 999)
  return d >= from && d <= to
}

export function TransactionsPage() {
  // Flat list for the whole client group. Bank and legal entity are filters
  // over account attributes rather than levels to drill into.
  // Default sort: value date descending.
  const rows = React.useMemo<Txn[]>(
    () => sortTransactionsByDateDesc(TRANSACTIONS),
    [],
  )

  const bankNames = React.useMemo(() => allBankNames(ACCOUNTS), [])

  const accounts = React.useMemo(() => ACCOUNTS, [])

  const defaultRange = React.useMemo<DateRange>(() => {
    const today = new Date('2026-06-01T00:00:00')
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from, to: today }
  }, [])

  const [q, setQ] = React.useState('')
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    defaultRange,
  )
  const [selectedBanks, setSelectedBanks] = React.useState<Set<string>>(
    new Set(bankNames),
  )
  const [accountId, setAccountId] = React.useState<string>('all')
  const [legalEntity, setLegalEntity] = React.useState<string>('all')
  const [direction, setDirection] = React.useState<DirectionFilter>('all')
  const [currency, setCurrency] = React.useState<CurrencyFilter>('all')
  const [txnType, setTxnType] = React.useState<string>('all')
  const [openTxn, setOpenTxn] = React.useState<Txn | null>(null)
  const [page, setPage] = React.useState(1)

  // Flag a credit transaction into the Pending review queue (Payments page).
  // Shared by the row actions menu and the detail sheet Actions button.
  // - Reversal: reverse a single payment order — processed as a refund
  //   reversal back to the client.
  // - Return: the bank rejected a payment order and returned the funds as a
  //   separate credit line — the payment needs to be resubmitted.
  const flagException = (t: Txn, kind: 'reversal' | 'return') => {
    const added = addUnprocessedDeposit({
      originalTxnId: t.id,
      customer: t.senderName,
      amount: `${t.currency} ${t.amount}`,
      reason:
        kind === 'reversal'
          ? 'Refund reversal to client'
          : 'Payment rejected — funds returned by bank, resubmission required',
      date: t.transactionDate,
      kind,
    })
    if (added) {
      toast.success(kind === 'reversal' ? 'Flagged as Reversal' : 'Flagged for return', {
        description:
          kind === 'reversal'
            ? `${t.id} moved to the Pending review tab on the Payments page — process as a refund reversal to the client.`
            : `${t.id} moved to the Pending review tab on the Payments page — resubmit the returned payment.`,
      })
    } else {
      toast.info('Already pending review', {
        description: `${t.id} is already awaiting review.`,
      })
    }
  }

  // Distinct currencies present in the transaction list, for the Currency filter.
  const currencies = React.useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.currency) set.add(r.currency)
    return Array.from(set).sort()
  }, [rows])

  // Distinct transaction types (ACT, FAST, MEPS, OTHERS, …) for the Type filter.
  const txnTypes = React.useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.transactionType) set.add(r.transactionType)
    return Array.from(set).sort()
  }, [rows])

  const accountById = React.useMemo<Record<string, Account>>(() => {
    const map: Record<string, Account> = {}
    for (const a of accounts) map[a.id] = a
    return map
  }, [accounts])

  // Map each account id → its bank name. Used by the Bank filter to decide
  // whether a transaction's internalAccountId belongs to a selected bank.
  const accountIdToBankName = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const a of accounts) map[a.id] = a.bank
    return map
  }, [accounts])

  // Map each account id → its legal-entity tag, for the Legal entity filter.
  const accountIdToLegalEntity = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const a of accounts) map[a.id] = a.legalEntity
    return map
  }, [accounts])

  // Map each account id → its display name (e.g. "USD Operating").
  // Used in the Transaction ID cell so the account context is visible inline.
  const accountIdToName = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const a of accounts) map[a.id] = a.name
    return map
  }, [accounts])

  // Map each account id → originating account number + bank BIC.
  // Used by the Originating account / Originating bank table columns.
  const accountIdToOrigin = React.useMemo<
    Record<string, { number: string; bic: string }>
  >(() => {
    const map: Record<string, { number: string; bic: string }> = {}
    for (const a of accounts) map[a.id] = { number: a.number, bic: a.swiftBic }
    return map
  }, [accounts])

  const filtered = React.useMemo<Txn[]>(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((t) => {
      if (needle) {
        const hay = [
          t.id,
          t.senderName,
          t.customerRef,
          t.bankRef,
          t.internalAccountId,
          t.remittanceInfo,
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (!inRange(t.transactionDate, dateRange)) return false
      const bankName = accountIdToBankName[t.internalAccountId]
      if (!bankName || !selectedBanks.has(bankName)) return false
      if (accountId !== 'all' && t.internalAccountId !== accountId) return false
      if (
        legalEntity !== 'all' &&
        accountIdToLegalEntity[t.internalAccountId] !== legalEntity
      )
        return false
      if (direction !== 'all' && t.direction !== direction) return false
      if (currency !== 'all' && t.currency !== currency) return false
      if (txnType !== 'all' && t.transactionType !== txnType) return false
      return true
    })
  }, [rows, q, dateRange, selectedBanks, accountId, legalEntity, direction, currency, txnType, accountIdToBankName, accountIdToLegalEntity])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  React.useEffect(() => {
    setPage(1)
  }, [q, dateRange, selectedBanks, accountId, legalEntity, direction, currency, txnType])

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const paged = filtered.slice(pageStart, pageEnd)

  const hasTxns = rows.length > 0
  const hasFilters = hasTxns

  const bankLabel =
    selectedBanks.size === 0
      ? 'None'
      : selectedBanks.size === bankNames.length
        ? 'All'
        : selectedBanks.size === 1
          ? Array.from(selectedBanks)[0]!
          : `${selectedBanks.size} selected`

  const dateLabel = formatDateRangeLabel(dateRange)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={filtered.length === 0}
          onClick={() => downloadTransactionsCsv(filtered, CLIENT_GROUP.name)}
        >
          <DownloadIcon className="size-3.5" />
          Download CSV
          {filtered.length > 0 && (
            <span className="text-[0.65rem] text-muted-foreground">
              ({filtered.length})
            </span>
          )}
        </Button>
      </div>

      {hasFilters && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by txn id, counterparty, customer ref, bank ref, intacc, remittance…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 font-normal"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Transaction date:
                  </span>
                  <span className="text-xs">{dateLabel}</span>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 font-normal"
                >
                  <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Bank:
                  </span>
                  <span>{bankLabel}</span>
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Filter by bank
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {bankNames.map((name) => (
                  <DropdownMenuCheckboxItem
                    key={name}
                    checked={selectedBanks.has(name)}
                    onCheckedChange={(checked) => {
                      setSelectedBanks((prev) => {
                        const next = new Set(prev)
                        if (checked) next.add(name)
                        else next.delete(name)
                        return next
                      })
                    }}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={legalEntity} onValueChange={setLegalEntity}>
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Legal entity:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEGAL_ENTITIES.map((e) => (
                  <SelectItem key={e.code} value={e.code}>
                    {e.code} · {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Account:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.bank} · {a.legalEntity} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as DirectionFilter)}
            >
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Direction:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="CREDIT">CREDIT</SelectItem>
                <SelectItem value="DEBIT">DEBIT</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as CurrencyFilter)}
            >
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Currency:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={txnType} onValueChange={setTxnType}>
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Type:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {txnTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32 text-[0.7rem] uppercase tracking-wider whitespace-normal leading-snug">
                    <span
                      className="inline-flex items-center gap-1"
                      title="Value Date of the transaction"
                    >
                      Date
                      <ArrowDownIcon className="size-3 opacity-60" />
                    </span>
                  </TableHead>
                  <TableHead className="w-44 text-[0.7rem] uppercase tracking-wider whitespace-normal leading-snug">
                    Account
                  </TableHead>
                  <TableHead className="w-40 text-right text-[0.7rem] uppercase tracking-wider whitespace-normal leading-snug">
                    Amount
                  </TableHead>
                  <TableHead className="w-56 text-[0.7rem] uppercase tracking-wider whitespace-normal leading-snug">
                    Counterparty details
                  </TableHead>
                  <TableHead className="w-28 text-[0.7rem] uppercase tracking-wider whitespace-normal leading-snug">
                    Reconciled
                  </TableHead>
                  <TableHead className="w-12 text-[0.7rem] uppercase tracking-wider whitespace-normal leading-snug">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => setOpenTxn(t)}
                  >
                    <TableCell
                      className="text-xs text-muted-foreground whitespace-nowrap"
                      title="Value Date of the transaction"
                    >
                      {t.transactionDate}
                    </TableCell>
                    <TableCell
                      className="max-w-[11rem]"
                      title={`${accountIdToName[t.internalAccountId] ?? ''} · ${t.internalAccountId}`}
                    >
                      <Mono className="block max-w-full truncate">
                        {accountIdToOrigin[t.internalAccountId]?.number ??
                          t.internalAccountId}
                      </Mono>
                      {accountIdToName[t.internalAccountId] && (
                        <div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                          {accountIdToName[t.internalAccountId]}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span
                        className={`text-sm tabular-nums ${
                          t.direction === 'CREDIT'
                            ? 'text-emerald-700'
                            : 'text-foreground'
                        }`}
                      >
                        {formatDirectionalAmount(t)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[14rem]">
                      <div
                        className="truncate text-sm font-medium"
                        title={t.senderName}
                      >
                        {t.senderName || '—'}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
                        {t.senderBank || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ReconciledBadge
                        at={txnDetail(t, accountById[t.internalAccountId])
                          .reconciledWithStatementAt}
                      />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label="Row actions"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => setOpenTxn(t)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => flagException(t, 'return')}
                            disabled={t.direction !== 'CREDIT'}
                          >
                            <FlagIcon className="size-3.5" />
                            Flag for return
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {rows.length === 0
                        ? 'No transactions yet.'
                        : 'No transactions match your filters'}
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

      <Sheet open={!!openTxn} onOpenChange={(o) => !o && setOpenTxn(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {openTxn && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{openTxn.id}</SheetTitle>
              </SheetHeader>
              {/* Headline + prominent Actions — mirrors the row actions menu */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-bold tracking-tight tabular-nums ${
                        openTxn.direction === 'CREDIT'
                          ? 'text-emerald-700'
                          : 'text-foreground'
                      }`}
                    >
                      {formatDirectionalAmount(openTxn)}
                    </span>
                    <span
                      className={
                        openTxn.direction === 'CREDIT'
                          ? 'inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-emerald-700'
                          : 'inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-700'
                      }
                    >
                      {openTxn.direction}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {openTxn.senderName} · {openTxn.transactionDate}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="gap-1.5">
                      Actions
                      <ChevronDownIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onSelect={() => flagException(openTxn, 'return')}
                      disabled={openTxn.direction !== 'CREDIT'}
                    >
                      <FlagIcon className="size-3.5" />
                      Flag for return
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <TxnDetailBody
                t={openTxn}
                account={accountById[openTxn.internalAccountId]}
                origin={accountIdToOrigin[openTxn.internalAccountId]}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <MonoLabel>{label}</MonoLabel>
      <div>{children}</div>
    </div>
  )
}

// Reconciliation state as a badge in the main table; the full timestamp lives
// in the detail view.
function ReconciledBadge({ at }: { at: string | null }) {
  if (!at) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-amber-700"
        title="Not yet matched to a bank statement"
      >
        <ClockIcon className="size-3" />
        Pending
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-emerald-700"
      title={`Reconciled at ${at}`}
    >
      <CheckCircle2Icon className="size-3" />
      Yes
    </span>
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
    <div className="space-y-3">
      <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-foreground/70">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  )
}

// Every field the spec assigns to the Detail view, in spec order.
// organization_id and statement_entry_id are deliberately not rendered.
function TxnDetailBody({
  t,
  account,
  origin,
}: {
  t: Txn
  account: Account | undefined
  origin: { number: string; bic: string } | undefined
}) {
  const d = txnDetail(t, account)

  return (
    <div className="space-y-6 px-4 pb-6 pt-4">
      <DetailSection title="Identifiers">
        <Field label="Transaction ID">
          <Mono>{t.id}</Mono>
        </Field>
        <Field label="Type">
          <StatusPill status={t.transactionType} />
        </Field>
        <Field label="Bank reference">
          <Mono>{t.bankRef || '—'}</Mono>
        </Field>
        <Field label="Customer reference">
          <Mono>{t.customerRef || '—'}</Mono>
        </Field>
        <Field label="Virtual account">
          {d.virtualAccountNumber ? (
            <Mono>{d.virtualAccountNumber}</Mono>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="Bank message ID">
          <Mono className="break-all">{d.messageId}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Counterparty">
        <Field
          label={t.direction === 'DEBIT' ? 'Receiver name' : 'Sender name'}
        >
          <span className="text-sm font-medium">{t.senderName || '—'}</span>
        </Field>
        <Field
          label={t.direction === 'DEBIT' ? 'Receiver bank' : 'Sender bank'}
        >
          <span className="text-sm">{t.senderBank || '—'}</span>
        </Field>
        <Field label="Counterparty account no.">
          {d.senderBankAccountNumber ? (
            <Mono>{d.senderBankAccountNumber}</Mono>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="Amount">
          <span className="text-sm tabular-nums">
            {formatAmountWithCurrency(t.amount, t.currency)}
          </span>
        </Field>
      </DetailSection>

      <DetailSection title="Payment information">
        <Field label="Description" className="col-span-2">
          <p className="break-words text-sm text-foreground/90">
            {d.description}
          </p>
        </Field>
        <Field label="Remittance information" className="col-span-2">
          <p className="break-words text-sm text-foreground/90">
            {t.remittanceInfo || '—'}
          </p>
        </Field>
        <Field label="Additional information" className="col-span-2">
          <pre className="whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-mono text-[0.72rem] text-foreground/90">
            {t.additionalInformation || '—'}
          </pre>
        </Field>
        <Field label="Other references" className="col-span-2">
          <div className="overflow-hidden rounded border">
            <table className="w-full text-[0.72rem]">
              <tbody>
                {d.transactionReferences.map((r) => (
                  <tr key={r.name} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">
                      {r.name}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{r.value}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">
                      {r.dataSource}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Field>
      </DetailSection>

      <DetailSection title="Reconciliation">
        <Field label="Statement ID">
          <button
            type="button"
            className="inline-flex items-center gap-1 font-mono text-[0.78rem] text-[#1447E6] hover:underline"
            onClick={() =>
              toast.info('Statements view not in this mockup yet', {
                description: `${d.statementId} — the statement detail page is still to be designed.`,
              })
            }
          >
            {d.statementId}
            <ExternalLinkIcon className="size-3" />
          </button>
        </Field>
        <Field label="Reconciled at">
          {d.reconciledWithStatementAt ? (
            <Mono>{d.reconciledWithStatementAt}</Mono>
          ) : (
            <span className="text-sm text-amber-700">
              Not yet reconciled
            </span>
          )}
        </Field>
        <Field label="Data source" className="col-span-2">
          <ol className="space-y-2">
            {d.dataSourceTimeline.map((step, i) => (
              <li key={`${step.source}-${i}`} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  {i < d.dataSourceTimeline.length - 1 && (
                    <span className="mt-0.5 w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex items-baseline gap-2">
                    <Mono className="text-[0.7rem]">{step.source}</Mono>
                    <span className="text-xs text-foreground/80">
                      {step.label}
                    </span>
                  </div>
                  <div className="text-[0.7rem] text-muted-foreground">
                    {step.at}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Field>
      </DetailSection>

      <DetailSection title="Audit">
        <Field label="Created at">
          <Mono>{t.createdAt}</Mono>
        </Field>
        <Field label="Last updated">
          <Mono>{d.updatedAt}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Bank log">
        <Field label="Raw bank log" className="col-span-2">
          <pre className="max-h-72 overflow-auto rounded border bg-muted/30 p-3 font-mono text-[0.7rem] leading-relaxed text-foreground/90">
            {d.rawBankLog}
          </pre>
        </Field>
        <Field label="API response payload" className="col-span-2">
          <pre className="max-h-96 overflow-auto rounded border bg-muted/30 p-3 font-mono text-[0.7rem] leading-relaxed text-foreground/90">
            {buildRawPayload(t, origin, d)}
          </pre>
        </Field>
      </DetailSection>
    </div>
  )
}

