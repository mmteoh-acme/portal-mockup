import * as React from 'react'
import { toast } from 'sonner'
import {
  ChevronDownIcon,
  LayersIcon,
  LockIcon,
  TagIcon,
  TriangleAlertIcon,
  UserRoundPlusIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Mono, StatusPill } from '@/components/mono'
import { DataTable, DataTablePagination } from '@/components/data-table'
import { DetailSection, Field } from '@/components/detail-list'
import {
  LEGAL_ENTITIES,
  PERMISSION_SETS,
  ACCOUNTS,
  accountsForUserGroup,
  formatMoney,
  getPermissionSet,
  getPortalUser,
  legalEntityName,
  permissionsForRole,
  permissionsForUser,
  portalUsers,
  rolesForUserGroup,
  userGroupsForUser,
  type PermissionSet,
  type PortalUser,
  type Role,
  type UserGroup,
  type UserGroupScope,
} from '@/data/fixtures'
import { formatWhen } from '@/lib/format'
import {
  addRole,
  addUserGroup,
  deleteRole,
  deleteUserGroup,
  nowIso,
  updateUserGroup,
  useRoles,
  useUserGroups,
} from '@/lib/admin-store'

// User Management, structured as Modern Treasury does it: permissions bundle
// into permission sets, sets compose into roles, roles are granted to a group,
// and users belong to groups. Acme's addition is the account scope on the
// group, because no grant in this product is unscoped (ACME-2178).

function Pill({
  children,
  tone = 'default',
  title,
}: {
  children: React.ReactNode
  tone?: 'default' | 'entity' | 'warning' | 'scope' | 'set'
  title?: string
}) {
  const cls =
    tone === 'entity'
      ? 'border-violet-300 bg-violet-50 text-violet-700'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : tone === 'scope'
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : tone === 'set'
            ? 'border-border bg-background text-foreground'
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

function PermissionKeyPill({ k }: { k: string }) {
  return (
    <span className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
      {k}
    </span>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Shared editors
// ---------------------------------------------------------------------------

function RolePicker({
  roles,
  selected,
  onToggle,
}: {
  roles: Role[]
  selected: Set<string>
  onToggle: (id: string, checked: boolean) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Roles</Label>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {roles.map((r) => (
          <label
            key={r.id}
            className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
          >
            <Checkbox
              className="mt-0.5"
              checked={selected.has(r.id)}
              onCheckedChange={(c) => onToggle(r.id, c === true)}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.name}</div>
              <div className="truncate text-[0.65rem] text-muted-foreground">
                {r.description}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.permissionSetIds.map((id) => (
                  <Pill key={id} tone="set">
                    {getPermissionSet(id)?.name ?? id}
                  </Pill>
                ))}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function ScopeEditor({
  scope,
  setScope,
  legalEntityCodes,
  toggleLegalEntity,
  accountIds,
  toggleAccount,
}: {
  scope: UserGroupScope
  setScope: (s: UserGroupScope) => void
  legalEntityCodes: Set<string>
  toggleLegalEntity: (code: string, checked: boolean) => void
  accountIds: Set<string>
  toggleAccount: (id: string, checked: boolean) => void
}) {
  return (
    <div className="space-y-3">
      <Label>Account access</Label>
      <p className="text-xs text-muted-foreground">
        Account access is defined by the group. The roles above apply only to
        the accounts in scope here.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setScope('ALL')}
          className={`rounded-md border px-3 py-2 text-left text-sm ${
            scope === 'ALL' ? 'border-primary bg-muted' : 'hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <LayersIcon className="size-3.5" /> All accounts
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
            <TagIcon className="size-3.5" /> By legal entity
          </div>
        </button>
        <button
          type="button"
          onClick={() => setScope('ACCOUNT')}
          className={`rounded-md border px-3 py-2 text-left text-sm ${
            scope === 'ACCOUNT' ? 'border-primary bg-muted' : 'hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <LayersIcon className="size-3.5" /> Pick accounts
          </div>
        </button>
      </div>

      {scope === 'LEGAL_ENTITY' && (
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
                  {e.code} · {e.countryName} ·{' '}
                  {ACCOUNTS.filter((a) => a.legalEntity === e.code).length}{' '}
                  accounts
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {scope === 'ACCOUNT' && (
        <div className="max-h-56 overflow-y-auto rounded-md border">
          {ACCOUNTS.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
            >
              <Checkbox
                checked={accountIds.has(a.id)}
                onCheckedChange={(c) => toggleAccount(a.id, c === true)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="truncate font-mono text-[0.65rem] text-muted-foreground">
                  {a.number} · {a.bank}
                </div>
              </div>
              <Pill tone="entity">{a.legalEntity}</Pill>
            </label>
          ))}
        </div>
      )}

      {scope === 'ALL' && (
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Every account in the client group, including accounts onboarded later.
        </p>
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
      <div className="max-h-52 overflow-y-auto rounded-md border">
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
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create dialogs
// ---------------------------------------------------------------------------

function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const roles = useRoles()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [roleIds, setRoleIds] = React.useState<Set<string>>(new Set())
  const [scope, setScope] = React.useState<UserGroupScope>('LEGAL_ENTITY')
  const [acctIds, setAcctIds] = React.useState<Set<string>>(new Set())
  const [leCodes, setLeCodes] = React.useState<Set<string>>(new Set())
  const [memberIds, setMemberIds] = React.useState<Set<string>>(new Set())

  const reset = () => {
    setName('')
    setDescription('')
    setRoleIds(new Set())
    setScope('LEGAL_ENTITY')
    setAcctIds(new Set())
    setLeCodes(new Set())
    setMemberIds(new Set())
  }

  const draft: UserGroup = {
    id: 'preview',
    name,
    description,
    roleIds: [...roleIds],
    scope,
    legalEntityCodes: [...leCodes],
    accountIds: [...acctIds],
    memberIds: [...memberIds],
    createdBy: '',
    createdAt: '',
    updatedAt: '',
  }
  const preview = accountsForUserGroup(draft)
  const hasScope =
    scope === 'ALL' ||
    (scope === 'LEGAL_ENTITY' ? leCodes.size > 0 : acctIds.size > 0)
  const canSubmit = name.trim().length > 0 && roleIds.size > 0 && hasScope

  const submit = () => {
    addUserGroup({
      ...draft,
      id: `ug_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}`,
      name: name.trim(),
      description: description.trim(),
      createdBy: 'Ming Miin',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    toast.success('Group created', {
      description: `${name.trim()} · ${roleIds.size} role${roleIds.size === 1 ? '' : 's'} over ${preview.length} account${preview.length === 1 ? '' : 's'}.`,
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
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>
            A group grants roles to its members, over a set of accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g-name">Name</Label>
              <Input
                id="g-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SG Payment Ops"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-desc">Description</Label>
              <Input
                id="g-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Raises payments out of the SG accounts"
              />
            </div>
          </div>

          <RolePicker
            roles={roles}
            selected={roleIds}
            onToggle={(id, checked) =>
              setRoleIds((prev) => {
                const next = new Set(prev)
                if (checked) next.add(id)
                else next.delete(id)
                return next
              })
            }
          />

          <ScopeEditor
            scope={scope}
            setScope={setScope}
            legalEntityCodes={leCodes}
            toggleLegalEntity={(code, checked) =>
              setLeCodes((prev) => {
                const next = new Set(prev)
                if (checked) next.add(code)
                else next.delete(code)
                return next
              })
            }
            accountIds={acctIds}
            toggleAccount={(id, checked) =>
              setAcctIds((prev) => {
                const next = new Set(prev)
                if (checked) next.add(id)
                else next.delete(id)
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
            <span className="font-medium text-foreground">Effective grant:</span>{' '}
            {memberIds.size} member{memberIds.size === 1 ? '' : 's'} ×{' '}
            {roleIds.size} role{roleIds.size === 1 ? '' : 's'} ×{' '}
            {preview.length} account{preview.length === 1 ? '' : 's'}
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

function CreateRoleDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [setIds, setSetIds] = React.useState<Set<string>>(new Set())

  const reset = () => {
    setName('')
    setDescription('')
    setSetIds(new Set())
  }

  const canSubmit = name.trim().length > 0 && setIds.size > 0

  // The one grant-time check the catalogue can enforce: a role that both
  // creates and approves payments would break four-eyes on its own.
  const keys = new Set(
    [...setIds].flatMap((id) => getPermissionSet(id)?.permissions ?? []),
  )
  const conflict =
    keys.has('payment.create_edit') && keys.has('payment.approve_reject')

  const submit = () => {
    addRole({
      id: `role_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}`,
      name: name.trim(),
      description: description.trim(),
      permissionSetIds: [...setIds],
    })
    toast.success('Role created', {
      description: `${name.trim()} · ${setIds.size} permission set${setIds.size === 1 ? '' : 's'}.`,
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
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>
            A role is a bundle of Acme's permission sets. Grant it to a group to
            put it to work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="r-name">Name</Label>
              <Input
                id="r-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Payment Ops"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-desc">Description</Label>
              <Input
                id="r-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Raises payments and reconciles status"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permission sets</Label>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {PERMISSION_SETS.map((ps) => (
                <label
                  key={ps.id}
                  className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={setIds.has(ps.id)}
                    onCheckedChange={(c) =>
                      setSetIds((prev) => {
                        const next = new Set(prev)
                        if (c === true) next.add(ps.id)
                        else next.delete(ps.id)
                        return next
                      })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {ps.name}
                      {ps.managed && (
                        <Pill title="Managed by Acme. Clients don't compose their own sets in MVP.">
                          <LockIcon className="size-2.5" /> managed
                        </Pill>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ps.permissions.map((k) => (
                        <PermissionKeyPill key={k} k={k} />
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {conflict && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                This role can both create and approve payments. Four-eyes is
                still enforced per payment at runtime, but granting both in one
                role defeats the intent.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Detail sheets — the description list Transactions and Payments use
// ---------------------------------------------------------------------------

function GroupSheet({
  group,
  onClose,
}: {
  group: UserGroup | null
  onClose: () => void
}) {
  const allRoles = useRoles()
  const [editing, setEditing] = React.useState(false)
  const [roleIds, setRoleIds] = React.useState<Set<string>>(
    () => new Set(group?.roleIds ?? []),
  )
  const [memberIds, setMemberIds] = React.useState<Set<string>>(
    () => new Set(group?.memberIds ?? []),
  )

  if (!group) return null

  const roles = rolesForUserGroup(group)
  const visible = accountsForUserGroup(group)
  const members = group.memberIds
    .map((id) => getPortalUser(id))
    .filter((u): u is NonNullable<typeof u> => !!u)
  const sets = PERMISSION_SETS.filter((ps) =>
    roles.some((r) => r.permissionSetIds.includes(ps.id)),
  )

  const save = () => {
    updateUserGroup(group.id, {
      roleIds: [...roleIds],
      memberIds: [...memberIds],
    })
    setEditing(false)
    toast.success('Group updated', {
      description: `${group.name} now grants ${roleIds.size} role${roleIds.size === 1 ? '' : 's'} to ${memberIds.size} member${memberIds.size === 1 ? '' : 's'}.`,
    })
  }

  return (
    <Sheet open={!!group} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-mono">{group.id}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 pb-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight">
              {group.name}
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {group.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit group
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                deleteUserGroup(group.id)
                toast.success('Group deleted', {
                  description: `${group.name} was removed. Its members lose those grants.`,
                })
                onClose()
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="space-y-6 px-4 pb-6 pt-4">
          {editing && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <RolePicker
                roles={allRoles}
                selected={roleIds}
                onToggle={(id, checked) =>
                  setRoleIds((prev) => {
                    const next = new Set(prev)
                    if (checked) next.add(id)
                    else next.delete(id)
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={save}>
                  Save group
                </Button>
              </div>
            </div>
          )}

          <DetailSection title="Group">
            <Field label="Group ID">
              <Mono>{group.id}</Mono>
            </Field>
            <Field label="Account scope">
              {group.scope === 'ALL' ? (
                <Pill tone="scope">All accounts</Pill>
              ) : group.scope === 'LEGAL_ENTITY' ? (
                <div className="flex flex-wrap gap-1">
                  <Pill tone="scope">By legal entity</Pill>
                  {group.legalEntityCodes.map((c) => (
                    <Pill key={c} tone="entity" title={legalEntityName(c)}>
                      {c}
                    </Pill>
                  ))}
                </div>
              ) : (
                <Pill tone="scope">
                  {group.accountIds.length} picked account
                  {group.accountIds.length === 1 ? '' : 's'}
                </Pill>
              )}
            </Field>
            <Field label="Accounts in scope">
              <span className="text-sm tabular-nums">{visible.length}</span>
            </Field>
            <Field label="Members">
              <span className="text-sm tabular-nums">{members.length}</span>
            </Field>
            <Field label="Updated">
              <span className="text-sm">{formatWhen(group.updatedAt)}</span>
            </Field>
          </DetailSection>

          <DetailSection title="Roles granted">
            <Field label="Roles" stacked>
              {roles.length === 0 ? (
                <Pill tone="warning">No role granted</Pill>
              ) : (
                <div className="overflow-hidden rounded border">
                  <table className="w-full text-[0.78rem]">
                    <tbody>
                      {roles.map((r) => (
                        <tr key={r.id} className="border-b last:border-b-0">
                          <td className="px-2 py-2 align-top">
                            <div className="font-medium">{r.name}</div>
                            <div className="text-[0.7rem] text-muted-foreground">
                              {r.description}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex flex-wrap justify-end gap-1">
                              {r.permissionSetIds.map((id) => (
                                <Pill key={id} tone="set">
                                  {getPermissionSet(id)?.name ?? id}
                                </Pill>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Field>
            <Field label="Permission sets" stacked>
              <div className="flex flex-wrap gap-1">
                {sets.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  sets.map((ps) => (
                    <Pill key={ps.id} tone="set">
                      {ps.name}
                    </Pill>
                  ))
                )}
              </div>
            </Field>
          </DetailSection>

          <DetailSection title="Accounts in scope">
            <Field label={`${visible.length} accounts`} stacked>
              {visible.length === 0 ? (
                <span className="text-sm text-amber-700">
                  Members of this group see no accounts.
                </span>
              ) : (
                <div className="overflow-hidden rounded border">
                  <table className="w-full text-[0.78rem]">
                    <tbody>
                      {visible.map((a) => (
                        <tr key={a.id} className="border-b last:border-b-0">
                          <td className="px-2 py-2">
                            <div className="font-medium">{a.name}</div>
                            <div className="font-mono text-[0.7rem] text-muted-foreground">
                              {a.number}
                            </div>
                          </td>
                          <td className="px-2 py-2">{a.bank}</td>
                          <td className="px-2 py-2">
                            <Pill tone="entity">{a.legalEntity}</Pill>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {formatMoney(a.currency, a.lastBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Field>
          </DetailSection>

          <DetailSection title="Members">
            <Field label={`${members.length} users`} stacked>
              {members.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No members yet.
                </span>
              ) : (
                <div className="overflow-hidden rounded border">
                  <table className="w-full text-[0.78rem]">
                    <tbody>
                      {members.map((u) => (
                        <tr key={u.id} className="border-b last:border-b-0">
                          <td className="px-2 py-2">
                            <div className="font-medium">{u.name}</div>
                            <div className="text-[0.7rem] text-muted-foreground">
                              {u.email}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <StatusPill status={u.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Field>
          </DetailSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function RoleSheet({
  role,
  onClose,
}: {
  role: Role | null
  onClose: () => void
}) {
  const groups = useUserGroups()
  if (!role) return null

  const permissions = permissionsForRole(role)
  const usedBy = groups.filter((g) => g.roleIds.includes(role.id))

  return (
    <Sheet open={!!role} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-mono">{role.id}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 pb-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight">{role.name}</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {role.description}
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={usedBy.length > 0}
            title={
              usedBy.length > 0
                ? 'Remove the role from every group before deleting it'
                : undefined
            }
            onClick={() => {
              deleteRole(role.id)
              toast.success('Role deleted', { description: role.name })
              onClose()
            }}
          >
            Delete
          </Button>
        </div>

        <div className="space-y-6 px-4 pb-6 pt-4">
          <DetailSection title="Role">
            <Field label="Role ID">
              <Mono>{role.id}</Mono>
            </Field>
            <Field label="Permission sets">
              <span className="text-sm tabular-nums">
                {role.permissionSetIds.length}
              </span>
            </Field>
            <Field label="Permissions">
              <span className="text-sm tabular-nums">{permissions.length}</span>
            </Field>
            <Field label="Granted by">
              <div className="flex flex-wrap gap-1">
                {usedBy.length === 0 ? (
                  <Pill tone="warning">No group</Pill>
                ) : (
                  usedBy.map((g) => <Pill key={g.id}>{g.name}</Pill>)
                )}
              </div>
            </Field>
          </DetailSection>

          <DetailSection title="Permission sets">
            {role.permissionSetIds.map((id) => {
              const ps = getPermissionSet(id)
              if (!ps) return null
              return (
                <Field key={id} label={ps.name} stacked>
                  <div className="space-y-2">
                    {ps.managed && (
                      <Pill>
                        <LockIcon className="size-2.5" /> Managed by Acme
                      </Pill>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {ps.permissions.map((k) => (
                        <PermissionKeyPill key={k} k={k} />
                      ))}
                    </div>
                  </div>
                </Field>
              )
            })}
          </DetailSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Tab tables — every list in the app runs through the same data table
// ---------------------------------------------------------------------------

const ADMIN_PAGE_SIZE = 10

// Groups, roles, sets and users are configuration lists of a handful of rows,
// so they get the sortable header, row click and pager but no checkbox
// selection: there is nothing to bulk-export here.
function useAdminTable<T>(data: T[], columns: ColumnDef<T>[], sortId: string) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: sortId, desc: false },
  ])
  return useReactTable({
    data,
    columns,
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize: ADMIN_PAGE_SIZE } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    autoResetPageIndex: true,
  })
}

type GroupRow = UserGroup & { roleNames: string[]; accountCount: number }

function GroupsTable({
  groups,
  onOpen,
}: {
  groups: UserGroup[]
  onOpen: (g: UserGroup) => void
}) {
  const data = React.useMemo<GroupRow[]>(
    () =>
      groups.map((g) => ({
        ...g,
        roleNames: rolesForUserGroup(g).map((r) => r.name),
        accountCount: accountsForUserGroup(g).length,
      })),
    [groups],
  )

  const columns = React.useMemo<ColumnDef<GroupRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="max-w-[16rem] whitespace-nowrap">
            <div className="font-medium">{row.original.name}</div>
            <div className="truncate text-[0.7rem] text-muted-foreground">
              {row.original.description}
            </div>
          </div>
        ),
      },
      {
        id: 'roles',
        accessorFn: (g) => g.roleNames.join(', '),
        header: 'Roles',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roleNames.length === 0 ? (
              <Pill tone="warning">No role</Pill>
            ) : (
              row.original.roleNames.map((n) => <Pill key={n}>{n}</Pill>)
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: 'sets',
        header: 'Permission sets',
        cell: ({ row }) => {
          const gRoles = rolesForUserGroup(row.original)
          const gSets = PERMISSION_SETS.filter((ps) =>
            gRoles.some((r) => r.permissionSetIds.includes(ps.id)),
          )
          return (
            <div className="flex flex-wrap gap-1">
              {gSets.map((ps) => (
                <Pill key={ps.id} tone="set">
                  {ps.name}
                </Pill>
              ))}
            </div>
          )
        },
        enableSorting: false,
      },
      {
        id: 'scope',
        accessorKey: 'scope',
        header: 'Account scope',
        cell: ({ row }) => {
          const g = row.original
          return (
            <div className="flex flex-wrap gap-1">
              {g.scope === 'ALL' ? (
                <Pill tone="scope">All accounts</Pill>
              ) : g.scope === 'LEGAL_ENTITY' ? (
                g.legalEntityCodes.map((c) => (
                  <Pill key={c} tone="entity" title={legalEntityName(c)}>
                    {c}
                  </Pill>
                ))
              ) : (
                <Pill tone="scope">{g.accountIds.length} picked</Pill>
              )}
            </div>
          )
        },
      },
      {
        id: 'accountCount',
        accessorKey: 'accountCount',
        header: 'Accounts',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.accountCount}</span>
        ),
      },
      {
        id: 'members',
        accessorFn: (g) => g.memberIds.length,
        header: 'Members',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.memberIds.length}</span>
        ),
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatWhen(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useAdminTable(data, columns, 'name')

  return (
    <div className="rounded-md border bg-card">
      <DataTable
        table={table}
        onRowClick={onOpen}
        emptyMessage="No groups yet. Nobody holds a permission until they are in a group."
      />
      <DataTablePagination table={table} />
    </div>
  )
}

function RolesTable({
  roles,
  groups,
  onOpen,
}: {
  roles: Role[]
  groups: UserGroup[]
  onOpen: (r: Role) => void
}) {
  const columns = React.useMemo<ColumnDef<Role>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="block max-w-sm text-xs text-muted-foreground">
            {row.original.description}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'sets',
        header: 'Permission sets',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.permissionSetIds.map((id) => (
              <Pill key={id} tone="set">
                {getPermissionSet(id)?.name ?? id}
              </Pill>
            ))}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: 'grantedBy',
        header: 'Granted by',
        cell: ({ row }) => {
          const usedBy = groups.filter((g) =>
            g.roleIds.includes(row.original.id),
          )
          return (
            <div className="flex flex-wrap gap-1">
              {usedBy.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Not granted
                </span>
              ) : (
                usedBy.map((g) => <Pill key={g.id}>{g.name}</Pill>)
              )}
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [groups],
  )

  const table = useAdminTable(roles, columns, 'name')

  return (
    <div className="rounded-md border bg-card">
      <DataTable
        table={table}
        onRowClick={onOpen}
        emptyMessage="No roles yet."
      />
      <DataTablePagination table={table} />
    </div>
  )
}

function PermissionSetsTable({ roles }: { roles: Role[] }) {
  const columns = React.useMemo<ColumnDef<PermissionSet>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap font-medium">
            <LockIcon className="size-3 text-muted-foreground" />
            {row.original.name}
          </div>
        ),
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="block max-w-xs text-xs text-muted-foreground">
            {row.original.description}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'permissions',
        header: 'Permissions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.permissions.map((k) => (
              <PermissionKeyPill key={k} k={k} />
            ))}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: 'usedBy',
        header: 'Used by roles',
        cell: ({ row }) => {
          const usedBy = roles.filter((r) =>
            r.permissionSetIds.includes(row.original.id),
          )
          return (
            <div className="flex flex-wrap gap-1">
              {usedBy.map((r) => (
                <Pill key={r.id}>{r.name}</Pill>
              ))}
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [roles],
  )

  const table = useAdminTable(PERMISSION_SETS, columns, 'name')

  return (
    <div className="rounded-md border bg-card">
      <DataTable table={table} emptyMessage="No permission sets." />
      <DataTablePagination table={table} />
    </div>
  )
}

function UsersTable({ groups }: { groups: UserGroup[] }) {
  const columns = React.useMemo<ColumnDef<PortalUser>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 rounded-md">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.original.name)}`}
                alt={row.original.name}
              />
              <AvatarFallback className="rounded-md text-xs">
                {initials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{row.original.name}</div>
              <div className="text-[0.7rem] text-muted-foreground">
                {row.original.email}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'groups',
        header: 'Groups',
        cell: ({ row }) => {
          const memberOf = userGroupsForUser(row.original.id, groups)
          return memberOf.length === 0 ? (
            <Pill tone="warning">No group</Pill>
          ) : (
            <div className="flex flex-wrap gap-1">
              {memberOf.map((g) => (
                <Pill key={g.id}>{g.name}</Pill>
              ))}
            </div>
          )
        },
        enableSorting: false,
      },
      {
        id: 'permissions',
        header: 'Effective permissions',
        cell: ({ row }) => {
          const perms = permissionsForUser(row.original.id, groups)
          return (
            <span
              className="text-xs text-muted-foreground"
              title={perms.map((p) => p.key).join('\n')}
            >
              {perms.length} permission{perms.length === 1 ? '' : 's'}
            </span>
          )
        },
        enableSorting: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: 'lastActive',
        accessorKey: 'lastActive',
        header: 'Last active',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {row.original.lastActive}
          </span>
        ),
      },
    ],
    [groups],
  )

  const table = useAdminTable(portalUsers, columns, 'name')

  return (
    <div className="rounded-md border bg-card">
      <DataTable table={table} emptyMessage="No users yet." />
      <DataTablePagination table={table} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function UserManagementPage() {
  const groups = useUserGroups()
  const roles = useRoles()
  const [openGroup, setOpenGroup] = React.useState<UserGroup | null>(null)
  const [openRole, setOpenRole] = React.useState<Role | null>(null)
  const [createGroup, setCreateGroup] = React.useState(false)
  const [createRole, setCreateRole] = React.useState(false)

  const openGroupLive = openGroup
    ? groups.find((g) => g.id === openGroup.id) ?? null
    : null
  const openRoleLive = openRole
    ? roles.find((r) => r.id === openRole.id) ?? null
    : null

  const ungrouped = portalUsers.filter(
    (u) => !groups.some((g) => g.memberIds.includes(u.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <UserRoundPlusIcon className="size-3.5" />
            Invite user
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                Create
                <ChevronDownIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setCreateGroup(true)}>
                Group
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCreateRole(true)}>
                Role
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Permission set (Acme-managed)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {ungrouped.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlertIcon className="size-4 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">
              {ungrouped.length} user{ungrouped.length === 1 ? '' : 's'} in no
              group:
            </span>{' '}
            {ungrouped.map((u) => u.name).join(', ')}. They can sign in and hold
            no permissions.
          </span>
        </div>
      )}

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
          <TabsTrigger value="sets">
            Permission Sets ({PERMISSION_SETS.length})
          </TabsTrigger>
          <TabsTrigger value="users">Users ({portalUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <GroupsTable groups={groups} onOpen={setOpenGroup} />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <RolesTable roles={roles} groups={groups} onOpen={setOpenRole} />
        </TabsContent>

        {/* Permission sets — Acme-managed, read only */}
        <TabsContent value="sets" className="mt-4">
          <PermissionSetsTable roles={roles} />
          <p className="mt-3 text-xs text-muted-foreground">
            Permission sets are defined by Acme. Clients compose roles from them
            rather than composing their own sets.
          </p>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersTable groups={groups} />
        </TabsContent>
      </Tabs>

      <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">How access resolves:</span>{' '}
        Permission → Permission Set → Role → Group → User, with the Group also
        carrying the account scope. A user's effective access is the union of
        every group they belong to.
      </div>

      <CreateGroupDialog open={createGroup} onOpenChange={setCreateGroup} />
      <CreateRoleDialog open={createRole} onOpenChange={setCreateRole} />
      <GroupSheet
        key={openGroupLive?.id ?? 'none'}
        group={openGroupLive}
        onClose={() => setOpenGroup(null)}
      />
      <RoleSheet
        key={openRoleLive?.id ?? 'none-role'}
        role={openRoleLive}
        onClose={() => setOpenRole(null)}
      />
    </div>
  )
}
