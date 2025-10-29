import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, subDays } from 'date-fns';
import { showError } from '@/utils/toast';
import { formatCurrencyINR } from '@/lib/currency';

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
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('date, amount')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo);

      if (salesError) {
        showError("Failed to fetch sales data for chart.");
        setLoadingChart(false);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('date, total')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgo);

      if (expensesError) {
        showError("Failed to fetch expenses data for chart.");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Sales vs. Expenses (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingChart ? (
          <p className="text-center text-muted-foreground">Loading chart data...</p>
        ) : chartData.length === 0 ? (
          <p className="text-center text-muted-foreground">No data available for the last 7 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => formatCurrencyINR(value)} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
                formatter={(value: number) => formatCurrencyINR(value)}
              />
              <Legend />
              <Bar dataKey="sales" fill="#22c55e" name="Sales" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardChart;