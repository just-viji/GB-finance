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
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const { user, profile, isLoading } = useSupabase();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user) return;

      setLoadingData(true);
      const userId = user.id;

      const { data: salesData } = await supabase
        .from("sales")
        .select("amount")
        .eq("user_id", userId);

      const totalSales = (salesData || []).reduce(
        (sum, sale) => sum + (sale.amount || 0),
        0
      );

      const { data: expensesData } = await supabase
        .from("expense_transactions")
        .select("grand_total")
        .eq("user_id", userId);

      const totalExpenses = (expensesData || []).reduce(
        (sum, expense) => sum + (expense.grand_total || 0),
        0
      );

      setSummary({
        totalSales,
        totalExpenses,
        profit: totalSales - totalExpenses,
      });
      setLoadingData(false);
    };

    if (user) fetchFinancialData();
  }, [user]);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "User";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-8">
      {/* Header */}
      <header className="flex flex-col space-y-1">
        <h2 className="text-3xl font-semibold text-gray-900">
          Welcome, <span className="text-green-600">{displayName}</span> 👋
        </h2>
        <p className="text-gray-500 text-sm">
          Here’s your financial overview.
        </p>
      </header>

      {/* Quick Actions */}
      <QuickActions />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingData ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-gray-700 text-sm font-medium">
                  Total Sales
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-green-600">
                  {formatCurrencyINR(summary?.totalSales || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-gray-700 text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-red-600">
                  {formatCurrencyINR(summary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-gray-700 text-sm font-medium">
                  Net Profit
                </CardTitle>
                <Wallet className="h-5 w-5 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-semibold ${
                    summary && summary.profit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrencyINR(summary?.profit || 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart Section */}
      <section>
        {loadingData ? (
          <Card className="border-gray-200 shadow-sm rounded-2xl">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <DashboardChart />
        )}
      </section>

      {/* Recent Transactions */}
      <section>
        {loadingData ? (
          <Card className="border-gray-200 shadow-sm rounded-2xl">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <DashboardRecentTransactions />
        )}
      </section>

      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;