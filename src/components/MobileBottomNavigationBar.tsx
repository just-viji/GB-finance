import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, PlusCircle, MinusCircle, TrendingUp, User, LogOut } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const MobileBottomNavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSupabase();

  // The handleLogout function is no longer needed here as the button is removed.
  // If you need logout functionality elsewhere, it should be handled there.

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Sale', path: '/add-sale', icon: PlusCircle },
    { name: 'Expense', path: '/add-expense', icon: MinusCircle },
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground shadow-lg border-t border-primary-foreground/20 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center text-xs font-medium h-full w-full transition-colors",
              location.pathname === item.path ? "text-white bg-primary-foreground/20" : "text-primary-foreground hover:bg-primary-foreground/10"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            {item.name}
          </Link>
        ))}
        {/* Logout button removed */}
      </div>
    </nav>
  );
};

export default MobileBottomNavigationBar;