import {
  UserRoundPlusIcon,
  ChevronDownIcon,
  CheckIcon,
} from 'lucide-react'
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
import { useEntity } from '@/lib/entity-context'

type UserStatus = 'active' | 'invited' | 'suspended'

type PortalRole = 'ADMIN' | 'MAKER' | 'CHECKER' | 'VIEWER' | 'AUDITOR'

type TeamMember = {
  id: string
  name: string
  email: string
  role: PortalRole
  status: UserStatus
  entityAccess: string[]
  approvalLimit: string | null
  lastActive: string
}

const ROLE_COLORS: Record<PortalRole, string> = {
  ADMIN: 'border-violet-300 bg-violet-100 text-violet-700',
  MAKER: 'border-blue-300 bg-blue-100 text-blue-700',
  CHECKER: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  VIEWER: 'border-zinc-300 bg-zinc-100 text-zinc-600',
  AUDITOR: 'border-amber-300 bg-amber-100 text-amber-700',
}

const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  invited: 'border-amber-300 bg-amber-100 text-amber-700',
  suspended: 'border-zinc-300 bg-zinc-100 text-zinc-500',
}

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: 'u_01',
    name: 'Ming Miin',
    email: 'ming@tryacme.com',
    role: 'ADMIN',
    status: 'active',
    entityAccess: ['All entities'],
    approvalLimit: null,
    lastActive: '1 Jun, 2026',
  },
  {
    id: 'u_02',
    name: 'Priya Lim',
    email: 'priya@tryacme.com',
    role: 'CHECKER',
    status: 'active',
    entityAccess: ['Acme Labs', 'Acme Markets Indonesia'],
    approvalLimit: 'Up to S$2,000,000',
    lastActive: '1 Jun, 2026',
  },
  {
    id: 'u_03',
    name: 'Alice Wong',
    email: 'alice@tryacme.com',
    role: 'MAKER',
    status: 'active',
    entityAccess: ['Acme Labs'],
    approvalLimit: null,
    lastActive: '31 May, 2026',
  },
  {
    id: 'u_04',
    name: 'Gary Tan',
    email: 'gary.tan@tryacme.com',
    role: 'MAKER',
    status: 'invited',
    entityAccess: ['Acme Labs'],
    approvalLimit: null,
    lastActive: '—',
  },
  {
    id: 'u_05',
    name: 'James Audit',
    email: 'james@auditors.com',
    role: 'AUDITOR',
    status: 'active',
    entityAccess: ['Acme Labs'],
    approvalLimit: null,
    lastActive: '15 Apr, 2026',
  },
  {
    id: 'u_06',
    name: 'CS Team',
    email: 'cs-ops@tryacme.com',
    role: 'VIEWER',
    status: 'active',
    entityAccess: ['Acme Labs'],
    approvalLimit: null,
    lastActive: '1 Jun, 2026',
  },
]

export function UsersPage() {
  const { entity } = useEntity()
  if (!entity) return null

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
            Manage team members, roles, and entity-level access for{' '}
            <span className="font-medium text-foreground">{entity.name}</span>.
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[0.7rem] uppercase tracking-wider">
                  User
                </TableHead>
                <TableHead className="text-[0.7rem] uppercase tracking-wider">
                  Role
                </TableHead>
                <TableHead className="text-[0.7rem] uppercase tracking-wider">
                  Entity access
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
              {MOCK_MEMBERS.map((m) => (
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
                    <RolePill role={m.role} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.entityAccess.map((e) => (
                        <span
                          key={e}
                          className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.approvalLimit ? (
                      <div className="flex items-center gap-1.5">
                        <CheckIcon className="size-3.5 text-emerald-600" />
                        <span className="text-xs text-muted-foreground">
                          {m.approvalLimit}
                        </span>
                      </div>
                    ) : m.role === 'CHECKER' ? (
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
                        <DropdownMenuItem>Change role</DropdownMenuItem>
                        <DropdownMenuItem>Edit entity access</DropdownMenuItem>
                        <DropdownMenuItem>Set approval limit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive">
                          Suspend access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval threshold note */}
      <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Approval thresholds:</span>{' '}
        Checkers can be assigned a maximum approval amount. Payments above the
        limit require a separate CHECKER with no limit, or a second approval from
        an ADMIN. Configure per-user in the Edit menu.
      </div>
    </div>
  )
}

function RolePill({ role }: { role: PortalRole }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider ${ROLE_COLORS[role]}`}
    >
      {role}
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
