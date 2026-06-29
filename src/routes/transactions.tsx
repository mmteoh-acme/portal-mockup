import * as React from 'react'
import {
  SearchIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  Undo2Icon,
  DownloadIcon,
} from 'lucide-react'
import { parse as parseDate } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Mono, MonoLabel, StatusPill } from '@/components/mono'
import { useEntity } from '@/lib/entity-context'
import {
  entityAccounts,
  entityTransactions,
  type Txn,
} from '@/data/fixtures'
import type { DateRange } from 'react-day-picker'

type DirectionFilter = 'all' | 'CREDIT' | 'DEBIT'
type CurrencyFilter = 'all' | string

const PAGE_SIZE = 20

const CSV_HEADERS = [
  'Transaction ID',
  'Direction',
  'Amount',
  'Currency',
  'Transaction date',
  'Internal account ID',
  'Sender name',
  'Sender bank',
  'Customer reference',
  'Bank reference',
  'Additional info',
  'Remittance info',
  'Transaction type',
  'Data source',
  'Created at',
] as const

function csvEscape(v: string | undefined | null): string {
  const s = (v ?? '').toString()
  return `"${s.replace(/"/g, '""')}"`
}

function downloadTransactionsCsv(rows: Txn[], entityName: string): void {
  const lines = [CSV_HEADERS.map(csvEscape).join(',')]
  for (const t of rows) {
    lines.push(
      [
        t.id,
        t.direction,
        t.amount,
        t.currency,
        t.transactionDate,
        t.internalAccountId,
        t.senderName,
        t.senderBank,
        t.customerRef,
        t.bankRef,
        t.additionalInformation,
        t.remittanceInfo,
        t.transactionType,
        t.dataSource,
        t.createdAt,
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
  const { entity } = useEntity()
  const navigate = useNavigate()

  const rows = React.useMemo<Txn[]>(
    () => (entity ? entityTransactions(entity) : []),
    [entity],
  )

  const bankNames = React.useMemo(
    () => (entity ? entity.banks.map((b) => b.name) : []),
    [entity],
  )

  const accounts = React.useMemo(
    () => (entity ? entityAccounts(entity) : []),
    [entity],
  )

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
  const [direction, setDirection] = React.useState<DirectionFilter>('all')
  const [currency, setCurrency] = React.useState<CurrencyFilter>('all')
  const [openTxn, setOpenTxn] = React.useState<Txn | null>(null)
  const [page, setPage] = React.useState(1)

  // Distinct currencies present in this entity's transactions, for the Currency filter.
  const currencies = React.useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.currency) set.add(r.currency)
    return Array.from(set).sort()
  }, [rows])

  React.useEffect(() => {
    setSelectedBanks(new Set(bankNames))
    setAccountId('all')
    setCurrency('all')
  }, [entity?.id, bankNames])

  // Map each entity account id → its bank's name. Used by the Bank filter to
  // decide whether a transaction's internalAccountId belongs to a selected bank.
  const accountIdToBankName = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const b of entity?.banks ?? []) {
      for (const a of b.accounts) {
        map[a.id] = b.name
      }
    }
    return map
  }, [entity?.banks])

  // Map each entity account id → its display name (e.g. "USD Operating").
  // Used in the Transaction ID cell so the account context is visible inline.
  const accountIdToName = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const b of entity?.banks ?? []) {
      for (const a of b.accounts) {
        map[a.id] = a.name
      }
    }
    return map
  }, [entity?.banks])

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
      if (direction !== 'all' && t.direction !== direction) return false
      if (currency !== 'all' && t.currency !== currency) return false
      return true
    })
  }, [rows, q, dateRange, selectedBanks, accountId, direction, currency, accountIdToBankName])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  React.useEffect(() => {
    setPage(1)
  }, [q, dateRange, selectedBanks, accountId, direction, currency, entity?.id])

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const paged = filtered.slice(pageStart, pageEnd)

  if (!entity) return null

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
          <p className="mt-1 text-sm text-muted-foreground">
            Search and reconcile across your bank rails for{' '}
            <span className="font-medium text-foreground">{entity.name}</span>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={filtered.length === 0}
          onClick={() => downloadTransactionsCsv(filtered, entity.name)}
        >
          <DownloadIcon className="size-3.5" />
          Download CSV
          {filtered.length > 0 && (
            <span className="font-mono text-[0.65rem] text-muted-foreground">
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
              placeholder="Search by txn id, sender name, customer ref, bank ref, intacc, remittance…"
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
                  <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Transaction date:
                  </span>
                  <span className="font-mono text-xs">{dateLabel}</span>
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
                  <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    Bank:
                  </span>
                  <span>{bankLabel}</span>
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
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

            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  Account:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as DirectionFilter)}
            >
              <SelectTrigger size="sm" className="h-8 gap-2 font-normal">
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
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
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
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
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Transaction ID
                  </TableHead>
                  <TableHead className="text-right font-mono text-[0.7rem] uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Currency
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Transaction date
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Sender name
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Sender bank
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Customer reference
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Bank reference
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Transaction type
                  </TableHead>
                  <TableHead className="font-mono text-[0.7rem] uppercase tracking-wider">
                    Created at
                  </TableHead>
                  <TableHead className="w-12 font-mono text-[0.7rem] uppercase tracking-wider">
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
                    <TableCell className="max-w-[12rem]">
                      <Mono>{t.id}</Mono>
                      {accountIdToName[t.internalAccountId] && (
                        <div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                          {accountIdToName[t.internalAccountId]}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div
                        className={`font-mono text-[0.65rem] uppercase tracking-wider ${
                          t.direction === 'CREDIT'
                            ? 'text-emerald-700'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {t.direction}
                      </div>
                      <div className="font-mono text-sm tabular-nums">
                        {t.direction === 'CREDIT' ? '+' : '-'} {t.amount}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.currency}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {t.transactionDate}
                    </TableCell>
                    <TableCell
                      className="max-w-[10rem] truncate text-sm font-medium"
                      title={t.senderName}
                    >
                      {t.senderName}
                    </TableCell>
                    <TableCell
                      className="max-w-[8rem] truncate text-xs"
                      title={t.senderBank}
                    >
                      {t.senderBank}
                    </TableCell>
                    <TableCell
                      className="max-w-[9rem] truncate"
                      title={t.customerRef}
                    >
                      <span className="block truncate font-mono text-[0.7rem] rounded bg-muted px-1.5 py-0.5">
                        {t.customerRef || '—'}
                      </span>
                    </TableCell>
                    <TableCell
                      className="max-w-[9rem] truncate"
                      title={t.bankRef}
                    >
                      <span className="block truncate font-mono text-[0.7rem] rounded bg-muted px-1.5 py-0.5">
                        {t.bankRef || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={t.transactionType} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {t.createdAt}
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
                            onSelect={() =>
                              navigate({
                                to: '/payments',
                                search: { action: 'new-refund', txnId: t.id },
                              })
                            }
                            disabled={t.direction !== 'CREDIT'}
                          >
                            <Undo2Icon className="size-3.5" />
                            Refund payment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {rows.length === 0
                        ? 'No transactions yet for this entity.'
                        : 'No transactions match your filters'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
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
                <span className="font-mono text-xs text-muted-foreground">
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
                <SheetDescription>
                  Transaction detail — surfaced verbatim from{' '}
                  {openTxn.dataSource}.
                </SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 pb-6">
                <Field label="Direction">
                  <span className="font-mono text-sm">{openTxn.direction}</span>
                </Field>
                <Field label="Amount">
                  <span className="font-mono text-sm tabular-nums">
                    {openTxn.direction === 'CREDIT' ? '+' : '-'} {openTxn.amount}
                  </span>
                </Field>
                <Field label="Currency">
                  <Mono>{openTxn.currency}</Mono>
                </Field>
                <Field label="Transaction date">
                  <Mono>{openTxn.transactionDate}</Mono>
                </Field>
                <Field label="Internal account number">
                  <Mono>{openTxn.internalAccountId}</Mono>
                </Field>
                <Field label="Transaction type">
                  <StatusPill status={openTxn.transactionType} />
                </Field>
                <Field label="Sender name">
                  <span className="text-sm font-medium">
                    {openTxn.senderName || '—'}
                  </span>
                </Field>
                <Field label="Sender bank">
                  <span className="text-sm">{openTxn.senderBank || '—'}</span>
                </Field>
                <Field label="Customer reference">
                  <Mono>{openTxn.customerRef || '—'}</Mono>
                </Field>
                <Field label="Bank reference">
                  <Mono>{openTxn.bankRef || '—'}</Mono>
                </Field>
                <Field label="Data source">
                  <Mono>{openTxn.dataSource}</Mono>
                </Field>
                <Field label="Created at">
                  <Mono>{openTxn.createdAt}</Mono>
                </Field>
                <Field label="Additional info" className="col-span-2">
                  <pre className="whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-mono text-[0.72rem] text-foreground/90">
                    {openTxn.additionalInformation || '—'}
                  </pre>
                </Field>
                <Field label="Remittance info" className="col-span-2">
                  <p className="break-words text-sm text-foreground/90">
                    {openTxn.remittanceInfo || '—'}
                  </p>
                </Field>
              </div>
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

