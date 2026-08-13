import * as React from 'react'
import {
  CalendarIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  DownloadIcon,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Mono, StatusPill } from '@/components/mono'
import {
  DataTable,
  DataTablePagination,
  DataTableSelectionBar,
} from '@/components/data-table'
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
  allPayments,
  formatAmountWithCurrency,
  legalEntityName,
  type Account,
  type Payment,
} from '@/data/fixtures'
import type { DateRange } from 'react-day-picker'

const PAGE_SIZE = 10

// Payments are read-only in this version: the portal lists what the bank
// settled or rejected. Creating, retrying and approving payments are not in
// the MVP, so only the two settled statuses are surfaced — there is no
// pending, rejected-by-approver or expired state to show.

const CSV_HEADERS = [
  'Payment ID',
  'Created at',
  'Status',
  'Type',
  'Amount',
  'Currency',
  'Account number',
  'Account name',
  'Internal account ID',
  'Bank',
  'Legal entity',
  'Receiver name',
  'Receiver bank (BIC)',
  'Receiver account no.',
  'Local routing ID',
  'Customer reference',
  'Payment details',
  'Result code',
  'Error message',
  'Mode',
  'Last updated',
] as const

// Row shape the table works on: the payment plus the sending account's
// attributes, so bank / legal entity / account are filterable columns rather
// than separate bits of page state.
type PaymentRow = Payment & {
  accountNumber: string
  accountName: string
  bank: string
  legalEntityCode: string
  amountNumber: number
}

function downloadPaymentsCsv(rows: PaymentRow[]): void {
  downloadCsv(
    csvFilename('payments', CLIENT_GROUP.name),
    CSV_HEADERS,
    rows.map((p) => [
      p.id,
      p.createdAt,
      p.status,
      p.type,
      p.amount,
      p.currency,
      p.accountNumber,
      p.accountName,
      p.senderAccountId,
      p.bank,
      p.legalEntityCode,
      p.receiverName,
      p.receiverBank,
      p.receiverBankAccountNumber,
      p.receiverLocalRoutingIdentifier,
      p.customerReference,
      p.paymentDetails,
      p.status === 'FAILED' ? p.resultCode : '',
      p.status === 'FAILED' ? p.underlyingErrorMessage : '',
      p.mode,
      p.updatedAt,
    ]),
  )
}

// Reconstruct the raw API payload for a payment, mirroring the
// GET /payments/{id} response shape surfaced by the Acme API.
function buildPaymentRawPayload(p: Payment): string {
  const created = isoDisplayDate(p.createdAt)
  const updated = isoDisplayDate(p.updatedAt || p.createdAt)
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
    status: p.status,
    paymentAdviceEmails: ['finance@tryacme.com'],
    ...(p.status === 'FAILED' && p.resultCode
      ? { resultCode: p.resultCode }
      : {}),
    createdAt: `${created}T00:00:00.000000Z`,
    updatedAt: `${updated}T00:00:00.000000Z`,
  }
  return JSON.stringify(payload, null, 2)
}

