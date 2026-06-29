import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('ming@tryacme.com')
  const [password, setPassword] = React.useState('demo')

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground">
            A
          </div>
          <span className="font-semibold">Acme</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">
                Sign in to your account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email and password to continue.
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                navigate({ to: '/select-entity' })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
            <div className="mt-6 text-sm">
              <a className="font-medium underline underline-offset-4">
                Forgot password? Set up or reset
              </a>
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
              Access is limited to invited client users.
            </p>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-md p-10">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Acme External Portal
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Self-serve ops for deposits, withdrawals, refunds, and
              reconciliation.
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}
