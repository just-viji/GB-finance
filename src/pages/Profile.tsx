import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User as UserIcon, LogOut } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  avatar_url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') { // PGRST116 means no row found, which is fine for new users
        showError("Failed to fetch profile.");
      } else if (data) {
        form.reset(data);
      }
      setLoadingProfile(false);
    };
    if (user) fetchProfile();
  }, [user, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    const toastId = showLoading("Updating profile...");

    try {
      let avatarUrl = values.avatar_url;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`; // Add timestamp to bust cache
      }

      const updates = {
        first_name: values.first_name,
        last_name: values.last_name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' }); // Use upsert to create if not exists, update if exists

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      dismissToast(toastId);
      showSuccess("Profile updated successfully!");
      
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear file input
      }
      
      form.setValue('avatar_url', avatarUrl, { shouldDirty: true }); // Update form state with new URL

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };

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

  const currentAvatarUrl = form.watch("avatar_url");
  const displayAvatarUrl = previewUrl || currentAvatarUrl;
  const fallbackInitials = `${form.watch("first_name")?.[0] || ''}${form.watch("last_name")?.[0] || ''}`.toUpperCase();

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center space-y-4 mb-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={displayAvatarUrl} alt="User Avatar" />
              <AvatarFallback className="bg-muted text-primary text-3xl font-bold">
                {fallbackInitials || <UserIcon className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Change Avatar
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} readOnly className="bg-muted cursor-not-allowed" />
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
          </div>
          <Button type="submit" className="w-full">Update Profile</Button>
        </form>
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