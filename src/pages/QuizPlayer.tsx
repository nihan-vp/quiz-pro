import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { Label } from '@/src/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { Progress } from '@/src/components/ui/progress';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Clock, 
  Send, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Loader2,
  Maximize2,
  Star
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/src/components/ui/select';
import { useAntiCheat } from '@/src/hooks/useAntiCheat';
import { useQuizStore } from '@/src/store/useQuizStore';
import { toast } from 'sonner';
import api from '@/src/lib/api';
import { io } from 'socket.io-client';

export default function QuizPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [requiresGuestInfo, setRequiresGuestInfo] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const socketRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);

  const { user } = useQuizStore();

  // Safe settings parsing
  const settings = (() => {
    try {
      return quiz?.settings ? JSON.parse(quiz.settings) : { antiCheat: {} };
    } catch (e) {
      return { antiCheat: {} };
    }
  })();

  // Anti-cheat handler
  const handleViolation = (type: string) => {
    setViolations((prev) => prev + 1);
    toast.error(`Anti-cheat violation: ${type}`);
    
    // Log violation to backend & notify live monitoring
    if (attemptId) {
      api.post(`/attempts/${attemptId}/violation`, { type });
      socketRef.current?.emit('violation', { 
        quizId: id, 
        attemptId, 
        type, 
        userName: user?.name || 'Anonymous',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleStartAnonymous = async () => {
    setIsStarting(true);
    try {
      const res = await api.post(`/forms/${id}/start`, { 
        guestName: `Guest ${Math.floor(Math.random() * 10000)}`
      });
      setAttemptId(res.data.id);
      setRequiresGuestInfo(false);
      
      // Initialize timer if exists in quiz settings
      try {
        const s = quiz?.settings ? JSON.parse(quiz.settings) : {};
        if (s.timer) setTimeLeft(s.timer * 60);
      } catch (e) {}

      toast.success('Quiz started!');
    } catch (error: any) {
      toast.error('Failed to start quiz');
    } finally {
      setIsStarting(false);
    }
  };

  const { enterFullscreen } = useAntiCheat({
    enabled: settings.antiCheat.detectTabSwitch || false,
    onViolation: handleViolation,
    maxViolations: settings.antiCheat.maxViolations || 99,
  });

  const handleSubmit = async (auto = false) => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    try {
      await api.post(`/attempts/${attemptId}/submit`, { answers, status: auto ? 'AUTO_SUBMITTED' : 'COMPLETED' });
      toast.success('Quiz submitted successfully!');
      setIsSubmitted(true);
    } catch (error) {
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const startQuiz = async () => {
      try {
        const res = await api.get(`/forms/${id}/join`);
        setQuiz(res.data.form);
        
        if (res.data.requiresGuestInfo) {
          setRequiresGuestInfo(true);
        } else {
          setAttemptId(res.data.attempt.id);
          try {
            const s = JSON.parse(res.data.form.settings);
            if (s.timer) setTimeLeft(s.timer * 60);
          } catch (e) {}
        }
        
        // Socket setup for monitoring
        socketRef.current = io();
        socketRef.current.emit('join-quiz', id);

      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to join quiz');
        navigate(user ? '/dashboard' : '/');
      } finally {
        setIsLoading(false);
      }
    };
    startQuiz();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id, navigate]);

  // Timer logic
  useEffect(() => {
    if (timeLeft === null || timeLeft < 0 || isSubmitted) return;

    if (timeLeft === 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  // Auto-submit on max violations
  useEffect(() => {
    if (settings.antiCheat.autoSubmitOnMaxViolations && violations >= settings.antiCheat.maxViolations) {
      toast.error('Maximum violations reached. Auto-submitting quiz.');
      handleSubmit(true);
    }
  }, [violations, settings.antiCheat]);

  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  const totalQuestions = quiz?.questions?.length || 1;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Emit progress update
  useEffect(() => {
    if (attemptId && quiz && !isSubmitted) {
      socketRef.current?.emit('progress-update', {
        quizId: id,
        attemptId,
        progress: Math.round(progress)
      });
    }
  }, [progress, attemptId, quiz, id, isSubmitted]);

  // View returns (Conditional but after all hooks)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Securing your session...</p>
        </div>
      </div>
    );
  }

  if (requiresGuestInfo) {
    return (
      <div className="min-h-screen flex items-start sm:items-center justify-center bg-muted/30 p-4 sm:p-6 py-8 sm:py-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 sm:p-10 pb-4 sm:pb-6 text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Welcome!</CardTitle>
              <p className="text-muted-foreground mt-2 font-medium">Please enter your name to start the quiz</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 pt-3 sm:pt-4">
              <form onSubmit={handleStartGuest} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input 
                    required
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-12 sm:h-14 rounded-2xl bg-muted/50 border-2 focus-visible:ring-primary/20 text-base sm:text-lg"
                  />
                </div>
                <Button 
                  disabled={isStarting}
                  className="w-full h-14 sm:h-16 rounded-[1.5rem] font-black uppercase text-xs sm:text-sm tracking-[0.2em] shadow-lg shadow-primary/25"
                >
                  {isStarting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Start Quiz'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">SUBMITTED</h1>
          <p className="text-muted-foreground text-lg">
            Your responses have been recorded successfully. You may now close this window.
          </p>
          <div className="flex flex-col gap-3">
            {quiz?.isQuiz && (
              <Button 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest"
                onClick={() => navigate(`/quiz/${id}/result/${attemptId}`)}
              >
                View Results
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest"
              onClick={() => navigate(user ? '/dashboard' : '/')}
            >
              {user ? 'Back to Dashboard' : 'Back to Home'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (settings?.antiCheat?.fullscreenRequired && !isFullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-none shadow-2xl shadow-primary/10 rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 text-center p-8">
            <ShieldAlert className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Secure Exam Mode</CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              This exam requires Fullscreen Mode to be active. You cannot take the exam windowed.
              Exiting fullscreen will be logged as a violation.
            </p>
            <Button size="lg" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20" onClick={() => {
              enterFullscreen();
              setIsFullScreen(true);
            }}>
              <Maximize2 className="mr-2 h-5 w-5" /> Enter Fullscreen & Start
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col pt-16 sm:pt-20">
      {/* Header Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50 px-3 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="p-2 bg-primary/10 rounded-xl">
            < ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm md:text-base truncate max-w-[46vw] sm:max-w-none">{quiz.title}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session Secured</span>
              <div className="h-1 w-1 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6 shrink-0">
          <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 transition-colors ${timeLeft && timeLeft < 300 ? 'border-red-200 bg-red-50 text-red-600 animate-pulse' : 'border-border bg-background'}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm sm:text-lg font-bold font-mono">{timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
          </div>
          {violations > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 border border-orange-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-tight">Violations: {violations}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span>Question {currentQuestionIndex + 1} of {quiz?.questions?.length || 0}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2 bg-background border border-border/50" />
          </div>

          {/* Question Card */}
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`border-none shadow-xl shadow-primary/5 rounded-2xl sm:rounded-3xl overflow-hidden ${currentQuestion.type === 'SECTION_BREAK' ? 'bg-primary text-white' : ''}`}>
              <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
                <div className="flex items-center gap-2 mb-4">
                  {currentQuestion.type !== 'SECTION_BREAK' && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">
                      {currentQuestion.type.replace('_', ' ')}
                    </span>
                  )}
                  {currentQuestion.isRequired && currentQuestion.type !== 'SECTION_BREAK' && (
                    <span className="text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Required
                    </span>
                  )}
                </div>
                <CardTitle className={`text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight ${currentQuestion.type === 'SECTION_BREAK' ? 'md:text-4xl' : ''}`}>
                  {currentQuestion.text}
                </CardTitle>
                {currentQuestion.description && (
                  <p className={`mt-3 sm:mt-4 text-base sm:text-lg ${currentQuestion.type === 'SECTION_BREAK' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{currentQuestion.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-8 pt-4 sm:pt-6">
                {currentQuestion.type === 'MCQ' && (
                  <RadioGroup 
                    value={answers[currentQuestion.id] || ''} 
                    onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.id]: val })}
                    className="grid gap-3"
                  >
                    {currentQuestion?.options ? JSON.parse(currentQuestion.options).map((opt: string, i: number) => (
                      <Label 
                        key={i} 
                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer hover:bg-secondary/20 ${answers[currentQuestion.id] === opt ? 'border-primary bg-primary/5' : 'border-secondary/30 bg-secondary/10'}`}
                      >
                        <RadioGroupItem value={opt} className="sr-only" />
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${answers[currentQuestion.id] === opt ? 'border-primary' : 'border-border'}`}>
                          {answers[currentQuestion.id] === opt && <div className="h-3 w-3 rounded-full bg-primary" />}
                        </div>
                        <span className="text-base sm:text-lg font-medium wrap-break-word">{opt}</span>
                      </Label>
                    )) : null}
                  </RadioGroup>
                )}

                {currentQuestion.type === 'CHECKBOX' && (
                  <div className="grid gap-3">
                    {currentQuestion?.options ? JSON.parse(currentQuestion.options).map((opt: string, i: number) => (
                      <Label 
                        key={i} 
                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer hover:bg-secondary/20 ${answers[currentQuestion.id]?.includes(opt) ? 'border-primary bg-primary/5' : 'border-secondary/30 bg-secondary/10'}`}
                      >
                        <Checkbox 
                          checked={answers[currentQuestion.id]?.includes(opt)} 
                          onCheckedChange={(checked) => {
                            const prev = answers[currentQuestion.id] || [];
                            const next = checked ? [...prev, opt] : prev.filter((o: string) => o !== opt);
                            setAnswers({ ...answers, [currentQuestion.id]: next });
                          }}
                        />
                        <span className="text-base sm:text-lg font-medium wrap-break-word">{opt}</span>
                      </Label>
                    )) : null}
                  </div>
                )}

                {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'PARAGRAPH') && (
                  <Input 
                    value={answers[currentQuestion.id] || ''} 
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="h-14 text-lg bg-secondary/10 rounded-2xl border-2 border-secondary/30 focus-visible:ring-primary/20"
                    placeholder="Type your answer here..."
                  />
                )}

                {currentQuestion.type === 'DROPDOWN' && (
                  <Select 
                    value={answers[currentQuestion.id] || ''} 
                    onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.id]: val })}
                  >
                    <SelectTrigger className="h-14 text-lg bg-secondary/10 rounded-2xl border-2 border-secondary/30">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentQuestion?.options ? JSON.parse(currentQuestion.options).map((opt: string, i: number) => (
                        <SelectItem key={i} value={opt}>{opt}</SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                )}

                {currentQuestion.type === 'RATING' && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-center py-4 sm:py-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setAnswers({ ...answers, [currentQuestion.id]: star.toString() })}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star 
                          className={`h-12 w-12 ${Number(answers[currentQuestion.id]) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                        />
                      </button>
                    ))}
                  </div>
                )}

                {(currentQuestion.type === 'DATE') && (
                  <Input 
                    type="date"
                    value={answers[currentQuestion.id] || ''} 
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="h-14 text-lg bg-secondary/10 rounded-2xl border-2 border-secondary/30"
                  />
                )}

                {(currentQuestion.type === 'TIME') && (
                  <Input 
                    type="time"
                    value={answers[currentQuestion.id] || ''} 
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="h-14 text-lg bg-secondary/10 rounded-2xl border-2 border-secondary/30"
                  />
                )}

                {currentQuestion.type === 'FILE_UPLOAD' && (
                  <div className="space-y-4">
                    <Input 
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAnswers({ ...answers, [currentQuestion.id]: file.name });
                      }}
                      className="h-14 pt-3 bg-secondary/10 rounded-2xl border-2 border-secondary/30"
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                      Note: In this preview, we only record the file name for review.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-secondary/5 p-6 flex items-center justify-between border-t border-border/10">
                <Button 
                  variant="ghost" 
                  disabled={currentQuestionIndex === 0} 
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl hover:bg-background"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                
                {currentQuestionIndex === (quiz?.questions?.length || 0) - 1 ? (
                    <Button 
                      className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20" 
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Finish Exam</>}
                  </Button>
                ) : (
                    <Button 
                      className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20" 
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  >
                    Next Question <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-full border border-border shadow-xl flex items-center gap-3">
          <div className="h-2 w-2 bg-green-500 rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none">Auto-Syncing</span>
        </div>
      </div>
    </div>
  );
}
