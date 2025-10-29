import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSupabase } from "@/integrations/supabase/supabaseContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, TrendingUp } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader"; // Import the new DashboardHeader

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
    return <div className="min-h-screen flex items-center justify-center">Loading data...</div>;
  }

  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
      <div className="flex-grow container mx-auto max-w-4xl">
        <DashboardHeader /> {/* Use the new DashboardHeader component */}

        {/* Profit Card */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Profit</CardTitle>
              <Plus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary && summary.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${summary?.profit.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Sales and Total Expenses Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${summary?.totalSales.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses</CardTitle>
              <Minus className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ${summary?.totalExpenses.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View All Transactions Button */}
        <div className="flex justify-center mt-6">
          <Button onClick={() => navigate('/reports')} className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 mr-2" /> View All Transactions
          </Button>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;