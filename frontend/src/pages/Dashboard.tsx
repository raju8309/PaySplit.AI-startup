import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { downloadExpensesCsv, downloadPaymentsCsv } from "@/lib/api";
import { useAnalyticsSummary, useMonthlySpend, usePaymentsByStatus, useRecentActivity } from "@/hooks/useAnalytics";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

function centsToUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

export default function Dashboard() {
  const summaryQ = useAnalyticsSummary();
  const monthlyQ = useMonthlySpend(6);
  const statusQ = usePaymentsByStatus();
  const activityQ = useRecentActivity(10);

  const monthlyData =
    monthlyQ.data?.points?.map((p) => ({
      month: p.month,
      total: Math.round((p.total_cents || 0) / 100),
    })) ?? [];

  const statusData =
    statusQ.data?.breakdown?.map((b) => ({
      name: b.status,
      value: b.count,
    })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">At-a-glance stats and recent activity.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadExpensesCsv()}>
            Export Expenses CSV
          </Button>
          <Button variant="outline" onClick={() => downloadPaymentsCsv()}>
            Export Payments CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQ.isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-semibold">{summaryQ.data?.total_groups ?? 0}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQ.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-semibold">{summaryQ.data?.total_expenses_count ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {centsToUsd(summaryQ.data?.total_expenses_amount_cents ?? 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQ.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-semibold">{summaryQ.data?.total_payments_count ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Paid: {centsToUsd(summaryQ.data?.total_payments_paid_cents ?? 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Payments Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusQ.isLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <div className="text-sm">
                {(statusQ.data?.breakdown ?? []).map((b) => (
                  <div key={b.status} className="flex justify-between">
                    <span className="capitalize">{b.status}</span>
                    <span className="font-medium">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="h-[320px]">
          <CardHeader>
            <CardTitle>Monthly Spend</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            {monthlyQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="h-[320px]">
          <CardHeader>
            <CardTitle>Payments by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center">
            {statusQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : statusData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No payments found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusData.map((_, idx) => (
                      <Cell key={idx} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityQ.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-4/6" />
            </div>
          ) : (activityQ.data?.items?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="space-y-3">
              {activityQ.data!.items.map((item) => (
                <div key={`${item.type}-${item.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">
                        <span className="capitalize">{item.type}</span>: {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{centsToUsd(item.amount_cents)}</div>
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}