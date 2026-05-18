import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/src/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Button } from '@/src/components/ui/button';
import { 
  Monitor, 
  AlertTriangle, 
  Activity, 
  Users, 
  ShieldAlert, 
  Clock,
  ArrowLeft,
  Circle
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '@/src/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function MonitoringDashboard() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [activeAttempts, setActiveAttempts] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const quizRes = await api.get(`/forms/${id}`);
        setQuiz(quizRes.data);
        
        const attemptsRes = await api.get(`/forms/${id}/active-attempts`);
        const totalQuestions = quizRes.data.questions?.length || 1;
        const attemptsWithProgress = attemptsRes.data.map((a: any) => ({
          ...a,
          progress: (a._count.responses / totalQuestions) * 100
        }));
        setActiveAttempts(attemptsWithProgress);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBaseData();

    // Socket setup
    const socket = io();
    socket.emit('join-quiz', id);

    socket.on('update-monitoring', (data) => {
      // data: { quizId, attemptId, type, userName }
      setViolations((prev) => [data, ...prev].slice(0, 50));
      
      // Update active attempt violation count in local state
      setActiveAttempts((prev) => 
        prev.map(a => a.id === data.attemptId 
          ? { ...a, _count: { ...a._count, violations: (a._count?.violations || 0) + 1 } } 
          : a
        )
      );
    });

    socket.on('status-update', (data) => {
      // data: { quizId, attemptId, progress }
      setActiveAttempts((prev) => 
        prev.map(a => a.id === data.attemptId 
          ? { ...a, progress: data.progress } 
          : a
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (isLoading) return <DashboardLayout><div>Loading monitor...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16 sm:pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Monitoring</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{quiz?.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-secondary/30 rounded-xl border border-border self-start sm:self-auto">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-bold">{activeAttempts.length} Active Participants</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Participants Table */}
          <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" /> Participant Status
                </CardTitle>
                <CardDescription>Real-time view of all candidates currently taking the exam.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="py-4 pl-6">Participant</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead className="pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAttempts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No active participants at the moment.
                        </TableCell>
                      </TableRow>
                    ) : activeAttempts.map((attempt) => (
                      <TableRow key={attempt.id} className="hover:bg-secondary/10 transition-colors">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-[10px] relative overflow-hidden">
                              {(attempt.user?.name || attempt.guestName || '?')[0]}
                              {!attempt.userId && (
                                <div className="absolute top-0 right-0 p-0.5 bg-orange-500 text-[4px] text-white font-bold leading-none">GUEST</div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{attempt.user?.name || attempt.guestName || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground">{attempt.user?.email || attempt.guestEmail || 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatDistanceToNow(new Date(attempt.startedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${attempt.progress || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{Math.round(attempt.progress || 0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${attempt._count?.violations > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {attempt._count?.violations || 0}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center gap-2">
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Online</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Violation Feed */}
          <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-primary/5 rounded-2xl overflow-hidden h-[420px] sm:h-[600px] flex flex-col">
              <CardHeader className="bg-red-500/5 border-b border-red-500/10">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <ShieldAlert className="h-5 w-5" /> Live Violation Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {violations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-50">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monitoring Stream Ready</p>
                  </div>
                ) : violations.map((v, i) => (
                  <div key={i} className="p-3 bg-red-50 rounded-xl border border-red-100 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1.5 bg-red-100 rounded-lg text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-900 group">
                          <span className="text-red-500">@{v.userName || 'Student'}</span> — {v.type.replace('-', ' ')}
                        </p>
                        <p className="text-[10px] text-red-700/70 mt-0.5">{formatDistanceToNow(new Date(v.timestamp || Date.now()), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
