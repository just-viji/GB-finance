import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User as UserIcon, LogOut, Upload, XCircle } from 'lucide-react';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useSupabase(); // Use profile from context
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Profile data is now managed by SupabaseSessionProvider
    // We just need to set loading state based on context's isLoading
    if (!isLoading) {
      setLoadingProfile(false);
    }
  }, [isLoading]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Failed to log out: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate('/login');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    } else {
      setAvatarFile(null);
    }
  };

  const handleAvatarUpload = async () => {
    if (!user || !avatarFile) {
      showError("No avatar file selected.");
      return;
    }

    const toastId = showLoading("Uploading avatar...");

    try {
      const fileExtension = avatarFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExtension}`;

      // Upload the new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
        });

      if (uploadError) throw new Error("Failed to upload avatar: " + uploadError.message);

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData.publicUrl;

      // Update the user's profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) throw new Error("Failed to update profile with new avatar URL: " + updateError.message);

      showSuccess("Avatar updated successfully!");
      setAvatarFile(null); // Clear selected file
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
      // The SupabaseSessionProvider will automatically re-fetch the profile
      // and update the context, so no need to manually update state here.
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred during avatar upload.");
    } finally {
      dismissToast(toastId);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) {
      showError("No avatar to remove.");
      return;
    }

    const toastId = showLoading("Removing avatar...");

    try {
      // Extract the path from the public URL
      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user.id}/${fileName}`; // Assuming the path structure is user_id/filename

      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (deleteError) throw new Error("Failed to delete avatar from storage: " + deleteError.message);

      // Clear the avatar_url in the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw new Error("Failed to clear avatar URL from profile: " + updateError.message);

      showSuccess("Avatar removed successfully!");
      // The SupabaseSessionProvider will automatically re-fetch the profile
      // and update the context.
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred during avatar removal.");
    } finally {
      dismissToast(toastId);
    }
  };

  if (loadingProfile) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">Loading profile...</div>;
  }

  const currentAvatarUrl = profile?.avatar_url || undefined;
  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';
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
            <AvatarImage src={currentAvatarUrl} alt="User Avatar" />
            <AvatarFallback className="bg-muted text-primary text-3xl font-bold">
              {fallbackInitials || <UserIcon className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center space-y-2">
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-fit">
              <Upload className="h-4 w-4 mr-2" /> Change Avatar
            </Button>
            {avatarFile && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{avatarFile.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setAvatarFile(null)}><XCircle className="h-4 w-4" /></Button>
              </div>
            )}
            {avatarFile && (
              <Button onClick={handleAvatarUpload} className="w-fit">
                Upload Selected Avatar
              </Button>
            )}
            {currentAvatarUrl && !avatarFile && (
              <Button variant="destructive" onClick={handleRemoveAvatar} className="w-fit">
                Remove Avatar
              </Button>
            )}
          </div>
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