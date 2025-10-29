import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, TrendingUp, LogOut, User } from 'lucide-react'; // Added User icon
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
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Profile', path: '/profile', icon: User }, // Added Profile to mobile nav
    { name: 'Logout', action: handleLogout, icon: LogOut, isLogout: true }, // Added Logout to mobile nav
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
          item.isLogout ? (
            <button
              key={item.name}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center justify-center text-xs font-medium h-full w-full transition-colors duration-200 text-gray-300 hover:bg-gray-800 hover:text-destructive"
            >
              <item.icon className="h-5 w-5 mb-1" />
              {item.name}
            </button>
          ) : (
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
          )
        ))}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNavigationBar;