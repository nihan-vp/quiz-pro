import { useState } from 'react';
import DashboardLayout from '@/src/components/DashboardLayout';
import { useQuizStore } from '@/src/store/useQuizStore';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { 
  User, 
  Mail, 
  Save, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '@/src/lib/api';
import { toast } from 'sonner';

export default function Settings() {
  const { user, setUser } = useQuizStore();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.put('/api/auth/profile', {
        name: profileData.name,
        email: profileData.email,
      });
      setUser(res.data.user);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 pb-16 sm:pb-20">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight uppercase">Settings</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage your account preferences and profile details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Navigation/Sidebar */}
          <div className="lg:col-span-1 space-y-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            <p className="px-4 mb-4">Account Categories</p>
            <nav className="space-y-1">
              {[
                { name: 'Profile Info', icon: User, active: true },
              ].map((item) => (
                <button
                  key={item.name}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs tracking-widest uppercase ${
                    item.active 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 transform -translate-y-0.5' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Section */}
            <Card className="border-none shadow-xl shadow-primary/5 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/10 p-5 sm:p-8 border-b">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner border-2 border-primary/10">
                    {user?.name?.[0].toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Public Profile</CardTitle>
                    <CardDescription className="text-sm font-medium">This information will be displayed to other users</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-8">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="pl-12 h-14 rounded-2xl bg-muted/20 border-2 focus-visible:ring-primary/20" 
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="pl-12 h-14 rounded-2xl bg-muted/20 border-2 focus-visible:ring-primary/20" 
                        placeholder="your@email.com"
                        type="email"
                      />
                    </div>
                  </div>
                  <Button 
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 mt-4"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Status */}
            <div className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-muted/30 border-2 border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:border-primary/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Account Verified</p>
                  <p className="text-xs text-muted-foreground font-medium">Your account is fully functional and secured.</p>
                </div>
              </div>
              <Button variant="ghost" className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50">
                <AlertCircle className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
