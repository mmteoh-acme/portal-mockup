import * as React from 'react'
import { LandmarkIcon, PlusIcon, XIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useEntity } from '@/lib/entity-context'
import {
  entityAccounts,
  entityBalancesByCurrency,
  formatMoney,
  type Account,
} from '@/data/fixtures'

function DeltaTag({
  currency,
  available,
  priorDay,
}: {
  currency: string
  available: number
  priorDay: number
}) {
  const delta = available - priorDay
  if (Math.abs(delta) < 0.005) {
    return <span className="text-xs text-muted-foreground">No change</span>
  }
  const up = delta > 0
  return (
    <span
      className={`text-xs tabular-nums ${up ? 'text-emerald-700' : 'text-rose-600'}`}
    >
      {up ? '+' : '−'} {formatMoney(currency, Math.abs(delta))}
    </span>
  )
}

function BalancesSection({
  groups,
}: {
  groups: ReturnType<typeof entityBalancesByCurrency>
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold">Balances</h2>
          <p className="text-xs text-muted-foreground">
            As of: Jun 1, 2026, 09:00 AM SGT · grouped by currency, bank, and
            account
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.currency} className="py-0">
            <CardContent className="p-0">
              {/* Currency rollup */}
              <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 font-mono text-[0.7rem] font-medium ring-1 ring-inset ring-border">
                    {g.currency}
                  </span>
                  <DeltaTag
                    currency={g.currency}
                    available={g.available}
                    priorDay={g.priorDay}
                  />
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      Available balance
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {formatMoney(g.currency, g.available)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      Prior-day balance
                    </div>
                    <div className="text-lg font-semibold tabular-nums text-muted-foreground">
                      {formatMoney(g.currency, g.priorDay)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banks -> accounts */}
              <div className="flex justify-between px-5 pb-1 pt-3 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                <span>Bank / account</span>
                <div className="flex gap-8">
                  <span className="w-36 text-right">Available</span>
                  <span className="w-36 text-right">Prior-day</span>
                </div>
              </div>
              <div className="divide-y">
                {g.banks.map((b) => (
                  <div key={b.bankId} className="px-5 py-3">
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <LandmarkIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{b.bankName}</span>
                      </div>
                      <div className="flex gap-8 text-sm tabular-nums">
                        <span className="w-36 text-right font-medium">
                          {formatMoney(g.currency, b.available)}
                        </span>
                        <span className="w-36 text-right text-muted-foreground">
                          {formatMoney(g.currency, b.priorDay)}
                        </span>
                      </div>
                    </div>
                    {b.accounts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between py-1.5 pl-6"
                      >
                        <div className="min-w-0">
                          <span className="text-sm">{a.name}</span>
                          <span className="ml-2 font-mono text-[0.7rem] text-muted-foreground">
                            ···{a.number.slice(-4)}
                          </span>
                        </div>
                        <div className="flex gap-8 text-sm tabular-nums">
                          <span className="w-36 text-right">
                            {formatMoney(g.currency, a.lastBalance)}
                          </span>
                          <span className="w-36 text-right text-muted-foreground">
                            {formatMoney(g.currency, a.priorDayBalance)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function formatCreated(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const hour12 = ((d.getHours() + 11) % 12) + 1
  const minute = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${month} ${day}, ${year} at ${String(hour12).padStart(2, '0')}:${minute} ${ampm}`
}

function ModePill({ mode }: { mode: 'LIVE' | 'TEST' }) {
  const cls =
    mode === 'LIVE'
      ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
      : 'bg-amber-100 text-amber-700 ring-amber-200'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {mode}
    </span>
  )
}

function CurrencyPill({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[0.7rem] font-medium text-foreground/80 ring-1 ring-inset ring-border">
      {code}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <SectionLabel>{label}</SectionLabel>
      <div>{children}</div>
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function AccountDetailSheet({
  account,
  onClose,
}: {
  account: Account | null
  onClose: () => void
}) {
  return (
    <Sheet open={!!account} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {account && (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle className="text-lg font-semibold">
                {account.name}
              </SheetTitle>
              <div className="font-mono text-xs text-muted-foreground">
                {account.id}
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-4 p-6">
              <SectionCard
                title="Banking"
                description="Account routing details. Hover a value to copy."
              >
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <DetailField label="Account number">
                    <div className="font-mono text-sm">{account.number}</div>
                  </DetailField>
                  <DetailField label="SWIFT/BIC">
                    <div className="font-mono text-sm">
                      {account.swiftBic || '—'}
                    </div>
                  </DetailField>
                  <DetailField label="IBAN">
                    <div className="font-mono text-sm">
                      {account.iban || '—'}
                    </div>
                  </DetailField>
                  <DetailField label="Available balance">
                    <div className="text-sm font-medium tabular-nums">
                      {formatMoney(account.currency, account.lastBalance)}
                    </div>
                  </DetailField>
                  <DetailField label="Prior-day balance">
                    <div className="text-sm tabular-nums text-muted-foreground">
                      {formatMoney(account.currency, account.priorDayBalance)}
                    </div>
                  </DetailField>
                </div>
              </SectionCard>

              <SectionCard
                title="Currencies"
                description="Currencies this account supports."
              >
                <CurrencyPill code={account.currency} />
              </SectionCard>

              <SectionCard title="Metadata">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <DetailField label="Mode">
                    <ModePill mode={account.mode} />
                  </DetailField>
                  <DetailField label="Created">
                    <div className="text-sm">
                      {formatCreated(account.createdAt)}
                    </div>
                  </DetailField>
                </div>
              </SectionCard>
            </div>
            <div className="border-t px-6 py-4 text-right">
              <Button variant="outline" onClick={onClose}>
                <XIcon className="size-3.5" /> Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function InternalAccountsPage() {
  const { entity } = useEntity()
  const [openAccount, setOpenAccount] = React.useState<Account | null>(null)

  if (!entity) return null
  const accounts = entityAccounts(entity)
  const balanceGroups = entityBalancesByCurrency(entity)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Internal Accounts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View bank accounts configured for your organization. Internal accounts
          can only be created by Acme Ops — contact Acme Ops to add or modify
          accounts.
        </p>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-full border bg-muted">
              <LandmarkIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-medium">No banks connected yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect a bank to start tracking balances and transactions for{' '}
                {entity.name}.
              </p>
            </div>
            <Button>
              <PlusIcon /> Connect a bank
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        {balanceGroups.length > 0 && <BalancesSection groups={balanceGroups} />}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Internal account ID</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Account #</TableHead>
                  <TableHead>SWIFT/BIC</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Currencies</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => setOpenAccount(a)}
                  >
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{a.id}</span>
                    </TableCell>
                    <TableCell>
                      <ModePill mode={a.mode} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.number}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.swiftBic || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.iban || '—'}
                    </TableCell>
                    <TableCell>
                      <CurrencyPill code={a.currency} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatCreated(a.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
      )}

      <AccountDetailSheet
        account={openAccount}
        onClose={() => setOpenAccount(null)}
      />
    </div>
  )
}
