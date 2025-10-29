import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, subDays } from 'date-fns';
import { showError } from '@/utils/toast';
import { formatCurrencyINR } from '@/lib/currency';
import { motion } from 'framer-motion';

interface DailyData {
  date: string;
  sales: number;
  expenses: number;
}

const DashboardChart = () => {
  const { user, isLoading } = useSupabase();
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!user) return;

      setLoadingChart(true);
      const userId = user.id;
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd'); // Data for the last 7 days

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('date, amount')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo);

      if (salesError) {
        console.error("Error fetching sales for chart:", salesError);
        showError("Failed to fetch sales data for chart: " + salesError.message);
        setLoadingChart(false);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('date, total')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo);

      if (expensesError) {
        console.error("Error fetching expenses for chart:", expensesError);
        showError("Failed to fetch expenses data for chart: " + expensesError.message);
        setLoadingChart(false);
        return;
      }

      const dailyMap = new Map<string, { sales: number; expenses: number }>();
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
        dailyMap.set(date, { sales: 0, expenses: 0 });
      }

      salesData.forEach(sale => {
        const date = sale.date;
        if (dailyMap.has(date)) {
          dailyMap.get(date)!.sales += sale.amount;
        }
      });

      expensesData.forEach(expense => {
        const date = expense.date;
        if (dailyMap.has(date)) {
          dailyMap.get(date)!.expenses += expense.total;
        }
      });

      const formattedData: DailyData[] = Array.from(dailyMap.entries())
        .map(([date, totals]) => ({
          date: format(parseISO(date), 'MMM dd'),
          sales: totals.sales,
          expenses: totals.expenses,
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

      setChartData(formattedData);
      setLoadingChart(false);
    };

    if (user) {
      fetchChartData();
    } else if (!isLoading) {
      setLoadingChart(false);
    }
  }, [user, isLoading]);

  if (loadingChart) {
    return (
      <Card className="w-full mb-6 bg-gray-800 text-gray-100 shadow-md rounded-lg border border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daily Sales vs. Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400">Loading chart data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="w-full mb-6 bg-gray-800 text-gray-100 shadow-md rounded-lg border border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daily Sales vs. Expenses (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-gray-400">No data available for the last 7 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrencyINR(value)} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(value: number) => formatCurrencyINR(value)}
                />
                <Bar dataKey="sales" fill="hsl(var(--neon-green))" name="Sales" />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardChart;