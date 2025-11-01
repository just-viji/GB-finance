import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { User, Wallet, TrendingUp } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('INR');

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update user's profile with onboarding info
        const { error } = await supabase
          .from('profiles')
          .update({ 
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (error) throw error;
        
        // Store additional preferences in localStorage for now
        localStorage.setItem('userPreferences', JSON.stringify({
          businessName,
          currency,
          onboardingCompleted: true
        }));
        
        showSuccess('Profile updated successfully!');
        navigate('/');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to complete onboarding');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Welcome to GB Finance</CardTitle>
          <p className="text-muted-foreground">Let's set up your account</p>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <User className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold mt-2">Personal Information</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Enter your last name"
                />
              </div>
              <Button className="w-full mt-4" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Wallet className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold mt-2">Business Information</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (Optional)</Label>
                <Input 
                  id="businessName" 
                  value={businessName} 
                  onChange={(e) => setBusinessName(e.target.value)} 
                  placeholder="Enter your business name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select 
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleComplete}>
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;