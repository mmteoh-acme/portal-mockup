import * as React from 'react'
import { COMPANY, getEntity, type Entity } from '@/data/fixtures'

type EntityContextValue = {
  entityId: string | null
  entity: Entity | null
  setEntityId: (id: string | null) => void
  entities: Entity[]
}

const EntityContext = React.createContext<EntityContextValue | undefined>(
  undefined,
)

const STORAGE_KEY = 'portal-mockup:selectedEntityId'

export function EntityProvider({ children }: { children: React.ReactNode }) {
  const [entityId, setEntityIdState] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.sessionStorage.getItem(STORAGE_KEY)
  })

  const setEntityId = React.useCallback((id: string | null) => {
    setEntityIdState(id)
    if (typeof window === 'undefined') return
    if (id) window.sessionStorage.setItem(STORAGE_KEY, id)
    else window.sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const entity = entityId ? getEntity(entityId) ?? null : null

  const value = React.useMemo<EntityContextValue>(
    () => ({
      entityId,
      entity,
      setEntityId,
      entities: COMPANY.entities,
    }),
    [entityId, entity, setEntityId],
  )

  return (
    <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
  )
}

export function useEntity() {
  const ctx = React.useContext(EntityContext)
  if (!ctx) {
    throw new Error('useEntity must be used inside EntityProvider')
  }
  return ctx
}
