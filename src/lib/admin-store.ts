import * as React from 'react'
import {
  ROLES,
  accountGroupsSeed,
  userGroupsSeed,
  type AccountGroup,
  type Role,
  type UserGroup,
} from '@/data/fixtures'

// Account groups and user groups an admin creates in the mockup live in
// sessionStorage so they survive navigation, seeded from the fixtures on first
// read. Same pattern as the refunds store.

const ROLES_KEY = 'portal-mockup:roles'
const ROLES_EVENT = 'portal-mockup:roles-updated'
const ACCOUNT_GROUPS_KEY = 'portal-mockup:accountGroups'
const USER_GROUPS_KEY = 'portal-mockup:userGroups'
const ACCOUNT_GROUPS_EVENT = 'portal-mockup:account-groups-updated'
const USER_GROUPS_EVENT = 'portal-mockup:user-groups-updated'

function read<T>(key: string, seed: T[]): T[] {
  if (typeof window === 'undefined') return seed
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return seed
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : seed
  } catch {
    return seed
  }
}

function write<T>(key: string, event: string, items: T[]): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(key, JSON.stringify(items))
  window.dispatchEvent(new Event(event))
}

function useStore<T>(key: string, event: string, seed: T[]): T[] {
  const [items, setItems] = React.useState<T[]>(() => read(key, seed))

  React.useEffect(() => {
    const handler = () => setItems(read(key, seed))
    window.addEventListener(event, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(event, handler)
      window.removeEventListener('storage', handler)
    }
  }, [key, event, seed])

  return items
}

// ---------------------------------------------------------------------------
// Account groups
// ---------------------------------------------------------------------------

export function readAccountGroups(): AccountGroup[] {
  return read(ACCOUNT_GROUPS_KEY, accountGroupsSeed)
}

export function useAccountGroups(): AccountGroup[] {
  return useStore(ACCOUNT_GROUPS_KEY, ACCOUNT_GROUPS_EVENT, accountGroupsSeed)
}

export function addAccountGroup(group: AccountGroup): void {
  write(ACCOUNT_GROUPS_KEY, ACCOUNT_GROUPS_EVENT, [
    ...readAccountGroups(),
    group,
  ])
}

export function updateAccountGroup(
  id: string,
  patch: Partial<AccountGroup>,
): void {
  write(
    ACCOUNT_GROUPS_KEY,
    ACCOUNT_GROUPS_EVENT,
    readAccountGroups().map((g) =>
      g.id === id ? { ...g, ...patch, updatedAt: nowIso() } : g,
    ),
  )
}

export function deleteAccountGroup(id: string): void {
  write(
    ACCOUNT_GROUPS_KEY,
    ACCOUNT_GROUPS_EVENT,
    readAccountGroups().filter((g) => g.id !== id),
  )
}

// ---------------------------------------------------------------------------
// User groups
// ---------------------------------------------------------------------------

export function readUserGroups(): UserGroup[] {
  return read(USER_GROUPS_KEY, userGroupsSeed)
}

export function useUserGroups(): UserGroup[] {
  return useStore(USER_GROUPS_KEY, USER_GROUPS_EVENT, userGroupsSeed)
}

export function addUserGroup(group: UserGroup): void {
  write(USER_GROUPS_KEY, USER_GROUPS_EVENT, [...readUserGroups(), group])
}

export function updateUserGroup(id: string, patch: Partial<UserGroup>): void {
  write(
    USER_GROUPS_KEY,
    USER_GROUPS_EVENT,
    readUserGroups().map((g) =>
      g.id === id ? { ...g, ...patch, updatedAt: nowIso() } : g,
    ),
  )
}

export function deleteUserGroup(id: string): void {
  write(
    USER_GROUPS_KEY,
    USER_GROUPS_EVENT,
    readUserGroups().filter((g) => g.id !== id),
  )
}

// ---------------------------------------------------------------------------
// Roles — Acme ships the permission sets, the client composes roles from them
// ---------------------------------------------------------------------------

export function readRoles(): Role[] {
  return read(ROLES_KEY, ROLES)
}

export function useRoles(): Role[] {
  return useStore(ROLES_KEY, ROLES_EVENT, ROLES)
}

export function addRole(role: Role): void {
  write(ROLES_KEY, ROLES_EVENT, [...readRoles(), role])
}

export function updateRole(id: string, patch: Partial<Role>): void {
  write(
    ROLES_KEY,
    ROLES_EVENT,
    readRoles().map((r) => (r.id === id ? { ...r, ...patch } : r)),
  )
}

export function deleteRole(id: string): void {
  write(ROLES_KEY, ROLES_EVENT, readRoles().filter((r) => r.id !== id))
}

// ---------------------------------------------------------------------------

export function nowIso(): string {
  return new Date().toISOString().slice(0, 19)
}

export function nextId(prefix: string, existing: { id: string }[]): string {
  return `${prefix}_${String(existing.length + 1).padStart(2, '0')}${Math.abs(
    existing.reduce((h, g) => (h + g.id.length * 31) % 997, 7),
  )}`
}
