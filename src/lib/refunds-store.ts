import * as React from 'react'

export type RefundReviewer = {
  name: string
  actingAs: string
  at: string
}

export type SubmittedRefund = {
  id: string
  originalTxnId: string | null
  amount: string
  currency: string
  reason: string
  note: string
  receiverName: string
  receiverBic: string
  receiverAccount: string
  address: string
  city: string
  country: string
  requester: string
  submittedAt: string
  status: 'Pending approval' | 'Approved' | 'Rejected'
  reviewer?: RefundReviewer
}

const STORAGE_KEY = 'portal-mockup:submittedRefunds'

function readFromStorage(): SubmittedRefund[] {
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

function writeToStorage(items: SubmittedRefund[]): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('portal-mockup:refunds-updated'))
}

export function addRefund(refund: SubmittedRefund): void {
  const items = readFromStorage()
  items.unshift(refund)
  writeToStorage(items)
}

function formatReviewedAt(now: Date = new Date()): string {
  const month = now.toLocaleString('en-US', { month: 'short' })
  const day = now.getDate()
  const year = now.getFullYear()
  const hh = String(((now.getHours() + 11) % 12) + 1).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM'
  return `${month} ${day}, ${year} at ${hh}:${mm} ${ampm}`
}

function updateRefundStatus(
  id: string,
  status: 'Approved' | 'Rejected',
  reviewer: { name: string; actingAs: string },
): void {
  const items = readFromStorage()
  const next = items.map((r) =>
    r.id === id
      ? {
          ...r,
          status,
          reviewer: {
            name: reviewer.name,
            actingAs: reviewer.actingAs,
            at: formatReviewedAt(),
          },
        }
      : r,
  )
  writeToStorage(next)
}

export function approveRefund(
  id: string,
  reviewer: { name: string; actingAs: string },
): void {
  updateRefundStatus(id, 'Approved', reviewer)
}

export function rejectRefund(
  id: string,
  reviewer: { name: string; actingAs: string },
): void {
  updateRefundStatus(id, 'Rejected', reviewer)
}

export function useSubmittedRefunds(): SubmittedRefund[] {
  const [items, setItems] = React.useState<SubmittedRefund[]>(() =>
    readFromStorage(),
  )

  React.useEffect(() => {
    const handler = () => setItems(readFromStorage())
    window.addEventListener('portal-mockup:refunds-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('portal-mockup:refunds-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return items
}
