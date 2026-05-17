import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/src/components/DashboardLayout';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { 
  BarChart, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Download, 
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  TrendingUp,
  Award,
  X,
  Clock,
  ChevronRight,
  User
} from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { format } from 'date-fns';
import api from '@/src/lib/api';
import { toast } from 'sonner';

export default function QuizReports() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [editedResponses, setEditedResponses] = useState<any[]>([]);

  const calculateScore = (responses: any[]) => {
    const rawScore = responses.reduce((acc: number, r: any) => acc + (r.marksObtained || 0), 0);
    const totalPossible = data?.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0) || 1;
    return Math.max(0, Math.round((rawScore / totalPossible) * 100));
  };

  const handleRelease = async (attemptId: string) => {
    try {
      const finalScore = calculateScore(editedResponses);
      await api.post(`/attempts/${attemptId}/review`, {
        score: finalScore,
        responses: editedResponses.map(r => ({ 
          id: r.id, 
          isCorrect: r.isCorrect, 
          marksObtained: r.marksObtained 
        }))
      });
      toast.success('Result released to student');
      setData((prev: any) => ({
        ...prev,
        attempts: (prev.attempts || []).map((a: any) => 
          a.id === attemptId ? { ...a, status: 'REVIEWED', score: finalScore, responses: editedResponses } : a
        )
      }));
      if (selectedAttempt?.id === attemptId) {
        setSelectedAttempt((prev: any) => ({ ...prev, status: 'REVIEWED', score: finalScore, responses: editedResponses }));
      }
    } catch (error) {
      toast.error('Failed to release result');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/forms/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${data.title.replace(/[^a-z0-9]/gi, '_')}_results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  useEffect(() => {
    if (selectedAttempt) {
      setEditedResponses(selectedAttempt.responses || []);
    } else {
      setEditedResponses([]);
    }
  }, [selectedAttempt]);

  const toggleResponse = (questionId: string, isCorrect: boolean) => {
    const question = data.questions.find((q: any) => q.id === questionId);
    setEditedResponses(prev => prev.map(r => {
      if (r.questionId === questionId) {
        const marks = isCorrect ? (question?.marks || 0) : -(question?.negativeMarks || 0);
        return { ...r, isCorrect, marksObtained: marks };
      }
      return r;
    }));
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get(`/forms/${id}/reports`);
        setData(res.data);
      } catch (error) {
        toast.error('Failed to load reports');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium">Loading reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
  const filteredAttempts = attempts.filter((a: any) => 
    (a.user?.name || a.guestName || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.user?.email || a.guestEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: attempts.length,
    avgScore: attempts.length > 0 ? Math.round(attempts.reduce((acc: number, a: any) => acc + (a.score || 0), 0) / attempts.length) : 0,
    maxScore: attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.score || 0)) : 0,
    violations: attempts.reduce((acc: number, a: any) => acc + (a.violations?.length || 0), 0)
  };

  const getPassMark = () => {
    try {
      if (data.settings) {
        const s = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
        return s.passMark ?? 50;
      }
    } catch (e) {}
    return 50;
  };
  const passMark = getPassMark();

  const totalPossibleMarks = data.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0) || 1;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="pl-0 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight uppercase truncate max-w-md">{data.title} — Reports</h1>
            <p className="text-muted-foreground font-medium">Detailed usage analytics and student performance</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="h-11 rounded-xl font-bold border-2" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Attempts', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Avg Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Highest Score', value: `${stats.maxScore}%`, icon: Award, color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Violations', value: stats.violations, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                    <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attempts Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold">Participant List</CardTitle>
                <CardDescription className="text-xs font-medium">Overview of all student submissions</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-10 h-11 rounded-xl bg-background border-2 focus-visible:ring-primary/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-4 px-6 font-black uppercase text-[10px] tracking-[0.2em]">Student</TableHead>
                    <TableHead className="py-4 px-6 font-black uppercase text-[10px] tracking-[0.2em]">Performance</TableHead>
                    <TableHead className="py-4 px-6 font-black uppercase text-[10px] tracking-[0.2em]">Cheating Checks</TableHead>
                    <TableHead className="py-4 px-6 font-black uppercase text-[10px] tracking-[0.2em]">Status</TableHead>
                    <TableHead className="py-4 px-6 font-black uppercase text-[10px] tracking-[0.2em]">Submission</TableHead>
                    <TableHead className="py-4 px-6 font-black uppercase text-[10px] tracking-[0.2em] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium">
                        No submissions found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : filteredAttempts.map((attempt: any) => (
                    <TableRow key={attempt.id} className="group hover:bg-muted/10 border-border/50 last:border-0 transition-colors">
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center font-black text-sm uppercase border-2 border-primary/10 shadow-sm relative overflow-hidden">
                            {(attempt.user?.name || attempt.guestName || '??').split(' ').map((n: string) => n[0]).join('')}
                            {!attempt.userId && (
                              <div className="absolute top-0 right-0 p-0.5 bg-orange-500 text-[6px] text-white font-bold leading-none">GUEST</div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-tight text-foreground">{attempt.user?.name || attempt.guestName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground leading-tight mt-0.5">{attempt.user?.email || attempt.guestEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black ${attempt.score >= passMark ? 'text-green-600' : 'text-red-600'}`}>
                              {attempt.score}%
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">Score</span>
                          </div>
                          <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${attempt.score >= passMark ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,44,44,0.4)]'}`} 
                              style={{ width: `${attempt.score}%` }} 
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        {attempt.violations?.length > 0 ? (
                           <div className="flex items-center gap-1.5 text-red-500 bg-red-100/50 border border-red-200 px-2.5 py-1 rounded-lg w-fit">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{attempt.violations.length} Flags</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-green-600 bg-green-100/50 border border-green-200 px-2.5 py-1 rounded-lg w-fit">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border w-fit ${
                          attempt.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                        }`}>
                          {attempt.status.replace('_', ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-2 text-muted-foreground font-bold">
                          <History className="h-3.5 w-3.5" />
                          <span className="text-xs">{format(new Date(attempt.completedAt), 'MMM d, h:mm a')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {attempt.status !== 'REVIEWED' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                              onClick={() => handleRelease(attempt.id)}
                            >
                              Release Result
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all border"
                            onClick={() => setSelectedAttempt(attempt)}
                          >
                            View Results
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attempt Details Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
          <div className="bg-background border-2 border-border shadow-2xl rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-lg">
                  {(selectedAttempt.user?.name || '??').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase leading-tight">{selectedAttempt.user?.name}</h2>
                  <p className="text-muted-foreground font-bold text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> {selectedAttempt.user?.email} • 
                    <History className="h-3.5 w-3.5 ml-1" /> {format(new Date(selectedAttempt.completedAt), 'PPP')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAttempt(null)} className="rounded-full hover:bg-red-50 hover:text-red-500">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Quick Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 border-2 rounded-2xl bg-muted/10 space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {selectedAttempt.status === 'REVIEWED' ? 'Final Score' : 'Projected Score'}
                  </p>
                  <p className={`text-4xl font-black ${ (selectedAttempt.status === 'REVIEWED' ? selectedAttempt.score : calculateScore(editedResponses)) >= passMark ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedAttempt.status === 'REVIEWED' ? selectedAttempt.score : calculateScore(editedResponses)}%
                  </p>
                </div>
                <div className="p-6 border-2 rounded-2xl bg-muted/10 space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Correct / Total</p>
                  <p className="text-4xl font-black">{editedResponses.filter(r => r.isCorrect).length} / {data.questions?.length}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    Raw Points: {editedResponses.reduce((acc: number, r: any) => acc + (r.marksObtained || 0), 0)} / {totalPossibleMarks}
                  </p>
                </div>
                <div className="p-6 border-2 rounded-2xl bg-muted/10 space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Violations</p>
                  <p className={`text-4xl font-black ${selectedAttempt.violations?.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedAttempt.violations?.length || 0}
                  </p>
                </div>
              </div>

              {/* Violation Details */}
              {selectedAttempt.violations?.length > 0 && (
                <div className="p-6 bg-red-50 border-2 border-red-100 rounded-2xl space-y-4">
                  <h4 className="font-black uppercase tracking-widest text-xs text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Integrity violations detected
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedAttempt.violations.map((v: any, i: number) => (
                      <div key={i} className="bg-white/80 p-3 rounded-xl border border-red-200">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">{v.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(v.createdAt), 'HH:mm:ss')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Level Data */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    Review Student Answers
                  </h3>
                  {selectedAttempt.status !== 'REVIEWED' && (
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                      Mark answers to update score
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  {data.questions.filter((q: any) => q.type !== 'SECTION_BREAK').map((question: any, idx: number) => {
                    const response = editedResponses.find((r: any) => r.questionId === question.id);
                    
                    const formatAnswer = (ans: string) => {
                      if (!ans) return <span className="italic opacity-50">No response</span>;
                      try {
                        if (ans.startsWith('[') || ans.startsWith('{')) {
                          const parsed = JSON.parse(ans);
                          if (Array.isArray(parsed)) return parsed.join(', ');
                          return ans;
                        }
                      } catch (e) {}
                      return ans;
                    };

                    return (
                      <div key={question.id} className="p-6 border-2 rounded-2xl hover:border-primary/20 transition-all group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                              Question {idx + 1} • {question.type.replace('_', ' ')}
                            </p>
                            <h4 className="font-bold text-lg">{question.text}</h4>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className={`p-1.5 rounded-lg border-2 ${response?.isCorrect ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                              {response?.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            </div>
                            {selectedAttempt.status !== 'REVIEWED' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant={response?.isCorrect ? 'default' : 'outline'}
                                  className={`h-7 px-2 text-[10px] font-black uppercase rounded-lg ${response?.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                  onClick={() => toggleResponse(question.id, true)}
                                >
                                  Correct
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={!response?.isCorrect ? 'default' : 'outline'}
                                  className={`h-7 px-2 text-[10px] font-black uppercase rounded-lg ${!response?.isCorrect ? 'bg-red-500 hover:bg-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                  onClick={() => toggleResponse(question.id, false)}
                                >
                                  Incorrect
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student's Answer</p>
                            <div className={`p-4 rounded-xl font-bold border-2 ${response?.isCorrect ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
                              {formatAnswer(response?.answer)}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Correct Answer</p>
                            <div className="p-4 rounded-xl bg-muted/50 border-2 font-bold text-primary">
                              {formatAnswer(question.correctAnswer)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
              <div>
                {selectedAttempt.status !== 'REVIEWED' && (
                  <Button 
                    variant="outline" 
                    className="h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
                    onClick={() => handleRelease(selectedAttempt.id)}
                  >
                    Approve & Release Result
                  </Button>
                )}
              </div>
              <Button onClick={() => setSelectedAttempt(null)} className="h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                Close Reports
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
