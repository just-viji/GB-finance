import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardTransactionListItem from './DashboardTransactionListItem';
import { format, subDays, subWeeks, subMonths, isAfter, parseISO } from 'date-fns';
import { showError } from '@/utils/toast';
import { motion } from 'framer-motion';

interface Sale {
  id: string;
  date: string;
  item: string;
  category: string;
  amount: number;
  payment_type: string;
}

interface Expense {
  id: string;
  date: string;
  item_name: string;
  total: number;
  payment_mode: string;
}

type Transaction = (Sale & { type: 'sale' }) | (Expense & { type: 'expense' });

const DashboardRecentTransactions = () => {
  const { user, isLoading } = useSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!user) return;

      setLoadingTransactions(true);
      const userId = user.id;

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, date, item, category, amount, payment_type')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50); // Fetch a reasonable number to filter client-side

      if (salesError) {
        console.error("Error fetching recent sales:", salesError);
        showError("Failed to fetch recent sales: " + salesError.message);
        setLoadingTransactions(false);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, date, item_name, total, payment_mode')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50); // Fetch a reasonable number to filter client-side

      if (expensesError) {
        console.error("Error fetching recent expenses:", expensesError);
        showError("Failed to fetch recent expenses: " + expensesError.message);
        setLoadingTransactions(false);
        return;
      }

      const allTransactions: Transaction[] = [
        ...(salesData || []).map(sale => ({ ...sale, type: 'sale' as const })),
        ...(expensesData || []).map(expense => ({ ...expense, type: 'expense' as const, item: expense.item_name, amount: expense.total })),
      ];

      // Sort all transactions by date in descending order
      allTransactions.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

      setTransactions(allTransactions);
      setLoadingTransactions(false);
    };

    if (user) {
      fetchRecentTransactions();
    } else if (!isLoading) {
      setLoadingTransactions(false);
    }
  }, [user, isLoading]);

  const filterTransactions = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let cutoffDate: Date;

    if (period === 'daily') {
      cutoffDate = subDays(now, 1); // Last 24 hours
    } else if (period === 'weekly') {
      cutoffDate = subWeeks(now, 1); // Last 7 days
    } else { // 'monthly'
      cutoffDate = subMonths(now, 1); // Last 30 days
    }

    return transactions.filter(tx => isAfter(parseISO(tx.date), cutoffDate));
  };

  const displayedTransactions = filterTransactions(activeTab);

  if (loadingTransactions) {
    return (
      <Card className="w-full mb-6 bg-gray-800 text-gray-100 shadow-md rounded-lg border border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400">Loading recent transactions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.0 }}
    >
      <Card className="w-full mb-6 bg-gray-800 text-gray-100 shadow-md rounded-lg border border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full" onValueChange={(value) => setActiveTab(value as 'daily' | 'weekly' | 'monthly')}>
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-gray-700 text-gray-300">
              <TabsTrigger value="daily" className="data-[state=active]:bg-neon-green data-[state=active]:text-primary-foreground">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-neon-green data-[state=active]:text-primary-foreground">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="data-[state=active]:bg-neon-green data-[state=active]:text-primary-foreground">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              {displayedTransactions.length === 0 ? (
                <p className="text-center text-gray-400">No transactions for this period.</p>
              ) : (
                <div className="space-y-2">
                  {displayedTransactions.map((tx) => (
                    <DashboardTransactionListItem
                      key={tx.id}
                      type={tx.type}
                      item={tx.item}
                      amount={tx.amount}
                      date={tx.date}
                      category={tx.type === 'sale' ? tx.category : undefined}
                      paymentMode={tx.type === 'expense' ? tx.payment_mode : undefined}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardRecentTransactions;