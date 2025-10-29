import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, ArrowLeft, PlusCircle, MinusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';

const itemSchema = z.object({
  item_name: z.string().min(1, "Item name is required."),
  unit: z.preprocess(
    (val) => Number(val),
    z.number().positive("Unit must be a positive number.")
  ),
  price_per_unit: z.preprocess(
    (val) => Number(val),
    z.number().positive("Price per unit must be a positive number.")
  ),
  total: z.preprocess(
    (val) => Number(val),
    z.number().positive("Total amount must be a positive number.")
  ),
});

const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  items: z.array(itemSchema).min(1, "At least one item is required."),
  payment_mode: z.string().min(1, "Payment mode is required."),
  note: z.string().optional(),
});

const AddExpense = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      items: [{ item_name: "", unit: 0, price_per_unit: 0, total: 0 }],
      payment_mode: "",
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Effect to update total when unit or price_per_unit changes for any item
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && name.startsWith('items.') && (name.endsWith('.unit') || name.endsWith('.price_per_unit'))) {
        const index = parseInt(name.split('.')[1]);
        const unit = form.getValues(`items.${index}.unit`);
        const price_per_unit = form.getValues(`items.${index}.price_per_unit`);
        if (unit > 0 && price_per_unit > 0) {
          form.setValue(`items.${index}.total`, unit * price_per_unit, { shouldValidate: true });
        } else {
          form.setValue(`items.${index}.total`, 0, { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("You must be logged in to add an expense.");
      return;
    }

    const expensesToInsert = values.items.map(item => ({
      user_id: user.id,
      date: format(values.date, 'yyyy-MM-dd'),
      item_name: item.item_name,
      unit: item.unit,
      price_per_unit: item.price_per_unit,
      total: item.total,
      payment_mode: values.payment_mode,
      note: values.note,
    }));

    const { error } = await supabase
      .from('expenses')
      .insert(expensesToInsert);

    if (error) {
      console.error("Error adding expenses:", error);
      showError("Failed to add expenses: " + error.message);
    } else {
      showSuccess("Expenses added successfully!");
      form.reset({
        date: new Date(),
        items: [{ item_name: "", unit: 0, price_per_unit: 0, total: 0 }],
        payment_mode: "",
        note: "",
      });
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">Add New Expense</CardTitle>
            <div className="w-10"></div> {/* Placeholder for alignment */}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("date") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("date") ? format(form.watch("date"), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("date")}
                    onSelect={(date) => form.setValue("date", date!)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.date && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>
              )}
            </div>

            <Separator />

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Expense Items</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 border p-4 rounded-md relative">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    className="absolute top-2 right-2 h-7 w-7"
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <Label htmlFor={`items.${index}.item_name`}>Item Name</Label>
                  <Input
                    id={`items.${index}.item_name`}
                    type="text"
                    {...form.register(`items.${index}.item_name`)}
                    className="mt-1"
                  />
                  {form.formState.errors.items?.[index]?.item_name && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.item_name?.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`items.${index}.unit`}>Unit</Label>
                    <Input
                      id={`items.${index}.unit`}
                      type="number"
                      step="0.01"
                      {...form.register(`items.${index}.unit`)}
                      className="mt-1"
                    />
                    {form.formState.errors.items?.[index]?.unit && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.unit?.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`items.${index}.price_per_unit`}>Price Per Unit</Label>
                    <Input
                      id={`items.${index}.price_per_unit`}
                      type="number"
                      step="0.01"
                      {...form.register(`items.${index}.price_per_unit`)}
                      className="mt-1"
                    />
                    {form.formState.errors.items?.[index]?.price_per_unit && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.price_per_unit?.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor={`items.${index}.total`}>Total Amount</Label>
                  <Input
                    id={`items.${index}.total`}
                    type="number"
                    step="0.01"
                    {...form.register(`items.${index}.total`)}
                    className="mt-1"
                    readOnly
                  />
                  {form.formState.errors.items?.[index]?.total && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.total?.message}</p>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ item_name: "", unit: 0, price_per_unit: 0, total: 0 })}
              className="w-full flex items-center justify-center"
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add Another Item
            </Button>
            {form.formState.errors.items && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.items.message}</p>
            )}

            <Separator />

            <div>
              <Label htmlFor="payment_mode">Payment Mode</Label>
              <Select onValueChange={(value) => form.setValue("payment_mode", value)} value={form.watch("payment_mode")}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payment_mode && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.payment_mode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                {...form.register("note")}
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
              Add Expenses
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddExpense;