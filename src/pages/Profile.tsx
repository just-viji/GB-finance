import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const formSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  avatar_url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [loadingProfile, setLoadingProfile] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') {
        showError("Failed to fetch profile.");
      } else if (data) {
        form.reset(data);
      }
      setLoadingProfile(false);
    };
    if (user) fetchProfile();
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      ...values,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (error) {
      showError("Failed to update profile.");
    } else {
      showSuccess("Profile updated successfully!");
    }
  };

  if (loadingProfile) {
    return <div className="flex items-center justify-center">Loading profile...</div>;
  }

  const currentAvatarUrl = form.watch("avatar_url");
  const fallbackInitials = `${form.watch("first_name")?.[0] || ''}${form.watch("last_name")?.[0] || ''}`.toUpperCase();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-primary">User Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex justify-center mb-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={currentAvatarUrl} alt="User Avatar" />
              <AvatarFallback className="bg-muted text-primary text-3xl font-bold">
                {fallbackInitials || <UserIcon className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" type="text" {...form.register("first_name")} />
            {form.formState.errors.first_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.first_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" type="text" {...form.register("last_name")} />
            {form.formState.errors.last_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.last_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
            <Input id="avatar_url" type="url" {...form.register("avatar_url")} />
            {form.formState.errors.avatar_url && <p className="text-red-500 text-sm mt-1">{form.formState.errors.avatar_url.message}</p>}
          </div>
          <Button type="submit" className="w-full">Update Profile</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default Profile;