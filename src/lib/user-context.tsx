import * as React from 'react'
import {
  getPortalUser,
  permissionsForUser,
  portalUsers,
  rolesForUserGroup,
  userGroupsForUser,
  type Permission,
  type PortalUser,
  type Role,
} from '@/data/fixtures'
import { useUserGroups } from '@/lib/admin-store'

// Who you are signed in as. A user holds no permissions of their own: they
// belong to groups, groups grant roles, roles bundle permission sets, and
// permission sets hold permissions. Everything below is derived from the
// group membership, so editing a group in the UI changes what this user can
// do (ACME-2178).

// Personas the mockup can switch between, from the ACME-2178 worked example:
// the seeded administrator, a regional payment operator, and the finance
// controller who approves.
const DEMO_USER_IDS = ['usr_etam', 'usr_sw', 'usr_fc']

const STORAGE_KEY = 'portal-mockup:activeUserId'

type UserContextValue = {
  user: PortalUser
  roles: Role[]
  permissions: Permission[]
  can: (permissionKey: string) => boolean
  setUserId: (id: string) => void
  demoUsers: PortalUser[]
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined)

function readFromStorage(): string {
  if (typeof window === 'undefined') return DEMO_USER_IDS[0]
  const v = window.sessionStorage.getItem(STORAGE_KEY)
  return v && DEMO_USER_IDS.includes(v) ? v : DEMO_USER_IDS[0]
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const userGroups = useUserGroups()
  const [userId, setUserIdState] = React.useState<string>(() =>
    readFromStorage(),
  )

  const setUserId = React.useCallback((id: string) => {
    setUserIdState(id)
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, id)
  }, [])

  const user = getPortalUser(userId) ?? portalUsers[0]

  const value = React.useMemo<UserContextValue>(() => {
    const permissions = permissionsForUser(user.id, userGroups)
    const roles = userGroupsForUser(user.id, userGroups).flatMap((g) =>
      rolesForUserGroup(g),
    )
    return {
      user,
      roles,
      permissions,
      can: (key: string) => permissions.some((p) => p.key === key),
      setUserId,
      demoUsers: DEMO_USER_IDS.map((id) => getPortalUser(id)).filter(
        (u): u is PortalUser => !!u,
      ),
    }
  }, [user, userGroups, setUserId])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = React.useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
