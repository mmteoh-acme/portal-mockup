import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  LayersIcon,
  PlusIcon,
  TagIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  LEGAL_ENTITIES,
  ROLE_PERMISSIONS,
  accountsForUserGroup,
  accountsInAccountGroup,
  formatMoney,
  getPortalUser,
  legalEntityName,
  portalUsers,
  type PortalRole,
  type UserGroup,
  type UserGroupScope,
} from '@/data/fixtures'
import { formatWhen } from '@/lib/format'
import {
  addUserGroup,
  deleteUserGroup,
  nowIso,
  updateUserGroup,
  useAccountGroups,
  useUserGroups,
} from '@/lib/admin-store'

const ROLES: PortalRole[] = ['ADMIN', 'MAKER', 'CHECKER', 'VIEWER', 'AUDITOR']

const ROLE_COLORS: Record<PortalRole, string> = {
  ADMIN: 'border-violet-300 bg-violet-100 text-violet-700',
  MAKER: 'border-blue-300 bg-blue-100 text-blue-700',
  CHECKER: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  VIEWER: 'border-zinc-300 bg-zinc-100 text-zinc-600',
  AUDITOR: 'border-amber-300 bg-amber-100 text-amber-700',
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Pill({
  children,
  tone = 'default',
  title,
}: {
  children: React.ReactNode
  tone?: 'default' | 'entity' | 'warning' | 'scope'
  title?: string
}) {
  const cls =
    tone === 'entity'
      ? 'border-violet-300 bg-violet-50 text-violet-700'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : tone === 'scope'
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-border bg-muted text-muted-foreground'
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${cls}`}
    >
      {children}
    </span>
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

function PermissionPills({ role }: { role: PortalRole }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ROLE_PERMISSIONS[role].map((p) => (
        <span
          key={p}
          className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground"
        >
          {p}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scope + member editors, shared by create and edit
// ---------------------------------------------------------------------------

function ScopeEditor({
  scope,
  setScope,
  accountGroupIds,
  toggleAccountGroup,
  legalEntityCodes,
  toggleLegalEntity,
}: {
  scope: UserGroupScope
  setScope: (s: UserGroupScope) => void
  accountGroupIds: Set<string>
  toggleAccountGroup: (id: string, checked: boolean) => void
  legalEntityCodes: Set<string>
  toggleLegalEntity: (code: string, checked: boolean) => void
}) {
  const accountGroups = useAccountGroups()

  return (
    <div className="space-y-3">
      <Label>Account visibility</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setScope('ACCOUNT_GROUP')}
          className={`rounded-md border px-3 py-2 text-left text-sm ${
            scope === 'ACCOUNT_GROUP'
              ? 'border-primary bg-muted'
              : 'hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <LayersIcon className="size-3.5" /> Account groups
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Map to one or more account groups.
          </div>
        </button>
        <button
          type="button"
          onClick={() => setScope('LEGAL_ENTITY')}
          className={`rounded-md border px-3 py-2 text-left text-sm ${
            scope === 'LEGAL_ENTITY'
              ? 'border-primary bg-muted'
              : 'hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <TagIcon className="size-3.5" /> Legal entity tags
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Skip the account group and scope by tag.
          </div>
        </button>
      </div>

      {scope === 'ACCOUNT_GROUP' ? (
        <div className="max-h-56 overflow-y-auto rounded-md border">
          {accountGroups.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No account groups yet.{' '}
              <Link
                to="/account-groups"
                className="font-medium underline underline-offset-4"
              >
                Create one first
              </Link>
              .
            </div>
          )}
          {accountGroups.map((ag) => (
            <label
              key={ag.id}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
            >
              <Checkbox
                checked={accountGroupIds.has(ag.id)}
                onCheckedChange={(c) => toggleAccountGroup(ag.id, c === true)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{ag.name}</div>
                <div className="truncate text-[0.65rem] text-muted-foreground">
                  {ag.description || 'No description'}
                </div>
              </div>
              <Pill>
                {accountsInAccountGroup(ag).length} account
                {accountsInAccountGroup(ag).length === 1 ? '' : 's'}
              </Pill>
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          {LEGAL_ENTITIES.map((e) => (
            <label
              key={e.code}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
            >
              <Checkbox
                checked={legalEntityCodes.has(e.code)}
                onCheckedChange={(c) => toggleLegalEntity(e.code, c === true)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.name}</div>
                <div className="truncate text-[0.65rem] text-muted-foreground">
                  {e.code} · {e.countryName}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function MemberEditor({
  memberIds,
  toggleMember,
}: {
  memberIds: Set<string>
  toggleMember: (id: string, checked: boolean) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Members</Label>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {portalUsers.map((u) => (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
          >
            <Checkbox
              checked={memberIds.has(u.id)}
              onCheckedChange={(c) => toggleMember(u.id, c === true)}
            />
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`}
                alt={u.name}
              />
              <AvatarFallback className="rounded-md text-[0.6rem]">
                {initials(u.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.name}</div>
              <div className="truncate text-[0.65rem] text-muted-foreground">
                {u.email}
              </div>
            </div>
            <RolePill role={u.role} />
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create user group
// ---------------------------------------------------------------------------

function CreateUserGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const accountGroups = useAccountGroups()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [role, setRole] = React.useState<PortalRole>('MAKER')
  const [scope, setScope] = React.useState<UserGroupScope>('ACCOUNT_GROUP')
  const [agIds, setAgIds] = React.useState<Set<string>>(new Set())
  const [leCodes, setLeCodes] = React.useState<Set<string>>(new Set())
  const [memberIds, setMemberIds] = React.useState<Set<string>>(new Set())

  const reset = () => {
    setName('')
    setDescription('')
    setRole('MAKER')
    setScope('ACCOUNT_GROUP')
    setAgIds(new Set())
    setLeCodes(new Set())
    setMemberIds(new Set())
  }

  // Live preview of what members will actually see.
  const preview = accountsForUserGroup(
    {
      id: 'preview',
      name,
      description,
      role,
      scope,
      accountGroupIds: [...agIds],
      legalEntityCodes: [...leCodes],
      memberIds: [...memberIds],
      createdBy: '',
      createdAt: '',
      updatedAt: '',
    },
    accountGroups,
  )

  const hasScope = scope === 'ACCOUNT_GROUP' ? agIds.size > 0 : leCodes.size > 0
  const canSubmit = name.trim().length > 0 && hasScope

  const submit = () => {
    const id = `ug_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}`
    addUserGroup({
      id,
      name: name.trim(),
      description: description.trim(),
      role,
      scope,
      accountGroupIds: scope === 'ACCOUNT_GROUP' ? [...agIds] : [],
      legalEntityCodes: scope === 'LEGAL_ENTITY' ? [...leCodes] : [],
      memberIds: [...memberIds],
      createdBy: 'Ming Miin',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    toast.success('User group created', {
      description: `${name.trim()} · ${memberIds.size} member${memberIds.size === 1 ? '' : 's'} can see ${preview.length} account${preview.length === 1 ? '' : 's'}.`,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create user group</DialogTitle>
          <DialogDescription>
            The group decides which accounts its members can see. What they can
            do with those accounts comes from the role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ug-name">Name</Label>
              <Input
                id="ug-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SG Payment Ops"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ug-desc">Description</Label>
              <Input
                id="ug-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Makers raising payments out of SG accounts"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as PortalRole)}
            >
              <SelectTrigger className="font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PermissionPills role={role} />
          </div>

          <ScopeEditor
            scope={scope}
            setScope={setScope}
            accountGroupIds={agIds}
            toggleAccountGroup={(id, checked) =>
              setAgIds((prev) => {
                const next = new Set(prev)
                if (checked) next.add(id)
                else next.delete(id)
                return next
              })
            }
            legalEntityCodes={leCodes}
            toggleLegalEntity={(code, checked) =>
              setLeCodes((prev) => {
                const next = new Set(prev)
                if (checked) next.add(code)
                else next.delete(code)
                return next
              })
            }
          />

          <MemberEditor
            memberIds={memberIds}
            toggleMember={(id, checked) =>
              setMemberIds((prev) => {
                const next = new Set(prev)
                if (checked) next.add(id)
                else next.delete(id)
                return next
              })
            }
          />

          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Effective access:
            </span>{' '}
            {memberIds.size} member{memberIds.size === 1 ? '' : 's'} ×{' '}
            {preview.length} account{preview.length === 1 ? '' : 's'} visible
            {preview.length > 0 && (
              <>
                {' '}
                ·{' '}
                {[...new Set(preview.map((a) => a.legalEntity))].join(', ')}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

function SummaryRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  )
}

function UserGroupSheet({
  group,
  onClose,
}: {
  group: UserGroup | null
  onClose: () => void
}) {
  const accountGroups = useAccountGroups()
  // Keyed on the group id by the caller, so plain initial state is enough.
  const [editingScope, setEditingScope] = React.useState(false)
  const [editingMembers, setEditingMembers] = React.useState(false)
  const [scope, setScope] = React.useState<UserGroupScope>(
    () => group?.scope ?? 'ACCOUNT_GROUP',
  )
  const [agIds, setAgIds] = React.useState<Set<string>>(
    () => new Set(group?.accountGroupIds ?? []),
  )
  const [leCodes, setLeCodes] = React.useState<Set<string>>(
    () => new Set(group?.legalEntityCodes ?? []),
  )
  const [memberIds, setMemberIds] = React.useState<Set<string>>(
    () => new Set(group?.memberIds ?? []),
  )

  if (!group) return null

  const visible = accountsForUserGroup(group, accountGroups)
  const members = group.memberIds
    .map((id) => getPortalUser(id))
    .filter((u): u is NonNullable<typeof u> => !!u)

  const saveScope = () => {
    updateUserGroup(group.id, {
      scope,
      accountGroupIds: scope === 'ACCOUNT_GROUP' ? [...agIds] : [],
      legalEntityCodes: scope === 'LEGAL_ENTITY' ? [...leCodes] : [],
    })
    setEditingScope(false)
    toast.success('Access updated', {
      description: `${group.name}'s account visibility was changed.`,
    })
  }

  const saveMembers = () => {
    updateUserGroup(group.id, { memberIds: [...memberIds] })
    setEditingMembers(false)
    toast.success('Members updated', {
      description: `${group.name} now has ${memberIds.size} member${memberIds.size === 1 ? '' : 's'}.`,
    })
  }

  return (
    <Sheet open={!!group} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <SheetTitle className="text-lg font-semibold">
                  {group.name}
                </SheetTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.description || 'No description'}
                </p>
              </div>
              <RolePill role={group.role} />
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 p-6">
            <div className="divide-y rounded-lg border bg-card">
              <SummaryRow label="ID">
                <span className="font-mono text-xs text-muted-foreground">
                  {group.id}
                </span>
              </SummaryRow>
              <SummaryRow label="Members">{group.memberIds.length}</SummaryRow>
              <SummaryRow label="Accounts visible">
                {visible.length}
              </SummaryRow>
              <SummaryRow label="Scoped by">
                {group.scope === 'LEGAL_ENTITY' ? (
                  <Pill tone="scope">
                    <TagIcon className="size-3" /> Legal entity tag
                  </Pill>
                ) : (
                  <Pill tone="scope">
                    <LayersIcon className="size-3" /> Account groups
                  </Pill>
                )}
              </SummaryRow>
              <SummaryRow label="Permissions">
                <PermissionPills role={group.role} />
              </SummaryRow>
              <SummaryRow label="Updated">
                {formatWhen(group.updatedAt)}
              </SummaryRow>
            </div>

            <Tabs defaultValue="access">
              <TabsList>
                <TabsTrigger value="access">
                  Access ({visible.length})
                </TabsTrigger>
                <TabsTrigger value="members">
                  Members ({members.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="access" className="mt-4 space-y-3">
                {editingScope ? (
                  <>
                    <ScopeEditor
                      scope={scope}
                      setScope={setScope}
                      accountGroupIds={agIds}
                      toggleAccountGroup={(id, checked) =>
                        setAgIds((prev) => {
                          const next = new Set(prev)
                          if (checked) next.add(id)
                          else next.delete(id)
                          return next
                        })
                      }
                      legalEntityCodes={leCodes}
                      toggleLegalEntity={(code, checked) =>
                        setLeCodes((prev) => {
                          const next = new Set(prev)
                          if (checked) next.add(code)
                          else next.delete(code)
                          return next
                        })
                      }
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingScope(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveScope}>
                        Save access
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {group.scope === 'ACCOUNT_GROUP'
                          ? group.accountGroupIds.map((id) => {
                              const ag = accountGroups.find((g) => g.id === id)
                              return (
                                <Pill key={id}>{ag?.name ?? id}</Pill>
                              )
                            })
                          : group.legalEntityCodes.map((c) => (
                              <Pill key={c} tone="entity">
                                {c} · {legalEntityName(c)}
                              </Pill>
                            ))}
                        {group.scope === 'ACCOUNT_GROUP' &&
                          group.accountGroupIds.length === 0 && (
                            <Pill tone="warning">No account group mapped</Pill>
                          )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingScope(true)}
                      >
                        Edit access
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
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
                              Entity
                            </TableHead>
                            <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                              Available
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visible.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-8 text-center text-sm text-muted-foreground"
                              >
                                Members of this group see no accounts.
                              </TableCell>
                            </TableRow>
                          )}
                          {visible.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {a.name}
                                </div>
                                <div className="font-mono text-[0.65rem] text-muted-foreground">
                                  {a.id}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{a.bank}</TableCell>
                              <TableCell>
                                <Pill tone="entity">{a.legalEntity}</Pill>
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {formatMoney(a.currency, a.lastBalance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="members" className="mt-4 space-y-3">
                {editingMembers ? (
                  <>
                    <MemberEditor
                      memberIds={memberIds}
                      toggleMember={(id, checked) =>
                        setMemberIds((prev) => {
                          const next = new Set(prev)
                          if (checked) next.add(id)
                          else next.delete(id)
                          return next
                        })
                      }
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMembers(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveMembers}>
                        Save members
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMembers(true)}
                      >
                        Edit members
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
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
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="py-8 text-center text-sm text-muted-foreground"
                              >
                                No members yet.
                              </TableCell>
                            </TableRow>
                          )}
                          {members.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-7 w-7 rounded-md">
                                    <AvatarImage
                                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`}
                                      alt={u.name}
                                    />
                                    <AvatarFallback className="rounded-md text-[0.6rem]">
                                      {initials(u.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-sm font-medium">
                                      {u.name}
                                    </div>
                                    <div className="text-[0.65rem] text-muted-foreground">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <RolePill role={u.role} />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {u.status}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                deleteUserGroup(group.id)
                toast.success('User group deleted', {
                  description: `${group.name} was removed. Its members lose that visibility.`,
                })
                onClose()
              }}
            >
              Delete group
            </Button>
            <Button variant="outline" onClick={onClose}>
              <XIcon className="size-3.5" /> Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function UserGroupsPage() {
  const userGroups = useUserGroups()
  const accountGroups = useAccountGroups()
  const [openGroup, setOpenGroup] = React.useState<UserGroup | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const openGroupLive = openGroup
    ? userGroups.find((g) => g.id === openGroup.id) ?? null
    : null

  const ungrouped = portalUsers.filter(
    (u) => !userGroups.some((g) => g.memberIds.includes(u.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Groups</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            A user group maps people to the accounts they can see — via{' '}
            <Link
              to="/account-groups"
              className="font-medium text-foreground underline underline-offset-4"
            >
              account groups
            </Link>{' '}
            or straight off a legal-entity tag. Role and permissions decide what
            they can do; the group decides what they can see. A user can be in
            several groups.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-3.5" />
          Create user group
        </Button>
      </div>

      {ungrouped.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlertIcon className="size-4 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">
              {ungrouped.length} user{ungrouped.length === 1 ? '' : 's'} in no
              group:
            </span>{' '}
            {ungrouped.map((u) => u.name).join(', ')} — they can sign in but see
            no accounts.
          </span>
        </div>
      )}

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
                    Role
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Scoped by
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Mapped to
                  </TableHead>
                  <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                    Accounts
                  </TableHead>
                  <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                    Members
                  </TableHead>
                  <TableHead className="text-[0.7rem] uppercase tracking-wider">
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="flex aspect-square size-11 items-center justify-center rounded-full border bg-muted">
                          <UsersRoundIcon className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            No user groups yet
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Nobody can see any account until they are in a
                            group.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {userGroups.map((g) => {
                  const visible = accountsForUserGroup(g, accountGroups)
                  return (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer"
                      onClick={() => setOpenGroup(g)}
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{g.name}</div>
                        <div className="max-w-xs truncate text-[0.65rem] text-muted-foreground">
                          {g.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RolePill role={g.role} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {g.scope === 'LEGAL_ENTITY' ? (
                          <Pill tone="scope">
                            <TagIcon className="size-3" /> Entity tag
                          </Pill>
                        ) : (
                          <Pill tone="scope">
                            <LayersIcon className="size-3" /> Account groups
                          </Pill>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {g.scope === 'ACCOUNT_GROUP'
                            ? g.accountGroupIds.map((id) => {
                                const ag = accountGroups.find(
                                  (x) => x.id === id,
                                )
                                return <Pill key={id}>{ag?.name ?? id}</Pill>
                              })
                            : g.legalEntityCodes.map((c) => (
                                <Pill key={c} tone="entity">
                                  {c}
                                </Pill>
                              ))}
                          {g.scope === 'ACCOUNT_GROUP' &&
                            g.accountGroupIds.length === 0 && (
                              <Pill tone="warning">Not mapped</Pill>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {visible.length}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.memberIds.length}
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

      <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">How access resolves:</span>{' '}
        Accounts → Account Group → (mapping) → User Group → User. A user's
        effective access is the union of every group they belong to; their role
        and permissions still gate each action.
      </div>

      <CreateUserGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserGroupSheet
        key={openGroupLive?.id ?? 'none'}
        group={openGroupLive}
        onClose={() => setOpenGroup(null)}
      />
    </div>
  )
}
