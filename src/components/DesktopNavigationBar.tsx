import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Home, PlusCircle, MinusCircle, TrendingUp, User } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const DesktopNavigationBar = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate('/login');
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Add Sale', path: '/add-sale', icon: PlusCircle },
    { name: 'Add Expense', path: '/add-expense', icon: MinusCircle },
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-md hidden md:block"> {/* Added sticky, top-0, z-50 */}
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
          <Button onClick={handleLogout} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavigationBar;