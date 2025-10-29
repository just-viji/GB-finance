import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSupabase } from "@/integrations/supabase/supabaseContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, TrendingUp } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardRecentTransactions from "@/components/DashboardRecentTransactions";
import DashboardChart from "@/components/DashboardChart"; // Import the new chart component
import FloatingActionButton from "@/components/FloatingActionButton"; // Import the new floating action button
import { formatCurrencyINR } from "@/lib/currency";
import { motion } from 'framer-motion';

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const { user, isLoading } = useSupabase();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user) return;

      setLoadingData(true);
      const userId = user.id;

      // Fetch total sales
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

      // Fetch total expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('total')
        .eq('user_id', userId);

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        setLoadingData(false);
        return;
      }

      const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.total || 0), 0);

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
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">Loading data...</div>;
  }

  return (
    <div className="flex flex-col bg-gray-900 text-gray-100 p-4 min-h-screen">
      <div className="flex-grow container mx-auto max-w-4xl">
        <DashboardHeader />

        {/* Profit Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 gap-4 mb-6"
        >
          <Card className="bg-gray-800 text-gray-100 shadow-neon-green-sm rounded-lg border border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Profit</CardTitle>
              <Plus className="h-4 w-4 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${summary && summary.profit >= 0 ? 'text-neon-green' : 'text-destructive'} drop-shadow-md`}>
                {formatCurrencyINR(summary?.profit || 0)}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Sales and Total Expenses Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="bg-gray-800 text-gray-100 shadow-neon-green-sm rounded-lg border border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-neon-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neon-green drop-shadow-md">
                  {formatCurrencyINR(summary?.totalSales || 0)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card className="bg-gray-800 text-gray-100 shadow-neon-green-sm rounded-lg border border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Expenses</CardTitle>
                <Minus className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive drop-shadow-md">
                  {formatCurrencyINR(summary?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Daily Sales vs. Expenses Chart */}
        <DashboardChart />

        {/* Recent Transactions List */}
        <DashboardRecentTransactions />
      </div>
      <MadeWithDyad />
      <FloatingActionButton />
    </div>
  );
};

export default Dashboard;