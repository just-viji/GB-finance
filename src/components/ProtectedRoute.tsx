import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import NavigationBar from './NavigationBar'; // Import the new NavigationBar

const ProtectedRoute = () => {
  const { session, isLoading } = useSupabase();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavigationBar />
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedRoute;