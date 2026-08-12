import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  SearchIcon,
  TagIcon,
  HandIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  ACCOUNTS,
  LEGAL_ENTITIES,
  accountGroupCurrencies,
  accountsInAccountGroup,
  bankNames,
  formatMoney,
  legalEntityName,
  userGroupsUsingAccountGroup,
  type AccountGroup,
  type AccountGroupRule,
} from '@/data/fixtures'
import { formatWhen } from '@/lib/format'
import {
  addAccountGroup,
  deleteAccountGroup,
  nowIso,
  updateAccountGroup,
  useUserGroups,
} from '@/lib/admin-store'

// The account-group configuration flow — create, edit and add accounts —
// shared by the Account Groups admin page and the dashboard so both drive the
// same components rather than two copies that drift.

export function Pill({
  children,
  tone = 'default',
  title,
}: {
  children: React.ReactNode
  tone?: 'default' | 'entity' | 'warning' | 'rule'
  title?: string
}) {
  const cls =
    tone === 'entity'
      ? 'border-violet-300 bg-violet-50 text-violet-700'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : tone === 'rule'
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

export function RulePill({ rule }: { rule: AccountGroupRule }) {
  return rule === 'LEGAL_ENTITY' ? (
    <Pill tone="rule" title="Every account carrying the legal-entity tag, including future ones">
      <TagIcon className="size-3" /> Legal entity tag
    </Pill>
  ) : (
    <Pill title="Admin hand-picks the accounts in this group">
      <HandIcon className="size-3" /> Manual
    </Pill>
  )
}

// ---------------------------------------------------------------------------
// Account picker — the flat list with its filter dimensions, used by both the
// create dialog and the edit-membership sheet.
// ---------------------------------------------------------------------------

export function AccountPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>
  onToggle: (id: string, checked: boolean) => void
}) {
  const [q, setQ] = React.useState('')
  const [bank, setBank] = React.useState('all')
  const [entity, setEntity] = React.useState('all')

  const banks = React.useMemo(() => bankNames(ACCOUNTS), [])
  const rows = ACCOUNTS.filter((a) => {
    if (bank !== 'all' && a.bank !== bank) return false
    if (entity !== 'all' && a.legalEntity !== entity) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return [a.name, a.id, a.number, a.bank, a.legalEntity]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accounts"
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
        <Select value={entity} onValueChange={setEntity}>
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
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border">
        {rows.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No accounts match these filters.
          </div>
        )}
        {rows.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
          >
            <Checkbox
              checked={selected.has(a.id)}
              onCheckedChange={(c) => onToggle(a.id, c === true)}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{a.name}</div>
              <div className="truncate font-mono text-[0.65rem] text-muted-foreground">
                {a.id} · {a.number}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Pill>{a.bank}</Pill>
              <Pill tone="entity" title={legalEntityName(a.legalEntity)}>
                {a.legalEntity}
              </Pill>
              <Pill>{a.currency}</Pill>
            </div>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.size} account{selected.size === 1 ? '' : 's'} selected
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create account group
// ---------------------------------------------------------------------------

export function CreateAccountGroupDialog({
  open,
  onOpenChange,
  presetAccountIds,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  presetAccountIds?: string[]
}) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [rule, setRule] = React.useState<AccountGroupRule>('MANUAL')
  const [entityCode, setEntityCode] = React.useState(LEGAL_ENTITIES[0].code)
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(presetAccountIds ?? []),
  )

  const reset = () => {
    setName('')
    setDescription('')
    setRule('MANUAL')
    setEntityCode(LEGAL_ENTITIES[0].code)
    setSelected(new Set())
  }

  const memberCount =
    rule === 'LEGAL_ENTITY'
      ? ACCOUNTS.filter((a) => a.legalEntity === entityCode).length
      : selected.size

  const manualHasPicks = rule === 'MANUAL' ? selected.size > 0 : true
  const canSubmit = name.trim().length > 0 && manualHasPicks

  const submit = () => {
    const id = `ag_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}`
    addAccountGroup({
      id,
      name: name.trim(),
      description: description.trim(),
      rule,
      legalEntityCode: rule === 'LEGAL_ENTITY' ? entityCode : null,
      accountIds: rule === 'MANUAL' ? [...selected] : [],
      createdBy: 'Ming Miin',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    toast.success('Account group created', {
      description: `${name.trim()} · ${memberCount} account${memberCount === 1 ? '' : 's'}. Map it to a user group to grant access.`,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create account group</DialogTitle>
          <DialogDescription>
            An account group is a set of accounts you can grant to a user group.
            An account can belong to several groups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ag-name">Name</Label>
              <Input
                id="ag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SG Operating"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ag-desc">Description</Label>
              <Input
                id="ag-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Singapore-booked operating accounts"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Membership</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRule('MANUAL')}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  rule === 'MANUAL'
                    ? 'border-primary bg-muted'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <HandIcon className="size-3.5" /> Pick accounts
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Hand-pick from the flat account list.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRule('LEGAL_ENTITY')}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  rule === 'LEGAL_ENTITY'
                    ? 'border-primary bg-muted'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <TagIcon className="size-3.5" /> By legal-entity tag
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Auto-includes accounts onboarded later.
                </div>
              </button>
            </div>
          </div>

          {rule === 'LEGAL_ENTITY' ? (
            <div className="space-y-2">
              <Label>Legal entity</Label>
              <Select value={entityCode} onValueChange={setEntityCode}>
                <SelectTrigger className="font-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_ENTITIES.map((e) => (
                    <SelectItem key={e.code} value={e.code}>
                      {e.code} · {e.name} ({e.countryName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {memberCount} account{memberCount === 1 ? '' : 's'} carry this
                tag today.
              </p>
            </div>
          ) : (
            <AccountPicker
              selected={selected}
              onToggle={(id, checked) =>
                setSelected((prev) => {
                  const next = new Set(prev)
                  if (checked) next.add(id)
                  else next.delete(id)
                  return next
                })
              }
            />
          )}
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

export function AccountGroupSheet({
  group,
  onClose,
}: {
  group: AccountGroup | null
  onClose: () => void
}) {
  const userGroups = useUserGroups()
  // Keyed on the group id by the caller, so plain initial state is enough.
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<Set<string>>(
    () => new Set(group?.accountIds ?? []),
  )

  if (!group) return null

  const accounts = accountsInAccountGroup(group)
  const mappedUserGroups = userGroupsUsingAccountGroup(group.id, userGroups)

  const saveMembership = () => {
    updateAccountGroup(group.id, { accountIds: [...draft] })
    setEditing(false)
    toast.success('Membership updated', {
      description: `${group.name} now holds ${draft.size} account${draft.size === 1 ? '' : 's'}.`,
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
              <RulePill rule={group.rule} />
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 p-6">
            <div className="divide-y rounded-lg border bg-card">
              <SummaryRow label="ID">
                <span className="font-mono text-xs text-muted-foreground">
                  {group.id}
                </span>
              </SummaryRow>
              <SummaryRow label="Accounts">{accounts.length}</SummaryRow>
              <SummaryRow label="Currencies">
                <div className="flex flex-wrap justify-end gap-1">
                  {accountGroupCurrencies(group).map((c) => (
                    <Pill key={c}>{c}</Pill>
                  ))}
                </div>
              </SummaryRow>
              {group.rule === 'LEGAL_ENTITY' && (
                <SummaryRow label="Legal entity tag">
                  <Pill tone="entity">
                    {group.legalEntityCode} ·{' '}
                    {legalEntityName(group.legalEntityCode ?? '')}
                  </Pill>
                </SummaryRow>
              )}
              <SummaryRow label="Created by">{group.createdBy}</SummaryRow>
              <SummaryRow label="Updated">
                {formatWhen(group.updatedAt)}
              </SummaryRow>
            </div>

            <Tabs defaultValue="accounts">
              <TabsList>
                <TabsTrigger value="accounts">
                  Accounts ({accounts.length})
                </TabsTrigger>
                <TabsTrigger value="user-groups">
                  Groups ({mappedUserGroups.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="accounts" className="mt-4 space-y-3">
                {group.rule === 'LEGAL_ENTITY' ? (
                  <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Membership is driven by the{' '}
                    <span className="font-medium text-foreground">
                      {group.legalEntityCode}
                    </span>{' '}
                    tag. Accounts onboarded with that tag join automatically —
                    nothing to maintain by hand.
                  </p>
                ) : editing ? (
                  <>
                    <AccountPicker
                      selected={draft}
                      onToggle={(id, checked) =>
                        setDraft((prev) => {
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
                        onClick={() => {
                          setDraft(new Set(group.accountIds))
                          setEditing(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveMembership}>
                        Save membership
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      Edit accounts
                    </Button>
                  </div>
                )}

                {!editing && (
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
                        {accounts.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="py-8 text-center text-sm text-muted-foreground"
                            >
                              No accounts in this group.
                            </TableCell>
                          </TableRow>
                        )}
                        {accounts.map((a) => (
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
                )}
              </TabsContent>

              <TabsContent value="user-groups" className="mt-4">
                {mappedUserGroups.length === 0 ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Not mapped to any group yet, so nobody sees these
                    accounts.{' '}
                    <Link
                      to="/user-management"
                      className="font-medium underline underline-offset-4"
                    >
                      Map it to a group →
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[0.7rem] uppercase tracking-wider">
                            Group
                          </TableHead>

                          <TableHead className="text-right text-[0.7rem] uppercase tracking-wider">
                            Members
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedUserGroups.map((ug) => (
                          <TableRow key={ug.id}>
                            <TableCell className="text-sm font-medium">
                              {ug.name}
                            </TableCell>

                            <TableCell className="text-right text-sm tabular-nums">
                              {ug.memberIds.length}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                deleteAccountGroup(group.id)
                toast.success('Account group deleted', {
                  description: `${group.name} was removed. Any user group mapped to it loses that access.`,
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
