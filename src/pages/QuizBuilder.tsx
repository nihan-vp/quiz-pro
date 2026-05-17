import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/src/components/DashboardLayout';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Save, 
  GripVertical, 
  Type, 
  AlignLeft, 
  CheckSquare, 
  CircleDot, 
  ChevronDown, 
  Upload, 
  Star, 
  Calendar, 
  Clock, 
  Menu,
  ShieldAlert,
  Loader2,
  Copy,
  Trophy
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/src/components/ui/select';
import { Switch } from '@/src/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { motion, Reorder } from 'motion/react';
import { toast } from 'sonner';
import api from '@/src/lib/api';

const QUESTION_TYPES = [
  { type: 'SHORT_ANSWER', label: 'Short Answer', icon: Type },
  { type: 'PARAGRAPH', label: 'Paragraph', icon: AlignLeft },
  { type: 'MCQ', label: 'Multiple Choice', icon: CircleDot },
  { type: 'CHECKBOX', label: 'Checkboxes', icon: CheckSquare },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown },
  { type: 'FILE_UPLOAD', label: 'File Upload', icon: Upload },
  { type: 'RATING', label: 'Rating', icon: Star },
  { type: 'DATE', label: 'Date', icon: Calendar },
  { type: 'TIME', label: 'Time', icon: Clock },
  { type: 'SECTION_BREAK', label: 'Section Break', icon: Menu },
];

