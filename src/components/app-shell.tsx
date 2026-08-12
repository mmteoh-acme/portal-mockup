import { Outlet, useRouterState } from '@tanstack/react-router'
import { BellIcon, WrenchIcon, LayersIcon } from 'lucide-react'
import { AppSidebar } from './app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Link } from '@tanstack/react-router'
import { CLIENT_GROUP, accountsOutsideEveryGroup } from '@/data/fixtures'
import { useUserGroups } from '@/lib/admin-store'

type Notification = {
  id: string
  title: string
  body: string
  window: string
  tone: 'warning' | 'info'
}

const DOWNTIME_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf_ocbc_collection',
    title: 'OCBC MY — Collection API maintenance',
    body: 'Collection APIs may return 503 errors during this window.',
    window: '28 Jun 2026 · 12:00AM–8:00AM SGT',
    tone: 'warning',
  },
  {
    id: 'ntf_dbs_fast',
    title: 'DBS SG — FAST rail maintenance',
    body: 'Outbound FAST payments may be delayed.',
    window: '30 Jun 2026 · 1:00AM–3:00AM SGT',
    tone: 'info',
  },
]

function NotificationBell() {
  // New accounts land outside every account group, which means nobody but an
  // admin can see them. Surface that here so it can't go unnoticed.
  const userGroups = useUserGroups()
  const unassigned = accountsOutsideEveryGroup(userGroups)
  const count = DOWNTIME_NOTIFICATIONS.length + (unassigned.length > 0 ? 1 : 0)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={`Notifications (${count})`}
        >
          <BellIcon className="size-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[0.6rem] font-medium text-white">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">Notifications</div>
          <p className="text-xs text-muted-foreground">
            Account assignment and scheduled downtime
          </p>
        </div>
        <div className="divide-y">
          {unassigned.length > 0 && (
            <Link
              to="/user-management"
              className="flex gap-3 px-4 py-3 hover:bg-muted/50"
            >
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700">
                <LayersIcon className="size-3.5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-medium leading-snug">
                  {unassigned.length} account
                  {unassigned.length === 1 ? '' : 's'} outside every group
                </div>
                <div className="text-xs text-muted-foreground">
                  An account inside no group's scope is invisible to everyone.
                  Put it in a group's scope.
                </div>
                <div className="text-[0.7rem] font-medium text-foreground/70">
                  Review in User Management →
                </div>
              </div>
            </Link>
          )}
          {DOWNTIME_NOTIFICATIONS.map((n) => (
            <div key={n.id} className="flex gap-3 px-4 py-3">
              <div
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${
                  n.tone === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <WrenchIcon className="size-3.5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-medium leading-snug">
                  {n.title}
                </div>
                <div className="text-xs text-muted-foreground">{n.body}</div>
                <div className="text-[0.7rem] font-medium text-foreground/70">
                  {n.window}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Home',
  '/transactions': 'Transactions',
  '/payments': 'Payments',
  '/internal-accounts': 'Internal Accounts',
  '/account-groups': 'Account Groups',
  '/user-management': 'User Management',
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = PAGE_TITLES[pathname] ?? 'Acme'

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink className="text-xs uppercase tracking-wider">
                  {CLIENT_GROUP.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs uppercase tracking-wider">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
