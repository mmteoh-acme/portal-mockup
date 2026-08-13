import * as React from 'react'
import { MoreHorizontalIcon, DownloadIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table'
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { DetailSection, Field } from '@/components/detail-list'
import { csvFilename, downloadCsv } from '@/lib/csv'
import { SELECT_ALL_STATE } from '@/lib/table-utils'
import { useUserGroups } from '@/lib/admin-store'
import {
  ACCOUNTS,
  CLIENT_GROUP,
  LEGAL_ENTITIES,
  accountCurrencyList,
  formatMoney,
  getConnection,
  getLegalEntity,
  groupsSeeingAccount,
  legalEntityName,
  type Account,
} from '@/data/fixtures'

const PAGE_SIZE = 10

// Main view carries the five attributes someone scans an account list for.
// Everything else — internal ID, connection profile, balances, routing, which
// groups can see it — is in the detail sheet.
const CSV_HEADERS = [
  'Bank',
  'Name',
  'Bank account no.',
  'Legal entity',
  'Currencies',
  'Internal account ID',
  'SWIFT/BIC',
  'IBAN',
  'Country',
  'Connection profile',
  'Mode',
  'Status',
  'Available balance',
  'Prior-day balance',
  'Visible to groups',
  'Created',
] as const

function formatCreated(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short' })
  const hour12 = ((d.getHours() + 11) % 12) + 1
  const minute = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${month} ${d.getDate()}, ${d.getFullYear()} at ${String(hour12).padStart(2, '0')}:${minute} ${ampm}`
}

// Row shape the table works on: the account plus its derived group visibility
// and currency list, so both are filterable and exportable.
type AccountRow = Account & {
  currencyList: string[]
  groupNames: string[]
}

function downloadAccountsCsv(rows: AccountRow[]): void {
  downloadCsv(
    csvFilename('accounts', CLIENT_GROUP.name),
    CSV_HEADERS,
    rows.map((a) => [
      a.bank,
      a.name,
      a.number,
      `${a.legalEntity} · ${legalEntityName(a.legalEntity)}`,
      a.currencyList.join(' / '),
      a.id,
      a.swiftBic,
      a.iban,
      a.country,
      getConnection(a.connectionId)?.name ?? a.connectionId,
      a.mode,
      a.status,
      formatMoney(a.currency, a.lastBalance),
      formatMoney(a.currency, a.priorDayBalance),
      a.groupNames.join('; '),
      formatCreated(a.createdAt),
    ]),
  )
}

function CurrencyPill({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[0.7rem] font-medium text-foreground/80 ring-1 ring-inset ring-border">
      {code}
    </span>
  )
}

function TagPill({
  children,
  title,
  tone = 'default',
}: {
  children: React.ReactNode
  title?: string
  tone?: 'default' | 'entity' | 'warning'
}) {
  const cls =
    tone === 'entity'
      ? 'border-violet-300 bg-violet-50 text-violet-700'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : 'border-border bg-muted text-muted-foreground'
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${cls}`}
    >
      {children}
    </span>
  )
}