export default function QuizBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled Quiz');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    isQuiz: true,
    timer: 60,
    startDate: '',
    endDate: '',
    oneResponsePerUser: true,
    requireLogin: true,
    shuffleQuestions: false,
    passMark: 50,
    antiCheat: {
      disableCopyPaste: true,
      disableRightClick: true,
      detectTabSwitch: true,
      fullscreenRequired: true,
      maxViolations: 3,
      autoSubmitOnMaxViolations: true,
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    if (id) {
      // Fetch existing quiz
      const fetchQuiz = async () => {
        try {
          const res = await api.get(`/forms/${id}`);
          const quiz = res.data;
          setTitle(quiz.title);
          setDescription(quiz.description || '');
          const parsedQuestions = (quiz.questions || []).map((q: any) => {
            let correctAnswer = q.correctAnswer;
            try {
              if (q.correctAnswer && (q.correctAnswer.startsWith('[') || q.correctAnswer.startsWith('{'))) {
                correctAnswer = JSON.parse(q.correctAnswer);
              }
            } catch (e) {}

            let options = q.options;
            try {
              if (typeof q.options === 'string') {
                options = JSON.parse(q.options);
              }
            } catch (e) {}

            return { ...q, correctAnswer, options: options || [] };
          });
          setQuestions(parsedQuestions);
          setPublished(quiz.isPublished);
          if (quiz.settings) setSettings(JSON.parse(quiz.settings));
        } catch (error) {
          toast.error('Failed to load quiz');
        }
      };
      fetchQuiz();
    }
  }, [id]);

  const addQuestion = (type: string) => {
    const newQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: type === 'SECTION_BREAK' ? 'Section Header' : 'New Question',
      description: '',
      options: type === 'MCQ' || type === 'CHECKBOX' || type === 'DROPDOWN' ? ['Option 1'] : null,
      correctAnswer: '',
      marks: 1,
      negativeMarks: 0,
      isRequired: true,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
    toast.success(`${type.replace('_', ' ')} added`);
  };

  const updateQuestion = (qId: string, updates: any) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
    toast.info('Question removed');
  };

  const handleSave = async (isPub: boolean = false) => {
    setIsSaving(true);
    try {
      const data = {
        title,
        description,
        questions,
        settings: JSON.stringify(settings),
        isPublished: isPub,
        isQuiz: settings.isQuiz,
      };

      let quizId = id;
      if (id) {
        await api.put(`/forms/${id}`, data);
      } else {
        const res = await api.post('/forms', data);
        quizId = res.data.id;
        navigate(`/forms/${quizId}/edit`, { replace: true });
      }
      setPublished(isPub);
      toast.success(isPub ? 'Quiz published!' : 'Quiz saved as draft');
      return quizId;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save quiz');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    const quizId = await handleSave(published); // Save with current state
    if (quizId) {
      window.open(`/forms/${quizId}/join`, '_blank');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold truncate max-w-[200px] md:max-w-md">{title}</h1>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSaving ? 'bg-secondary animate-pulse' : (published ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')}`}>
              {isSaving ? 'Saving...' : (published ? 'Published' : 'Draft')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handlePreview} className="hidden sm:flex">
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="shadow-lg shadow-primary/20">
              Publish
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-secondary/30 p-1 rounded-xl h-11">
              <TabsTrigger value="questions" className="rounded-lg px-6 h-9 transition-all data-[state=active]:shadow-sm">Questions</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg px-6 h-9 transition-all data-[state=active]:shadow-sm">Settings</TabsTrigger>
              <TabsTrigger value="anticheat" className="rounded-lg px-6 h-9 transition-all data-[state=active]:shadow-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Anti-Cheat
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="questions" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Title Card */}
            <Card className="border-t-8 border-t-primary shadow-xl shadow-primary/5 rounded-2xl border-x-none border-b-none md:border md:border-t-8">
              <CardContent className="pt-8 pb-10 px-6 md:px-10 space-y-6">
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="text-4xl font-extrabold border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:opacity-20"
                  placeholder="Quiz Title"
                />
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="text-lg text-muted-foreground border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:opacity-20"
                  placeholder="Quiz description (optional)"
                />
              </CardContent>
            </Card>

            {/* Questions area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3">
                {questions.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/5">
                    <p className="text-muted-foreground mb-4">No questions added yet</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                      {QUESTION_TYPES.slice(0, 4).map(qt => (
                        <Button key={qt.type} variant="secondary" size="sm" onClick={() => addQuestion(qt.type)}>
                          <Plus className="mr-2 h-4 w-4" /> {qt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-6">
                    {questions.map((q) => (
                      <Reorder.Item key={q.id} value={q} className="group relative">
                        <Card className="shadow-sm hover:shadow-md transition-shadow relative rounded-2xl border-border/50">
                          <div className="absolute left-1/2 -translate-x-1/2 -top-3 h-6 w-10 bg-secondary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing border-2 border-border shadow-sm">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <CardContent className="p-6 md:p-8 space-y-6">
                            <div className="flex items-start gap-4 flex-col md:flex-row">
                              <div className="flex-1 space-y-4 w-full">
                                <div className="flex gap-4">
                                  <Input 
                                    value={q.text} 
                                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })} 
                                    className="text-lg font-semibold bg-secondary/20 h-12"
                                    placeholder="Question text"
                                  />
                                  <Select 
                                    value={q.type} 
                                    onValueChange={(val) => updateQuestion(q.id, { type: val })}
                                  >
                                    <SelectTrigger className="w-[180px] bg-secondary/20 h-12">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {QUESTION_TYPES.map(qt => (
                                        <SelectItem key={qt.type} value={qt.type}>
                                          <div className="flex items-center gap-2">
                                            <qt.icon className="h-4 w-4" /> {qt.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                 {/* Options for Choice based questions */}
                                {(q.type === 'MCQ' || q.type === 'CHECKBOX' || q.type === 'DROPDOWN') && (
                                  <div className="space-y-3 pl-4">
                                    {(q.options || []).map((opt: string, idx: number) => {
                                      const isCorrect = q.type === 'CHECKBOX' 
                                        ? (Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : (q.correctAnswer === opt))
                                        : (q.correctAnswer === opt);
                                      
                                      const toggleCorrect = () => {
                                        if (q.type === 'CHECKBOX') {
                                          let current = Array.isArray(q.correctAnswer) ? q.correctAnswer : (q.correctAnswer ? [q.correctAnswer] : []);
                                          if (current.includes(opt)) {
                                            current = current.filter(c => c !== opt);
                                          } else {
                                            current = [...current, opt];
                                          }
                                          updateQuestion(q.id, { correctAnswer: current });
                                        } else {
                                          updateQuestion(q.id, { correctAnswer: opt });
                                        }
                                      };

                                      return (
                                        <div key={idx} className="flex items-center gap-3">
                                          <button 
                                            type="button"
                                            onClick={toggleCorrect}
                                            className={`h-5 w-5 rounded-full border-2 transition-all ${isCorrect ? 'bg-primary border-primary scale-110' : 'border-border hover:border-primary/50'}`} 
                                            title="Mark as correct"
                                          />
                                          <Input 
                                            value={opt} 
                                            onChange={(e) => {
                                              const newOpts = [...q.options];
                                              newOpts[idx] = e.target.value;
                                              updateQuestion(q.id, { options: newOpts });
                                            }}
                                            className="flex-1 bg-transparent border-none focus-visible:ring-0 p-0 h-auto font-medium"
                                          />
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive" onClick={() => {
                                            const newOpts = q.options.filter((_: any, i: number) => i !== idx);
                                            updateQuestion(q.id, { options: newOpts });
                                          }}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                    <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => {
                                      updateQuestion(q.id, { options: [...(q.options || []), `Option ${q.options.length + 1}`] });
                                    }}>
                                      <Plus className="mr-2 h-4 w-4" /> Add option
                                    </Button>
                                  </div>
                                )}

                                {(q.type === 'SHORT_ANSWER' || q.type === 'DATE' || q.type === 'TIME' || q.type === 'RATING') && (
                                  <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Correct Answer (Optional for auto-grading)</Label>
                                    <Input 
                                      type={q.type === 'DATE' ? 'date' : q.type === 'TIME' ? 'time' : q.type === 'RATING' ? 'number' : 'text'}
                                      max={q.type === 'RATING' ? 5 : undefined}
                                      min={q.type === 'RATING' ? 1 : undefined}
                                      value={q.correctAnswer} 
                                      onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })} 
                                      className="bg-secondary/10 h-10 border-dashed"
                                      placeholder="Leave empty for manual review"
                                    />
                                  </div>
                                )}

                                {q.type === 'PARAGRAPH' && (
                                  <div className="space-y-1 pl-4 border-l-2 border-orange-500/20 italic text-muted-foreground text-sm">
                                    Manual grading usually required for long text answers.
                                  </div>
                                )}

                                {q.type === 'FILE_UPLOAD' && (
                                  <div className="space-y-1 pl-4 border-l-2 border-blue-500/20 italic text-muted-foreground text-sm">
                                    Files will be collected and require manual review by the creator.
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="bg-secondary/10 px-6 py-3 flex items-center justify-between">
                            {q.type !== 'SECTION_BREAK' ? (
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Marks</Label>
                                  <Input 
                                    type="number" 
                                    value={q.marks} 
                                    onChange={(e) => updateQuestion(q.id, { marks: parseInt(e.target.value) || 0 })}
                                    className="w-16 h-8 text-center font-bold"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Required</Label>
                                  <Switch 
                                    checked={q.isRequired} 
                                    onCheckedChange={(val) => updateQuestion(q.id, { isRequired: val })} 
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Section Separator (No Score)</div>
                            )}
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70" onClick={() => deleteQuestion(q.id)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:block">
                <Card className="sticky top-28 bg-card border-none shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest">Question Types</div>
                  <div className="p-2 grid grid-cols-2 lg:grid-cols-1 gap-1">
                    {QUESTION_TYPES.map((qt) => (
                      <Button 
                        key={qt.type} 
                        variant="ghost" 
                        className="justify-start gap-4 h-11 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                        onClick={() => addQuestion(qt.type)}
                      >
                        <qt.icon size={18} />
                        <span className="text-xs font-semibold">{qt.label}</span>
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10 mb-6">
                <CardTitle className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" /> General Quiz Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl group transition-all hover:bg-secondary/30">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Quiz Mode</Label>
                    <p className="text-sm text-muted-foreground">Enable scoring, correct answers, and feedback.</p>
                  </div>
                  <Switch checked={settings.isQuiz} onCheckedChange={(val) => setSettings({ ...settings, isQuiz: val })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time Limit (minutes)</Label>
                    <Input 
                      type="number" 
                      value={settings.timer} 
                      onChange={(e) => setSettings({ ...settings, timer: parseInt(e.target.value) || 0 })}
                      className="bg-secondary/20 h-11"
                    />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Passing Mark (%)</Label>
                    <Input 
                      type="number" 
                      value={settings.passMark} 
                      onChange={(e) => setSettings({ ...settings, passMark: parseInt(e.target.value) || 0 })}
                      className="bg-secondary/20 h-11"
                    />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Plus className="h-4 w-4" /> One response per user</Label>
                    <Switch checked={settings.oneResponsePerUser} onCheckedChange={(val) => setSettings({ ...settings, oneResponsePerUser: val })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label>Start Date/Time</Label>
                    <Input 
                      type="datetime-local" 
                      value={settings.startDate} 
                      onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                      className="bg-secondary/20 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date/Time</Label>
                    <Input 
                      type="datetime-local" 
                      value={settings.endDate} 
                      onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                      className="bg-secondary/20 h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anticheat" className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
              <CardHeader className="bg-red-500/5 border-b border-red-500/10 mb-6">
                <CardTitle className="flex items-center gap-3 text-red-600">
                  <ShieldAlert className="h-5 w-5" /> Anti-Cheat System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-8 flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-900">Integrity Measures</h4>
                    <p className="text-sm text-red-700/80">Enable these settings to enforce exam rules and detect potential cheating attempts in real-time.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {[
                    { label: 'Disable Copy/Paste', key: 'disableCopyPaste', desc: 'Prevents applicants from copying questions or pasting answers' },
                    { label: 'Detect Tab Switch', key: 'detectTabSwitch', desc: 'Logs everytime the user leaves the exam tab' },
                    { label: 'Force Fullscreen', key: 'fullscreenRequired', desc: 'Requires users to stay in fullscreen mode during the exam' },
                    { label: 'Auto-Submit on Violations', key: 'autoSubmitOnMaxViolations', desc: 'Automatically finishes the exam after maximum violations' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl hover:bg-secondary/20 transition-colors">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold uppercase tracking-wider">{setting.label}</Label>
                        <p className="text-xs text-muted-foreground">{setting.desc}</p>
                      </div>
                      <Switch 
                        checked={(settings.antiCheat as any)[setting.key]} 
                        onCheckedChange={(val) => setSettings({ 
                          ...settings, 
                          antiCheat: { ...settings.antiCheat, [setting.key]: val } 
                        })} 
                      />
                    </div>
                  ))}

                  <div className="mt-4 p-4 bg-secondary/30 rounded-xl space-y-4">
                    <Label className="text-sm font-bold flex items-center justify-between">
                      MAX VIOLATIONS ALLOWED <span className="font-mono text-primary text-lg">{settings.antiCheat.maxViolations}</span>
                    </Label>
                    <Input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={settings.antiCheat.maxViolations} 
                      onChange={(e) => setSettings({
                        ...settings,
                        antiCheat: { ...settings.antiCheat, maxViolations: parseInt(e.target.value) }
                      })}
                      className="accent-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
