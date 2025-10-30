import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Filter, Image as ImageIcon, Wallet, Landmark } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { formatCurrencyINR } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'; // Keep Collapsible for filter section
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

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [allTransactions, setAllTransactions] = useState<UnifiedTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'sale' | 'expense'>('all');
  const [summary, setSummary] = useState<{ cashInHand: number; bankBalance: number } | null>(null);

  const hasActiveFilters = !!dateRange.from || !!searchTerm || transactionTypeFilter !== 'all';

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setLoadingData(true);

      let salesQuery = supabase.from('sales').select('*').eq('user_id', user.id);
      let expensesQuery = supabase.from('expense_transactions').select('*').eq('user_id', user.id);

      if (dateRange.from) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        salesQuery = salesQuery.gte('date', fromDate);
        expensesQuery = expensesQuery.gte('date', fromDate);
      }
      if (dateRange.to) {
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        salesQuery = salesQuery.lte('date', toDate);
        expensesQuery = expensesQuery.lte('date', toDate);
      }

      const [{ data: salesData, error: salesError }, { data: transactionsData, error: transactionsError }] = await Promise.all([
        salesQuery.order('date', { ascending: false }),
        expensesQuery.order('date', { ascending: false })
      ]);

      if (salesError) showError("Failed to fetch sales data: " + salesError.message);
      if (transactionsError) showError("Failed to fetch expense transactions: " + transactionsError.message);

      if (salesData && transactionsData) {
        const totalCashSales = salesData.filter(s => s.payment_type === 'Cash').reduce((acc, s) => acc + s.amount, 0);
        const totalBankSales = salesData.filter(s => s.payment_type !== 'Cash').reduce((acc, s) => acc + s.amount, 0);
        const totalCashExpenses = transactionsData.filter(e => e.payment_mode === 'Cash').reduce((acc, e) => acc + e.grand_total, 0);
        const totalBankExpenses = transactionsData.filter(e => e.payment_mode !== 'Cash').reduce((acc, e) => acc + e.grand_total, 0);
        setSummary({
          cashInHand: totalCashSales - totalCashExpenses,
          bankBalance: totalBankSales - totalBankExpenses,
        });
      } else {
        setSummary(null);
      }

      let combinedTransactions: UnifiedTransaction[] = [];

      if (salesData && (transactionTypeFilter === 'all' || transactionTypeFilter === 'sale')) {
        const filteredSales = salesData.filter(s => !searchTerm || (s.note && s.note.toLowerCase().includes(searchTerm.toLowerCase())));
        combinedTransactions.push(...filteredSales.map(s => ({ ...s, type: 'sale' as const })));
      }

      if (transactionsData && (transactionTypeFilter === 'all' || transactionTypeFilter === 'expense')) {
        const transactionIds = transactionsData.map(t => t.id);
        let itemsQuery = supabase.from('expense_items').select('*').in('transaction_id', transactionIds);
        
        const { data: itemsData, error: itemsError } = await itemsQuery;
        if (itemsError) showError("Failed to fetch expense items: " + itemsError.message);
        
        const itemsByTransactionId = (itemsData || []).reduce((acc, item) => {
          acc[item.transaction_id] = acc[item.transaction_id] || [];
          acc[item.transaction_id].push(item);
          return acc;
        }, {} as Record<string, ExpenseItem[]>);

        const filteredExpenses = transactionsData.map(t => ({
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
  }, [user, dateRange, searchTerm, transactionTypeFilter]);

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
    setIsFiltersOpen(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary && summary.cashInHand >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrencyINR(summary?.cashInHand || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary && summary.bankBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrencyINR(summary?.bankBalance || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center">
                <Filter className="h-4 w-4 mr-2" /> Filter Reports
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Search by item/note..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
            No transactions found matching your criteria.
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