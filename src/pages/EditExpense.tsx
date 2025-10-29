import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Calendar as CalendarIcon, ArrowLeft, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  item_name: z.string().min(1, "Item name is required."),
  unit: z.preprocess((val) => Number(val), z.number().positive("Unit must be a positive number.")),
  price_per_unit: z.preprocess((val) => Number(val), z.number().positive("Price per unit must be a positive number.")),
  total: z.preprocess((val) => Number(val), z.number().positive("Total must be a positive number.")),
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

  useEffect(() => {
    const fetchExpense = async () => {
      if (!user || !id) return;
      const { data, error } = await supabase.from('expenses').select('*').eq('id', id).eq('user_id', user.id).single();
      if (error) {
        showError("Failed to fetch expense details.");
        navigate('/reports');
      } else if (data) {
        form.reset({ ...data, date: parseISO(data.date) });
        setExistingImageUrl(data.bill_image_url || null);
      }
    };
    if (user) fetchExpense();
  }, [user, id, navigate, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'unit' || name === 'price_per_unit') {
        const unit = form.getValues('unit');
        const price = form.getValues('price_per_unit');
        form.setValue('total', (unit || 0) * (price || 0));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setExistingImageUrl(null);
      form.setValue("bill_image_url", "");
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setExistingImageUrl(null);
    form.setValue("bill_image_url", "");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !id) return;
    const toastId = showLoading("Updating expense...");
    let finalBillImageUrl = existingImageUrl;

    try {
      if (selectedFile) {
        const filePath = `${user.id}/expenses/${Date.now()}.${selectedFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('bill_images').upload(filePath, selectedFile);
        if (uploadError) throw new Error("Failed to upload new image: " + uploadError.message);
        const { data: urlData } = supabase.storage.from('bill_images').getPublicUrl(filePath);
        finalBillImageUrl = urlData.publicUrl;
      } else if (!existingImageUrl) {
        finalBillImageUrl = null;
      }

      const { error: updateError } = await supabase.from('expenses').update({
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
        bill_image_url: finalBillImageUrl,
      }).eq('id', id);

      if (updateError) throw new Error("Failed to update expense: " + updateError.message);

      showSuccess("Expense updated successfully!");
      navigate('/reports');
    } catch (error: any) {
      showError(error.message);
    } finally {
      dismissToast(toastId);
    }
  };

  const displayImageUrl = filePreviewUrl || existingImageUrl;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-destructive">Edit Expense</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <div><Label>Item Name</Label><Input {...form.register("item_name")} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Unit</Label><Input type="number" {...form.register("unit")} /></div>
            <div><Label>Price/Unit</Label><Input type="number" step="0.01" {...form.register("price_per_unit")} /></div>
            <div><Label>Total</Label><Input type="number" step="0.01" {...form.register("total")} readOnly className="bg-muted" /></div>
          </div>
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
          <div>
            <Label>Payment Mode</Label>
            <Select onValueChange={(value) => form.setValue("payment_mode", value)} value={form.watch("payment_mode")}>
              <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Note (Optional)</Label><Textarea {...form.register("note")} /></div>
          <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90">Update Expense</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EditExpense;