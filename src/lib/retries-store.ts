import * as React from 'react'

export type RetryReviewer = {
  name: string
  actingAs: string
  at: string
}

export type SubmittedRetry = {
  id: string
  originalPaymentId: string
  amount: string
  currency: string
  receiverName: string
  receiverBankBic: string
  receiverAccountNumber: string
  receiverLocalRoutingIdentifier: string
  type: string
  notes: string
  requester: string
  submittedAt: string
  status: 'Pending approval' | 'Approved' | 'Rejected'
  reviewer?: RetryReviewer
  // What kind of payment request this is — retries, new payments, and
  // exception processing (returns/reversals) all flow through this store.
  kind?: 'retry' | 'payment' | 'return' | 'reversal'
  purpose?: string
  customerReference?: string
  returnReason?: string
}

const STORAGE_KEY = 'portal-mockup:submittedRetries'

function readFromStorage(): SubmittedRetry[] {
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

function writeToStorage(items: SubmittedRetry[]): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('portal-mockup:retries-updated'))
}

export function addRetry(retry: SubmittedRetry): void {
  const items = readFromStorage()
  items.unshift(retry)
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

function updateRetryStatus(
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

export function approveRetry(
  id: string,
  reviewer: { name: string; actingAs: string },
): void {
  updateRetryStatus(id, 'Approved', reviewer)
}

export function rejectRetry(
  id: string,
  reviewer: { name: string; actingAs: string },
): void {
  updateRetryStatus(id, 'Rejected', reviewer)
}

export function useSubmittedRetries(): SubmittedRetry[] {
  const [items, setItems] = React.useState<SubmittedRetry[]>(() =>
    readFromStorage(),
  )

  React.useEffect(() => {
    const handler = () => setItems(readFromStorage())
    window.addEventListener('portal-mockup:retries-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('portal-mockup:retries-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return items
}
