import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Mono, StatusPill } from '@/components/mono'
import { webhooks } from '@/data/fixtures'

export function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Endpoints that receive Acme event deliveries.
          </p>
        </div>
        <Button>Add endpoint</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>2 endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[0.7rem] uppercase tracking-wider">
                  URL
                </TableHead>
                <TableHead className="text-[0.7rem] uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-[0.7rem] uppercase tracking-wider">
                  Last delivery
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Mono>{w.url}</Mono>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={w.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {w.lastDelivery}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
