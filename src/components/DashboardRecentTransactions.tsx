import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardTransactionListItem from './DashboardTransactionListItem';
import { parseISO, subDays } from 'date-fns';
import { showError } from '@/utils/toast';

interface Sale {
  id: string;
  date: string;
  amount: number;
  payment_type: string;
}

interface ExpenseTransaction {
  id: string;
  date: string;
  grand_total: number;
  payment_mode: string;
}

type Transaction = (Sale & { type: 'sale'; item: string }) | (ExpenseTransaction & { type: 'expense'; item: string; amount: number });

const DashboardRecentTransactions = () => {
  const { user, isLoading } = useSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!user) return;

      setLoadingTransactions(true);
      const userId = user.id;
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, date, amount, payment_type')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false });

      if (salesError) {
        showError("Failed to fetch recent sales.");
        setLoadingTransactions(false);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expense_transactions')
        .select('id, date, grand_total, payment_mode')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false });

      if (expensesError) {
        showError("Failed to fetch recent expenses.");
        setLoadingTransactions(false);
        return;
      }

      const allTransactions: Transaction[] = [
        ...(salesData || []).map(sale => ({ ...sale, type: 'sale' as const, item: 'Sale' })),
        ...(expensesData || []).map(expense => ({ ...expense, type: 'expense' as const, item: 'Expense', amount: expense.grand_total })),
      ];

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

  const salesTransactions = transactions.filter(tx => tx.type === 'sale');
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingTransactions ? (
          <p className="text-center text-muted-foreground">Loading transactions...</p>
        ) : (
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">
              {salesTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No sales in the last 30 days.</p>
              ) : (
                <div className="space-y-2 mt-4">
                  {salesTransactions.map((tx) => (
                    <DashboardTransactionListItem
                      key={`${tx.type}-${tx.id}`}
                      type={tx.type}
                      item={tx.item}
                      amount={tx.amount}
                      date={tx.date}
                      paymentType={tx.type === 'sale' ? tx.payment_type : undefined}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="expenses">
              {expenseTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No expenses in the last 30 days.</p>
              ) : (
                <div className="space-y-2 mt-4">
                  {expenseTransactions.map((tx) => (
                    <DashboardTransactionListItem
                      key={`${tx.type}-${tx.id}`}
                      type={tx.type}
                      item={tx.item}
                      amount={tx.amount}
                      date={tx.date}
                      paymentMode={tx.type === 'expense' ? tx.payment_mode : undefined}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardRecentTransactions;