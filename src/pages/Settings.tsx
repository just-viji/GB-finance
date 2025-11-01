import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Moon, Sun, Download, Upload } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useTheme } from '@/components/ThemeProvider';
import DataImport from '@/components/DataImport';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  const handleExportData = async () => {
    if (!user) return;
    
    try {
      // Fetch all user data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id);
      
      const { data: expenseTransactions, error: transactionsError } = await supabase
        .from('expense_transactions')
        .select('*')
        .eq('user_id', user.id);
      
      const transactionIds = expenseTransactions?.map(t => t.id) || [];
      const { data: expenseItems, error: itemsError } = await supabase
        .from('expense_items')
        .select('*')
        .in('transaction_id', transactionIds);
      
      if (salesError || transactionsError || itemsError) {
        throw new Error('Failed to fetch data for export');
      }
      
      // Create export object
      const exportData = {
        sales: salesData,
        expenseTransactions,
        expenseItems,
        exportDate: new Date().toISOString()
      };
      
      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showSuccess('Data exported successfully!');
    } catch (error) {
      showError('Failed to export data');
      console.error(error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-primary">Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <Label htmlFor="dark-mode" className="text-base">
              Dark Mode
            </Label>
          </div>
          <Switch
            id="dark-mode"
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </div>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5" />
            <Label htmlFor="notifications" className="text-base">
              Enable Notifications
            </Label>
          </div>
          <Switch
            id="notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5" />
            <Label htmlFor="auto-backup" className="text-base">
              Automatic Backups
            </Label>
          </div>
          <Switch
            id="auto-backup"
            checked={autoBackup}
            onCheckedChange={setAutoBackup}
          />
        </div>
        
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Data Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Export your financial data for backup or transfer to another device.
          </p>
          <Button onClick={handleExportData} className="w-full mb-4">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <DataImport />
        </div>
      </CardContent>
    </Card>
  );
};

export default Settings;