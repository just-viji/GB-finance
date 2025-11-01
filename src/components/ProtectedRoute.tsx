import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import NavigationBar from './NavigationBar';
import Onboarding from '@/pages/Onboarding';

const ProtectedRoute = () => {
  const { session, isLoading, profile } = useSupabase();
  const location = useLocation();
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      // Check if user has completed onboarding
      const preferences = localStorage.getItem('userPreferences');
      if (preferences) {
        const parsedPreferences = JSON.parse(preferences);
        setOnboardingCompleted(parsedPreferences.onboardingCompleted || false);
      } else {
        // If no preferences exist, check if profile has required info
        setOnboardingCompleted(!!(profile?.first_name && profile?.last_name));
      }
      setCheckingOnboarding(false);
    };

    if (!isLoading && session) {
      checkOnboardingStatus();
    } else if (!isLoading) {
      setCheckingOnboarding(false);
    }
  }, [session, isLoading, profile]);

  if (isLoading || checkingOnboarding) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding is not completed and user is not on onboarding page, redirect to onboarding
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding is completed and user is on onboarding page, redirect to dashboard
  if (onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <NavigationBar />
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedRoute;