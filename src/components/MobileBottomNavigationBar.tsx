import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, PlusCircle, MinusCircle, TrendingUp, User, LogOut } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MobileBottomNavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Sale', path: '/add-sale', icon: PlusCircle },
    { name: 'Expense', path: '/add-expense', icon: MinusCircle },
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 shadow-lg border-t border-gray-700 z-50 md:hidden"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center text-xs font-medium h-full w-full transition-colors duration-200",
              location.pathname === item.path ? "text-neon-green bg-gray-800" : "text-gray-300 hover:bg-gray-800 hover:text-neon-green"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            {item.name}
          </Link>
        ))}
        {user && (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center text-xs font-medium h-full w-full transition-colors duration-200 text-gray-300 hover:bg-gray-800 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 mb-1" />
            Logout
          </button>
        )}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNavigationBar;