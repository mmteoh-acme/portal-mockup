import * as React from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Mono } from '@/components/mono'
import { DataTable, DataTablePagination } from '@/components/data-table'
import { ACCOUNTS, formatMoney, ledgerBalanceFor, type Account } from '@/data/fixtures'

const PAGE_SIZE = 10

// A "pull" simulates hitting the bank's real-time balance endpoint. There's no
// live feed backing this mockup, so each pull nudges the static ledger and
// available balances by a small deterministic jitter (seeded by account id +
// pull count) rather than a fabricated random walk — same inputs always give
// the same "live" numbers for a given pull count, so screenshots don't drift.
function jitteredBalance(base: number, seed: string): number {
  const n = seed.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)
  const jitter = 0.003 * Math.sin(n * 1.7) // +/- 0.3%
  return Math.round(base * (1 + jitter) * 100) / 100
}

type BalanceRow = Account & {
  ledger: number
  available: number
  asOf: string | null
}

export function BalancesPage() {
  const [isPulling, setIsPulling] = React.useState(false)
  const [pullCount, setPullCount] = React.useState(0)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'bank', desc: false },
  ])

  const data = React.useMemo<BalanceRow[]>(
    () =>
      ACCOUNTS.map((a) => {
        const baseLedger = ledgerBalanceFor(a)
        const baseAvailable = a.lastBalance
        const pulled = pullCount > 0
        return {
          ...a,
          ledger: pulled
            ? jitteredBalance(baseLedger, `${a.id}:${pullCount}:ledger`)
            : baseLedger,
          available: pulled
            ? jitteredBalance(baseAvailable, `${a.id}:${pullCount}:available`)
            : baseAvailable,
          asOf: pulled ? 'Just now' : null,
        }
      }),
    [pullCount],
  )

  function handlePull() {
    setIsPulling(true)
    // Simulate a network round trip to each connected bank.
    setTimeout(() => {
      setPullCount((c) => c + 1)
      setIsPulling(false)
      toast.success('Real-time balances updated')
    }, 700)
  }

  const columns = React.useMemo<ColumnDef<BalanceRow>[]>(
    () => [
      {
        id: 'bank',
        accessorKey: 'bank',
        header: 'Bank',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{row.original.bank}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Account name',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'currency',
        accessorKey: 'currency',
        header: 'Currency',
        cell: ({ row }) => <Mono>{row.original.currency}</Mono>,
      },
      {
        id: 'ledger',
        accessorKey: 'ledger',
        header: 'Ledger balance',
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(row.original.currency, row.original.ledger)}
          </span>
        ),
      },
      {
        id: 'available',
        accessorKey: 'available',
        header: 'Available balance',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(row.original.currency, row.original.available)}
          </span>
        ),
      },
      {
        id: 'asOf',
        accessorFn: (a) => a.asOf ?? '',
        header: 'As of',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.asOf ?? '—'}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
    getRowId: (r) => r.id,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Balances</h1>
          <p className="text-sm text-muted-foreground">
            Pull live ledger and available balances from each connected bank
            before initiating payments.
          </p>
        </div>
        <Button className="gap-1.5" onClick={handlePull} disabled={isPulling}>
          <RefreshCwIcon className={isPulling ? 'size-3.5 animate-spin' : 'size-3.5'} />
          Get real-time balances
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <DataTable table={table} emptyMessage="No accounts yet." />
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
