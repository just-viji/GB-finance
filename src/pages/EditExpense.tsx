import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Calendar as CalendarIcon, ArrowLeft, PlusCircle, MinusCircle, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';
import { formatCurrencyINR } from '@/lib/currency';

const itemSchema = z.object({
  item_name: z.string().min(1, "Item name is required."),
  unit: z.preprocess((val) => Number(val), z.number().positive("Unit must be a positive number.")),
  price_per_unit: z.preprocess((val) => Number(val), z.number().positive("Price per unit must be a positive number.")),
  total: z.preprocess((val) => Number(val), z.number().min(0)),
});

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  items: z.array(itemSchema).min(1, "At least one item is required."),
  payment_mode: z.string().min(1, "Payment mode is required."),
  bill_image_url: z.string().url().optional().or(z.literal('')),
  note: z.string().optional(),
});

const EditExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");
  const grandTotal = watchedItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

  useEffect(() => {
    const fetchExpense = async () => {
      if (!user || !id) return;
      const { data: transactionData, error: transactionError } = await supabase.from('expense_transactions').select('*').eq('id', id).single();
      if (transactionError) {
        showError("Failed to fetch expense details.");
        return navigate('/reports');
      }
      const { data: itemsData, error: itemsError } = await supabase.from('expense_items').select('*').eq('transaction_id', id);
      if (itemsError) {
        showError("Failed to fetch expense items.");
        return navigate('/reports');
      }
      form.reset({
        ...transactionData,
        date: parseISO(transactionData.date),
        items: itemsData || [],
      });
      setExistingImageUrl(transactionData.bill_image_url || null);
    };
    if (user) fetchExpense();
  }, [user, id, navigate, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && name.startsWith('items.') && (name.endsWith('.unit') || name.endsWith('.price_per_unit'))) {
        const index = parseInt(name.split('.')[1]);
        const unit = form.getValues(`items.${index}.unit`);
        const price = form.getValues(`items.${index}.price_per_unit`);
        const currentTotal = form.getValues(`items.${index}.total`);
        const newTotal = (unit || 0) * (price || 0);
        
        if (currentTotal !== newTotal) {
          form.setValue(`items.${index}.total`, newTotal, { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setExistingImageUrl(null); // Clear existing image when a new file is selected
      form.setValue("bill_image_url", ""); // Clear form's bill_image_url
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setExistingImageUrl(null); // Explicitly remove existing image
    form.setValue("bill_image_url", ""); // Clear form's bill_image_url
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !id) {
      showError("User or transaction ID missing.");
      return;
    }
    const toastId = showLoading("Updating expense...");
    let finalBillImageUrl: string | null = null;

    try {
      if (selectedFile) {
        // User selected a new file, upload it
        const filePath = `${user.id}/expenses/${Date.now()}.${selectedFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('bill_images').upload(filePath, selectedFile, { upsert: true });
        if (uploadError) throw new Error("Failed to upload new image: " + uploadError.message);
        const { data: urlData } = supabase.storage.from('bill_images').getPublicUrl(filePath);
        finalBillImageUrl = urlData.publicUrl;
      } else if (existingImageUrl && values.bill_image_url !== "") {
        // No new file selected, but there was an existing image and it wasn't explicitly removed
        finalBillImageUrl = existingImageUrl;
      }
      // If selectedFile is null AND existingImageUrl is null (or was explicitly cleared by handleRemoveImage),
      // then finalBillImageUrl correctly remains null.

      const calculatedGrandTotal = values.items.reduce((sum, item) => sum + item.total, 0);

      const { error: transactionError } = await supabase.from('expense_transactions').update({
        date: format(values.date, 'yyyy-MM-dd'),
        payment_mode: values.payment_mode,
        note: values.note,
        bill_image_url: finalBillImageUrl,
        grand_total: calculatedGrandTotal,
      }).eq('id', id);
      if (transactionError) throw new Error("Failed to update transaction: " + transactionError.message);

      // Delete old items and insert new ones
      const { error: deleteError } = await supabase.from('expense_items').delete().eq('transaction_id', id);
      if (deleteError) throw new Error("Failed to clear old items: " + deleteError.message);

      const itemsToInsert = values.items.map(item => ({ transaction_id: id, user_id: user.id, ...item }));
      const { error: insertError } = await supabase.from('expense_items').insert(itemsToInsert);
      if (insertError) throw new Error("Failed to insert new items: " + insertError.message);

      showSuccess("Expense updated successfully!");
      navigate('/reports');
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      dismissToast(toastId);
    }
  };

  const displayImageUrl = filePreviewUrl || existingImageUrl;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/reports')}><ArrowLeft className="h-5 w-5" /></Button>
          <CardTitle className="text-2xl font-bold text-destructive">Edit Expense</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !form.watch("date") && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("date") ? format(form.watch("date"), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.watch("date")} onSelect={(date) => form.setValue("date", date!)} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select onValueChange={(value) => form.setValue("payment_mode", value)} value={form.watch("payment_mode")}>
                <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Gpay">Gpay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Expense Items</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg">
                <div className="col-span-12 md:col-span-4"><Label>Item Name</Label><Input {...form.register(`items.${index}.item_name`)} /></div>
                <div className="col-span-6 md:col-span-2"><Label>Unit</Label><Input type="number" {...form.register(`items.${index}.unit`)} /></div>
                <div className="col-span-6 md:col-span-2"><Label>Price/Unit</Label><Input type="number" step="0.01" {...form.register(`items.${index}.price_per_unit`)} /></div>
                <div className="col-span-10 md:col-span-3"><Label>Total</Label><Input type="number" step="0.01" {...form.register(`items.${index}.total`)} readOnly className="bg-muted" /></div>
                <div className="col-span-2 md:col-span-1">{fields.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><MinusCircle className="h-4 w-4" /></Button>}</div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => append({ item_name: "", unit: 1, price_per_unit: 0, total: 0 })} className="w-full"><PlusCircle className="h-4 w-4 mr-2" /> Add Item</Button>
          </div>

          <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
            <span className="text-lg font-bold">Grand Total</span>
            <span className="text-2xl font-bold text-destructive">{formatCurrencyINR(grandTotal)}</span>
          </div>

          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bill Image</Label>
              <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
              {displayImageUrl && (
                <div className="relative mt-2 w-fit">
                  <img src={displayImageUrl} alt="Bill Preview" className="max-h-40 rounded-md" />
                  <Button type="button" variant="ghost" size="icon" onClick={handleRemoveImage} className="absolute top-1 right-1 text-red-500"><XCircle className="h-5 w-5" /></Button>
                </div>
              )}
            </div>
            <div><Label>Note (Optional)</Label><Textarea {...form.register("note")} /></div>
          </div>
          
          <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90">Update Expense</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EditExpense;