import { useId } from 'react'
import type { Column, RowData } from '@tanstack/react-table'
import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Per-column filter control from the shadcn data-table-04 model: a column
// declares `meta.filterVariant` and gets a text box, a min/max pair, or a
// select built from its faceted values.
//
// Adapted from the original in two places — our Select is the stock shadcn
// (Radix) one, so it takes children rather than an `items` prop, and labels
// come from `meta.filterLabel` when the header is a node rather than a string.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select'
    filterLabel?: string
    // Explains the column in a tooltip on its header.
    headerTooltip?: string
    // Fixed option list, for when faceted values aren't the full domain.
    filterOptions?: { label: string; value: string }[]
  }
}

export function DataTableFilter<TData>({
  column,
  options,
}: {
  column: Column<TData, unknown>
  // Overrides the faceted values, for when the full domain is wider than what
  // the current rows happen to contain.
  options?: { label: string; value: string }[]
}) {
  const id = useId()
  const columnFilterValue = column.getFilterValue()
  const { filterVariant, filterLabel } = column.columnDef.meta ?? {}
  const filterOptions = options ?? column.columnDef.meta?.filterOptions
  const columnHeader =
    filterLabel ??
    (typeof column.columnDef.header === 'string' ? column.columnDef.header : '')

  // Distinct values actually present in the filtered rows. Not memoised: these
  // sets are a handful of entries, and the faceted map is a new object each
  // render so it can't serve as a dependency anyway.
  const sortedUniqueValues =
    filterVariant === 'range' || filterOptions
      ? []
      : Array.from(
          new Set(
            Array.from(column.getFacetedUniqueValues().keys()).reduce(
              (acc: string[], curr) =>
                Array.isArray(curr) ? [...acc, ...curr] : [...acc, curr],
              [],
            ),
          ),
        )
          .filter((v) => v !== undefined && v !== null && v !== '')
          .sort()

  if (filterVariant === 'range') {
    const range = columnFilterValue as [number | undefined, number | undefined]
    return (
      <div className="space-y-1.5">
        <Label className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
          {columnHeader}
        </Label>
        <div className="flex">
          <Input
            id={`${id}-range-1`}
            className="h-8 flex-1 rounded-r-none [-moz-appearance:textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
            value={range?.[0] ?? ''}
            onChange={(e) =>
              column.setFilterValue(
                (old: [number | undefined, number | undefined]) => [
                  e.target.value ? Number(e.target.value) : undefined,
                  old?.[1],
                ],
              )
            }
            placeholder="Min"
            type="number"
            aria-label={`${columnHeader} min`}
          />
          <Input
            id={`${id}-range-2`}
            className="-ms-px h-8 flex-1 rounded-l-none [-moz-appearance:textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
            value={range?.[1] ?? ''}
            onChange={(e) =>
              column.setFilterValue(
                (old: [number | undefined, number | undefined]) => [
                  old?.[0],
                  e.target.value ? Number(e.target.value) : undefined,
                ],
              )
            }
            placeholder="Max"
            type="number"
            aria-label={`${columnHeader} max`}
          />
        </div>
      </div>
    )
  }

  if (filterVariant === 'select') {
    const options =
      filterOptions ??
      sortedUniqueValues.map((value) => ({
        label: String(value),
        value: String(value),
      }))
    return (
      <div className="space-y-1.5">
        <Label
          htmlFor={`${id}-select`}
          className="text-[0.7rem] uppercase tracking-wider text-muted-foreground"
        >
          {columnHeader}
        </Label>
        <Select
          value={columnFilterValue?.toString() ?? 'all'}
          onValueChange={(value) =>
            column.setFilterValue(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger
            id={`${id}-select`}
            size="sm"
            className="h-8 w-full font-normal"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {options.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`${id}-input`}
        className="text-[0.7rem] uppercase tracking-wider text-muted-foreground"
      >
        {columnHeader}
      </Label>
      <div className="relative">
        <Input
          id={`${id}-input`}
          className="peer h-8 pl-8"
          value={(columnFilterValue ?? '') as string}
          onChange={(e) => column.setFilterValue(e.target.value)}
          placeholder={`Search ${columnHeader.toLowerCase()}`}
          type="text"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-2.5 text-muted-foreground/80 peer-disabled:opacity-50">
          <SearchIcon size={14} />
        </div>
      </div>
    </div>
  )
}
