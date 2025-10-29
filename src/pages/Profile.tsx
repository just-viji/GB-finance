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
  const { user, isLoading } = useSupabase();
  const [loadingProfile, setLoadingProfile] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      avatar_url: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new users
        console.error("Error fetching profile:", error);
        showError("Failed to fetch profile: " + error.message);
      } else if (data) {
        form.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          avatar_url: data.avatar_url || "",
        });
      }
      setLoadingProfile(false);
    };

    if (user) {
      fetchProfile();
    } else if (!isLoading) {
      showError("You must be logged in to view your profile.");
      navigate('/login');
    }
  }, [user, isLoading, navigate, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Authentication error. Please log in again.");
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        avatar_url: values.avatar_url || null, // Store null if empty string
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error("Error updating profile:", error);
      showError("Failed to update profile: " + error.message);
    } else {
      showSuccess("Profile updated successfully!");
    }
  };

  if (isLoading || loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

  const currentAvatarUrl = form.watch("avatar_url");
  const firstNameInitial = form.watch("first_name") ? form.watch("first_name")[0].toUpperCase() : '';
  const lastNameInitial = form.watch("last_name") ? form.watch("last_name")[0].toUpperCase() : '';
  const fallbackInitials = `${firstNameInitial}${lastNameInitial}`;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-400">User Profile</CardTitle>
            <div className="w-10"></div> {/* Placeholder for alignment */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={currentAvatarUrl} alt="User Avatar" />
              <AvatarFallback className="bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100 text-3xl font-bold">
                {fallbackInitials || <UserIcon className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                type="text"
                {...form.register("first_name")}
                className="mt-1"
              />
              {form.formState.errors.first_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.first_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                type="text"
                {...form.register("last_name")}
                className="mt-1"
              />
              {form.formState.errors.last_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.last_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
              <Input
                id="avatar_url"
                type="url"
                {...form.register("avatar_url")}
                className="mt-1"
              />
              {form.formState.errors.avatar_url && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.avatar_url.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;