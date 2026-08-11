import * as React from 'react'
import { LandmarkIcon, PlusIcon, XIcon, SearchIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
import {
  ACCOUNTS,
  LEGAL_ENTITIES,
  accountGroupsForAccount,
  bankNames,
  formatMoney,
  getConnection,
  getLegalEntity,
  legalEntityName,
  type Account,
} from '@/data/fixtures'
import { useAccountGroups } from '@/lib/admin-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

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

function AccountDetailSheet({
  account,
  onClose,
}: {
  account: Account | null
  onClose: () => void
}) {
  const accountGroups = useAccountGroups()
  const groups = account
    ? accountGroupsForAccount(account.id, accountGroups)
    : []
  const entity = account ? getLegalEntity(account.legalEntity) : undefined
  const connection = account ? getConnection(account.connectionId) : undefined

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
              <div className="mt-2 flex flex-wrap gap-1">
                <TagPill title="Bank — an attribute, not a layer">
                  {account.bank}
                </TagPill>
                <TagPill
                  tone="entity"
                  title="Legal entity — a tag on the account"
                >
                  {account.legalEntity} · {legalEntityName(account.legalEntity)}
                </TagPill>
                <TagPill title="Country">{account.country}</TagPill>
                <TagPill title="Currency">{account.currency}</TagPill>
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-4 p-6">
              <SectionCard
                title="Grouping & access"
                description="Who can see this account is decided by the account groups it belongs to."
              >
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <DetailField label="Legal entity (tag)">
                    <div className="text-sm">
                      {entity ? `${entity.name} · ${entity.countryName}` : '—'}
                    </div>
                  </DetailField>
                  <DetailField label="Bank">
                    <div className="text-sm">{account.bank}</div>
                  </DetailField>
                  <DetailField label="Connection profile">
                    <div className="font-mono text-xs text-muted-foreground">
                      {connection ? connection.name : account.connectionId}
                    </div>
                  </DetailField>
                  <DetailField label="Country">
                    <div className="text-sm">{account.country}</div>
                  </DetailField>
                  <div className="col-span-2 space-y-1">
                    <SectionLabel>Account groups</SectionLabel>
                    {groups.length === 0 ? (
                      <div className="flex items-center gap-1.5">
                        <TriangleAlertIcon className="size-3.5 text-amber-600" />
                        <span className="text-sm text-amber-700">
                          Unassigned — invisible to every non-admin user
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {groups.map((g) => (
                          <TagPill key={g.id}>{g.name}</TagPill>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

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
  const [openAccount, setOpenAccount] = React.useState<Account | null>(null)
  const [q, setQ] = React.useState('')
  const [bank, setBank] = React.useState('all')
  const [legalEntity, setLegalEntity] = React.useState('all')
  const [country, setCountry] = React.useState('all')
  const [currency, setCurrency] = React.useState('all')
  const accountGroups = useAccountGroups()

  const banks = React.useMemo(() => bankNames(ACCOUNTS), [])
  const countries = React.useMemo(
    () => [...new Set(ACCOUNTS.map((a) => a.country))].sort(),
    [],
  )
  const currencies = React.useMemo(
    () => [...new Set(ACCOUNTS.map((a) => a.currency))].sort(),
    [],
  )

  const groupsByAccount = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of ACCOUNTS) {
      map.set(
        a.id,
        accountGroupsForAccount(a.id, accountGroups).map((g) => g.name),
      )
    }
    return map
  }, [accountGroups])

  const accounts = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ACCOUNTS.filter((a) => {
      if (bank !== 'all' && a.bank !== bank) return false
      if (legalEntity !== 'all' && a.legalEntity !== legalEntity) return false
      if (country !== 'all' && a.country !== country) return false
      if (currency !== 'all' && a.currency !== currency) return false
      if (!needle) return true
      return [a.name, a.id, a.number, a.bank, a.legalEntity, a.swiftBic]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [q, bank, legalEntity, country, currency])

  const unassignedCount = ACCOUNTS.filter(
    (a) => (groupsByAccount.get(a.id) ?? []).length === 0,
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Internal Accounts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One flat list of accounts under {' '}
          <span className="font-medium text-foreground">Acme Group</span>. Bank,
          legal entity, country and currency are attributes on the account, so
          use them as filters. Internal accounts can only be created by Acme
          Ops.
        </p>
      </div>

      {unassignedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlertIcon className="size-4 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">
              {unassignedCount} account{unassignedCount === 1 ? '' : 's'} not in
              any account group.
            </span>{' '}
            Unassigned accounts are invisible to every non-admin user until an
            admin assigns them.
          </span>
          <Button asChild variant="outline" size="sm" className="h-7 bg-white">
            <Link to="/account-groups">Assign accounts</Link>
          </Button>
        </div>
      )}

      {/* Filters — the flat model's replacement for tree navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ID, account #, BIC"
            className="h-8 pl-8"
          />
        </div>
        <Select value={bank} onValueChange={setBank}>
          <SelectTrigger size="sm" className="h-8 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All banks</SelectItem>
            {banks.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={legalEntity} onValueChange={setLegalEntity}>
          <SelectTrigger size="sm" className="h-8 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All legal entities</SelectItem>
            {LEGAL_ENTITIES.map((e) => (
              <SelectItem key={e.code} value={e.code}>
                {e.code} · {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger size="sm" className="h-8 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger size="sm" className="h-8 font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All currencies</SelectItem>
            {currencies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(q || bank !== 'all' || legalEntity !== 'all' || country !== 'all' || currency !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setQ('')
              setBank('all')
              setLegalEntity('all')
              setCountry('all')
              setCurrency('all')
            }}
          >
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {accounts.length} of {ACCOUNTS.length} accounts
        </span>
      </div>

      {ACCOUNTS.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-full border bg-muted">
              <LandmarkIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-medium">No banks connected yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect a bank to start tracking balances and transactions.
              </p>
            </div>
            <Button>
              <PlusIcon /> Connect a bank
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Legal entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Account groups</TableHead>
                    <TableHead>Internal account ID</TableHead>
                    <TableHead>Connection</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No accounts match these filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {accounts.map((a) => {
                    const groupNames = groupsByAccount.get(a.id) ?? []
                    return (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer"
                        onClick={() => setOpenAccount(a)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {a.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {a.bank}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <TagPill
                            tone="entity"
                            title={legalEntityName(a.legalEntity)}
                          >
                            {a.legalEntity}
                          </TagPill>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {a.country}
                        </TableCell>
                        <TableCell>
                          <CurrencyPill code={a.currency} />
                        </TableCell>
                        <TableCell>
                          {groupNames.length === 0 ? (
                            <TagPill tone="warning" title="Not in any account group">
                              Unassigned
                            </TagPill>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {groupNames.map((n) => (
                                <TagPill key={n}>{n}</TagPill>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {a.id}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {getConnection(a.connectionId)?.name ?? a.connectionId}
                        </TableCell>
                        <TableCell>
                          <ModePill mode={a.mode} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {a.number}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatCreated(a.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AccountDetailSheet
        account={openAccount}
        onClose={() => setOpenAccount(null)}
      />
    </div>
  )
}
