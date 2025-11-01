import React, { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { Button } from '@/components/ui/button';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Upload } from 'lucide-react';

interface ImportData {
  sales: any[];
  expenseTransactions: any[];
  expenseItems: any[];
}

const DataImport = () => {
  const { user } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const toastId = showLoading('Importing data...');

    try {
      // Read file content
      const fileContent = await file.text();
      const importData: ImportData = JSON.parse(fileContent);

      // Import sales
      if (importData.sales && importData.sales.length > 0) {
        const salesWithUserId = importData.sales.map(sale => ({
          ...sale,
          user_id: user.id,
          date: sale.date // Ensure date is in correct format
        }));

        const { error: salesError } = await supabase
          .from('sales')
          .insert(salesWithUserId);

        if (salesError) throw new Error(`Failed to import sales: ${salesError.message}`);
      }

      // Import expense transactions
      if (importData.expenseTransactions && importData.expenseTransactions.length > 0) {
        const transactionsWithUserId = importData.expenseTransactions.map(transaction => ({
          ...transaction,
          user_id: user.id,
          date: transaction.date // Ensure date is in correct format
        }));

        const { error: transactionsError } = await supabase
          .from('expense_transactions')
          .insert(transactionsWithUserId);

        if (transactionsError) throw new Error(`Failed to import expense transactions: ${transactionsError.message}`);
      }

      // Import expense items
      if (importData.expenseItems && importData.expenseItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('expense_items')
          .insert(importData.expenseItems);

        if (itemsError) throw new Error(`Failed to import expense items: ${itemsError.message}`);
      }

      showSuccess('Data imported successfully!');
    } catch (error: any) {
      showError(error.message || 'Failed to import data');
      console.error(error);
    } finally {
      dismissToast(toastId);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Import Data</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Import your financial data from a backup file.
      </p>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleImportData}
        className="hidden"
        id="import-file"
      />
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        className="w-full"
        variant="outline"
      >
        <Upload className="h-4 w-4 mr-2" />
        Import Data
      </Button>
    </div>
  );
};

export default DataImport;