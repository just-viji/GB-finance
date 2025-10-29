import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, MinusCircle, FileText } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    { name: 'Add Sale', icon: PlusCircle, path: '/add-sale', color: 'text-green-600' },
    { name: 'Add Expense', icon: MinusCircle, path: '/add-expense', color: 'text-red-600' },
    { name: 'View Reports', icon: FileText, path: '/reports', color: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {actions.map((action) => (
        <Card
          key={action.name}
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate(action.path)}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <action.icon className={`w-8 h-8 mb-2 ${action.color}`} />
            <p className="text-sm font-semibold text-center text-foreground">{action.name}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuickActions;