import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/src/components/DashboardLayout';
import { useQuizStore } from '@/src/store/useQuizStore';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { 
  Plus, 
  FileText, 
  Users, 
  BarChart, 
  Clock, 
  ChevronRight, 
  MoreHorizontal,
  Share2,
  Trash2,
  Copy,
  Play,
  Monitor,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { toast } from 'sonner';
import api from '@/src/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { user } = useQuizStore();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.role === 'CREATOR' || user?.role === 'ADMIN') {
          const res = await api.get('/forms');
          setQuizzes(Array.isArray(res.data) ? res.data : []);
        } else {
          const [attemptsRes, statsRes] = await Promise.all([
            api.get('/attempts/my'),
            api.get('/stats/student')
          ]);
          setAttempts(Array.isArray(attemptsRes.data) ? attemptsRes.data : []);
          setStudentStats(statsRes.data);
        }
      } catch (error: any) {
        if (error.response?.status !== 401) {
          console.error('Failed to fetch dashboard data', error);
          toast.error('Failed to load dashboard data');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const recentRes = await api.get('/attempts/recent');
        setRecentResults(Array.isArray(recentRes.data) ? recentRes.data : []);
      } catch (e) {
        console.error('Failed to fetch recent attempts', e);
      }
    };
    if (user) fetchRecent();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz? All responses will be lost.')) return;
    try {
      await api.delete(`/forms/${id}`);
      setQuizzes(quizzes.filter(q => q.id !== id));
      toast.success('Quiz deleted');
    } catch (error) {
      toast.error('Failed to delete quiz');
    }
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/quiz/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Quiz link copied to clipboard');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Quiz code copied: ' + code);
  };

  const [joinCode, setJoinCode] = useState('');

  const handleJoin = async () => {
    if (!joinCode) return;
    try {
      const res = await api.get(`/forms/code/${joinCode}`);
      navigate(`/quiz/${res.data.id}/join`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid quiz code');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 break-words">Welcome back, {user?.name}</h1>
            <p className="text-muted-foreground">
              {user?.role === 'CREATOR' 
                ? "Here's what's happening with your quizzes." 
                : "Your upcoming and past assessments."}
            </p>
          </div>
          {(user?.role === 'CREATOR' || user?.role === 'ADMIN') && (
            <Link to="/forms/create">
              <Button className="h-11 px-6 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Create New Quiz
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { 
              label: user?.role === 'CREATOR' ? 'Active Quizzes' : 'Available Quizzes', 
              value: user?.role === 'CREATOR' 
                ? quizzes.filter(q => q.isPublished).length 
                : (studentStats?.availableQuizzes ?? '0'), 
              icon: FileText,
              color: 'text-blue-500',
              bg: 'bg-blue-50'
            },
            { 
              label: user?.role === 'CREATOR' ? 'Total Responses' : 'Completed Quizzes', 
              value: user?.role === 'CREATOR' 
                ? quizzes.reduce((acc, q) => acc + (q._count?.attempts || 0), 0) 
                : (studentStats?.totalCompleted ?? attempts.length), 
              icon: Users,
              color: 'text-green-500',
              bg: 'bg-green-50'
            },
            { 
              label: 'Average Score', 
              value: user?.role === 'STUDENT'
                ? (`${studentStats?.avgScore ?? 0}%`)
                : (recentResults.length > 0 ? `${Math.round(recentResults.reduce((acc, a) => acc + (a.score || 0), 0) / recentResults.length)}%` : '0%'), 
              icon: BarChart,
              color: 'text-purple-500',
              bg: 'bg-purple-50'
            },
            { 
              label: user?.role === 'CREATOR' ? 'Forms Created' : 'Rank', 
              value: user?.role === 'CREATOR' ? quizzes.length : (studentStats?.rank ? `#${studentStats.rank}` : 'N/A'), 
              icon: Clock,
              color: 'text-orange-500',
              bg: 'bg-orange-50'
            }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {user?.role === 'CREATOR' ? 'Your Recent Quizzes' : 'Recent Activity'}
              </h2>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                View all <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-secondary/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : user?.role === 'CREATOR' ? (
              <div className="grid gap-4">
                {quizzes.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-secondary/10">
                    <div className="p-4 bg-background rounded-full w-fit mx-auto mb-4 shadow-sm">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No quizzes created yet</h3>
                    <p className="text-muted-foreground mb-6">Start by creating your first assessment</p>
                    <Link to="/forms/create">
                      <Button variant="outline">Create Quiz</Button>
                    </Link>
                  </div>
                ) : quizzes.map((quiz) => (
                    <Card key={quiz.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group">
                      <CardHeader className="flex flex-row items-start justify-between p-6 pb-2">
                      <div className="space-y-1 min-w-0">
                        <Link to={`/forms/${quiz.id}/edit`} className="text-lg font-bold hover:text-primary transition-colors block">
                          {quiz.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardDescription className="break-words">{quiz._count?.questions || 0} Questions • Created {format(new Date(quiz.createdAt), 'MMM d, yyyy')}</CardDescription>
                          <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded uppercase tracking-tighter">Code: {quiz.shareLink}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title="Copy Direct Link" onClick={() => handleCopyLink(quiz.id)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title="Copy Quiz Code" onClick={() => handleCopyCode(quiz.shareLink)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(quiz.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${quiz.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {quiz.isPublished ? 'Published' : 'Draft'}
                          </div>
                          {quiz.isQuiz && (
                            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <ShieldCheck className="h-3 w-3" /> Proctored
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/forms/${quiz.id}/reports`}>
                            <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary px-3">
                              <BarChart className="mr-1.5 h-3 w-3" /> Reports
                            </Button>
                          </Link>
                          <Link to={`/forms/${quiz.id}/monitor`}>
                            <Button size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest px-3">
                              <Monitor className="mr-1.5 h-3 w-3" /> Monitor
                            </Button>
                          </Link>
                          <Link to={`/forms/${quiz.id}/edit`}>
                            <Button size="sm" className="h-8 px-4 font-black text-[10px] uppercase tracking-widest">
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Student specific history could go here */}
                {attempts.length === 0 ? (
                  <div className="text-center py-12 bg-secondary/10 rounded-2xl">
                    <p className="text-muted-foreground">No attempts yet. Enter a quiz code to start.</p>
                  </div>
                ) : attempts.map((attempt) => (
                  <Card key={attempt.id} className="border-none shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold">{attempt.form.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {attempt.status === 'REVIEWED' 
                              ? (() => {
                                  const settings = typeof attempt.form.settings === 'string' ? JSON.parse(attempt.form.settings) : attempt.form.settings;
                                  const passMark = settings?.passMark ?? 50;
                                  return attempt.score >= passMark ? 'Status: Pass' : 'Status: Fail';
                                })()
                              : 'Status: Submitted (Pending Review)'} 
                            • {format(new Date(attempt.completedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {attempt.status === 'REVIEWED' && (
                        <Link to={`/quiz/${attempt.formId}/result`}>
                          <Button variant="ghost" size="sm">Details <ChevronRight className="ml-1 h-4 w-4" /></Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-2">
                {user?.role === 'STUDENT' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Join a Quiz</h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input 
                          placeholder="Enter Quiz Code" 
                          className="bg-secondary/20 h-10" 
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                        />
                        <Button className="h-10" onClick={handleJoin}>Join</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link to="/forms/create" className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-secondary/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span className="font-medium">New Assessment</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link to="/templates" className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-secondary/50 transition-colors group text-muted-foreground cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Browse Templates</span>
                      </div>
                      <Lock className="h-4 w-4 opacity-50" />
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            <h2 className="text-xl font-bold pt-4">Recent Results</h2>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent results</p>
                  ) : recentResults.map((result, i) => (
                    <div key={result.id} className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {(result.user?.name || user?.name || '??').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate">
                          {result.user?.name || 'You'} — {result.form.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.role === 'STUDENT' && result.status !== 'REVIEWED' 
                            ? 'Awaiting Review' 
                            : (user?.role === 'STUDENT' ? 'Result Released' : `Scored ${result.score}%`)} 
                          • {result.completedAt ? formatDistanceToNow(new Date(result.completedAt), { addSuffix: true }) : 'just now'}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${
                        (user?.role === 'STUDENT' && result.status !== 'REVIEWED')
                          ? 'text-orange-500' 
                          : (() => {
                              const settings = typeof result.form.settings === 'string' ? JSON.parse(result.form.settings) : result.form.settings;
                              const passMark = settings?.passMark ?? 50;
                              return result.score >= passMark ? 'text-green-500' : 'text-red-500';
                            })()
                      }`}>
                        {(user?.role === 'STUDENT' && result.status !== 'REVIEWED')
                          ? 'Submitted' 
                          : (() => {
                              const settings = typeof result.form.settings === 'string' ? JSON.parse(result.form.settings) : result.form.settings;
                              const passMark = settings?.passMark ?? 50;
                              return result.score >= passMark ? 'Pass' : 'Fail';
                            })()}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-6 text-xs text-muted-foreground uppercase tracking-widest hover:text-primary">
                  View full reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Lock({ className, ...props }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
