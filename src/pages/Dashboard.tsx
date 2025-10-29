import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSupabase } from "@/integrations/supabase/supabaseContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Minus, TrendingUp, LogOut, User } from "lucide-react"; // Import User icon

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

const Dashboard = () => {
  const { user, isLoading } = useSupabase();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const fetchFinancialSummary = async () => {
      if (!user) return;

      setLoadingSummary(true);
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
      setLoadingSummary(false);
    };

    if (user) {
      fetchFinancialSummary();
    } else if (!isLoading) {
      setLoadingSummary(false);
    }
  }, [user, isLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading || loadingSummary) {
    return <div className="min-h-screen flex items-center justify-center">Loading data...</div>;
  }

  const chartData = [
    { name: 'Sales', value: summary?.totalSales || 0, fill: '#0C9C59' },
    { name: 'Expenses', value: summary?.totalExpenses || 0, fill: '#EF4444' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 p-4">
      <div className="flex-grow container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-green-700 dark:text-green-400">GB Finance Dashboard</h1>
          <div className="flex space-x-2">
            <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" /> Profile
            </Button>
            <Button onClick={handleLogout} variant="destructive" size="sm">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                ${summary?.totalSales.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses</CardTitle>
              <Minus className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${summary?.totalExpenses.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Profit</CardTitle>
              <Plus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary && summary.profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                ${summary?.profit.toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6 p-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Sales vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#888888" />
                <YAxis stroke="#888888" />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button onClick={() => navigate('/add-sale')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-lg flex items-center justify-center">
            <Plus className="h-5 w-5 mr-2" /> Add Sale
          </Button>
          <Button onClick={() => navigate('/add-expense')} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg text-lg flex items-center justify-center">
            <Minus className="h-5 w-5 mr-2" /> Add Expense
          </Button>
          <Button onClick={() => navigate('/reports')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 mr-2" /> Reports
          </Button>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;