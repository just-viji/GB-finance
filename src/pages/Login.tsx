import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useSupabase();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers requested
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(140 70% 40%)', // A vibrant green
                  brandAccent: 'hsl(140 70% 30%)', // A darker green for hover/active
                },
              },
            },
          }}
          theme="light"
        />
      </div>
    </div>
  );
};

export default Login;