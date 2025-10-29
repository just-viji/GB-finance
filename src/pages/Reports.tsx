import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, Filter, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { formatCurrencyINR } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Sale { id: string; date: string; amount: number; payment_type: string; note?: string; }
interface Expense { id: string; date: string; item_name: string; total: number; payment_mode: string; note?: string; bill_image_url?: string; }

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setLoadingData(true);

      let salesQuery = supabase.from('sales').select('*').eq('user_id', user.id);
      let expensesQuery = supabase.from('expenses').select('*').eq('user_id', user.id);

      if (dateRange.from) {
        salesQuery = salesQuery.gte('date', format(dateRange.from, 'yyyy-MM-dd'));
        expensesQuery = expensesQuery.gte('date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        salesQuery = salesQuery.lte('date', format(dateRange.to, 'yyyy-MM-dd'));
        expensesQuery = expensesQuery.lte('date', format(dateRange.to, 'yyyy-MM-dd'));
      }
      if (searchTerm) {
        // Search only applies to expenses now
        expensesQuery = expensesQuery.ilike('item_name', `%${searchTerm}%`);
      }

      const [{ data: salesData }, { data: expensesData }] = await Promise.all([
        salesQuery.order('date', { ascending: false }),
        expensesQuery.order('date', { ascending: false })
      ]);

      setSales(salesData || []);
      setExpenses(expensesData || []);
      setLoadingData(false);
    };
    if (user) fetchReports();
  }, [user, dateRange, searchTerm]);

  const handleDelete = async (table: 'sales' | 'expenses', id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      showError(`Failed to delete ${table.slice(0, -1)}.`);
    } else {
      showSuccess(`${table.slice(0, -1)} deleted.`);
      setSales(prev => table === 'sales' ? prev.filter(s => s.id !== id) : prev);
      setExpenses(prev => table === 'expenses' ? prev.filter(e => e.id !== id) : prev);
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
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Payment Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{sales.map(s => <TableRow key={s.id}><TableCell>{format(parseISO(s.date), 'PPP')}</TableCell><TableCell>{s.payment_type}</TableCell><TableCell className="text-right text-green-600">{formatCurrencyINR(s.amount)}</TableCell><TableCell className="flex gap-2"><Button size="icon" variant="outline" onClick={() => navigate(`/edit-sale/${s.id}`)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => handleDelete('sales', s.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
          </TabsContent>
          <TabsContent value="expenses">
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Bill</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{expenses.map(e => <TableRow key={e.id}><TableCell>{format(parseISO(e.date), 'PPP')}</TableCell><TableCell>{e.item_name}</TableCell><TableCell className="text-right text-red-600">{formatCurrencyINR(e.total)}</TableCell><TableCell>{e.bill_image_url && <Dialog><DialogTrigger asChild><Button size="icon" variant="outline"><ImageIcon className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Bill Image</DialogTitle></DialogHeader><img src={e.bill_image_url} alt="Bill" className="w-full h-auto" /></DialogContent></Dialog>}</TableCell><TableCell className="flex gap-2"><Button size="icon" variant="outline" onClick={() => navigate(`/edit-expense/${e.id}`)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => handleDelete('expenses', e.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Reports;