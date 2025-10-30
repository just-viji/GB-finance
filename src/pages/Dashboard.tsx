import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSupabase } from "@/integrations/supabase/supabaseContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import DashboardRecentTransactions from "@/components/DashboardRecentTransactions";
import DashboardChart from "@/components/DashboardChart";
import QuickActions from "@/components/QuickActions";
import { formatCurrencyINR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const { user, profile, isLoading } = useSupabase(); // Get profile from context
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user) return;

      setLoadingData(true);
      const userId = user.id;

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('amount')
        .eq('user_id', userId);

      if (salesError) {
        console.error("Error fetching sales:", salesError);
        setLoadingData(false);
        return;
      }
      const totalSales = salesData.reduce((sum, sale) => sum + (sale.amount || 0), 0);

      const { data: expensesData, error: expensesError } = await supabase
        .from('expense_transactions')
        .select('grand_total')
        .eq('user_id', userId);

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        setLoadingData(false);
        return;
      }
      const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.grand_total || 0), 0);

      setSummary({
        totalSales,
        totalExpenses,
        profit: totalSales - totalExpenses,
      });
      setLoadingData(false);
    };

    if (user) {
      fetchFinancialData();
    } else if (!isLoading) {
      setLoadingData(false);
    }
  }, [user, isLoading]);

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || 'User';

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  return (
    <div className="flex flex-col space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-foreground">Welcome, {displayName}!</h2>
        <p className="text-muted-foreground">Here's your financial overview.</p>
      </header>

      <QuickActions />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingData ? (
          <>
            <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrencyINR(summary?.totalSales || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrencyINR(summary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary && summary.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrencyINR(summary?.profit || 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {loadingData ? (
        <Card>
          <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      ) : (
        <DashboardChart />
      )}
      
      {loadingData ? (
        <Card>
          <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : (
        <DashboardRecentTransactions />
      )}
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;