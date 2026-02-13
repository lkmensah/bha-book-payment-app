import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PiggyBank, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type DashboardProps = {
  totalDue: number;
  totalReceived: number;
  totalOutstanding: number;
  onOutstandingClick?: () => void;
  isOutstandingFiltered?: boolean;
};

export function Dashboard({ totalDue, totalReceived, totalOutstanding, onOutstandingClick, isOutstandingFiltered }: DashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount Due</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalDue)}</div>
          <p className="text-xs text-muted-foreground">Total expected payments from all students</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount Received</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">{formatCurrency(totalReceived)}</div>
          <p className="text-xs text-muted-foreground">Total payments received to date</p>
        </CardContent>
      </Card>
      <Card 
        onClick={onOutstandingClick} 
        className={cn(
          "transition-colors", 
          onOutstandingClick && "cursor-pointer hover:bg-muted/50",
          isOutstandingFiltered && "ring-2 ring-destructive"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</div>
          <p className="text-xs text-muted-foreground">Total remaining payments</p>
        </CardContent>
      </Card>
    </div>
  );
}
