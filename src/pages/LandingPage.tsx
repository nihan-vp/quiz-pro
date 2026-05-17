import { motion } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, ShieldCheck, Zap, BarChart3, Users, Play, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';
import api from '@/src/lib/api';
import { toast } from 'sonner';

export default function LandingPage() {
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setIsJoining(true);
    try {
      const res = await api.get(`/forms/code/${joinCode}`);
      navigate(`/quiz/${res.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid quiz code');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/40 backdrop-blur-md fixed top-0 left-0 right-0 z-50 bg-background/80">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="p-1 bg-primary rounded-lg">
            <ClipboardList className="text-primary-foreground h-5 w-5" />
          </div>
          <span>QuizForm<span className="text-primary">Pro</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link to="/auth/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/auth/register">
            <Button size="sm" className="shadow-lg shadow-primary/20">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="px-6 py-24 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-8 border border-primary/20"
          >
            <Zap className="h-3 w-3" />
            <span>New: Proctored Exams Mode</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
          >
            Create <span className="text-primary italic">Better</span> Quizzes.<br />
            Secure <span className="underline underline-offset-8 decoration-primary/30">Everything</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mb-10"
          >
            The production-ready quiz and exam platform for educators and organizations. 
            Build complex assessments with built-in anti-cheat, real-time monitoring, 
            and advanced analytics.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth/register">
                <Button size="lg" className="px-8 text-lg font-medium shadow-xl shadow-primary/30 h-14">
                  Create Free Assessment
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 text-lg font-medium h-14">
                Watch Demo
              </Button>
            </div>

            <div className="w-full max-w-sm mt-4">
              <div className="p-1.5 bg-muted/50 backdrop-blur-sm rounded-[2rem] border border-border/50 shadow-sm flex items-center gap-2 group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <div className="pl-4 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Play className="h-5 w-5 fill-current" />
                </div>
                <form onSubmit={handleJoinByCode} className="flex-1 flex items-center">
                  <input 
                    type="text" 
                    placeholder="Enter Quiz Code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-widest h-11"
                  />
                  <Button 
                    disabled={isJoining}
                    className="rounded-full h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                  >
                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Quiz'}
                  </Button>
                </form>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4 opacity-70">No account required to join</p>
            </div>
          </motion.div>

          {/* Abstract background element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10 opacity-50" />
        </section>

        {/* Features Grid */}
        <section id="features" className="px-6 py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Features</h2>
              <p className="text-muted-foreground">Everything you need to run high-stakes exams virtually.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <ShieldCheck className="h-8 w-8 text-primary" />,
                  title: "Anti-Cheat Suite",
                  description: "Tab detection, fullscreen lock, copy-paste disabling, and violation monitoring to ensure integrity."
                },
                {
                  icon: <Zap className="h-8 w-8 text-primary" />,
                  title: "Smart Quiz Builder",
                  description: "Drag-and-drop interface with 10+ question types including file uploads and complex rating scales."
                },
                {
                  icon: <BarChart3 className="h-8 w-8 text-primary" />,
                  title: "Advanced Analytics",
                  description: "Visual insights into performance, question difficulty, and student progress with detailed charts."
                },
                {
                  icon: <Users className="h-8 w-8 text-primary" />,
                  title: "Role Management",
                  description: "Granular permissions for Admins, Creators, and Students with organization-level isolation."
                },
                {
                  icon: <ClipboardList className="h-8 w-8 text-primary" />,
                  title: "Automated Grading",
                  description: "Instant results for MCQ and short answer questions with customizable rubrics and explanations."
                },
                {
                  icon: <Users className="h-8 w-8 text-primary" />,
                  title: "Live Monitoring",
                  description: "Monitor exam attempts in real-time. See who is taking the quiz and track violations live."
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-8 bg-background border border-border rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="mb-6">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-12 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="p-1 bg-primary rounded-lg">
              <ClipboardList className="text-primary-foreground h-4 w-4" />
            </div>
            <span>QuizForm Pro</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground font-medium">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 QuizForm Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
