import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart2, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 flex-col bg-white border-r hidden md:flex fixed h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">GB Finance</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-primary/10 hover:text-primary",
              location.pathname === item.path && "bg-primary/10 text-primary font-semibold"
            )}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 mt-auto">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-gray-700 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;