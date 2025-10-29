import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, PlusCircle, MinusCircle, TrendingUp, User } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const DesktopNavigationBar = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();

  // The handleLogout function is no longer needed here as the button is removed.
  // If you need logout functionality elsewhere, it should be handled there.

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Add Sale', path: '/add-sale', icon: PlusCircle },
    { name: 'Add Expense', path: '/add-expense', icon: MinusCircle },
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-md hidden md:block">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">GB Finance</Link>
        <div className="flex items-center space-x-4">
          {navLinks.map((link) => (
            <Button key={link.name} variant="ghost" asChild className="text-primary-foreground hover:bg-primary/80">
              <Link to={link.path}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.name}
              </Link>
            </Button>
          ))}
          {/* Logout button removed */}
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavigationBar;