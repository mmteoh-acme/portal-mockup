import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { LayersIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  accountGroupCurrencies,
  accountsInAccountGroup,
  formatMoney,
  legalEntityName,
  unassignedAccounts,
  userGroupsUsingAccountGroup,
  type Account,
  type AccountGroup,
} from '@/data/fixtures'
import { useAccountGroups, useUserGroups } from '@/lib/admin-store'
import { formatWhen } from '@/lib/format'
import {
  AccountGroupSheet,
  CreateAccountGroupDialog,
  Pill,
  RulePill,
} from '@/components/account-group-config'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AccountGroupsPage() {
  const groups = useAccountGroups()
  const userGroups = useUserGroups()
  const [openGroup, setOpenGroup] = React.useState<AccountGroup | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [presetIds, setPresetIds] = React.useState<string[]>([])

  const unassigned = unassignedAccounts(groups)

  // Keep the open sheet in sync with store edits.
  const openGroupLive = openGroup
    ? groups.find((g) => g.id === openGroup.id) ?? null
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Groups</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Accounts are flat under Acme Group. Group them however your access
            rules need — by legal entity, country, function — then map a group
            to a{' '}
            <Link
              to="/user-management"
              className="font-medium text-foreground underline underline-offset-4"
            >
              user group
            </Link>{' '}
            to grant visibility. An account can belong to several groups.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => {
            setPresetIds([])
            setCreateOpen(true)
          }}
        >
          <PlusIcon className="size-3.5" />
          Create account group
        </Button>
      </div>

      {unassigned.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlertIcon className="size-4 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">
              {unassigned.length} unassigned account
              {unassigned.length === 1 ? '' : 's'}.
            </span>{' '}
            New accounts are invisible by default — nobody but an admin sees
            them until they are in a group.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 bg-white"
            onClick={() => {
              setPresetIds(unassigned.map((a) => a.id))
              setCreateOpen(true)
            }}
          >
            Group them now
          </Button>
        </div>
      )}

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned accounts ({unassigned.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Name
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Membership
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Description
                      </TableHead>
                      <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                        Accounts
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Currencies
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Mapped user groups
                      </TableHead>
                      <TableHead className="text-[0.7rem] uppercase tracking-wider">
                        Updated
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-14">
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex aspect-square size-11 items-center justify-center rounded-full border bg-muted">
                              <LayersIcon className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                No account groups yet
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Without a group, no non-admin user can see any
                                account.
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {groups.map((g) => {
                      const mapped = userGroupsUsingAccountGroup(
                        g.id,
                        userGroups,
                      )
                      return (
                        <TableRow
                          key={g.id}
                          className="cursor-pointer"
                          onClick={() => setOpenGroup(g)}
                        >
                          <TableCell className="whitespace-nowrap font-medium">
                            {g.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <RulePill rule={g.rule} />
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {g.description || '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {accountsInAccountGroup(g).length}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {accountGroupCurrencies(g).map((c) => (
                                <Pill key={c}>{c}</Pill>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {mapped.length === 0 ? (
                              <Pill tone="warning">Not mapped</Pill>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {mapped.map((ug) => (
                                  <Pill key={ug.id}>{ug.name}</Pill>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatWhen(g.updatedAt)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {unassigned.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="flex aspect-square size-11 items-center justify-center rounded-full border bg-muted">
                    <LayersIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Every account is in at least one group
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nothing is silently invisible.
                    </p>
                  </div>
                </div>
              ) : (
                <UnassignedTable accounts={unassigned} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateAccountGroupDialog
        key={`create-${presetIds.join(',')}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        presetAccountIds={presetIds}
      />
      <AccountGroupSheet
        key={openGroupLive?.id ?? 'none'}
        group={openGroupLive}
        onClose={() => setOpenGroup(null)}
      />
    </div>
  )
}

function UnassignedTable({ accounts }: { accounts: Account[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[0.7rem] uppercase tracking-wider">
              Account
            </TableHead>
            <TableHead className="text-[0.7rem] uppercase tracking-wider">
              Bank
            </TableHead>
            <TableHead className="text-[0.7rem] uppercase tracking-wider">
              Legal entity
            </TableHead>
            <TableHead className="text-[0.7rem] uppercase tracking-wider">
              Country
            </TableHead>
            <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
              Available
            </TableHead>
            <TableHead className="text-[0.7rem] uppercase tracking-wider">
              Onboarded
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="font-mono text-[0.65rem] text-muted-foreground">
                  {a.id}
                </div>
              </TableCell>
              <TableCell className="text-sm">{a.bank}</TableCell>
              <TableCell>
                <Pill tone="entity" title={legalEntityName(a.legalEntity)}>
                  {a.legalEntity}
                </Pill>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {a.country}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatMoney(a.currency, a.lastBalance)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatWhen(a.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
