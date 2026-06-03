import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { LoginPage } from '@/routes/login'
import { SelectEntityPage } from '@/routes/select-entity'
import { DashboardPage } from '@/routes/dashboard'
import { TransactionsPage } from '@/routes/transactions'
import { PaymentsPage } from '@/routes/payments'
import { InternalAccountsPage } from '@/routes/internal-accounts'
import { ApiKeysPage } from '@/routes/api-keys'
import { WebhooksPage } from '@/routes/webhooks'
import { UsersPage } from '@/routes/users'
import { ActivityPage } from '@/routes/activity'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/login' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const selectEntityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/select-entity',
  component: SelectEntityPage,
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const transactionsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/transactions',
  component: TransactionsPage,
})

const paymentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/payments',
  component: PaymentsPage,
  validateSearch: (
    raw: Record<string, unknown>,
  ): { action?: string; txnId?: string; paymentId?: string } => ({
    action: typeof raw.action === 'string' ? raw.action : undefined,
    txnId: typeof raw.txnId === 'string' ? raw.txnId : undefined,
    paymentId: typeof raw.paymentId === 'string' ? raw.paymentId : undefined,
  }),
})

const internalAccountsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/internal-accounts',
  component: InternalAccountsPage,
})

const apiKeysRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/api-keys',
  component: ApiKeysPage,
})

const webhooksRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/webhooks',
  component: WebhooksPage,
})

const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/users',
  component: UsersPage,
})

const activityRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/activity',
  component: ActivityPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  selectEntityRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    transactionsRoute,
    paymentsRoute,
    internalAccountsRoute,
    apiKeysRoute,
    webhooksRoute,
    usersRoute,
    activityRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
