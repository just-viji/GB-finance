import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MobileBottomNavigationBar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings }, // Added Settings link
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center text-xs font-medium h-full w-full transition-colors duration-200",
              location.pathname === item.path ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            {item.name}
          </Link>
        ))}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNavigationBar;