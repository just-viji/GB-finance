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
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import { SupabaseSessionProvider } from "./integrations/supabase/supabaseContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="gb-finance-theme">
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
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/onboarding" element={<Onboarding />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SupabaseSessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;