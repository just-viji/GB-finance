import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import NavigationBar from './NavigationBar';

const ProtectedRoute = () => {
  const { session, isLoading } = useSupabase();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <NavigationBar />
      <main className="flex-1 md:ml-64 pb-16 md:pb-0"> {/* Add margin for sidebar and padding for mobile nav */}
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedRoute;