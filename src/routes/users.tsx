import { Link } from '@tanstack/react-router'
import { UserRoundPlusIcon, ChevronDownIcon, CheckIcon } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  accountsForUser,
  portalUsers,
  userGroupsForUser,
  permissionsFor,
  type PermissionSet,
  type UserStatus,
} from '@/data/fixtures'
import { useAccountGroups, useUserGroups } from '@/lib/admin-store'

const PERMISSION_SET_COLORS: Record<PermissionSet, string> = {
  administrator: 'border-violet-300 bg-violet-100 text-violet-700',
  approver: 'border-emerald-300 bg-emerald-100 text-emerald-700',
}

const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  invited: 'border-amber-300 bg-amber-100 text-amber-700',
  suspended: 'border-zinc-300 bg-zinc-100 text-zinc-500',
}

export function UsersPage() {
  const userGroups = useUserGroups()
  const accountGroups = useAccountGroups()

  const initials = (name: string) =>
    name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A user's permission set decides what they can do. Which accounts
            they can see comes from the{' '}
            <Link to="/user-groups" className="font-medium text-foreground underline underline-offset-4">
              user groups
            </Link>{' '}
            they belong to.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <UserRoundPlusIcon className="size-3.5" />
          Invite user
        </Button>
      </div>

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    User
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Permission set
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    User groups
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Account access
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Approval limit
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Last active
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {portalUsers.map((m) => {
                  const groups = userGroupsForUser(m.id, userGroups)
                  const visible = accountsForUser(
                    m.id,
                    userGroups,
                    accountGroups,
                  )
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-md">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`}
                              alt={m.name}
                            />
                            <AvatarFallback className="rounded-md text-xs">
                              {initials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{m.name}</div>
                            <div className="text-[0.65rem] text-muted-foreground">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PermissionSetPill set={m.permissionSet} />
                      </TableCell>
                      <TableCell>
                        {groups.length === 0 ? (
                          <span className="text-xs text-amber-700">
                            No group — sees nothing
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {groups.map((g) => (
                              <Link
                                key={g.id}
                                to="/user-groups"
                                className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground hover:text-foreground"
                              >
                                {g.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {visible.length} account
                        {visible.length === 1 ? '' : 's'}
                      </TableCell>
                      <TableCell>
                        {m.approvalLimit ? (
                          <div className="flex items-center gap-1.5">
                            <CheckIcon className="size-3.5 text-emerald-600" />
                            <span className="text-xs text-muted-foreground">
                              {m.approvalLimit}
                            </span>
                          </div>
                        ) : m.permissionSet === 'approver' ? (
                          <span className="text-xs text-muted-foreground">
                            Unlimited
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={m.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.lastActive}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                            >
                              Edit
                              <ChevronDownIcon className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Change permission set</DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/user-groups">Edit user groups</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Set approval limit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive">
                              Suspend access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Visibility vs. permission:
        </span>{' '}
        user groups decide which accounts a person can see; their permission set
        decides what they can do. Both apply, and every grant is scoped — an
        administrator in SG Payment Ops can raise payments, but only on that
        group's accounts.
      </div>

      <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Approval thresholds:</span>{' '}
        Approvers can be assigned a maximum approval amount. Payments above the
        limit require a second approver with no limit. An administrator
        configures who can approve and cannot approve themselves. Configure
        per-user in the Edit menu.
      </div>
    </div>
  )
}

// Acme defines the sets; the client assigns them. The tooltip carries the
// grant list so an admin can see what a set actually allows.
function PermissionSetPill({ set }: { set: PermissionSet }) {
  return (
    <span
      title={permissionsFor(set)
        .map((p) => p.key)
        .join('\n')}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${PERMISSION_SET_COLORS[set]}`}
    >
      {set}
    </span>
  )
}

function StatusPill({ status }: { status: UserStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  )
}
