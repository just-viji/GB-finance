import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion'; // Import motion

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useSupabase();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/'); // Redirect to dashboard after login
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/10 backdrop-filter backdrop-blur-lg border border-gray-700 shadow-lg rounded-xl p-6">
          <CardHeader className="flex flex-col items-center space-y-4">
            <img src="/finance-icon.svg" alt="GB Finance Logo" className="h-20 w-20 mb-4" />
            <CardTitle className="text-center text-3xl font-bold text-neon-green drop-shadow-md">GB Finance</CardTitle>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(var(--neon-green))',
                      brandAccent: 'hsl(var(--neon-green) / 0.8)',
                      inputBackground: 'hsl(var(--background))',
                      inputBorder: 'hsl(var(--border))',
                      inputBorderHover: 'hsl(var(--neon-green))',
                      inputBorderFocus: 'hsl(var(--neon-green))',
                      inputText: 'hsl(var(--foreground))',
                      inputLabel: 'hsl(var(--muted-foreground))',
                      messageText: 'hsl(var(--foreground))',
                      messageBackground: 'hsl(var(--card))',
                      anchorTextColor: 'hsl(var(--neon-green))',
                      anchorTextHoverColor: 'hsl(var(--neon-green) / 0.8)',
                      // Customizing button for neon effect
                      buttonBackground: 'hsl(var(--neon-green))',
                      buttonBorder: 'hsl(var(--neon-green))',
                      buttonBackgroundHover: 'hsl(var(--neon-green) / 0.8)',
                      buttonBorderHover: 'hsl(var(--neon-green) / 0.8)',
                      buttonText: 'hsl(var(--primary-foreground))',
                    },
                    radii: {
                      borderRadiusButton: '0.5rem',
                      button: '0.5rem',
                      input: '0.5rem',
                    },
                    shadows: {
                      // Adding a subtle glow to buttons
                      button: '0 0 8px hsl(var(--neon-green) / 0.6)',
                    },
                  },
                },
              }}
              theme="dark" // Use dark theme for auth UI to match app
              redirectTo={window.location.origin + '/'} // Redirect to root (dashboard)
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;