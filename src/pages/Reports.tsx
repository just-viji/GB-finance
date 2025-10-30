import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Filter, Image as ImageIcon, Wallet, Landmark, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { formatCurrencyINR } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Sale { id: string; date: string; amount: number; payment_type: string; note?: string; }
interface ExpenseItem { id: string; transaction_id: string; item_name: string; total: number; unit: number; price_per_unit: number; }
interface ExpenseTransaction { id: string; date: string; grand_total: number; payment_mode: string; note?: string; bill_image_url?: string; items: ExpenseItem[]; }

interface UnifiedSale {
  id: string;
  type: 'sale';
  date: string;
  amount: number;
  payment_type: string;
  note?: string;
}

interface UnifiedExpense {
  id: string;
  type: 'expense';
  date: string;
  amount: number; // grand_total for expenses
  payment_mode: string;
  note?: string;
  bill_image_url?: string;
  items: ExpenseItem[];
}

type UnifiedTransaction = UnifiedSale | UnifiedExpense;

interface MonthlyFinancialSummary {
  totalMonthlySales: number;
  cashInHand: number;
  bankBalance: number;
  monthlyCashSales: number;
  monthlyGpaySales: number;
  monthlyTotalExpenses: number;
  monthlyCashExpenses: number;
  monthlyGpayExpenses: number;
}

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [allTransactions, setAllTransactions] = useState<UnifiedTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'sale' | 'expense'>('all');
  const [monthlySummary, setMonthlySummary] = useState<MonthlyFinancialSummary | null>(null);

  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const hasActiveFilters = !!dateRange.from || !!searchTerm || transactionTypeFilter !== 'all';

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // Current year and past 4 years

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setLoadingData(true);

      const userId = user.id;
      const startOfMonth = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
      const endOfMonth = format(new Date(selectedYear, selectedMonth + 1, 0), 'yyyy-MM-dd');

      // Fetch all sales and expenses for the selected month for summary calculation
      const { data: salesDataForMonth, error: salesErrorForMonth } = await supabase
        .from('sales')
        .select('amount, payment_type')
        .eq('user_id', userId)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const { data: expensesDataForMonth, error: expensesErrorForMonth } = await supabase
        .from('expense_transactions')
        .select('grand_total, payment_mode')
        .eq('user_id', userId)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (salesErrorForMonth) showError("Failed to fetch monthly sales data: " + salesErrorForMonth.message);
      if (expensesErrorForMonth) showError("Failed to fetch monthly expenses data: " + expensesErrorForMonth.message);

      let monthlyCashSales = 0;
      let monthlyGpaySales = 0;
      let monthlyTotalExpenses = 0;
      let monthlyCashExpenses = 0;
      let monthlyGpayExpenses = 0;

      if (salesDataForMonth) {
        monthlyCashSales = salesDataForMonth.filter(s => s.payment_type === 'Cash').reduce((sum, s) => sum + s.amount, 0);
        monthlyGpaySales = salesDataForMonth.filter(s => s.payment_type === 'Gpay').reduce((sum, s) => sum + s.amount, 0);
      }

      if (expensesDataForMonth) {
        monthlyTotalExpenses = expensesDataForMonth.reduce((sum, e) => sum + e.grand_total, 0);
        monthlyCashExpenses = expensesDataForMonth.filter(e => e.payment_mode === 'Cash').reduce((sum, e) => sum + e.grand_total, 0);
        monthlyGpayExpenses = expensesDataForMonth.filter(e => e.payment_mode === 'Gpay').reduce((sum, e) => sum + e.grand_total, 0);
      }
      
      const totalMonthlySales = monthlyCashSales + monthlyGpaySales;

      setMonthlySummary({
        totalMonthlySales,
        cashInHand: monthlyCashSales - monthlyCashExpenses,
        bankBalance: monthlyGpaySales - monthlyGpayExpenses,
        monthlyCashSales,
        monthlyGpaySales,
        monthlyTotalExpenses,
        monthlyCashExpenses,
        monthlyGpayExpenses,
      });

      // Fetch data for the transaction table, applying month/year filter first, then dateRange and searchTerm
      let salesQueryForTable = supabase.from('sales').select('*').eq('user_id', userId).gte('date', startOfMonth).lte('date', endOfMonth);
      let expensesQueryForTable = supabase.from('expense_transactions').select('*').eq('user_id', userId).gte('date', startOfMonth).lte('date', endOfMonth);

      if (dateRange.from) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        salesQueryForTable = salesQueryForTable.gte('date', fromDate);
        expensesQueryForTable = expensesQueryForTable.gte('date', fromDate);
      }
      if (dateRange.to) {
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        salesQueryForTable = salesQueryForTable.lte('date', toDate);
        expensesQueryForTable = expensesQueryForTable.lte('date', toDate);
      }

      const [{ data: salesDataForTable, error: salesErrorForTable }, { data: transactionsDataForTable, error: transactionsErrorForTable }] = await Promise.all([
        salesQueryForTable.order('date', { ascending: false }),
        expensesQueryForTable.order('date', { ascending: false })
      ]);

      if (salesErrorForTable) showError("Failed to fetch sales data for table: " + salesErrorForTable.message);
      if (transactionsErrorForTable) showError("Failed to fetch expense transactions for table: " + transactionsErrorForTable.message);

      let combinedTransactions: UnifiedTransaction[] = [];

      if (salesDataForTable && (transactionTypeFilter === 'all' || transactionTypeFilter === 'sale')) {
        const filteredSales = salesDataForTable.filter(s => !searchTerm || (s.note && s.note.toLowerCase().includes(searchTerm.toLowerCase())));
        combinedTransactions.push(...filteredSales.map(s => ({ ...s, type: 'sale' as const })));
      }

      if (transactionsDataForTable && (transactionTypeFilter === 'all' || transactionTypeFilter === 'expense')) {
        const transactionIds = transactionsDataForTable.map(t => t.id);
        let itemsQuery = supabase.from('expense_items').select('*').in('transaction_id', transactionIds);
        
        const { data: itemsData, error: itemsError } = await itemsQuery;
        if (itemsError) showError("Failed to fetch expense items: " + itemsError.message);
        
        const itemsByTransactionId = (itemsData || []).reduce((acc, item) => {
          acc[item.transaction_id] = acc[item.transaction_id] || [];
          acc[item.transaction_id].push(item);
          return acc;
        }, {} as Record<string, ExpenseItem[]>);

        const filteredExpenses = transactionsDataForTable.map(t => ({
          ...t,
          items: itemsByTransactionId[t.id] || [],
          amount: t.grand_total // Map grand_total to amount for consistency
        })).filter(t => !searchTerm || t.items.some(item => item.item_name.toLowerCase().includes(searchTerm.toLowerCase())) || (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase())));
        
        combinedTransactions.push(...filteredExpenses.map(e => ({ ...e, type: 'expense' as const })));
      }

      combinedTransactions.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      setAllTransactions(combinedTransactions);
      setLoadingData(false);
    };
    if (user) fetchReports();
  }, [user, dateRange, searchTerm, transactionTypeFilter, selectedMonth, selectedYear]);

  const handleDelete = async (type: 'sale' | 'expense', id: string) => {
    if (!confirm("Are you sure?")) return;
    const table = type === 'sale' ? 'sales' : 'expense_transactions';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      showError(`Failed to delete entry.`);
    } else {
      showSuccess(`Entry deleted.`);
      setAllTransactions(prev => prev.filter(t => t.id !== id || t.type !== type));
    }
  };

  const resetFilters = () => {
    setDateRange({});
    setSearchTerm('');
    setTransactionTypeFilter('all');
    // Keep month/year selection as it's a primary context filter
    // setIsFiltersOpen(false); // Optionally close filters
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <CardTitle className="text-2xl font-bold text-primary">Financial Reports</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Month and Year Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select onValueChange={(value) => setSelectedMonth(parseInt(value))} value={selectedMonth.toString()}>
            <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => setSelectedYear(parseInt(value))} value={selectedYear.toString()}>
            <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Summary Section - Consolidated Card View */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                  <Card><CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                </div>
              </div>
            ) : (
              <>
                {/* Sales Summary */}
                <h4 className="text-lg font-semibold mb-2">Sales Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Monthly Sales</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrencyINR(monthlySummary?.totalMonthlySales || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Sales (Cash)</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrencyINR(monthlySummary?.monthlyCashSales || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Sales (Gpay)</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrencyINR(monthlySummary?.monthlyGpaySales || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expenses Summary */}
                <h4 className="text-lg font-semibold mb-2 mt-4">Expenses Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Total Expenses</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrencyINR(monthlySummary?.monthlyTotalExpenses || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Expenses (Cash)</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrencyINR(monthlySummary?.monthlyCashExpenses || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Expenses (Gpay)</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrencyINR(monthlySummary?.monthlyGpayExpenses || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Net Balances */}
                <h4 className="text-lg font-semibold mb-2 mt-4">Net Balances</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cash in Hand (Monthly Net)</CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${monthlySummary && monthlySummary.cashInHand >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrencyINR(monthlySummary?.cashInHand || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Bank Balance (Monthly Net)</CardTitle>
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${monthlySummary && monthlySummary.bankBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrencyINR(monthlySummary?.bankBalance || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center">
                <Filter className="h-4 w-4 mr-2" /> Filter Transactions
                {hasActiveFilters && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                    Active
                  </span>
                )}
              </span>
              {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 border rounded-b-lg mt-[-1px]">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
              <Input placeholder="Search by item/note..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select onValueChange={(value: 'all' | 'sale' | 'expense') => setTransactionTypeFilter(value)} value={transactionTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} /></PopoverContent>
              </Popover>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="mt-4 w-full">
                Clear Filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        {loadingData ? (
          <div className="space-y-2 mt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : allTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No transactions found matching your criteria for {months[selectedMonth]} {selectedYear}.
            {transactionTypeFilter === 'all' && (
              <> <Button variant="link" onClick={() => navigate('/add-sale')} className="p-0 h-auto">Add a sale?</Button> or <Button variant="link" onClick={() => navigate('/add-expense')} className="p-0 h-auto">Add an expense?</Button></>
            )}
            {transactionTypeFilter === 'sale' && <Button variant="link" onClick={() => navigate('/add-sale')} className="p-0 h-auto">Add a new sale?</Button>}
            {transactionTypeFilter === 'expense' && <Button variant="link" onClick={() => navigate('/add-expense')} className="p-0 h-auto">Add a new expense?</Button>}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="whitespace-nowrap">Description</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Bill</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransactions.map(transaction => (
                  <TransactionRow key={`${transaction.type}-${transaction.id}`} transaction={transaction} onDelete={handleDelete} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TransactionRow = ({ transaction, onDelete }: { transaction: UnifiedTransaction; onDelete: (type: 'sale' | 'expense', id: string) => void }) => {
  const navigate = useNavigate();

  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
  const editPath = isExpense ? `/edit-expense/${transaction.id}` : `/edit-sale/${transaction.id}`;
  const category = isExpense ? transaction.payment_mode : transaction.payment_type;
  const description = isExpense 
    ? (transaction.items.length > 0 ? transaction.items.map(item => item.item_name).join(', ') : transaction.note || 'Expense') 
    : transaction.note || 'Sale';

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{format(parseISO(transaction.date), 'PPP')}</TableCell>
      <TableCell className="whitespace-nowrap">{transaction.type === 'sale' ? 'Sale' : 'Expense'}</TableCell>
      <TableCell className="whitespace-nowrap">{category}</TableCell>
      <TableCell className="whitespace-nowrap">{description}</TableCell>
      <TableCell className={cn("text-right whitespace-nowrap", amountColor)}>
        {isExpense ? '-' : '+'}{formatCurrencyINR(transaction.amount)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {isExpense && transaction.bill_image_url && (
          <Dialog>
            <DialogTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline"><ImageIcon className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent><p>View Bill</p></TooltipContent>
              </Tooltip>
            </DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Bill Image</DialogTitle></DialogHeader><img src={transaction.bill_image_url} alt="Bill" className="w-full h-auto" /></DialogContent>
          </Dialog>
        )}
      </TableCell>
      <TableCell className="flex gap-2 flex-nowrap whitespace-nowrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={() => navigate(editPath)}>
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{isExpense ? 'Edit Expense' : 'Edit Sale'}</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="destructive" onClick={() => onDelete(transaction.type, transaction.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{isExpense ? 'Delete Expense' : 'Delete Sale'}</p></TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default Reports;