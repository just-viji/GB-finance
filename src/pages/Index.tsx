import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSupabase } from "@/integrations/supabase/supabaseContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, isLoading } = useSupabase();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading user data...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-green-700 dark:text-green-400">GB Finance Dashboard</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
          Welcome, {user?.email}!
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          This is your main dashboard. More features coming soon!
        </p>
        <Button onClick={handleLogout} className="mt-8 bg-red-600 hover:bg-red-700 text-white">
          Logout
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;