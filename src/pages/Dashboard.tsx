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

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("amount")
        .eq("user_id", userId);

      if (salesError) {
        console.error("Error fetching sales:", salesError);
        setLoadingData(false);
        return;
      }
      const totalSales = salesData.reduce((sum, sale) => sum + (sale.amount || 0), 0);

      const { data: expensesData, error: expensesError } = await supabase
        .from("expense_transactions")
        .select("grand_total")
        .eq("user_id", userId);

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        setLoadingData(false);
        return;
      }
      const totalExpenses = expensesData.reduce(
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
    else if (!isLoading) setLoadingData(false);
  }, [user, isLoading]);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "User";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Loading authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 space-y-8">
      {/* Header */}
      <header className="text-center">
        <h2 className="text-3xl font-extrabold text-green-500">
          Welcome, {displayName}!
        </h2>
        <p className="text-gray-400 mt-1">
          Here's your financial overview.
        </p>
      </header>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-lg">
        <QuickActions />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingData ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl shadow-lg"
              >
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
            {/* Sales */}
            <Card className="bg-white/5 border border-green-500 rounded-2xl shadow-md hover:shadow-green-700/30 transition">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Total Sales
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrencyINR(summary?.totalSales || 0)}
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="bg-white/5 border border-red-500 rounded-2xl shadow-md hover:shadow-red-700/30 transition">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrencyINR(summary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            {/* Profit */}
            <Card className="bg-white/5 border border-blue-500 rounded-2xl shadow-md hover:shadow-blue-700/30 transition">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Net Profit
                </CardTitle>
                <Wallet className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary && summary.profit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrencyINR(summary?.profit || 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg">
        {loadingData ? (
          <>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </>
        ) : (
          <DashboardChart />
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg">
        {loadingData ? (
          <>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-16 w-full mb-2" />
            <Skeleton className="h-16 w-full mb-2" />
          </>
        ) : (
          <DashboardRecentTransactions />
        )}
      </div>

      <div className="pt-6">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Dashboard;
