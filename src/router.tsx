import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { LoginPage } from '@/routes/login'
import { TransactionsPage } from '@/routes/transactions'
import { PaymentsPage } from '@/routes/payments'
import { AccountsPage } from '@/routes/accounts'
import { UserManagementPage } from '@/routes/user-management'

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

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
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
})

const accountsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/accounts',
  component: AccountsPage,
})

const userManagementRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/user-management',
  component: UserManagementPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appLayoutRoute.addChildren([
    transactionsRoute,
    paymentsRoute,
    accountsRoute,
    userManagementRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
