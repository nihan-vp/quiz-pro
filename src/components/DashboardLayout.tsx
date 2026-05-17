import { ReactNode } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuizStore } from '@/src/store/useQuizStore';
import { Button } from '@/src/components/ui/button';
import { 
  ClipboardList, 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings, 
  LogOut, 
  Menu,
  Monitor
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/src/components/ui/sheet';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useQuizStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['ADMIN', 'CREATOR', 'STUDENT'] },
    { name: 'Create Quiz', icon: PlusCircle, path: '/forms/create', roles: ['ADMIN', 'CREATOR'] },
    { name: 'My History', icon: History, path: '/history', roles: ['STUDENT'] },
    { name: 'Settings', icon: Settings, path: '/settings', roles: ['ADMIN', 'CREATOR', 'STUDENT'] },
  ].filter(item => !item.roles || (user && item.roles.includes(user.role)));

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={`flex flex-col h-full bg-card border-r border-border min-w-[240px] ${className}`}>
      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <Button 
                variant={isActive ? 'secondary' : 'ghost'} 
                className={`w-full justify-start gap-3 h-11 ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-border/50">
        {user ? (
          <>
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl mb-4">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{user?.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <Link to="/auth/login" className="block">
              <Button variant="outline" className="w-full h-11 border-2 font-bold uppercase text-[10px] tracking-widest">
                Login
              </Button>
            </Link>
            <Link to="/auth/register" className="block">
              <Button className="w-full h-11 font-bold uppercase text-[10px] tracking-widest">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 flex items-center px-6 border-b border-border bg-card sticky top-0 z-50 shrink-0">
        <div className="flex items-center lg:hidden">
          <Sheet>
            <SheetTrigger render={
              <Button variant="ghost" size="icon" className="mr-4">
                <Menu className="h-5 w-5" />
              </Button>
            } />
            <SheetContent side="left" className="p-0 w-[280px]">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span>QuizForm Pro</span>
          </Link>
        </div>

        <div className="ml-auto hidden lg:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-secondary/50 rounded-full border">
               <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-[10px]">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-xs font-bold truncate max-w-[120px]">{user?.name}</span>
            </div>
          ) : (
             <div className="flex items-center gap-2">
                <Link to="/auth/login">
                  <Button variant="ghost" className="text-xs font-black uppercase tracking-widest">Login</Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="h-9 text-xs font-black uppercase tracking-widest rounded-full px-5">Join Now</Button>
                </Link>
             </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-full shrink-0">
          <Sidebar />
        </div>
  
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
