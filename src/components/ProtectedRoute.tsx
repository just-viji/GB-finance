import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';

const ProtectedRoute = () => {
  const { session, isLoading } = useSupabase();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;