import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyINR } from '@/lib/currency';

interface TransactionListItemProps {
  type: 'sale' | 'expense';
  item: string;
  amount: number;
  date: string;
  category?: string; // For sales
  paymentMode?: string; // For expenses
}

const DashboardTransactionListItem: React.FC<TransactionListItemProps> = ({
  type,
  item,
  amount,
  date,
  category,
  paymentMode,
}) => {
  const formattedDate = isValid(parseISO(date)) ? format(parseISO(date), 'MMM dd, yyyy') : date;
  const isSale = type === 'sale';
  const icon = isSale ? <ArrowUpCircle className="h-5 w-5 text-neon-green" /> : <ArrowDownCircle className="h-5 w-5 text-destructive" />;
  const amountColor = isSale ? 'text-neon-green' : 'text-destructive';

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0 border-gray-700">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="font-medium text-gray-100">{item}</p>
          <p className="text-sm text-gray-400">
            {isSale ? category : paymentMode} &bull; {formattedDate}
          </p>
        </div>
      </div>
      <p className={cn("font-semibold", amountColor)}>
        {isSale ? '+' : ''}{formatCurrencyINR(amount)}
      </p>
    </div>
  );
};

export default DashboardTransactionListItem;