export function AccountsPage() {
  const userGroups = useUserGroups()

  const data = React.useMemo<AccountRow[]>(
    () =>
      ACCOUNTS.map((a) => ({
        ...a,
        currencyList: accountCurrencyList(a),
        groupNames: groupsSeeingAccount(a.id, userGroups).map((g) => g.name),
      })),
    [userGroups],
  )

  const [openAccount, setOpenAccount] = React.useState<AccountRow | null>(null)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'bank', desc: false },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )

  const columns = React.useMemo<ColumnDef<AccountRow>[]>(
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
        id: 'bank',
        accessorKey: 'bank',
        header: 'Bank',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{row.original.bank}</span>
        ),
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterLabel: 'Bank' },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium">
            {row.original.name}
          </span>
        ),
        filterFn: 'includesString',
        meta: { filterVariant: 'text', filterLabel: 'Name' },
      },
      {
        id: 'number',
        accessorKey: 'number',
        header: 'Bank account no.',
        cell: ({ row }) => <Mono>{row.original.number}</Mono>,
        filterFn: 'includesString',
        meta: { filterVariant: 'text', filterLabel: 'Bank account no.' },
      },
      {
        id: 'legalEntity',
        accessorKey: 'legalEntity',
        header: 'Legal entity',
        cell: ({ row }) => (
          <TagPill tone="entity" title={legalEntityName(row.original.legalEntity)}>
            {row.original.legalEntity}
          </TagPill>
        ),
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
        id: 'currencies',
        accessorFn: (a) => a.currencyList,
        header: 'Currencies',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.currencyList.map((c) => (
              <CurrencyPill key={c} code={c} />
            ))}
          </div>
        ),
        // Multi-currency accounts must match on any currency they accept.
        filterFn: (row, _columnId, value) =>
          row.original.currencyList.includes(value as string),
        enableSorting: false,
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
                <DropdownMenuItem onSelect={() => setOpenAccount(row.original)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => downloadAccountsCsv([row.original])}
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
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
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
    enableSortingRemoval: false,
    autoResetPageIndex: true,
  })

  const currencyOptions = React.useMemo(() => {
    const codes = new Set<string>()
    for (const a of data) for (const c of a.currencyList) codes.add(c)
    return [...codes].sort().map((c) => ({ label: c, value: c }))
  }, [data])

  const unassignedCount = data.filter((a) => a.groupNames.length === 0).length
  const activeFilterCount = columnFilters.length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>

      {unassignedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlertIcon className="size-4 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">
              {unassignedCount} account{unassignedCount === 1 ? '' : 's'} outside
              every group.
            </span>{' '}
            An account inside no group's scope is invisible to everyone.
          </span>
          <Button asChild variant="outline" size="sm" className="h-7 bg-white">
            <Link to="/user-management">Review groups</Link>
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-card">
        {/* Per-column filters */}
        <div className="space-y-3 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <DataTableFilter column={table.getColumn('bank')!} />
            <DataTableFilter column={table.getColumn('name')!} />
            <DataTableFilter column={table.getColumn('number')!} />
            <DataTableFilter column={table.getColumn('legalEntity')!} />
            <DataTableFilter
              column={table.getColumn('currencies')!}
              options={currencyOptions}
            />
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
                onClick={() => setColumnFilters([])}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <DataTableSelectionBar
          table={table}
          noun="accounts"
          onDownloadCsv={downloadAccountsCsv}
        />

        <DataTable
          table={table}
          onRowClick={setOpenAccount}
          emptyMessage={
            data.length === 0
              ? 'No accounts yet.'
              : 'No accounts match your filters'
          }
        />

        <DataTablePagination table={table} />
      </div>

      <Sheet
        open={!!openAccount}
        onOpenChange={(o) => !o && setOpenAccount(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {openAccount && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{openAccount.id}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 pb-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold tracking-tight">
                    {openAccount.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TagPill title="Bank — an attribute, not a layer">
                      {openAccount.bank}
                    </TagPill>
                    <TagPill tone="entity" title="Legal entity">
                      {openAccount.legalEntity}
                    </TagPill>
                    <StatusPill status={openAccount.status} />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => downloadAccountsCsv([openAccount])}
                >
                  <DownloadIcon className="size-3.5" />
                  Export as CSV
                </Button>
              </div>
              <AccountDetailBody a={openAccount} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AccountDetailBody({ a }: { a: AccountRow }) {
  const entity = getLegalEntity(a.legalEntity)
  const connection = getConnection(a.connectionId)

  return (
    <div className="space-y-6 px-4 pb-6 pt-4">
      <DetailSection title="Account">
        <Field label="Bank">
          <span className="text-sm">{a.bank}</span>
        </Field>
        <Field label="Account name">
          <span className="text-sm font-medium">{a.name}</span>
        </Field>
        <Field label="Bank account no.">
          <Mono>{a.number}</Mono>
        </Field>
        <Field label="Legal entity">
          <span className="text-sm">
            {a.legalEntity} · {legalEntityName(a.legalEntity)}
          </span>
        </Field>
        <Field label="Currencies">
          <div className="flex flex-wrap gap-1">
            {a.currencyList.map((c) => (
              <CurrencyPill key={c} code={c} />
            ))}
          </div>
        </Field>
        <Field label="Internal account ID">
          <Mono>{a.id}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Banking">
        <Field label="SWIFT/BIC">
          <Mono>{a.swiftBic || '—'}</Mono>
        </Field>
        <Field label="IBAN">
          <Mono>{a.iban || '—'}</Mono>
        </Field>
        <Field label="Country">
          <span className="text-sm">
            {entity ? `${a.country} · ${entity.countryName}` : a.country}
          </span>
        </Field>
        <Field label="Available balance">
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(a.currency, a.lastBalance)}
          </span>
        </Field>
        <Field label="Prior-day balance">
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(a.currency, a.priorDayBalance)}
          </span>
        </Field>
      </DetailSection>

      <DetailSection title="Access">
        <Field label="Visible to groups" stacked>
          {a.groupNames.length === 0 ? (
            <div className="flex items-center gap-1.5">
              <TriangleAlertIcon className="size-3.5 text-amber-600" />
              <span className="text-sm text-amber-700">
                No group — invisible to everyone
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {a.groupNames.map((n) => (
                <TagPill key={n}>{n}</TagPill>
              ))}
            </div>
          )}
        </Field>
        <Field label="Connection profile">
          <Mono>{connection ? connection.name : a.connectionId}</Mono>
        </Field>
      </DetailSection>

      <DetailSection title="Metadata">
        <Field label="Status">
          <StatusPill status={a.status} />
        </Field>
        <Field label="Mode">
          <span className="text-xs uppercase tracking-wider">{a.mode}</span>
        </Field>
        <Field label="Created">
          <span className="text-sm">{formatCreated(a.createdAt)}</span>
        </Field>
      </DetailSection>
    </div>
  )
}
