import * as React from 'react'
import {
  SearchIcon,
  CalendarIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import type {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table'
import {
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Mono, StatusPill } from '@/components/mono'
import { DataTable, DataTablePagination } from '@/components/data-table'
import { DataTableFilter } from '@/components/data-table-filter'
import { CodeBlockField, DetailSection, Field } from '@/components/detail-list'
import { csvFilename, downloadCsv } from '@/lib/csv'
import {
  SELECT_ALL_STATE,
  dateInRange,
  formatDateRangeLabel,
  isoDisplayDate,
} from '@/lib/table-utils'
import {
  ACCOUNTS,
  CLIENT_GROUP,
  LEGAL_ENTITIES,
  TRANSACTIONS,
  formatAmountWithCurrency,
  formatDirectionalAmount,
  getAccount,
  legalEntityName,
  txnDetail,
  txnIsoDate,
  type Account,
  type Txn,
  type TxnDetail,
} from '@/data/fixtures'
import type { DateRange } from 'react-day-picker'

const PAGE_SIZE = 10

// Mirrors the transaction view's field set: the main columns first, then the
// detail fields. organization_id and statement_entry_id stay out of the export.
const CSV_HEADERS = [
  'Date',
  'Booking date',
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

function downloadTransactionsCsv(rows: Txn[], entityName: string): void {
  downloadCsv(
    csvFilename('transactions', entityName),
    CSV_HEADERS,
    rows.map((t) => {
      const account = getAccount(t.internalAccountId)
      const d = txnDetail(t, account)
      return [
        t.transactionDate,
        d.bookingDate,
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
        d.transactionReferences.map((r) => `${r.name}=${r.value}`).join('; '),
        d.messageId,
        t.dataSource,
        d.statementId,
        d.reconciledWithStatementAt,
        d.description,
        t.createdAt,
        d.updatedAt,
      ]
    }),
  )
}

// Reconstruct the raw API payload for a transaction, mirroring the
// GET /transactions response shape surfaced by the Acme API.
function buildRawPayload(
  t: Txn,
  origin: { number: string; bic: string } | undefined,
  d: TxnDetail,
): string {
  const date = isoDisplayDate(t.transactionDate)
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

// Row shape the table works on: the transaction plus the account attributes and
// derived values the columns sort, filter and group by.
type TxnRow = Txn & {
  accountNumber: string
  accountName: string
  bank: string
  legalEntityCode: string
  amountNumber: number
}

export function TransactionsPage() {
  const accounts = React.useMemo(() => ACCOUNTS, [])
  const accountById = React.useMemo<Record<string, Account>>(() => {
    const map: Record<string, Account> = {}
    for (const a of accounts) map[a.id] = a
    return map
  }, [accounts])

  // Flat list for the whole client group, widened with the account attributes
  // so bank / legal entity / account are filterable columns rather than
  // separate bits of page state.
  const data = React.useMemo<TxnRow[]>(
    () =>
      TRANSACTIONS.map((t) => {
        const account = accountById[t.internalAccountId]
        return {
          ...t,
          accountNumber: account?.number ?? t.internalAccountId,
          accountName: account?.name ?? '',
          bank: account?.bank ?? '',
          legalEntityCode: account?.legalEntity ?? '',
          amountNumber: Number(String(t.amount).replace(/,/g, '')) || 0,
        }
      }),
    [accountById],
  )

  const defaultRange = React.useMemo<DateRange>(() => {
    const today = new Date('2026-06-01T00:00:00')
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from, to: today }
  }, [])

  const [openTxn, setOpenTxn] = React.useState<Txn | null>(null)
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'transactionDate', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () => [{ id: 'transactionDate', value: defaultRange }],
  )

  const columns = React.useMemo<ColumnDef<TxnRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={SELECT_ALL_STATE(
              table.getIsAllPageRowsSelected(),
              table.getIsSomePageRowsSelected(),
            )}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: 'transactionDate',
        accessorKey: 'transactionDate',
        header: 'Date',
        meta: { headerTooltip: 'Value date returned from the bank' },
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {row.original.transactionDate}
          </span>
        ),
        sortingFn: (a, b) =>
          txnIsoDate(a.original.transactionDate).localeCompare(
            txnIsoDate(b.original.transactionDate),
          ) || a.original.createdAt.localeCompare(b.original.createdAt),
        filterFn: (row, columnId, value) =>
          dateInRange(
            row.getValue(columnId) as string,
            value as DateRange | undefined,
          ),
      },
      {
        id: 'accountNumber',
        accessorKey: 'accountNumber',
        header: 'Account',
        cell: ({ row }) => (
          <div
            className="max-w-[11rem]"
            title={`${row.original.accountName} · ${row.original.internalAccountId}`}
          >
            <Mono className="block max-w-full truncate">
              {row.original.accountNumber}
            </Mono>
            {row.original.accountName && (
              <div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                {row.original.accountName}
              </div>
            )}
          </div>
        ),
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterLabel: 'Account' },
      },
      {
        id: 'amountNumber',
        accessorKey: 'amountNumber',
        header: 'Amount',
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <span
              className={`text-sm tabular-nums ${
                row.original.direction === 'CREDIT'
                  ? 'text-emerald-700'
                  : 'text-foreground'
              }`}
            >
              {formatDirectionalAmount(row.original)}
            </span>
          </div>
        ),
        filterFn: 'inNumberRange',
        meta: { filterVariant: 'range', filterLabel: 'Amount' },
      },
      {
        id: 'counterparty',
        accessorFn: (r) => `${r.senderName} ${r.senderBank}`.trim(),
        header: 'Counterparty details',
        cell: ({ row }) => (
          <div className="max-w-[14rem]">
            <div
              className="truncate text-sm font-medium"
              title={row.original.senderName}
            >
              {row.original.senderName || '—'}
            </div>
            <div className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
              {row.original.senderBank || '—'}
            </div>
          </div>
        ),
        filterFn: 'includesString',
        enableSorting: false,
        meta: { filterVariant: 'text', filterLabel: 'Counterparty' },
      },
      {
        id: 'bankRef',
        accessorKey: 'bankRef',
        header: 'Bank reference',
        cell: ({ row }) => (
          <Mono className="text-[0.7rem]">{row.original.bankRef || '—'}</Mono>
        ),
        filterFn: 'includesString',
        enableSorting: false,
        meta: { filterVariant: 'text', filterLabel: 'Bank reference' },
      },
      {
        id: 'transactionType',
        accessorKey: 'transactionType',
        header: 'Type',
        cell: ({ row }) => (
          <StatusPill status={row.original.transactionType} />
        ),
        filterFn: 'equalsString',
        enableSorting: false,
        meta: { filterVariant: 'select', filterLabel: 'Type' },
      },
      // Attributes we filter on but don't show as columns — hidden so their
      // filter controls can live in the same filter row.
      {
        id: 'bank',
        accessorKey: 'bank',
        header: 'Bank',
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterLabel: 'Bank' },
      },
      {
        id: 'legalEntityCode',
        accessorKey: 'legalEntityCode',
        header: 'Legal entity',
        filterFn: 'equalsString',
        meta: {
          filterVariant: 'select',
          filterLabel: 'Legal entity',
          filterOptions: LEGAL_ENTITIES.map((e) => ({
            label: `${e.code} · ${e.name}`,
            value: e.code,
          })),
        },
      },
      {
        id: 'direction',
        accessorKey: 'direction',
        header: 'Direction',
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterLabel: 'Direction' },
      },
      {
        id: 'currency',
        accessorKey: 'currency',
        header: 'Currency',
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterLabel: 'Currency' },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div>
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
                <DropdownMenuItem onSelect={() => setOpenTxn(row.original)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    downloadTransactionsCsv([row.original], CLIENT_GROUP.name)
                  }
                >
                  <DownloadIcon className="size-3.5" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
        size: 48,
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter },
    initialState: {
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
      columnVisibility: {
        bank: false,
        legalEntityCode: false,
        direction: false,
        currency: false,
      },
    },
    getRowId: (r) => r.id,
    globalFilterFn: (row, _columnId, value) => {
      const needle = String(value).trim().toLowerCase()
      if (!needle) return true
      const r = row.original
      return [
        r.id,
        r.senderName,
        r.customerRef,
        r.bankRef,
        r.internalAccountId,
        r.accountNumber,
        r.remittanceInfo,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableSortingRemoval: false,
    autoResetPageIndex: true,
  })

  const dateColumn = table.getColumn('transactionDate')!
  const dateRange = dateColumn.getFilterValue() as DateRange | undefined
  const dateLabel = formatDateRangeLabel(dateRange)

  const accountOptions = React.useMemo(
    () =>
      accounts.map((a) => ({
        label: `${a.number} · ${a.name}`,
        value: a.number,
      })),
    [accounts],
  )

  const selectedRows = table.getSelectedRowModel().rows

  const clearFilters = () => {
    setGlobalFilter('')
    setColumnFilters([{ id: 'transactionDate', value: defaultRange }])
  }

  const activeFilterCount =
    columnFilters.filter((f) => f.id !== 'transactionDate').length +
    (globalFilter.trim() ? 1 : 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select rows to export them as CSV.
        </p>
      </div>

      <div className="rounded-md border bg-card">
        {/* Search + per-column filters */}
        <div className="space-y-3 px-4 py-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search by txn id, counterparty, customer ref, bank ref, account, remittance…"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Transaction date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 font-normal"
                  >
                    <CalendarIcon className="size-3.5" />
                    <span className="truncate text-xs">{dateLabel}</span>
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
                          dateColumn.setFilterValue({ from, to: today })
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
                          dateColumn.setFilterValue({ from, to: today })
                        }}
                      >
                        Last 30 days
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => dateColumn.setFilterValue(undefined)}
                      >
                        Clear
                      </Button>
                    </div>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(r) => dateColumn.setFilterValue(r)}
                      numberOfMonths={2}
                      defaultMonth={dateRange?.from ?? new Date('2026-06-01')}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <DataTableFilter
              column={table.getColumn('accountNumber')!}
              options={accountOptions}
            />
            <DataTableFilter column={table.getColumn('amountNumber')!} />
            <DataTableFilter column={table.getColumn('counterparty')!} />
            <DataTableFilter column={table.getColumn('bankRef')!} />
            <DataTableFilter column={table.getColumn('bank')!} />
            <DataTableFilter column={table.getColumn('legalEntityCode')!} />
            <DataTableFilter column={table.getColumn('direction')!} />
            <DataTableFilter column={table.getColumn('currency')!} />
            <DataTableFilter column={table.getColumn('transactionType')!} />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {activeFilterCount} filter
                {activeFilterCount === 1 ? '' : 's'} active
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Bulk actions for the checkbox selection */}
        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t bg-brand-subtle px-4 py-2.5">
            <span className="text-xs font-medium text-brand-subtle-foreground">
              {selectedRows.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 bg-background text-xs"
              onClick={() =>
                downloadTransactionsCsv(
                  selectedRows.map((r) => r.original),
                  CLIENT_GROUP.name,
                )
              }
            >
              <DownloadIcon className="size-3" />
              Download CSV ({selectedRows.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
          </div>
        )}

        <DataTable
          table={table}
          onRowClick={setOpenTxn}
          emptyMessage={
            data.length === 0
              ? 'No transactions yet.'
              : 'No transactions match your filters'
          }
        />

        <DataTablePagination table={table} />
      </div>

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
                      onSelect={() =>
                        downloadTransactionsCsv([openTxn], CLIENT_GROUP.name)
                      }
                    >
                      <DownloadIcon className="size-3.5" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <TxnDetailBody
                t={openTxn}
                account={accountById[openTxn.internalAccountId]}
                origin={
                  accountById[openTxn.internalAccountId]
                    ? {
                        number: accountById[openTxn.internalAccountId].number,
                        bic: accountById[openTxn.internalAccountId].swiftBic,
                      }
                    : undefined
                }
              />
            </>
          )}
        </SheetContent>
      </Sheet>
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
      <DetailSection title="Account">
        <Field label="Account name">
          <span className="text-sm font-medium">{account?.name ?? '—'}</span>
        </Field>
        <Field label="Account number">
          <Mono>{origin?.number ?? '—'}</Mono>
        </Field>
        <Field label="Internal account ID">
          <Mono>{t.internalAccountId}</Mono>
        </Field>
        <Field label="Bank">
          <span className="text-sm">{account?.bank ?? '—'}</span>
        </Field>
        <Field label="Legal entity">
          {account ? (
            <span className="text-sm">
              {account.legalEntity} · {legalEntityName(account.legalEntity)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="SWIFT/BIC">
          <Mono>{origin?.bic || '—'}</Mono>
        </Field>
      </DetailSection>

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
        <Field label="Description" stacked>
          <p className="break-words text-sm text-foreground/90">
            {d.description}
          </p>
        </Field>
        <Field label="Remittance information" stacked>
          <p className="break-words text-sm text-foreground/90">
            {t.remittanceInfo || '—'}
          </p>
        </Field>
        <Field label="Additional information" stacked>
          <pre className="whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-mono text-[0.72rem] text-foreground/90">
            {t.additionalInformation || '—'}
          </pre>
        </Field>
        <Field label="Other references" stacked>
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
            className="inline-flex items-center gap-1 font-mono text-[0.78rem] text-brand hover:underline"
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
        <Field label="Data source" stacked>
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

      <DetailSection title="Dates">
        <Field label="Booking date">
          <Mono>{d.bookingDate}</Mono>
        </Field>
        <Field label="Created at">
          <Mono>{t.createdAt}</Mono>
        </Field>
        <Field label="Last updated">
          <Mono>{d.updatedAt}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Bank log">
        <CodeBlockField label="Raw bank log" code={d.rawBankLog} />
        <CodeBlockField
          label="API response payload"
          code={buildRawPayload(t, origin, d)}
        />
      </DetailSection>
    </div>
  )
}

