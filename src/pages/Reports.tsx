import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';

interface Sale {
  id: string;
  date: string;
  item: string;
  category: string;
  amount: number;
  payment_type: string;
  note?: string;
}

interface Expense {
  id: string;
  date: string;
  item_name: string;
  unit: number;
  price_per_unit: number;
  total: number;
  payment_mode: string;
  note?: string;
}

const Reports = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSupabase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchReports = async () => {
    if (!user) return;

    setLoadingData(true);
    const userId = user.id;

    // Fetch sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      showError("Failed to fetch sales: " + salesError.message);
    } else {
      setSales(salesData as Sale[]);
    }

    // Fetch expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError);
      showError("Failed to fetch expenses: " + expensesError.message);
    } else {
      setExpenses(expensesData as Expense[]);
    }

    setLoadingData(false);
  };

  useEffect(() => {
    if (user) {
      fetchReports();
    } else if (!isLoading) {
      setLoadingData(false);
    }
  }, [user, isLoading]);

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sale?")) return;

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id); // Ensure only owner can delete

    if (error) {
      console.error("Error deleting sale:", error);
      showError("Failed to delete sale: " + error.message);
    } else {
      showSuccess("Sale deleted successfully!");
      fetchReports(); // Refresh data
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id); // Ensure only owner can delete

    if (error) {
      console.error("Error deleting expense:", error);
      showError("Failed to delete expense: " + error.message);
    } else {
      showSuccess("Expense deleted successfully!");
      fetchReports(); // Refresh data
    }
  };

  if (isLoading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center">Loading reports...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-4xl mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-400">Financial Reports</CardTitle>
            <div className="w-10"></div> {/* Placeholder for alignment */}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Sales Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {sales.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">No sales recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell>{format(new Date(sale.date), 'PPP')}</TableCell>
                              <TableCell>{sale.item}</TableCell>
                              <TableCell>{sale.category}</TableCell>
                              <TableCell className="text-right">${sale.amount.toFixed(2)}</TableCell>
                              <TableCell>{sale.payment_type}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{sale.note || '-'}</TableCell>
                              <TableCell className="flex justify-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => navigate(`/edit-sale/${sale.id}`)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeleteSale(sale.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="expenses">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Expense Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">No expenses recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Price/Unit</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>{format(new Date(expense.date), 'PPP')}</TableCell>
                              <TableCell>{expense.item_name}</TableCell>
                              <TableCell>{expense.unit}</TableCell>
                              <TableCell className="text-right">${expense.price_per_unit.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${expense.total.toFixed(2)}</TableCell>
                              <TableCell>{expense.payment_mode}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{expense.note || '-'}</TableCell>
                              <TableCell className="flex justify-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => navigate(`/edit-expense/${expense.id}`)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeleteExpense(expense.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;