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
import { Calendar as CalendarIcon, ArrowLeft, Image as ImageIcon, UploadCloud, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { motion } from 'framer-motion';

const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
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
  payment_mode: z.string().min(1, "Payment mode is required."),
  bill_image_url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  note: z.string().optional(),
});

const EditExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      item_name: "",
      unit: 0,
      price_per_unit: 0,
      total: 0,
      payment_mode: "",
      bill_image_url: "",
      note: "",
    },
  });

  useEffect(() => {
    const fetchExpense = async () => {
      if (!user || !id) return;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('user.id', user.id)
        .single();

      if (error) {
        console.error("Error fetching expense:", error);
        showError("Failed to fetch expense details: " + error.message);
        navigate('/reports');
      } else if (data) {
        form.reset({
          date: parseISO(data.date),
          item_name: data.item_name,
          unit: data.unit,
          price_per_unit: data.price_per_unit,
          total: data.total,
          payment_mode: data.payment_mode,
          bill_image_url: data.bill_image_url || "",
          note: data.note || "",
        });
        setExistingImageUrl(data.bill_image_url || null);
      }
    };

    if (user && id) {
      fetchExpense();
    } else if (!isLoading && !user) {
      showError("You must be logged in to edit an expense.");
      navigate('/login');
    }
  }, [user, id, isLoading, navigate, form]);

  // Effect to update total when unit or price_per_unit changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'unit' || name === 'price_per_unit') {
        const unit = form.getValues('unit');
        const price_per_unit = form.getValues('price_per_unit');
        if (unit > 0 && price_per_unit > 0) {
          form.setValue('total', unit * price_per_unit);
        } else {
          form.setValue('total', 0);
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
      // Clear existing image URL if a new file is selected
      setExistingImageUrl(null);
      form.setValue("bill_image_url", "");
    } else {
      setSelectedFile(null);
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setExistingImageUrl(null);
    form.setValue("bill_image_url", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !id) {
      showError("Authentication error or expense ID missing.");
      return;
    }

    let finalBillImageUrl = values.bill_image_url;
    const toastId = showLoading("Updating expense...");

    try {
      if (selectedFile) {
        // If a new file is selected, upload it
        const fileExtension = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/expenses/${Date.now()}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bill_images')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error("Failed to upload new bill image: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('bill_images')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for new uploaded image.");
        }
        finalBillImageUrl = publicUrlData.publicUrl;

        // Optionally, delete the old image from storage if it existed
        // This requires parsing the old URL to get the path, which can be complex.
        // For simplicity, we'll leave old images in storage for now.
      } else if (existingImageUrl && !form.watch("bill_image_url")) {
        // If there was an existing image but it was removed (by clearing the input or clicking remove)
        finalBillImageUrl = null;
        // Optionally, delete the image from storage here
      } else if (!existingImageUrl && form.watch("bill_image_url")) {
        // If user manually entered a URL after clearing file input
        finalBillImageUrl = form.watch("bill_image_url");
      } else if (existingImageUrl && !selectedFile) {
        // If no new file and existing image was not removed, keep the existing URL
        finalBillImageUrl = existingImageUrl;
      } else {
        finalBillImageUrl = null; // No image at all
      }


      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          date: format(values.date, 'yyyy-MM-dd'),
          item_name: values.item_name,
          unit: values.unit,
          price_per_unit: values.price_per_unit,
          total: values.total,
          payment_mode: values.payment_mode,
          bill_image_url: finalBillImageUrl,
          note: values.note,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error("Failed to update expense: " + updateError.message);
      }

      showSuccess("Expense updated successfully!");
      navigate('/reports');
    } catch (error: any) {
      console.error("Error in onSubmit:", error);
      showError(error.message || "An unexpected error occurred.");
    } finally {
      dismissToast(toastId);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">Loading...</div>;
  }

  const displayImageUrl = filePreviewUrl || existingImageUrl;

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
              <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/reports')} className="text-gray-300 hover:bg-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-2xl font-bold text-destructive">Edit Expense</CardTitle>
              <div className="w-10"></div>
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
                <Label htmlFor="item_name" className="text-gray-300">Item Name</Label>
                <Input
                  id="item_name"
                  type="text"
                  {...form.register("item_name")}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                />
                {form.formState.errors.item_name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.item_name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit" className="text-gray-300">Unit</Label>
                  <Input
                    id="unit"
                    type="number"
                    step="0.01"
                    {...form.register("unit", { valueAsNumber: true })}
                    className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                  />
                  {form.formState.errors.unit && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.unit.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="price_per_unit" className="text-gray-300">Price Per Unit</Label>
                  <Input
                    id="price_per_unit"
                    type="number"
                    step="0.01"
                    {...form.register("price_per_unit", { valueAsNumber: true })}
                    className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                  />
                  {form.formState.errors.price_per_unit && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.price_per_unit.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="total" className="text-gray-300">Total Amount</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  {...form.register("total", { valueAsNumber: true })}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600"
                  readOnly
                />
                {form.formState.errors.total && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.total.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bill_image_upload" className="text-gray-300">Bill Image (Optional)</Label>
                <Input
                  id="bill_image_upload"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-neon-green file:text-primary-foreground
                  hover:file:bg-neon-green/90"
                />
                {(displayImageUrl) && (
                  <div className="relative mt-2 p-2 border rounded-md bg-gray-700 border-gray-600 flex items-center justify-center">
                    <img src={displayImageUrl} alt="Bill Preview" className="max-h-40 object-contain rounded-md" />
                    <Button
                      type="button" // Added type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                )}
                {form.formState.errors.bill_image_url && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.bill_image_url.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment_mode" className="text-gray-300">Payment Mode</Label>
                <Select onValueChange={(value) => form.setValue("payment_mode", value)} value={form.watch("payment_mode")}>
                  <SelectTrigger className="w-full mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border border-gray-700 text-gray-100">
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
                <Label htmlFor="note" className="text-gray-300">Note (Optional)</Label>
                <Textarea
                  id="note"
                  {...form.register("note")}
                  className="mt-1 bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                />
              </div>

              <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90 text-primary-foreground shadow-sm transition-all duration-300">
                Update Expense
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EditExpense;