import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Filter, Image as ImageIcon, ChevronDown, ChevronRight, ChevronUp, Wallet, Landmark } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { formatCurrencyINR } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton component

interface Sale { id: string; date: string; amount: number; payment_type: string; note?: string; }
interface ExpenseItem { id: string; transaction_id: string; item_name: string; total: number; unit: number; price_per_unit: number; }
interface ExpenseTransaction { id: string; date: string; grand_total: number; payment_mode: string; note?: string; bill_image_url?: string; items: ExpenseItem[]; }

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState<{ cashInHand: number; bankBalance: number } | null>(null);

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

      const [{ data: salesData }, { data: transactionsData }] = await Promise.all([
        salesQuery.order('date', { ascending: false }),
        expensesQuery.order('date', { ascending: false })
      ]);

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

      setSales(salesData || []);

      if (transactionsData && transactionsData.length > 0) {
        const transactionIds = transactionsData.map(t => t.id);
        let itemsQuery = supabase.from('expense_items').select('*').in('transaction_id', transactionIds);
        if (searchTerm) {
          itemsQuery = itemsQuery.ilike('item_name', `%${searchTerm}%`);
        }
        const { data: itemsData } = await itemsQuery;
        
        const itemsByTransactionId = (itemsData || []).reduce((acc, item) => {
          acc[item.transaction_id] = acc[item.transaction_id] || [];
          acc[item.transaction_id].push(item);
          return acc;
        }, {} as Record<string, ExpenseItem[]>);

        const combinedExpenses = transactionsData.map(t => ({
          ...t,
          items: itemsByTransactionId[t.id] || []
        })).filter(t => !searchTerm || t.items.length > 0);
        
        setExpenses(combinedExpenses);
      } else {
        setExpenses([]);
      }

      setLoadingData(false);
    };
    if (user) fetchReports();
  }, [user, dateRange, searchTerm]);

  const handleDelete = async (table: 'sales' | 'expense_transactions', id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      showError(`Failed to delete entry.`);
    } else {
      showSuccess(`Entry deleted.`);
      if (table === 'sales') setSales(prev => prev.filter(s => s.id !== id));
      if (table === 'expense_transactions') setExpenses(prev => prev.filter(e => e.id !== id));
    }
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
              <span className="flex items-center"><Filter className="h-4 w-4 mr-2" /> Filter Reports</span>
              {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 border rounded-b-lg mt-[-1px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Search by expense item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
          </CollapsibleContent>
        </Collapsible>

        <Tabs defaultValue="sales">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <TabsContent value="sales">
            {loadingData ? (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : sales.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No sales found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{format(parseISO(s.date), 'PPP')}</TableCell>
                        <TableCell>{s.payment_type}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrencyINR(s.amount)}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={() => navigate(`/edit-sale/${s.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => handleDelete('sales', s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="expenses">
            {loadingData ? (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No expenses found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24"></TableHead> {/* For expand/collapse */}
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Mode</TableHead> {/* Added this */}
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(e => (
                      <ExpenseRow key={e.id} expense={e} onDelete={() => handleDelete('expense_transactions', e.id)} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const ExpenseRow = ({ expense, onDelete }: { expense: ExpenseTransaction; onDelete: () => void }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow>
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>{format(parseISO(expense.date), 'PPP')}</TableCell>
        <TableCell>{expense.payment_mode}</TableCell> {/* Added this */}
        <TableCell>{expense.items.length} item(s)</TableCell>
        <TableCell className="text-right text-red-600">{formatCurrencyINR(expense.grand_total)}</TableCell>
        <TableCell>{expense.bill_image_url && <Dialog><DialogTrigger asChild><Button size="icon" variant="outline"><ImageIcon className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Bill Image</DialogTitle></DialogHeader><img src={expense.bill_image_url} alt="Bill" className="w-full h-auto" /></DialogContent></Dialog>}</TableCell>
        <TableCell className="flex gap-2"><Button size="icon" variant="outline" onClick={() => navigate(`/edit-expense/${expense.id}`)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={7} className="p-0"> {/* Updated colSpan from 6 to 7 */}
            <div className="p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">Items:</h4>
              <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Unit</TableHead><TableHead>Price/Unit</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>{expense.items.map(item => <TableRow key={item.id}><TableCell>{item.item_name}</TableCell><TableCell>{item.unit}</TableCell><TableCell>{formatCurrencyINR(item.price_per_unit)}</TableCell><TableCell className="text-right">{formatCurrencyINR(item.total)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Reports;