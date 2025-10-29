import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Filter, Search, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrencyINR } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';

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
  bill_image_url?: string;
}

const Reports = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSupabase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentMonthFilteredExpenseTotal, setCurrentMonthFilteredExpenseTotal] = useState<number>(0);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true); // State for collapsible filters

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [saleCategoryFilter, setSaleCategoryFilter] = useState<string>('all');
  const [salePaymentTypeFilter, setSalePaymentTypeFilter] = useState<string>('all');
  const [expensePaymentModeFilter, setExpensePaymentModeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Debounce effect for search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

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
    if (debouncedSearchTerm) {
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
    if (debouncedSearchTerm) {
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
  }, [user, isLoading, startDate, endDate, saleCategoryFilter, salePaymentTypeFilter, expensePaymentModeFilter, debouncedSearchTerm]);

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
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };

  if (isLoading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">Loading reports...</div>;
  }

  // Extract unique categories and payment types for filters
  const uniqueSaleCategories = Array.from(new Set(sales.map(sale => sale.category))).sort();
  const uniqueSalePaymentTypes = Array.from(new Set(sales.map(sale => sale.payment_type))).sort();
  const uniqueExpensePaymentModes = Array.from(new Set(expenses.map(expense => expense.payment_mode))).sort();

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 text-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mt-8"
      >
        <Card className="bg-gray-800 text-gray-100 shadow-lg rounded-lg border border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-300 hover:bg-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-2xl font-bold text-neon-green">Financial Reports</CardTitle>
              <div className="w-10"></div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Current Month's Filtered Expense Total */}
            <Card className="mb-6 bg-gray-700 border-gray-600 text-gray-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Current Month's Filtered Expense Total
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-300">
                  {formatCurrencyINR(currentMonthFilteredExpenseTotal)}
                </div>
                <p className="text-xs text-gray-400">
                  Based on current filters and search term.
                </p>
              </CardContent>
            </Card>

            {/* Collapsible Filter Section */}
            <Card className="mb-6 bg-gray-700 border-gray-600 text-gray-100">
              <Collapsible
                open={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-lg font-semibold text-gray-100 hover:bg-gray-600">
                    <span className="flex items-center">
                      <Filter className="h-5 w-5 mr-2 text-neon-green" /> Filter Reports
                    </span>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="searchTerm" className="text-gray-300">Search Item/Category</Label>
                      <Input
                        id="searchTerm"
                        type="text"
                        placeholder="e.g., groceries, rent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-1 bg-gray-600 text-gray-100 border-gray-500 focus:border-neon-green"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDate" className="text-gray-300">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-600 text-gray-100 border-gray-500 hover:bg-gray-500",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-neon-green" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border border-gray-700 text-gray-100">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="text-gray-100"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-gray-300">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-600 text-gray-100 border-gray-500 hover:bg-gray-500",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-neon-green" />
                            {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border border-gray-700 text-gray-100">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="text-gray-100"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="saleCategoryFilter" className="text-gray-300">Sale Category</Label>
                      <Select onValueChange={setSaleCategoryFilter} value={saleCategoryFilter}>
                        <SelectTrigger className="w-full bg-gray-600 text-gray-100 border-gray-500 focus:border-neon-green">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-gray-700 text-gray-100">
                          <SelectItem value="all">All Categories</SelectItem>
                          {uniqueSaleCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="salePaymentTypeFilter" className="text-gray-300">Sale Payment Type</Label>
                      <Select onValueChange={setSalePaymentTypeFilter} value={salePaymentTypeFilter}>
                        <SelectTrigger className="w-full bg-gray-600 text-gray-100 border-gray-500 focus:border-neon-green">
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-gray-700 text-gray-100">
                          <SelectItem value="all">All Payment Types</SelectItem>
                          {uniqueSalePaymentTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expensePaymentModeFilter" className="text-gray-300">Expense Payment Mode</Label>
                      <Select onValueChange={setExpensePaymentModeFilter} value={expensePaymentModeFilter}>
                        <SelectTrigger className="w-full bg-gray-600 text-gray-100 border-gray-500 focus:border-neon-green">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border border-gray-700 text-gray-100">
                          <SelectItem value="all">All Payment Modes</SelectItem>
                          {uniqueExpensePaymentModes.map(mode => (
                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" onClick={handleClearFilters} variant="outline" className="mt-4 w-full bg-gray-600 text-neon-green border-neon-green hover:bg-gray-500 hover:text-neon-green shadow-neon-green-sm">
                    Clear Filters
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700 text-gray-300">
                <TabsTrigger value="sales" className="data-[state=active]:bg-neon-green data-[state=active]:text-primary-foreground">Sales</TabsTrigger>
                <TabsTrigger value="expenses" className="data-[state=active]:bg-destructive data-[state=active]:text-primary-foreground">Expenses</TabsTrigger>
              </TabsList>
              <TabsContent value="sales">
                <Card className="mt-4 bg-gray-800 text-gray-100 shadow-lg rounded-lg border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-neon-green">Sales Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sales.length === 0 ? (
                      <p className="text-center text-gray-400">No sales recorded yet for the selected filters.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow className="bg-gray-700 hover:bg-gray-700">
                              <TableHead className="text-gray-300 w-[120px] text-nowrap">Date</TableHead>
                              <TableHead className="text-gray-300 w-[150px] text-nowrap">Item</TableHead>
                              <TableHead className="text-gray-300 w-[120px] text-nowrap">Category</TableHead>
                              <TableHead className="text-right text-gray-300 w-[100px] text-nowrap">Amount</TableHead>
                              <TableHead className="text-gray-300 w-[120px] text-nowrap">Payment</TableHead>
                              <TableHead className="text-gray-300 flex-1 min-w-[150px] text-nowrap">Note</TableHead>
                              <TableHead className="text-center text-gray-300 w-[100px] text-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sales.map((sale) => (
                              <TableRow key={sale.id} className="border-gray-700 hover:bg-gray-700/50">
                                <TableCell className="text-gray-200 text-nowrap">{isValid(parseISO(sale.date)) ? format(parseISO(sale.date), 'PPP') : sale.date}</TableCell>
                                <TableCell className="text-gray-200 text-nowrap">{sale.item}</TableCell>
                                <TableCell className="text-gray-200 text-nowrap">{sale.category}</TableCell>
                                <TableCell className="text-right text-neon-green text-nowrap">{formatCurrencyINR(sale.amount)}</TableCell>
                                <TableCell className="text-gray-200 text-nowrap">{sale.payment_type}</TableCell>
                                <TableCell className="max-w-[150px] truncate text-gray-200">{sale.note || '-'}</TableCell>
                                <TableCell className="flex justify-center space-x-2 text-nowrap">
                                  <Button type="button" variant="outline" size="icon" onClick={() => navigate(`/edit-sale/${sale.id}`)} className="bg-gray-600 text-neon-green border-neon-green hover:bg-gray-500 shadow-neon-green-sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button type="button" variant="destructive" size="icon" onClick={() => handleDeleteSale(sale.id)} className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
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
                <Card className="mt-4 bg-gray-800 text-gray-100 shadow-lg rounded-lg border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-destructive">Expense Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenses.length === 0 ? (
                      <p className="text-center text-gray-400">No expenses recorded yet for the selected filters.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow className="bg-gray-700 hover:bg-gray-700">
                              <TableHead className="text-gray-300 w-[120px] text-nowrap">Date</TableHead>
                              <TableHead className="text-gray-300 w-[150px] text-nowrap">Item</TableHead>
                              <TableHead className="text-gray-300 w-[80px] text-nowrap">Unit</TableHead>
                              <TableHead className="text-right text-gray-300 w-[100px] text-nowrap">Price/Unit</TableHead>
                              <TableHead className="text-right text-gray-300 w-[100px] text-nowrap">Total</TableHead>
                              <TableHead className="text-gray-300 w-[120px] text-nowrap">Payment</TableHead>
                              <TableHead className="text-center text-gray-300 w-[80px] text-nowrap">Bill</TableHead>
                              <TableHead className="text-gray-300 flex-1 min-w-[150px] text-nowrap">Note</TableHead>
                              <TableHead className="text-center text-gray-300 w-[100px] text-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenses.map((expense) => (
                              <TableRow key={expense.id} className="border-gray-700 hover:bg-gray-700/50">
                                <TableCell className="text-gray-200 text-nowrap">{isValid(parseISO(expense.date)) ? format(parseISO(expense.date), 'PPP') : expense.date}</TableCell>
                                <TableCell className="text-gray-200 text-nowrap">{expense.item_name}</TableCell>
                                <TableCell className="text-gray-200 text-nowrap">{expense.unit}</TableCell>
                                <TableCell className="text-right text-gray-200 text-nowrap">{formatCurrencyINR(expense.price_per_unit)}</TableCell>
                                <TableCell className="text-right text-destructive text-nowrap">{formatCurrencyINR(expense.total)}</TableCell>
                                <TableCell className="text-gray-200 text-nowrap">{expense.payment_mode}</TableCell>
                                <TableCell className="text-center">
                                  {expense.bill_image_url ? (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-gray-600 text-blue-400 border-blue-500 hover:bg-gray-500 shadow-sm">
                                          <ImageIcon className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[425px] md:max-w-2xl lg:max-w-4xl bg-gray-800 border border-gray-700 text-gray-100">
                                        <DialogHeader>
                                          <DialogTitle className="text-neon-green">Bill Image for {expense.item_name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex justify-center items-center p-4">
                                          <img src={expense.bill_image_url} alt="Bill" className="max-w-full max-h-[80vh] object-contain" />
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate text-gray-200">{expense.note || '-'}</TableCell>
                                <TableCell className="flex justify-center space-x-2 text-nowrap">
                                  <Button type="button" variant="outline" size="icon" onClick={() => navigate(`/edit-expense/${expense.id}`)} className="bg-gray-600 text-yellow-400 border-yellow-500 hover:bg-gray-500 shadow-sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button type="button" variant="destructive" size="icon" onClick={() => handleDeleteExpense(expense.id)} className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
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
      </motion.div>
    </div>
  );
};

export default Reports;