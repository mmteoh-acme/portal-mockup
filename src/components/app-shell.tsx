import * as React from 'react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { AppSidebar } from './app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useEntity } from '@/lib/entity-context'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Home',
  '/transactions': 'Transactions',
  '/payments': 'Payments',
  '/internal-accounts': 'Internal Accounts',
  '/api-keys': 'API Keys',
  '/webhooks': 'Webhooks',
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = PAGE_TITLES[pathname] ?? 'Acme'
  const { entity } = useEntity()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!entity) {
      navigate({ to: '/select-entity', replace: true })
    }
  }, [entity, navigate])

  if (!entity) return null

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
                  {entity.name}
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
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
