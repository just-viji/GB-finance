import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User as UserIcon, LogOut } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') { // PGRST116 means no row found, which is fine for new users
        showError("Failed to fetch profile.");
      } else if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setAvatarUrl(data.avatar_url || null);
      }
      setLoadingProfile(false);
    };
    if (user) fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate('/login');
    }
  };

  if (loadingProfile) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">Loading profile...</div>;
  }

  const fallbackInitials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold text-primary">User Profile</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4 mb-6">
          <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={avatarUrl || undefined} alt="User Avatar" />
            <AvatarFallback className="bg-muted text-primary text-3xl font-bold">
              {fallbackInitials || <UserIcon className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} readOnly className="bg-muted cursor-not-allowed" />
          </div>
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" type="text" value={firstName} readOnly className="bg-muted cursor-not-allowed" />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" type="text" value={lastName} readOnly className="bg-muted cursor-not-allowed" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center pt-4">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-center text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Profile;