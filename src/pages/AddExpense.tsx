import React, { useEffect, useState, useRef } from 'react';
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
import { Calendar as CalendarIcon, ArrowLeft, PlusCircle, MinusCircle, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';


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
  bill_image_url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  note: z.string().optional(),
});

const AddExpense = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      items: [{ item_name: "", unit: 0, price_per_unit: 0, total: 0 }],
      payment_mode: "",
      bill_image_url: "",
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      form.setValue("bill_image_url", ""); // Clear URL input if file is selected
    } else {
      setSelectedFile(null);
      setFilePreviewUrl(null);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("You must be logged in to add an expense.");
      return;
    }

    let finalBillImageUrl = values.bill_image_url;
    const toastId = showLoading("Adding expenses...");

    try {
      if (selectedFile) {
        const fileExtension = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/expenses/${Date.now()}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bill_images')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error("Failed to upload bill image: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('bill_images')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded image.");
        }
        finalBillImageUrl = publicUrlData.publicUrl;
      }

      const expensesToInsert = values.items.map(item => ({
        user_id: user.id,
        date: format(values.date, 'yyyy-MM-dd'),
        item_name: item.item_name,
        unit: item.unit,
        price_per_unit: item.price_per_unit,
        total: item.total, // Send total as it's part of the schema and might be used for calculations
        payment_mode: values.payment_mode,
        bill_image_url: finalBillImageUrl || null,
        note: values.note,
      }));

      const { error: insertError } = await supabase
        .from('expenses')
        .insert(expensesToInsert);

      if (insertError) {
        throw new Error("Failed to add expenses: " + insertError.message);
      }

      showSuccess("Expenses added successfully!");
      form.reset({ // Reset form fields to default values
        date: new Date(),
        items: [{ item_name: "", unit: 0, price_per_unit: 0, total: 0 }],
        payment_mode: "",
        bill_image_url: "",
        note: "",
      });
      setSelectedFile(null); // Clear selected file state
      setFilePreviewUrl(null); // Clear file preview URL
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input element
      }
      // Removed navigate('/dashboard');
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

  const currentBillImageUrl = form.watch("bill_image_url");

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 text-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl mt-8"
      >
        <Card className="bg-gray-800 text-gray-100 shadow-lg rounded-lg border border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-gray-300 hover:bg-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-2xl font-bold text-destructive">Add New Expense</CardTitle>
              <div className="w-10"></div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <Separator className="bg-gray-700" />

              <h3 className="text-lg font-semibold text-gray-100">Expense Items</h3>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-700 hover:bg-gray-700">
                      <TableHead className="w-[200px] text-gray-300">Item Name</TableHead>
                      <TableHead className="w-[100px] text-gray-300">Unit</TableHead>
                      <TableHead className="w-[120px] text-gray-300">Price/Unit</TableHead>
                      <TableHead className="w-[120px] text-gray-300">Total</TableHead>
                      <TableHead className="w-[60px] text-center text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id} className="border-gray-700">
                        <TableCell>
                          <Input
                            id={`items.${index}.item_name`}
                            type="text"
                            {...form.register(`items.${index}.item_name`)}
                            placeholder="e.g., Office Supplies"
                            className="bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                          />
                          {form.formState.errors.items?.[index]?.item_name && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.item_name?.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            id={`items.${index}.unit`}
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.unit`, { valueAsNumber: true })}
                            placeholder="1"
                            className="bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                          />
                          {form.formState.errors.items?.[index]?.unit && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.unit?.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            id={`items.${index}.price_per_unit`}
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.price_per_unit`, { valueAsNumber: true })}
                            placeholder="10.00"
                            className="bg-gray-700 text-gray-100 border-gray-600 focus:border-neon-green"
                          />
                          {form.formState.errors.items?.[index]?.price_per_unit && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.price_per_unit?.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            id={`items.${index}.total`}
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.total`, { valueAsNumber: true })}
                            readOnly
                            className="bg-gray-700 text-gray-100 border-gray-600"
                          />
                          {form.formState.errors.items?.[index]?.total && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.total?.message}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => remove(index)}
                              className="h-7 w-7 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ item_name: "", unit: 0, price_per_unit: 0, total: 0 })}
                className="w-full flex items-center justify-center mt-4 bg-gray-700 text-neon-green border-neon-green hover:bg-gray-600 hover:text-neon-green shadow-neon-green-sm"
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add Another Item
              </Button>
              {form.formState.errors.items && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.items.message}</p>
              )}

              <Separator className="bg-gray-700" />

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
                {filePreviewUrl && (
                  <div className="mt-2 p-2 border rounded-md bg-gray-700 border-gray-600 flex items-center justify-center">
                    <img src={filePreviewUrl} alt="Bill Preview" className="max-h-40 object-contain rounded-md" />
                  </div>
                )}
                {currentBillImageUrl && !selectedFile && ( // Show existing URL image if no new file is selected
                  <div className="mt-2 p-2 border rounded-md bg-gray-700 border-gray-600 flex items-center justify-center">
                    <img src={currentBillImageUrl} alt="Existing Bill" className="max-h-40 object-contain rounded-md" />
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
                Add Expenses
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AddExpense;