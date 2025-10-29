import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="flex flex-col items-center space-y-2 text-center">
            <img src="/finance-icon.svg" alt="GB Finance Logo" className="h-16 w-16 mb-2" />
            <CardTitle className="text-3xl font-bold text-primary">GB Finance</CardTitle>
            <CardDescription>Sign in to manage your finances</CardDescription>
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
                      brand: 'hsl(var(--primary))',
                      brandAccent: 'hsl(var(--primary) / 0.8)',
                    },
                  },
                },
              }}
              theme="light"
              redirectTo={window.location.origin + '/'}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;