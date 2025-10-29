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

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const { user, isLoading } = useSupabase();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [displayName, setDisplayName] = useState<string>('Guest');

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user) return;

      setLoadingData(true);
      const userId = user.id;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        const name = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ');
        setDisplayName(name || user.email || 'User');
      } else {
        setDisplayName(user.email || 'User');
      }

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

  if (isLoading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center">Loading data...</div>;
  }

  return (
    <div className="flex flex-col space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-foreground">Welcome, {displayName}!</h2>
        <p className="text-muted-foreground">Here's your financial overview.</p>
      </header>

      <QuickActions />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <DashboardChart />
      <DashboardRecentTransactions />
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;