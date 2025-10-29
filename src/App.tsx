import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AddSale from "./pages/AddSale";
import AddExpense from "./pages/AddExpense";
import Reports from "./pages/Reports";
import EditSale from "./pages/EditSale";
import EditExpense from "./pages/EditExpense";
import Profile from "./pages/Profile"; // Import the new Profile component
import { SupabaseSessionProvider } from "./integrations/supabase/supabaseContext";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SupabaseSessionProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="/add-sale" element={<AddSale />} />
              <Route path="/add-expense" element={<AddExpense />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/edit-sale/:id" element={<EditSale />} />
              <Route path="/edit-expense/:id" element={<EditExpense />} />
              <Route path="/profile" element={<Profile />} /> {/* New route for User Profile */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SupabaseSessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;