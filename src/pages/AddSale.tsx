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

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  amount: z.preprocess((val) => Number(val), z.number().positive("Amount must be a positive number.")),
  payment_type: z.string().min(1, "Payment type is required."),
  note: z.string().optional(),
});

const AddSale = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { date: new Date(), amount: "", payment_type: "", note: "" }, // Changed amount default to empty string
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("You must be logged in to add a sale.");
      return;
    }

    const { error } = await supabase.from('sales').insert({
      user_id: user.id,
      date: format(values.date, 'yyyy-MM-dd'),
      ...values,
    });

    if (error) {
      showError("Failed to add sale: " + error.message);
    } else {
      showSuccess("Sale added successfully!");
      form.reset({ date: new Date(), amount: "", payment_type: "", note: "" }); // Reset with empty amount
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-primary">Add New Sale</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !form.watch("date") && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("date") ? format(form.watch("date"), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={form.watch("date")} onSelect={(date) => form.setValue("date", date!)} initialFocus />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>}
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
            {form.formState.errors.amount && <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>}
          </div>
          <div>
            <Label htmlFor="payment_type">Payment Type</Label>
            <Select onValueChange={(value) => form.setValue("payment_type", value)} value={form.watch("payment_type")}>
              <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Gpay">Gpay</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.payment_type && <p className="text-red-500 text-sm mt-1">{form.formState.errors.payment_type.message}</p>}
          </div>
          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea id="note" {...form.register("note")} />
          </div>
          <Button type="submit" className="w-full">Add Sale</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddSale;