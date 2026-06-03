import * as React from 'react'

export type UserRole = 'MAKER' | 'CHECKER'
export type User = { name: string; email: string; role: UserRole }

const MAKER: User = {
  name: 'Ming Miin',
  email: 'ming@tryacme.com',
  role: 'MAKER',
}
const CHECKER: User = {
  name: 'Priya Lim',
  email: 'priya@tryacme.com',
  role: 'CHECKER',
}

const ALL_USERS: User[] = [MAKER, CHECKER]

const STORAGE_KEY = 'portal-mockup:activeRole'

type UserContextValue = {
  user: User
  setRole: (r: UserRole) => void
  allUsers: User[]
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined)

function readRoleFromStorage(): UserRole {
  if (typeof window === 'undefined') return 'MAKER'
  const v = window.sessionStorage.getItem(STORAGE_KEY)
  return v === 'CHECKER' ? 'CHECKER' : 'MAKER'
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<UserRole>(() => readRoleFromStorage())

  const setRole = React.useCallback((r: UserRole) => {
    setRoleState(r)
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, r)
  }, [])

  const user = role === 'CHECKER' ? CHECKER : MAKER

  const value = React.useMemo<UserContextValue>(
    () => ({ user, setRole, allUsers: ALL_USERS }),
    [user, setRole],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = React.useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
