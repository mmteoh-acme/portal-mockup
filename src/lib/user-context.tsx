import * as React from 'react'
import type { PermissionSet } from '@/data/fixtures'

// Who you are signed in as. There are no roles: a user is granted one of
// Acme's permission sets, and four-eyes falls out of the catalogue — an
// administrator creates and edits payments but cannot approve, an approver
// can approve but holds no admin permissions (ACME-2178).
export type User = {
  name: string
  email: string
  permissionSet: PermissionSet
}

const ADMINISTRATOR: User = {
  name: 'Ming Miin',
  email: 'ming@tryacme.com',
  permissionSet: 'administrator',
}
const APPROVER: User = {
  name: 'Priya Lim',
  email: 'priya@tryacme.com',
  permissionSet: 'approver',
}

const ALL_USERS: User[] = [ADMINISTRATOR, APPROVER]

const STORAGE_KEY = 'portal-mockup:activePermissionSet'

type UserContextValue = {
  user: User
  setPermissionSet: (s: PermissionSet) => void
  allUsers: User[]
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined)

function readFromStorage(): PermissionSet {
  if (typeof window === 'undefined') return 'administrator'
  const v = window.sessionStorage.getItem(STORAGE_KEY)
  return v === 'approver' ? 'approver' : 'administrator'
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [permissionSet, setState] = React.useState<PermissionSet>(() =>
    readFromStorage(),
  )

  const setPermissionSet = React.useCallback((s: PermissionSet) => {
    setState(s)
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, s)
  }, [])

  const user = permissionSet === 'approver' ? APPROVER : ADMINISTRATOR

  const value = React.useMemo<UserContextValue>(
    () => ({ user, setPermissionSet, allUsers: ALL_USERS }),
    [user, setPermissionSet],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = React.useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
