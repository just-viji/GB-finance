import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, PlusCircle, MinusCircle, TrendingUp, User as UserIcon, LogOut } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DesktopNavigationBar = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSupabase();
  const [displayName, setDisplayName] = useState<string>('Guest');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setDisplayName('Guest');
        setAvatarUrl(null);
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new users
        console.error("Error fetching profile for navigation bar:", error);
        setDisplayName(user.email || 'User');
      } else if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        setDisplayName(name || user.email || 'User');
        setAvatarUrl(data.avatar_url);
      } else {
        setDisplayName(user.email || 'User');
        setAvatarUrl(null);
      }
      setLoadingProfile(false);
    };

    if (!isLoading) {
      fetchProfile();
    }
  }, [user, isLoading]);

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
  ];

  const firstNameInitial = displayName ? displayName[0].toUpperCase() : '';
  const lastNameInitial = displayName.split(' ').length > 1 ? displayName.split(' ')[1][0].toUpperCase() : '';
  const fallbackInitials = `${firstNameInitial}${lastNameInitial}`.trim();

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

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || undefined} alt="User Avatar" />
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm font-bold">
                      {fallbackInitials || <UserIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavigationBar;