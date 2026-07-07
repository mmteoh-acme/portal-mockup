import * as React from 'react'
import type { UnprocessedRefund } from '@/data/fixtures'

// Session-scoped store of credit transactions an operator has flagged from
// the Transactions page — Reversals (refund reversal to a client) and Returns
// (bank-returned payment orders to resubmit). These surface in the Pending
// review tab on the Payments page.

const STORAGE_KEY = 'portal-mockup:unprocessedDeposits'
const EVENT = 'portal-mockup:unprocessed-deposits-updated'

function readFromStorage(): UnprocessedRefund[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToStorage(items: UnprocessedRefund[]): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(EVENT))
}

export function addUnprocessedDeposit(deposit: UnprocessedRefund): boolean {
  const items = readFromStorage()
  if (items.some((d) => d.originalTxnId === deposit.originalTxnId)) return false
  items.unshift(deposit)
  writeToStorage(items)
  return true
}

export function useUnprocessedDeposits(): UnprocessedRefund[] {
  const [items, setItems] = React.useState<UnprocessedRefund[]>(() =>
    readFromStorage(),
  )

  React.useEffect(() => {
    const handler = () => setItems(readFromStorage())
    window.addEventListener(EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return items
}
