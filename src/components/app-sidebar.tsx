import {
  HomeIcon,
  KeyRoundIcon,
  LandmarkIcon,
  WebhookIcon,
  ArrowLeftRightIcon,
  WalletIcon,
  UserRoundIcon,
  ActivityIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  CheckIcon,
} from 'lucide-react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useEntity } from '@/lib/entity-context'
import { useUser } from '@/lib/user-context'

type NavItem = {
  title: string
  icon: typeof HomeIcon
  to: string
}

const HOME: NavItem = { title: 'Home', icon: HomeIcon, to: '/dashboard' }

const OPERATIONS: ReadonlyArray<NavItem> = [
  { title: 'Transactions', icon: ArrowLeftRightIcon, to: '/transactions' },
  { title: 'Payments', icon: WalletIcon, to: '/payments' },
]

const ADMIN: ReadonlyArray<NavItem> = [
  { title: 'Internal Accounts', icon: LandmarkIcon, to: '/internal-accounts' },
  { title: 'API Keys', icon: KeyRoundIcon, to: '/api-keys' },
  { title: 'Webhooks', icon: WebhookIcon, to: '/webhooks' },
  { title: 'Users', icon: UserRoundIcon, to: '/users' },
  { title: 'Activity', icon: ActivityIcon, to: '/activity' },
]

function NavLink({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const isActive =
    pathname === item.to ||
    (item.to !== '/dashboard' && pathname.startsWith(item.to))
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={cn(
          'h-10 rounded-lg px-3 text-[0.95rem] font-normal text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground',
          '[&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:stroke-[1.5] [&>svg]:text-muted-foreground',
          'data-[active=true]:bg-[#EEF2FF] data-[active=true]:font-medium data-[active=true]:text-[#1447E6]',
          'data-[active=true]:[&>svg]:text-[#1447E6]',
          'data-[active=true]:hover:bg-[#EEF2FF] data-[active=true]:hover:text-[#1447E6]',
        )}
      >
        <Link to={item.to} className="gap-3">
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { entity, entities, setEntityId } = useEntity()
  const { user, setRole, allUsers } = useUser()
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground">
                    A
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {entity?.name ?? 'Select entity'}
                    </span>
                    <span className="truncate text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      Acme
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="bottom"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-64"
              >
                <DropdownMenuLabel className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Entities · Acme
                </DropdownMenuLabel>
                {entities.map((e) => {
                  const active = e.id === entity?.id
                  return (
                    <DropdownMenuItem
                      key={e.id}
                      onClick={() => setEntityId(e.id)}
                    >
                      <div className="flex aspect-square size-6 items-center justify-center rounded-sm border bg-muted text-[10px] font-semibold">
                        {e.name
                          .replace('Acme ', '')
                          .split(' ')
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 truncate">{e.name}</div>
                      {active && (
                        <CheckIcon className="ml-2 size-4 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: '/select-entity' })}>
                  View all entities
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavLink item={HOME} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {OPERATIONS.map((item) => (
                <NavLink key={item.title} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN.map((item) => (
                <NavLink key={item.title} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 rounded-md">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.name}
                    </span>
                    <span className="truncate text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      {user.role}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-64"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Switch role
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {allUsers.map((u) => {
                    const active = u.role === user.role
                    return (
                      <DropdownMenuItem
                        key={u.role}
                        onClick={() => setRole(u.role)}
                      >
                        <div className="flex aspect-square size-6 items-center justify-center rounded-sm border bg-muted text-[10px] font-semibold">
                          {u.name
                            .split(' ')
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="flex flex-1 flex-col leading-tight">
                          <span className="truncate text-sm">{u.name}</span>
                          <span className="truncate text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                            {u.role}
                          </span>
                        </div>
                        {active && (
                          <CheckIcon className="ml-2 size-4 text-muted-foreground" />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setEntityId(null)
                    navigate({ to: '/login' })
                  }}
                >
                  <LogOutIcon /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
