import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { motion } from 'framer-motion';

const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  item: z.string().min(1, "Item name is required."),
  category: z.string().min(1, "Category is required."),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().positive("Amount must be a positive number.")
  ),
  payment_type: z.string().min(1, "Payment type is required."),
  note: z.string().optional(),
});

const AddSale = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      item: "",
      category: "",
      amount: 0,
      payment_type: "",
      note: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("You must be logged in to add a sale.");
      return;
    }

    const { data, error } = await supabase
      .from('sales')
      .insert({
        user_id: user.id,
        date: format(values.date, 'yyyy-MM-dd'),
        item: values.item,
        category: values.category,
        amount: values.amount,
        payment_type: values.payment_type,
        note: values.note,
      });

    if (error) {
      console.error("Error adding sale:", error);
      showError("Failed to add sale: " + error.message);
    } else {
      showSuccess("Sale added successfully!");
      form.reset({ // Reset form fields to default values
        date: new Date(),
        item: "",
        category: "",
        amount: 0,
        payment_type: "",
        note: "",
      });
      // Removed navigate('/dashboard');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 text-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mt-8"
      >
        <Card className="bg-gray-800 text-gray-100 shadow-lg rounded-lg border border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-300 hover:bg-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-2xl font-bold text-neon-green">Add New Sale</CardTitle>
              <div className="w-10"></div> {/* Placeholder for alignment */}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-gray-300">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button" // Added type="button"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600",
                        !form.watch("date") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-neon-green" />
                      {form.watch("date") ? format(form.watch("date"), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border border-gray-700 text-gray-100">
                    <Calendar
                      mode="single"
                      selected={form.watch("date")}
                      onSelect={(date) => form.setValue("date", date!)}
                      initialFocus
                      className="text-gray-100"
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.date && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="item" className="text-gray-300">Item</Label>
                <Input
                  id="item"
                  type="text"
                  {...form.register("item")}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                />
                {form.formState.errors.item && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.item.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category" className="text-gray-300">Category</Label>
                <Input
                  id="category"
                  type="text"
                  {...form.register("category")}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                />
                {form.formState.errors.category && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="amount" className="text-gray-300">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...form.register("amount")}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                />
                {form.formState.errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment_type" className="text-gray-300">Payment Type</Label>
                <Select onValueChange={(value) => form.setValue("payment_type", value)} value={form.watch("payment_type")}>
                  <SelectTrigger className="w-full mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border border-gray-700 text-gray-100">
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.payment_type && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.payment_type.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="note" className="text-gray-300">Note (Optional)</Label>
                <Textarea
                  id="note"
                  {...form.register("note")}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                />
              </div>

              <Button type="submit" className="w-full bg-neon-green hover:bg-neon-green/90 text-primary-foreground shadow-neon-green-sm transition-all duration-300">
                Add Sale
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AddSale;