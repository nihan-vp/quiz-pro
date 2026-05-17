import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/src/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { 
  Trophy, 
  Target, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  FileText,
  BarChart
} from 'lucide-react';
import api from '@/src/lib/api';
import { format } from 'date-fns';
import { useQuizStore } from '@/src/store/useQuizStore';

export default function QuizResult() {
  const { id, attemptId: urlAttemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useQuizStore();
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (urlAttemptId) {
          const res = await api.get(`/attempts/public/${urlAttemptId}`);
          setResult(res.data);
        } else {
          const res = await api.get(`/attempts/my`);
          const attempt = res.data.find((a: any) => a.formId === id);
          setResult(attempt);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [id, urlAttemptId]);

  if (isLoading) return <DashboardLayout><div>Loading results...</div></DashboardLayout>;

  if (!result) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">No results found</h2>
        <Link to="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </DashboardLayout>
  );

  if (result.status !== 'REVIEWED') return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 max-w-2xl mx-auto">
        <div className="h-20 w-20 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center animate-pulse">
          <Clock className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tight">Submission Received</h2>
          <p className="text-muted-foreground font-medium">
            Your evaluation is under review by the creator. You will be notified once your results are released.
          </p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline" className="rounded-xl px-8 h-12 font-bold">Return to Dashboard</Button>
        </Link>
      </div>
    </DashboardLayout>
  );

  const getPassMark = () => {
    try {
      if (result.form.settings) {
        const s = typeof result.form.settings === 'string' ? JSON.parse(result.form.settings) : result.form.settings;
        return s.passMark ?? 50;
      }
    } catch (e) {}
    return 50;
  };
  const passMark = getPassMark();
  const isPass = result.score >= passMark; 
  const totalQuestions = result.form.questions.length;
  const correctCount = result.responses?.filter((r: any) => r.isCorrect).length || 0;
  const incorrectCount = totalQuestions - correctCount;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
            <Trophy className="h-3 w-3" /> Assessment Result
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">{result.form.title}</h1>
          <p className="text-muted-foreground">Released on {format(new Date(result.completedAt), 'MMMM d, yyyy')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Main Verdict Card */}
          <Card className="w-full border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] overflow-hidden text-center p-12 space-y-4 border-2 bg-muted/5">
            <div className={`mx-auto h-28 w-28 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 group-hover:rotate-0 transition-all duration-500 scale-110 ${isPass ? 'bg-green-100 text-green-600 shadow-[0_20px_40px_rgba(34,197,94,0.2)]' : 'bg-red-100 text-red-600 shadow-[0_20px_40px_rgba(239,44,44,0.2)]'}`}>
              {isPass ? <CheckCircle2 className="h-14 w-14" /> : <XCircle className="h-14 w-14" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Evaluation Outcome</h3>
              <p className={`text-6xl font-black uppercase tracking-tighter ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                {isPass ? 'Pass' : 'Fail'}
              </p>
            </div>
            <p className="text-muted-foreground font-bold pt-4 text-sm max-w-[240px] mx-auto leading-relaxed">
              {isPass 
                ? "Congratulations! You have successfully demonstrated competence." 
                : "Required proficiency standards were not met in this attempt."}
            </p>
          </Card>

          {/* Metrics Card */}
          <div className="space-y-4">
            <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] p-8 bg-background border-2 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Target className="h-32 w-32" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                <BarChart className="h-4 w-4" /> Performance Metrics
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Accuracy Percentage</p>
                    <p className="text-2xl font-black">{accuracy}%</p>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${accuracy >= 50 ? 'bg-green-500' : 'bg-red-500'}`} 
                      style={{ width: `${accuracy}%` }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Correct</p>
                    <p className="text-2xl font-black text-green-700">{correctCount}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Incorrect</p>
                    <p className="text-2xl font-black text-red-700">{incorrectCount}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Points</p>
                    <p className="text-xl font-black">{result.score}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 text-right">Attempted</p>
                    <p className="text-xl font-black text-right">{result.responses?.length} / {totalQuestions}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-muted transition-all"
              onClick={() => navigate(user ? '/dashboard' : '/')}
            >
              {user ? 'Return to Dashboard' : 'Return Home'}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
