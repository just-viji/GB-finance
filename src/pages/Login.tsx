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
    <div className="flex items-center justify-center min-h-screen bg-black">
  <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
    
    {/* Logo Section */}
    <div className="flex flex-col items-center mb-8">
      <div className="bg-green-500 rounded-xl p-3 shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" 
             fill="none" 
             viewBox="0 0 24 24" 
             strokeWidth={2} 
             stroke="white" 
             className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M4 10h16M4 6h16" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold text-green-600 mt-4">GB Finance</h1>
      <p className="text-gray-500">Sign in to manage your finances</p>
    </div>

    {/* Form */}
    <form className="space-y-5">
      <div>
        <input 
          type="email" 
          placeholder="Email address"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl 
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <input 
          type="password" 
          placeholder="Password"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl 
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button 
        type="submit"
        className="w-full bg-gradient-to-r from-green-600 to-black 
                   text-white font-semibold py-3 rounded-xl 
                   hover:scale-105 transition-transform">
        Sign In
      </button>
    </form>

    {/* Links */}
    <div className="mt-6 text-sm text-gray-500">
      <a href="#" className="hover:text-green-600">Forgot your password?</a>
      <p className="mt-2">
        Don't have an account?{" "}
        <a href="#" className="text-green-600 font-semibold hover:underline">
          Sign up
        </a>
      </p>
    </div>
  </div>
</div>

  );
};

export default Login;