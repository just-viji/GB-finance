import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/integrations/supabase/supabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardHeader = () => {
  const { user, isLoading } = useSupabase();
  const [displayName, setDisplayName] = useState<string>('Guest');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setDisplayName('Guest');
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new users
        console.error("Error fetching profile for dashboard header:", error);
        setDisplayName(user.email || 'User');
      } else if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        setDisplayName(name || user.email || 'User');
      } else {
        setDisplayName(user.email || 'User');
      }
      setLoadingProfile(false);
    };

    if (!isLoading) {
      fetchProfile();
    }
  }, [user, isLoading]);

  if (isLoading || loadingProfile) {
    return (
      <Card className="w-full mb-6 bg-gray-800 text-gray-100 shadow-md rounded-lg border border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-neon-green">GB Finance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Loading user data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full mb-6 bg-gray-800 text-gray-100 shadow-md rounded-lg border border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-neon-green">GB Finance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-gray-300 flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-blue-400" /> Welcome, {displayName}!
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardHeader;