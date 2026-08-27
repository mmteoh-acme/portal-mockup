import * as React from 'react'
import { toast } from 'sonner'
import {
  LayersIcon,
  LockIcon,
  PlusIcon,
  TagIcon,
  TriangleAlertIcon,
  UserRoundPlusIcon,
  UsersRoundIcon,
  XIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
  PERMISSION_SETS,
  ACCOUNTS,
  accountsForUserGroup,
  formatMoney,
  getPermissionSet,
  getPortalUser,
  legalEntityName,
  permissionsByFeature,
  permissionsForRole,
  permissionsForUser,
  portalUsers,
  rolesForUserGroup,
  userGroupsForUser,
  type PermissionSet,
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

/**
 * "Payments — view, create, edit, export". An Acme permission is a feature and
 * an action on it, so the feature names the line and the actions it grants
 * follow, rather than a wall of raw keys.
 */
function PermissionList({
  keys,
  className,
}: {
  keys: ReadonlyArray<string>
  className?: string
}) {
  const features = permissionsByFeature(keys)
  if (features.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        Permissions not yet specified
      </span>
    )
  }
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {features.map((f) => (
        <div key={f.feature} className="text-sm">
          <span className="font-medium">{f.featureName}</span>
          <span className="text-muted-foreground">
            {' '}
            — {f.actions.join(', ')}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Permission | Actions, the shape a permission reads in on a detail page: the
 * feature names the row, the actions it grants fill the second column.
 */
function PermissionTable({ keys }: { keys: ReadonlyArray<string> }) {
  const features = permissionsByFeature(keys)
  if (features.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Permissions not yet specified.
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Permission</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.map((f) => (
          <TableRow key={f.feature}>
            <TableCell className="whitespace-nowrap font-medium">
              {f.featureName}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {f.actions.join(', ')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Detail sheet for an Acme-managed permission set. */
function PermissionSetSheet({
  set,
  onClose,
}: {
  set: PermissionSet | null
  onClose: () => void
}) {
  return (
    <Sheet open={!!set} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {set && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2 text-xl leading-tight font-bold">
                {set.name}
                {set.managed && (
                  <Pill title="Managed by Acme. Clients compose roles from these sets rather than authoring their own.">
                    <LockIcon className="size-2.5" /> managed
                  </Pill>
                )}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{set.description}</p>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
              <div className="divide-y rounded-lg border bg-card">
                <SummaryRow label="ID">
                  <span className="font-mono text-xs text-muted-foreground">
                    {set.id}
                  </span>
                </SummaryRow>
                <SummaryRow label="Permissions">
                  {set.permissions.length}
                </SummaryRow>
              </div>

              <section className="rounded-lg border bg-card">
                <header className="border-b px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Permissions
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    What this set grants, by feature and the actions allowed on
                    it.
                  </p>
                </header>
                <PermissionTable keys={set.permissions} />
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
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
    (keys.has('payments.create') || keys.has('payments.edit')) &&
    keys.has('payments.approve')

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
                    <PermissionList keys={ps.permissions} className="mt-1" />
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
// Detail sheets
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
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-lg font-semibold">
              {group.name}
            </SheetTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.description || 'No description'}
            </p>
          </SheetHeader>

          <div className="flex-1 space-y-4 p-6">
            <div className="divide-y rounded-lg border bg-card">
              <SummaryRow label="ID">
                <span className="font-mono text-xs text-muted-foreground">
                  {group.id}
                </span>
              </SummaryRow>
              <SummaryRow label="Roles">
                <div className="flex flex-wrap justify-end gap-1">
                  {roles.length === 0 ? (
                    <Pill tone="warning">No role granted</Pill>
                  ) : (
                    roles.map((r) => <Pill key={r.id}>{r.name}</Pill>)
                  )}
                </div>
              </SummaryRow>
              <SummaryRow label="Permission sets">
                <div className="flex flex-wrap justify-end gap-1">
                  {sets.map((ps) => (
                    <Pill key={ps.id} tone="set">
                      {ps.name}
                    </Pill>
                  ))}
                </div>
              </SummaryRow>
              <SummaryRow label="Members">{members.length}</SummaryRow>
              <SummaryRow label="Accounts in scope">
                {visible.length}
              </SummaryRow>
              <SummaryRow label="Updated">
                {formatWhen(group.updatedAt)}
              </SummaryRow>
            </div>

            <Tabs defaultValue="roles">
              <TabsList>
                <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
                <TabsTrigger value="access">
                  Account scope ({visible.length})
                </TabsTrigger>
                <TabsTrigger value="members">
                  Members ({members.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="roles" className="mt-4 space-y-3">
                {editing ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                      >
                        Edit group
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              Role
                            </TableHead>
                            <TableHead>
                              Permission sets
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roles.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {r.name}
                                </div>
                                <div className="text-[0.65rem] text-muted-foreground">
                                  {r.description}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {r.permissionSetIds.map((id) => (
                                    <Pill key={id} tone="set">
                                      {getPermissionSet(id)?.name ?? id}
                                    </Pill>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="access" className="mt-4 space-y-3">
                <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-foreground/70">
                  Scope
                </div>
                <div className="rounded-lg border px-3 py-2 text-sm">
                  {group.scope === 'ALL' ? (
                    <span>
                      <Pill tone="scope">All accounts</Pill> Every account in the
                      client group, including accounts onboarded later.
                    </span>
                  ) : group.scope === 'LEGAL_ENTITY' ? (
                    <span className="flex flex-wrap items-center gap-1">
                      <Pill tone="scope">By legal entity</Pill>
                      {group.legalEntityCodes.map((c) => (
                        <Pill key={c} tone="entity">
                          {c} · {legalEntityName(c)}
                        </Pill>
                      ))}
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      <Pill tone="scope">Picked accounts</Pill>
                      {group.accountIds.length} account
                      {group.accountIds.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-foreground/70">
                  Accounts in scope ({visible.length})
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Account
                        </TableHead>
                        <TableHead>
                          Bank
                        </TableHead>
                        <TableHead>
                          Entity
                        </TableHead>
                        <TableHead className="text-right">
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
                            <div className="text-sm font-medium">{a.name}</div>
                            <div className="font-mono text-[0.65rem] text-muted-foreground">
                              {a.number}
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
              </TabsContent>

              <TabsContent value="members" className="mt-4">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          User
                        </TableHead>
                        <TableHead>
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No members yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {members.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{u.name}</div>
                            <div className="text-[0.65rem] text-muted-foreground">
                              {u.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.status}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
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
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-lg font-semibold">
              {role.name}
            </SheetTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {role.description}
            </p>
          </SheetHeader>

          <div className="flex-1 space-y-4 p-6">
            <div className="divide-y rounded-lg border bg-card">
              <SummaryRow label="ID">
                <span className="font-mono text-xs text-muted-foreground">
                  {role.id}
                </span>
              </SummaryRow>
              <SummaryRow label="Permission sets">
                {role.permissionSetIds.length}
              </SummaryRow>
              <SummaryRow label="Permissions">{permissions.length}</SummaryRow>
              <SummaryRow label="Granted by">
                <div className="flex flex-wrap justify-end gap-1">
                  {usedBy.length === 0 ? (
                    <Pill tone="warning">No group</Pill>
                  ) : (
                    usedBy.map((g) => <Pill key={g.id}>{g.name}</Pill>)
                  )}
                </div>
              </SummaryRow>
            </div>

            <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-foreground/70">
              Permission sets
            </div>
            <div className="space-y-3">
              {role.permissionSetIds.map((id) => {
                const ps = getPermissionSet(id)
                if (!ps) return null
                return (
                  <div key={id} className="rounded-lg border">
                    <div className="flex items-center gap-1.5 border-b px-3 py-2 text-sm font-medium">
                      {ps.name}
                      {ps.managed && (
                        <Pill>
                          <LockIcon className="size-2.5" /> managed
                        </Pill>
                      )}
                    </div>
                    <PermissionTable keys={ps.permissions} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
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
              Delete role
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

export function UserManagementPage() {
  const groups = useUserGroups()
  const roles = useRoles()
  const [openGroup, setOpenGroup] = React.useState<UserGroup | null>(null)
  const [openRole, setOpenRole] = React.useState<Role | null>(null)
  const [openSet, setOpenSet] = React.useState<PermissionSet | null>(null)
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Permissions bundle into permission sets, sets compose into roles,
            roles are granted to a group, and users belong to groups. Every
            grant is scoped to a set of accounts.
          </p>
        </div>
        {/* Creating happens inside the tab that owns the thing being
            created, so there is no cross-tab Create menu here. */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <UserRoundPlusIcon className="size-3.5" />
            Invite user
          </Button>
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

        {/* Groups */}
        <TabsContent value="groups" className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <p className="min-w-0 max-w-3xl text-sm text-muted-foreground">
              Groups let you assign accounts under a meaningful group name. The
              default group assigned to Administrators includes all accounts.
            </p>
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setCreateGroup(true)}
            >
              <PlusIcon className="size-4" />
              Create new group
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Name
                      </TableHead>
                      <TableHead>
                        Roles
                      </TableHead>
                      <TableHead>
                        Permission sets
                      </TableHead>
                      <TableHead>
                        Account scope
                      </TableHead>
                      <TableHead>
                        Accounts
                      </TableHead>
                      <TableHead>
                        Members
                      </TableHead>
                      <TableHead>
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
                              <UsersRoundIcon className="size-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">No groups yet</p>
                            <p className="text-sm text-muted-foreground">
                              Nobody holds a permission until they are in a
                              group.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {groups.map((g) => {
                      const gRoles = rolesForUserGroup(g)
                      const gSets = PERMISSION_SETS.filter((ps) =>
                        gRoles.some((r) => r.permissionSetIds.includes(ps.id)),
                      )
                      const visible = accountsForUserGroup(g)
                      return (
                        <TableRow
                          key={g.id}
                          className="cursor-pointer"
                          onClick={() => setOpenGroup(g)}
                        >
                          <TableCell className="whitespace-nowrap">
                            <div className="font-medium">{g.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {gRoles.length === 0 ? (
                                <Pill tone="warning">No role</Pill>
                              ) : (
                                gRoles.map((r) => (
                                  <Pill key={r.id}>{r.name}</Pill>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {gSets.map((ps) => (
                                <Pill key={ps.id} tone="set">
                                  {ps.name}
                                </Pill>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {g.scope === 'ALL' ? (
                                <Pill tone="scope">All accounts</Pill>
                              ) : g.scope === 'LEGAL_ENTITY' ? (
                                g.legalEntityCodes.map((c) => (
                                  <Pill key={c} tone="entity">
                                    {c}
                                  </Pill>
                                ))
                              ) : (
                                <Pill tone="scope">
                                  {g.accountIds.length} picked
                                </Pill>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {visible.length}
                          </TableCell>
                          <TableCell className="tabular-nums">
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
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <p className="min-w-0 max-w-3xl text-sm text-muted-foreground">
              A user's role does not automatically give them access to every
              account in the organisation. Account access is granted by the
              group they belong to.
            </p>
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setCreateRole(true)}
            >
              <PlusIcon className="size-4" />
              Create new role
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Name
                      </TableHead>
                      <TableHead>
                        Description
                      </TableHead>
                      <TableHead>
                        Permission sets
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((r) => {
                      return (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() => setOpenRole(r)}
                        >
                          <TableCell className="whitespace-nowrap font-medium">
                            {r.name}
                          </TableCell>
                          <TableCell className="max-w-sm text-xs text-muted-foreground">
                            {r.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.permissionSetIds.map((id) => (
                                <Pill key={id} tone="set">
                                  {getPermissionSet(id)?.name ?? id}
                                </Pill>
                              ))}
                            </div>
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

        {/* Permission sets — Acme-managed, read only */}
        <TabsContent value="sets" className="mt-4 space-y-4">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Permission sets are defined by Acme. Clients compose roles from them
            rather than composing their own sets.
          </p>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Name
                      </TableHead>
                      <TableHead>
                        Description
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_SETS.map((ps: PermissionSet) => {
                      return (
                        <TableRow
                          key={ps.id}
                          className="cursor-pointer"
                          onClick={() => setOpenSet(ps)}
                        >
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium">
                              <LockIcon className="size-3 text-muted-foreground" />
                              {ps.name}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground">
                            {ps.description}
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

        {/* Users */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        User
                      </TableHead>
                      <TableHead>
                        Groups
                      </TableHead>
                      <TableHead>
                        Effective permissions
                      </TableHead>
                      <TableHead>
                        Status
                      </TableHead>
                      <TableHead>
                        Last active
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portalUsers.map((u) => {
                      const memberOf = userGroupsForUser(u.id, groups)
                      const perms = permissionsForUser(u.id, groups)
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 rounded-md">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`}
                                  alt={u.name}
                                />
                                <AvatarFallback className="rounded-md text-xs">
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
                            {memberOf.length === 0 ? (
                              <span className="text-xs text-amber-700">
                                No group
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {memberOf.map((g) => (
                                  <Pill key={g.id}>{g.name}</Pill>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-xs text-muted-foreground"
                            title={perms.map((p) => p.key).join('\n')}
                          >
                            {perms.length} permission
                            {perms.length === 1 ? '' : 's'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.status}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.lastActive}
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
      </Tabs>

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
      <PermissionSetSheet set={openSet} onClose={() => setOpenSet(null)} />
    </div>
  )
}
