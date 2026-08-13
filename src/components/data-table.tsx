import * as React from 'react'
import type { Table as TanstackTable } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  InfoIcon,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { pageNumbers } from '@/lib/table-utils'

// The table body and pager from the shadcn data-table-04 model, shared by
// Transactions and Payments so the two lists stay identical in behaviour:
// left-aligned columns, sortable headers with optional tooltips, checkbox
// selection, and row click opening the detail sheet.

// Cells that own their own click target, so a click there must not also open
// the row's detail sheet.
const SELF_HANDLED_COLUMNS = new Set(['select', 'actions'])

export function DataTable<TData>({
  table,
  onRowClick,
  emptyMessage,
}: {
  table: TanstackTable<TData>
  onRowClick?: (row: TData) => void
  emptyMessage: React.ReactNode
}) {
  return (
    <div className="w-full overflow-x-auto border-t">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const tip = header.column.columnDef.meta?.headerTooltip
                const label = header.isPlaceholder ? null : canSort ? (
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 uppercase tracking-wider ${
                      sorted ? 'text-brand' : 'text-foreground'
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {tip && <InfoIcon className="size-3 opacity-50" />}
                    {sorted === 'desc' ? (
                      <ArrowDownIcon className="size-3" />
                    ) : sorted === 'asc' ? (
                      <ArrowUpIcon className="size-3" />
                    ) : (
                      <ArrowUpDownIcon className="size-3 opacity-30" />
                    )}
                  </button>
                ) : (
                  flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )
                )
                return (
                  <TableHead
                    key={header.id}
                    className="relative h-10 select-none text-[0.7rem] uppercase tracking-wider"
                    style={
                      header.column.columnDef.size
                        ? { width: header.column.columnDef.size }
                        : undefined
                    }
                  >
                    {tip ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">{label}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <InfoIcon className="size-3.5 shrink-0 opacity-80" />
                          {tip}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      label
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={
                      SELF_HANDLED_COLUMNS.has(cell.column.id)
                        ? (e) => e.stopPropagation()
                        : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleFlatColumns().length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function DataTablePagination<TData>({
  table,
}: {
  table: TanstackTable<TData>
}) {
  const total = table.getFilteredRowModel().rows.length
  if (total === 0) return null

  const { pageIndex, pageSize } = table.getState().pagination
  const pageStart = pageIndex * pageSize + 1
  const pageEnd = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
        Showing {pageStart}–{pageEnd} of {total}
      </div>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!table.getCanPreviousPage()}
              className={
                table.getCanPreviousPage()
                  ? undefined
                  : 'pointer-events-none opacity-40'
              }
              onClick={(e) => {
                e.preventDefault()
                table.previousPage()
              }}
            />
          </PaginationItem>
          {pageNumbers(pageIndex + 1, table.getPageCount()).map((p, i) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`gap-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === pageIndex + 1}
                  className={
                    p === pageIndex + 1
                      ? 'border-brand bg-brand text-brand-foreground hover:bg-brand hover:text-brand-foreground'
                      : undefined
                  }
                  onClick={(e) => {
                    e.preventDefault()
                    table.setPageIndex(p - 1)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!table.getCanNextPage()}
              className={
                table.getCanNextPage()
                  ? undefined
                  : 'pointer-events-none opacity-40'
              }
              onClick={(e) => {
                e.preventDefault()
                table.nextPage()
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
