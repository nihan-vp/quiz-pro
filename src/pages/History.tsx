import { useState, useEffect } from 'react';
import DashboardLayout from '@/src/components/DashboardLayout';
import { useQuizStore } from '@/src/store/useQuizStore';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { 
  History as HistoryIcon,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Clock,
  Layout,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import api from '@/src/lib/api';
import { Skeleton } from '@/src/components/ui/skeleton';

export default function History() {
  const { user } = useQuizStore();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/attempts/my');
        setAttempts(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10 pb-16 sm:pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight uppercase flex items-center gap-2 sm:gap-3">
              <HistoryIcon className="h-8 w-8 text-primary" />
              My History
            </h1>
            <p className="text-muted-foreground font-medium mt-1">Review your past performance and assessment results</p>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl border-2 border-dashed self-start md:self-auto">
            <div className="px-4 py-2 bg-background rounded-xl shadow-sm border flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-black uppercase tracking-widest">{attempts.length} Attempts</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-20 text-center space-y-6 bg-muted/20 rounded-[2rem] sm:rounded-[3rem] border-4 border-dashed border-muted">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <Layout className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">No History Yet</h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                You haven't attempted any assessments yet. Start one to see your results here!
              </p>
            </div>
            <Link to="/dashboard">
              <Button className="rounded-2xl px-8 h-12 font-black uppercase text-[10px] tracking-widest shadow-lg">
                Explore Assessments
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {attempts.map((attempt) => {
              const settings = typeof attempt.form.settings === 'string' ? JSON.parse(attempt.form.settings) : attempt.form.settings;
              const passMark = settings?.passMark ?? 50;
              const isPassed = attempt.score >= passMark;
              const isReviewed = attempt.status === 'REVIEWED';

              return (
                <Card key={attempt.id} className="group border-none shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all border-2 hover:border-primary/20">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row items-stretch">
                      {/* Status Indicator */}
                      <div className={`w-2 md:w-4 ${!isReviewed ? 'bg-orange-400' : (isPassed ? 'bg-green-500' : 'bg-red-500')}`} />
                      
                      <div className="flex-1 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left flex-1">
                          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${!isReviewed ? 'bg-orange-50 text-orange-500' : (isPassed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}`}>
                            {!isReviewed ? <Clock className="h-8 w-8" /> : (isPassed ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />)}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                              {attempt.form.title}
                            </h3>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(attempt.completedAt), 'MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {format(new Date(attempt.completedAt), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-5 md:gap-8 text-center md:text-right shrink-0">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Result Status</p>
                            <p className={`text-lg font-black uppercase ${!isReviewed ? 'text-orange-500' : (isPassed ? 'text-green-600' : 'text-red-600')}`}>
                              {!isReviewed ? 'Under Review' : (isPassed ? 'Pass' : 'Fail')}
                            </p>
                          </div>

                          <div className="space-y-1 min-w-[64px] sm:min-w-[80px]">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Final Score</p>
                            <p className="text-2xl font-black tracking-tighter">
                              {isReviewed ? `${attempt.score}%` : '---'}
                            </p>
                          </div>

                          {isReviewed ? (
                            <Link to={`/quiz/${attempt.formId}/result`}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-12 w-12 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm border-2 group-hover:translate-x-1"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </Button>
                            </Link>
                          ) : (
                            <div className="h-12 w-12 flex items-center justify-center text-muted-foreground/30">
                              <Lock className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
