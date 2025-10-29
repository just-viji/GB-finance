import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, TrendingUp, LogOut } from 'lucide-react'; // Removed PlusCircle, MinusCircle, User
import { showSuccess, showError } from '@/utils/toast';
import { motion } from 'framer-motion';

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
    // Removed 'Add Sale', 'Add Expense', 'Profile'
    { name: 'Reports', path: '/reports', icon: TrendingUp },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="sticky top-0 z-50 bg-gray-900 text-gray-100 p-4 shadow-lg hidden md:block border-b border-gray-700"
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-neon-green">GB Finance</Link>
        <div className="flex items-center space-x-4">
          {navLinks.map((link) => (
            <Button
              key={link.name}
              variant="ghost"
              asChild
              className="text-gray-100 hover:bg-gray-700 hover:text-neon-green transition-colors duration-200"
            >
              <Link to={link.path}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.name}
              </Link>
            </Button>
          ))}
          {user && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-100 hover:bg-gray-700 hover:text-destructive transition-colors duration-200"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default DesktopNavigationBar;