import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadExpensesCsv, downloadPaymentsCsv } from "@/lib/api";

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">Download reports.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadExpensesCsv()}>
            Download Expenses CSV
          </Button>
          <Button variant="outline" onClick={() => downloadPaymentsCsv()}>
            Download Payments CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}