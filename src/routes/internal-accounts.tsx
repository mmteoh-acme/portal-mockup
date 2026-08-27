import * as React from 'react'
import { LandmarkIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
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
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { CopyButton } from '@/components/copy-button'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@/components/page-header'
import { FieldGrid, FieldRow, FormSection } from '@/components/form-section'
import {
  ACCOUNTS,
  groupsSeeingAccount,
  formatMoney,
  getConnection,
  getLegalEntity,
  type Account,
} from '@/data/fixtures'
import { useUserGroups } from '@/lib/admin-store'

/** "14 Jun 2023 02:08 PM" — the stamp format the production tables use. */
function formatCreated(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const month = d.toLocaleString('en-US', { month: 'short' })
  const hour12 = String(((d.getHours() + 11) % 12) + 1).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${d.getDate()} ${month} ${d.getFullYear()} ${hour12}:${minute} ${ampm}`
}

function AccountDetailSheet({
  account,
  onClose,
}: {
  account: Account | null
  onClose: () => void
}) {
  const userGroups = useUserGroups()
  const groups = account ? groupsSeeingAccount(account.id, userGroups) : []
  const entity = account ? getLegalEntity(account.legalEntity) : undefined
  const connection = account ? getConnection(account.connectionId) : undefined

  return (
    <Sheet open={!!account} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {account && (
          <>
            {/* Name over the internal account id, as the production sheet
                opens. Everything below is the same section stack. */}
            <SheetHeader className="border-b">
              <SheetTitle className="text-xl leading-tight font-bold">
                {account.name}
              </SheetTitle>
              <div className="group inline-flex items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground">
                  {account.id}
                </span>
                <CopyButton
                  value={account.id}
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                />
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
              <FormSection
                title="Banking"
                description="Account routing details. Hover a value to copy."
              >
                <FieldGrid>
                  <FieldRow
                    label="Account Number"
                    value={account.number}
                    mono
                    copyValue={account.number}
                  />
                  <FieldRow
                    label="SWIFT/BIC"
                    value={account.swiftBic}
                    mono
                    copyValue={account.swiftBic || undefined}
                  />
                  <FieldRow
                    label="IBAN"
                    value={account.iban}
                    mono
                    copyValue={account.iban || undefined}
                    className="sm:col-span-2"
                  />
                </FieldGrid>
              </FormSection>

              <FormSection
                title="Currencies"
                description="Currencies this account supports."
              >
                <Badge variant="secondary">{account.currency}</Badge>
              </FormSection>

              <FormSection title="Metadata">
                <FieldGrid>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                      Mode
                    </span>
                    <div className="flex min-h-6 items-center">
                      <Badge
                        variant={
                          account.mode === 'LIVE' ? 'default' : 'secondary'
                        }
                      >
                        {account.mode}
                      </Badge>
                    </div>
                  </div>
                  <FieldRow
                    label="Created"
                    value={formatCreated(account.createdAt)}
                  />
                </FieldGrid>
              </FormSection>

              {/* Balances and the access model are this mockup's own, so they
                  sit after the sections production ships. */}
              <FormSection
                title="Balances"
                description="Last figures Acme retrieved from the bank."
              >
                <FieldGrid>
                  <FieldRow
                    label="Available balance"
                    value={formatMoney(account.currency, account.lastBalance)}
                  />
                  <FieldRow
                    label="Prior-day balance"
                    value={formatMoney(
                      account.currency,
                      account.priorDayBalance,
                    )}
                  />
                </FieldGrid>
              </FormSection>

              <FormSection
                title="Grouping & access"
                description="Bank, legal entity and country are attributes on the account. Who can see it is decided by the groups whose scope covers it."
              >
                <FieldGrid>
                  <FieldRow label="Bank" value={account.bank} />
                  <FieldRow
                    label="Legal entity"
                    value={
                      entity
                        ? `${entity.code} · ${entity.name}`
                        : account.legalEntity
                    }
                  />
                  <FieldRow label="Country" value={account.country} />
                  <FieldRow
                    label="Connection profile"
                    value={connection?.name ?? account.connectionId}
                    mono
                  />
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-medium">
                      Visible to groups
                    </span>
                    {groups.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <TriangleAlertIcon className="size-4" />
                        No group — invisible to everyone
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {groups.map((g) => (
                          <Badge key={g.id} variant="secondary">
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FieldGrid>
              </FormSection>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function InternalAccountsPage() {
  const [openAccount, setOpenAccount] = React.useState<Account | null>(null)
  const userGroups = useUserGroups()

  const groupsByAccount = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of ACCOUNTS) {
      map.set(
        a.id,
        groupsSeeingAccount(a.id, userGroups).map((g) => g.name),
      )
    }
    return map
  }, [userGroups])

  const unassignedCount = ACCOUNTS.filter(
    (a) => (groupsByAccount.get(a.id) ?? []).length === 0,
  ).length

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Internal Accounts</PageHeaderTitle>
        <PageHeaderDescription>
          View bank accounts configured for your client group. Internal accounts
          can only be created by Acme Ops — contact Acme Ops to add or modify
          accounts.
        </PageHeaderDescription>
      </PageHeader>

      {/* Mockup-only: an account inside no group's scope is invisible to
          everyone, so it must not go unnoticed. */}
      {unassignedCount > 0 && (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>
            {unassignedCount} account{unassignedCount === 1 ? '' : 's'} outside
            every group
          </AlertTitle>
          <AlertDescription>
            An account inside no group's scope is invisible to everyone.
          </AlertDescription>
          <AlertAction>
            <Button asChild variant="outline" size="sm">
              <Link to="/user-management">Review groups</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {ACCOUNTS.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex aspect-square size-12 items-center justify-center rounded-full border bg-muted">
              <LandmarkIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-medium">No accounts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact Acme Ops to have your bank accounts configured.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Account #</TableHead>
                  <TableHead>SWIFT/BIC</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Currencies</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACCOUNTS.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => setOpenAccount(a)}
                  >
                    <TableCell className="whitespace-nowrap">{a.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={a.mode === 'LIVE' ? 'default' : 'secondary'}
                      >
                        {a.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono whitespace-nowrap">
                      {a.number}
                    </TableCell>
                    <TableCell className="font-mono whitespace-nowrap">
                      {a.swiftBic || (
                        <span className="font-sans text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono whitespace-nowrap">
                      {a.iban || (
                        <span className="font-sans text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a.currency}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatCreated(a.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <AccountDetailSheet
        account={openAccount}
        onClose={() => setOpenAccount(null)}
      />
    </div>
  )
}
