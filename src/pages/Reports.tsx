import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import { format, isValid, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Import Input component
import { formatCurrencyINR } from '@/lib/currency';

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
  const [currentMonthFilteredExpenseTotal, setCurrentMonthFilteredExpenseTotal] = useState<number>(0);

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [saleCategoryFilter, setSaleCategoryFilter] = useState<string>('all');
  const [salePaymentTypeFilter, setSalePaymentTypeFilter] = useState<string>('all');
  const [expensePaymentModeFilter, setExpensePaymentModeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>(''); // State for immediate input value
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(''); // State for debounced search

  // Debounce effect for search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchReports = async () => {
    if (!user) return;

    setLoadingData(true);
    const userId = user.id;

    // Fetch sales with filters
    let salesQuery = supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      salesQuery = salesQuery.gte('date', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      salesQuery = salesQuery.lte('date', format(endDate, 'yyyy-MM-dd'));
    }
    if (saleCategoryFilter && saleCategoryFilter !== 'all') {
      salesQuery = salesQuery.eq('category', saleCategoryFilter);
    }
    if (salePaymentTypeFilter && salePaymentTypeFilter !== 'all') {
      salesQuery = salesQuery.eq('payment_type', salePaymentTypeFilter);
    }
    if (debouncedSearchTerm) { // Use debounced search term here
      salesQuery = salesQuery.or(`item.ilike.%${debouncedSearchTerm}%,category.ilike.%${debouncedSearchTerm}%`);
    }

    const { data: salesData, error: salesError } = await salesQuery.order('date', { ascending: false });

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      showError("Failed to fetch sales: " + salesError.message);
    } else {
      setSales(salesData as Sale[]);
    }

    // Fetch expenses with filters
    let expensesQuery = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      expensesQuery = expensesQuery.gte('date', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      expensesQuery = expensesQuery.lte('date', format(endDate, 'yyyy-MM-dd'));
    }
    if (expensePaymentModeFilter && expensePaymentModeFilter !== 'all') {
      expensesQuery = expensesQuery.eq('payment_mode', expensePaymentModeFilter);
    }
    if (debouncedSearchTerm) { // Use debounced search term here
      expensesQuery = expensesQuery.ilike('item_name', `%${debouncedSearchTerm}%`);
    }

    const { data: expensesData, error: expensesError } = await expensesQuery.order('date', { ascending: false });

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError);
      showError("Failed to fetch expenses: " + expensesError.message);
    } else {
      setExpenses(expensesData as Expense[]);
    }

    // Calculate current month's filtered expense total
    const now = new Date();
    let totalExpensesForCurrentMonth = 0;
    if (expensesData) {
      expensesData.forEach(expense => {
        const expenseDate = parseISO(expense.date);
        if (isValid(expenseDate) && isSameMonth(expenseDate, now) && isSameYear(expenseDate, now)) {
          totalExpensesForCurrentMonth += expense.total;
        }
      });
    }
    setCurrentMonthFilteredExpenseTotal(totalExpensesForCurrentMonth);

    setLoadingData(false);
  };

  useEffect(() => {
    if (user) {
      fetchReports();
    } else if (!isLoading) {
      setLoadingData(false);
    }
  }, [user, isLoading, startDate, endDate, saleCategoryFilter, salePaymentTypeFilter, expensePaymentModeFilter, debouncedSearchTerm]); // Re-fetch when filters or DEBOUNCED search term change

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sale?")) return;

    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      console.error("Error deleting sale:", error);
      showError("Failed to delete sale: " + error.message);
    } else {
      showSuccess("Sale deleted successfully!");
      fetchReports();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      console.error("Error deleting expense:", error);
      showError("Failed to delete expense: " + error.message);
    } else {
      showSuccess("Expense deleted successfully!");
      fetchReports();
    }
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSaleCategoryFilter('all');
    setSalePaymentTypeFilter('all');
    setExpensePaymentModeFilter('all');
    setSearchTerm(''); // Clear immediate search term
    setDebouncedSearchTerm(''); // Clear debounced search term
  };

  if (isLoading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center">Loading reports...</div>;
  }

  // Extract unique categories and payment types for filters
  const uniqueSaleCategories = Array.from(new Set(sales.map(sale => sale.category))).sort();
  const uniqueSalePaymentTypes = Array.from(new Set(sales.map(sale => sale.payment_type))).sort();
  const uniqueExpensePaymentModes = Array.from(new Set(expenses.map(expense => expense.payment_mode))).sort();

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-4xl mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-400">Financial Reports</CardTitle>
            <div className="w-10"></div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Current Month's Filtered Expense Total */}
          <Card className="mb-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Current Month's Filtered Expense Total
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                {formatCurrencyINR(currentMonthFilteredExpenseTotal)}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Based on current filters and search term.
              </p>
            </CardContent>
          </Card>

          <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Filter className="h-5 w-5 mr-2" /> Filter Reports
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="searchTerm">Search Item/Category</Label>
                <Input
                  id="searchTerm"
                  type="text"
                  placeholder="e.g., groceries, rent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="saleCategoryFilter">Sale Category</Label>
                <Select onValueChange={setSaleCategoryFilter} value={saleCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueSaleCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="salePaymentTypeFilter">Sale Payment Type</Label>
                <Select onValueChange={setSalePaymentTypeFilter} value={salePaymentTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Types</SelectItem>
                    {uniqueSalePaymentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expensePaymentModeFilter">Expense Payment Mode</Label>
                <Select onValueChange={setExpensePaymentModeFilter} value={expensePaymentModeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Modes</SelectItem>
                    {uniqueExpensePaymentModes.map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleClearFilters} variant="outline" className="mt-4 w-full">
              Clear Filters
            </Button>
          </div>

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
                    <p className="text-center text-gray-500 dark:text-gray-400">No sales recorded yet for the selected filters.</p>
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
                              <TableCell>{isValid(parseISO(sale.date)) ? format(parseISO(sale.date), 'PPP') : sale.date}</TableCell>
                              <TableCell>{sale.item}</TableCell>
                              <TableCell>{sale.category}</TableCell>
                              <TableCell className="text-right">{formatCurrencyINR(sale.amount)}</TableCell>
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
                    <p className="text-center text-gray-500 dark:text-gray-400">No expenses recorded yet for the selected filters.</p>
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
                              <TableCell>{isValid(parseISO(expense.date)) ? format(parseISO(expense.date), 'PPP') : expense.date}</TableCell>
                              <TableCell>{expense.item_name}</TableCell>
                              <TableCell>{expense.unit}</TableCell>
                              <TableCell className="text-right">{formatCurrencyINR(expense.price_per_unit)}</TableCell>
                              <TableCell className="text-right">{formatCurrencyINR(expense.total)}</TableCell>
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