export function PaymentsPage() {
  const accounts = React.useMemo(() => ACCOUNTS, [])
  const accountById = React.useMemo<Record<string, Account>>(() => {
    const map: Record<string, Account> = {}
    for (const a of accounts) map[a.id] = a
    return map
  }, [accounts])

  const data = React.useMemo<PaymentRow[]>(
    () =>
      allPayments.map((p) => {
        const account = accountById[p.senderAccountId]
        return {
          ...p,
          accountNumber: account?.number ?? p.senderAccountId,
          accountName: account?.name ?? '',
          bank: account?.bank ?? '',
          legalEntityCode: account?.legalEntity ?? '',
          amountNumber: Number(String(p.amount).replace(/,/g, '')) || 0,
        }
      }),
    [accountById],
  )

  const [openPayment, setOpenPayment] = React.useState<PaymentRow | null>(null)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'createdAt', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )

  const columns = React.useMemo<ColumnDef<PaymentRow>[]>(
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
        meta: { headerTooltip: 'Select rows to export them as CSV' },
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Date',
        meta: { headerTooltip: 'Date the payment order was created' },
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {row.original.createdAt}
          </span>
        ),
        sortingFn: (a, b) =>
          isoDisplayDate(a.original.createdAt).localeCompare(
            isoDisplayDate(b.original.createdAt),
          ) || a.original.id.localeCompare(b.original.id),
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
            title={`${row.original.accountName} · ${row.original.senderAccountId}`}
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
          <span className="whitespace-nowrap text-sm tabular-nums">
            {formatAmountWithCurrency(
              row.original.amount,
              row.original.currency,
            )}
          </span>
        ),
        filterFn: 'inNumberRange',
        meta: { filterVariant: 'range', filterLabel: 'Amount' },
      },
      {
        id: 'receiver',
        accessorFn: (r) => `${r.receiverName} ${r.receiverBankAccountNumber}`.trim(),
        header: 'Receiver details',
        cell: ({ row }) => (
          <div className="max-w-[14rem]">
            <div
              className="truncate text-sm font-medium"
              title={row.original.receiverName}
            >
              {row.original.receiverName || '—'}
            </div>
            <div className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
              {row.original.receiverBankAccountNumber || '—'}
            </div>
          </div>
        ),
        filterFn: 'includesString',
        enableSorting: false,
        meta: { filterVariant: 'text', filterLabel: 'Receiver' },
      },
      {
        id: 'id',
        accessorKey: 'id',
        header: 'Payment ID',
        cell: ({ row }) => (
          <Mono className="text-[0.7rem]">{row.original.id}</Mono>
        ),
        filterFn: 'includesString',
        enableSorting: false,
        meta: { filterVariant: 'text', filterLabel: 'Payment ID' },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusPill status={row.original.status} />,
        filterFn: 'equalsString',
        enableSorting: false,
        meta: { filterVariant: 'select', filterLabel: 'Status' },
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <StatusPill status={row.original.type} />,
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
                <DropdownMenuItem
                  onSelect={() => setOpenPayment(row.original)}
                >
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => downloadPaymentsCsv([row.original])}
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
    state: { sorting, columnFilters, rowSelection },
    initialState: {
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
      columnVisibility: {
        bank: false,
        legalEntityCode: false,
        currency: false,
      },
    },
    getRowId: (r) => r.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
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

  const dateColumn = table.getColumn('createdAt')!
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

  const activeFilterCount = columnFilters.length

  const clearFilters = () => setColumnFilters([])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Payments</h1>

      <div className="rounded-md border bg-card">
        {/* Per-column filters */}
        <div className="space-y-3 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Created at
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
                          from.setDate(from.getDate() - 29)
                          dateColumn.setFilterValue({ from, to: today })
                        }}
                      >
                        Last 30 days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const today = new Date('2026-06-01T00:00:00')
                          const from = new Date(today)
                          from.setDate(from.getDate() - 89)
                          dateColumn.setFilterValue({ from, to: today })
                        }}
                      >
                        Last 90 days
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
                      defaultMonth={dateRange?.from ?? new Date('2026-05-01')}
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
            <DataTableFilter column={table.getColumn('receiver')!} />
            <DataTableFilter column={table.getColumn('id')!} />
            <DataTableFilter column={table.getColumn('status')!} />
            <DataTableFilter column={table.getColumn('type')!} />
            <DataTableFilter column={table.getColumn('bank')!} />
            <DataTableFilter column={table.getColumn('legalEntityCode')!} />
            <DataTableFilter column={table.getColumn('currency')!} />
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

        <DataTableSelectionBar
          table={table}
          noun="payments"
          onDownloadCsv={downloadPaymentsCsv}
        />

        <DataTable
          table={table}
          onRowClick={setOpenPayment}
          emptyMessage={
            data.length === 0
              ? 'No payments yet.'
              : 'No payments match your filters'
          }
        />

        <DataTablePagination table={table} />
      </div>

      <Sheet
        open={!!openPayment}
        onOpenChange={(o) => !o && setOpenPayment(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {openPayment && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{openPayment.id}</SheetTitle>
              </SheetHeader>
              {/* Headline + prominent Actions — mirrors the row actions menu */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight tabular-nums">
                    {formatAmountWithCurrency(
                      openPayment.amount,
                      openPayment.currency,
                    )}
                  </span>
                  <StatusPill status={openPayment.status} />
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
                      onSelect={() => downloadPaymentsCsv([openPayment])}
                    >
                      <DownloadIcon className="size-3.5" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <PaymentDetailBody
                p={openPayment}
                account={accountById[openPayment.senderAccountId]}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function PaymentDetailBody({
  p,
  account,
}: {
  p: PaymentRow
  account: Account | undefined
}) {
  return (
    <div className="space-y-6 px-4 pb-6 pt-4">
      <DetailSection title="Payment">
        <Field label="Payment ID">
          <Mono>{p.id}</Mono>
        </Field>
        <Field label="Status">
          <StatusPill status={p.status} />
        </Field>
        <Field label="Type">
          <StatusPill status={p.type} />
        </Field>
        <Field label="Amount">
          <span className="text-sm tabular-nums">
            {formatAmountWithCurrency(p.amount, p.currency)}
          </span>
        </Field>
        <Field label="Mode">
          <span className="text-xs uppercase tracking-wider">{p.mode}</span>
        </Field>
      </DetailSection>

      <DetailSection title="Sending account">
        <Field label="Account name">
          <span className="text-sm font-medium">{account?.name ?? '—'}</span>
        </Field>
        <Field label="Account number">
          <Mono>{account?.number ?? '—'}</Mono>
        </Field>
        <Field label="Internal account ID">
          <Mono>{p.senderAccountId || '—'}</Mono>
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
          <Mono>{account?.swiftBic || '—'}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Receiver">
        <Field label="Receiver name">
          <span className="text-sm font-medium">{p.receiverName || '—'}</span>
        </Field>
        <Field label="Receiver bank (BIC)">
          <Mono>{p.receiverBank || '—'}</Mono>
        </Field>
        <Field label="Receiver account no.">
          <Mono>{p.receiverBankAccountNumber || '—'}</Mono>
        </Field>
        <Field label="Local routing ID">
          <Mono>{p.receiverLocalRoutingIdentifier || '—'}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Payment information">
        <Field label="Customer reference">
          <Mono className="break-all">{p.customerReference || '—'}</Mono>
        </Field>
        <Field label="Payment details" stacked>
          <p className="break-words text-sm text-foreground/90">
            {p.paymentDetails || '—'}
          </p>
        </Field>
      </DetailSection>

      {p.status === 'FAILED' && (
        <DetailSection title="Result">
          <Field label="Result code">
            <span className="text-xs uppercase tracking-wider">
              {p.resultCode || '—'}
            </span>
          </Field>
          <Field label="Error message" stacked>
            <pre className="whitespace-pre-wrap break-words rounded border bg-muted/30 p-2 font-mono text-[0.72rem] text-foreground/90">
              {p.underlyingErrorMessage || '—'}
            </pre>
          </Field>
        </DetailSection>
      )}

      <DetailSection title="Dates">
        <Field label="Created at">
          <Mono>{p.createdAt}</Mono>
        </Field>
        <Field label="Last updated">
          <Mono>{p.updatedAt}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="API">
        <CodeBlockField
          label="API response payload"
          code={buildPaymentRawPayload(p)}
        />
      </DetailSection>
    </div>
  )
}
