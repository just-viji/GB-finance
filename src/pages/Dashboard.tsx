import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSupabase } from "@/integrations/supabase/supabaseContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Sparkles } from "lucide-react";
import DashboardRecentTransactions from "@/components/DashboardRecentTransactions";
import DashboardChart from "@/components/DashboardChart";
import QuickActions from "@/components/QuickActions";
import { formatCurrencyINR } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const { user, profile, isLoading } = useSupabase();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

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

      // Check if user is new (no sales or expenses)
      if (totalSales === 0 && totalExpenses === 0) {
        setIsNewUser(true);
      }

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

      {/* Welcome message for new users */}
      {isNewUser && (
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="h-8 w-8 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-2">Welcome to GB Finance!</h3>
                <p className="mb-4">
                  It looks like you're new here. Start by adding your first sale or expense to begin tracking your finances.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate('/add-sale')}
                  >
                    Add First Sale
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate('/add-expense')}
                  >
                    Add First Expense
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <CardHeader className="flex justify-between items-center p-4 pb-2">
                <CardTitle className="text-gray-700 text-sm font-medium">
                  Total Sales
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-semibold text-green-600">
                  {formatCurrencyINR(summary?.totalSales || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="flex justify-between items-center p-4 pb-2">
                <CardTitle className="text-gray-700 text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-semibold text-red-600">
                  {formatCurrencyINR(summary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="flex justify-between items-center p-4 pb-2">
                <CardTitle className="text-gray-700 text-sm font-medium">
                  Net Profit
                </CardTitle>
                <Wallet className="h-5 w-5 text-gray-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div
                  className={`text-xl font-semibold ${
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