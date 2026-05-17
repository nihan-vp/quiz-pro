import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "./src/lib/prisma.ts";
import { createToken } from "./src/lib/auth.ts";
import { authenticate, optionalAuthenticate, authorize } from "./src/lib/middleware.ts";
import type { AuthRequest } from "./src/lib/middleware.ts";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role }
      });
      const token = await createToken({ id: user.id, email: user.email, role: user.role, name: user.name });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = await createToken({ id: user.id, email: user.email, role: user.role, name: user.name });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } catch (error) {
      res.status(400).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", authenticate as any, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/stats/student", authenticate as any, authorize(["STUDENT", "ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const attempts = await prisma.attempt.findMany({
        where: { userId: req.user.id, status: "COMPLETED" },
        include: { form: true }
      });

      const totalCompleted = attempts.length;
      const avgScore = totalCompleted > 0 
        ? Math.round(attempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalCompleted) 
        : 0;

      // Simple ranking logic: compare this student's avg score to others
      // This is a naive implementation for demo purposes
      const allStudents = await prisma.user.findMany({
        where: { role: "STUDENT" },
        include: { attempts: { where: { status: "COMPLETED" } } }
      });

      const studentPerf = allStudents.map(s => ({
        id: s.id,
        avg: s.attempts.length > 0 ? s.attempts.reduce((acc, a) => acc + (a.score || 0), 0) / s.attempts.length : 0
      })).sort((a, b) => b.avg - a.avg);

      const rank = studentPerf.findIndex(s => s.id === req.user.id) + 1;
      const totalStudents = allStudents.length;

      const availableQuizzes = await prisma.form.count({
        where: { 
          isPublished: true,
          attempts: { none: { userId: req.user.id } }
        }
      });

      res.json({
        totalCompleted,
        avgScore,
        rank,
        totalStudents,
        availableQuizzes
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/auth/profile", authenticate as any, async (req: AuthRequest, res) => {
    try {
      const { name, email, password } = req.body;
      const data: any = {};
      if (name) data.name = name;
      if (email) data.email = email;
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data
      });

      // Re-create token with updated info
      const token = await createToken({ id: user.id, email: user.email, role: user.role, name: user.name });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // --- Form Routes ---
  app.get("/api/forms", authenticate as any, async (req: AuthRequest, res) => {
    try {
      const forms = await prisma.form.findMany({
        where: req.user.role === "ADMIN" ? {} : { creatorId: req.user.id },
        include: { _count: { select: { questions: true, attempts: true } } }
      });

      // Lazy check/migration for shareLink
      const updatedForms = await Promise.all(forms.map(async (form) => {
        if (!form.shareLink) {
          const shareLink = Math.random().toString(36).substring(2, 8).toUpperCase();
          return await prisma.form.update({
            where: { id: form.id },
            data: { shareLink },
            include: { _count: { select: { questions: true, attempts: true } } }
          });
        }
        return form;
      }));

      res.json(updatedForms);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/forms/:id/export", authenticate as any, authorize(["CREATOR", "ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const form = await prisma.form.findUnique({
        where: { id: req.params.id },
        include: { 
          attempts: { 
            include: { user: true, responses: true },
            where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED", "REVIEWED"] } }
          },
          questions: { orderBy: { order: "asc" } }
        }
      });

      if (!form) return res.status(404).json({ message: "Form not found" });

      // Build CSV headers
      const headers = ["Student Name", "Email", "Status", "Score", "Percentage", "Submitted At"];
      form.questions.forEach((q, i) => headers.push(`Q${i+1}: ${q.text}`));

      const totalPossibleMarks = form.questions.reduce((acc, q) => acc + (q.marks || 0), 0) || 1;

      const rows = form.attempts.map(a => {
        const name = a.user?.name || a.guestName || "Guest";
        const email = a.user?.email || a.guestEmail || "N/A";
        const row = [
          name,
          email,
          a.status,
          a.score || 0,
          `${Math.round((a.score || 0) / totalPossibleMarks * 100)}%`,
          a.completedAt?.toISOString() || "N/A"
        ];
        
        form.questions.forEach(q => {
          const resp = a.responses.find(r => r.questionId === q.id);
          row.push(resp?.answer ? resp.answer.replace(/"/g, '""').replace(/\n/g, ' ') : "");
        });
        
        return row.map(cell => `"${cell}"`).join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, '_')}_results.csv"`);
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/forms", authenticate as any, authorize(["CREATOR", "ADMIN"]), async (req: AuthRequest, res) => {
    const { title, description, questions, settings, isQuiz, isPublished } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "A quiz must have at least one question." });
    }

    try {
      const shareLink = Math.random().toString(36).substring(2, 8).toUpperCase();
      const form = await prisma.form.create({
        data: {
          title,
          description,
          settings,
          isQuiz,
          isPublished: !!isPublished,
          creatorId: req.user.id,
          shareLink,
          questions: {
            create: questions.map((q: any) => ({
              type: q.type,
              text: q.text,
              description: q.description,
              options: q.options ? JSON.stringify(q.options) : null,
              correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer),
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              order: q.order,
              isRequired: q.isRequired
            }))
          }
        }
      });
      res.json(form);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/forms/:id", authenticate as any, authorize(["CREATOR", "ADMIN"]), async (req: AuthRequest, res) => {
    const { title, description, questions, settings, isQuiz, isPublished } = req.body;
    try {
      // Delete existing questions and recreate them to keep it simple for now
      // A more complex implementation would diff and update
      await prisma.question.deleteMany({ where: { formId: req.params.id } });

      const form = await prisma.form.update({
        where: { id: req.params.id },
        data: {
          title,
          description,
          settings,
          isQuiz,
          isPublished: !!isPublished,
          questions: {
            create: questions.map((q: any, index: number) => ({
              type: q.type,
              text: q.text,
              description: q.description,
              options: q.options ? JSON.stringify(q.options) : null,
              correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer),
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              order: index,
              isRequired: q.isRequired
            }))
          }
        }
      });
      res.json(form);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/forms/:id", authenticate as any, async (req: AuthRequest, res) => {
    const form = await prisma.form.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { order: "asc" } } }
    });
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  });

  app.get("/api/forms/code/:code", authenticate as any, async (req: AuthRequest, res) => {
    const form = await prisma.form.findUnique({
      where: { shareLink: req.params.code.toUpperCase() },
      select: { id: true, isPublished: true }
    });
    if (!form) return res.status(404).json({ message: "Invalid quiz code" });
    if (!form.isPublished) return res.status(403).json({ message: "This quiz is not published" });
    res.json({ id: form.id });
  });

  // Join quiz - returns form info and existing attempt if logged in
  app.get("/api/forms/:id/join", optionalAuthenticate as any, async (req: AuthRequest, res) => {
    const form = await prisma.form.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { order: "asc" } } }
    });
    if (!form) return res.status(404).json({ message: "Quiz not found" });

    // If not published, only creator can join
    if (!form.isPublished && (!req.user || form.creatorId !== req.user.id)) {
      return res.status(403).json({ message: "This quiz is not published yet." });
    }

    const settings = form.settings ? JSON.parse(form.settings) : {};
    let attempt = null;

    if (req.user) {
      if (settings.oneResponsePerUser) {
        const existingCompleted = await prisma.attempt.findFirst({
          where: { formId: form.id, userId: req.user.id, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } }
        });
        if (existingCompleted) {
          return res.status(403).json({ message: "You have already submitted this quiz." });
        }
      }

      // Check for existing in-progress attempt
      attempt = await prisma.attempt.findFirst({
        where: { formId: form.id, userId: req.user.id, status: "IN_PROGRESS" }
      });
      
      if (!attempt) {
        attempt = await prisma.attempt.create({
          data: { formId: form.id, userId: req.user.id }
        });
      }
    }

    // Strip correct answers if it's a quiz
    const sanitizedForm = {
      ...form,
      questions: form.questions.map(q => ({ ...q, correctAnswer: null, explanation: null }))
    };

    res.json({ form: sanitizedForm, attempt, requiresGuestInfo: !req.user && !attempt });
  });

  // Start attempt for guests or manual start
  app.post("/api/forms/:id/start", optionalAuthenticate as any, async (req: AuthRequest, res) => {
    const { guestName, guestEmail } = req.body;
    
    // If logged in, we already handled it in /join or we use the user info
    const userId = req.user?.id;

    const attempt = await prisma.attempt.create({
      data: { 
        formId: req.params.id, 
        userId: userId || null,
        guestName,
        guestEmail,
        status: "IN_PROGRESS"
      }
    });

    res.json(attempt);
  });

  // --- Attempt Routes ---
  app.post("/api/attempts/:id/violation", async (req, res) => {
    await prisma.violation.create({
      data: { attemptId: req.params.id, type: req.body.type }
    });
    res.json({ success: true });
  });

  app.post("/api/attempts/:id/submit", async (req, res) => {
    const { answers, status } = req.body;
    try {
      const attempt = await prisma.attempt.findUnique({
        where: { id: req.params.id },
        include: { form: { include: { questions: true } } }
      });

      if (!attempt) return res.status(404).json({ message: "Attempt not found" });

      let totalScore = 0;
      const responseData = Object.entries(answers).map(([qId, answer]) => {
        const question = attempt.form.questions.find(q => q.id === qId);
        
        let isCorrect = false;
        if (question && question.correctAnswer) {
          const processedAnswer = typeof answer === 'string' ? answer : JSON.stringify(answer);
          isCorrect = question.correctAnswer === processedAnswer;
        }

        const marks = isCorrect ? (question?.marks || 0) : -(question?.negativeMarks || 0);
        totalScore += marks;
        return {
          questionId: qId,
          answer: typeof answer === "string" ? answer : JSON.stringify(answer),
          isCorrect,
          marksObtained: marks
        };
      });

      const updatedAttempt = await prisma.attempt.update({
        where: { id: req.params.id },
        data: {
          status: status || "COMPLETED",
          completedAt: new Date(),
          score: totalScore,
          responses: { create: responseData }
        }
      });

      res.json(updatedAttempt);
    } catch (error: any) {
      console.error("Submission error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/attempts/public/:id", async (req, res) => {
    try {
      const attempt = await prisma.attempt.findUnique({
        where: { id: req.params.id },
        include: { form: { include: { questions: true } }, responses: true }
      });
      if (!attempt) return res.status(404).json({ message: "Result not found" });
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/attempts/my", authenticate as any, async (req: AuthRequest, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.user.id, status: "COMPLETED" },
      include: { form: true }
    });
    res.json(attempts);
  });

  app.get("/api/attempts/recent", authenticate as any, async (req: AuthRequest, res) => {
    try {
      let attempts;
      if (req.user.role === "CREATOR" || req.user.role === "ADMIN") {
        attempts = await prisma.attempt.findMany({
          where: {
            form: req.user.role === "ADMIN" ? {} : { creatorId: req.user.id },
            status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }
          },
          include: { user: true, form: true },
          orderBy: { completedAt: "desc" },
          take: 5
        });
      } else {
        attempts = await prisma.attempt.findMany({
          where: { userId: req.user.id, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } },
          include: { form: true },
          orderBy: { completedAt: "desc" },
          take: 5
        });
      }
      res.json(attempts);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/forms/:id/active-attempts", authenticate as any, authorize(["CREATOR", "ADMIN"]), async (req: AuthRequest, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { formId: req.params.id, status: "IN_PROGRESS" },
      include: { 
        user: true, 
        _count: { select: { violations: true, responses: true } } 
      }
    });
    res.json(attempts);
  });

  app.post("/api/attempts/:id/review", authenticate as any, authorize(["CREATOR", "ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const { score, responses } = req.body;
      
      if (responses && Array.isArray(responses)) {
        for (const resp of responses) {
          await prisma.response.update({
            where: { id: resp.id },
            data: { 
              isCorrect: resp.isCorrect,
              marksObtained: resp.marksObtained !== undefined ? resp.marksObtained : undefined
            }
          });
        }
      }

      const attempt = await prisma.attempt.update({
        where: { id: req.params.id },
        data: { 
          status: "REVIEWED",
          score: score !== undefined ? score : undefined
        }
      });
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/forms/:id/reports", authenticate as any, authorize(["CREATOR", "ADMIN"]), async (req: AuthRequest, res) => {
    try {
      const form = await prisma.form.findUnique({
        where: { id: req.params.id },
        include: { 
          questions: true,
          attempts: {
            where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } },
            include: { 
              user: true, 
              responses: true,
              violations: true
            },
            orderBy: { completedAt: "desc" }
          }
        }
      });
      
      if (!form) return res.status(404).json({ message: "Quiz not found" });
      
      // Ensure only creator or admin can access
      if (form.creatorId !== req.user.id && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(form);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // --- Socket Logic ---
  io.on("connection", (socket) => {
    socket.on("join-quiz", (quizId) => {
      socket.join(`quiz:${quizId}`);
    });
    socket.on("violation", (data) => {
      io.to(`quiz:${data.quizId}`).emit("update-monitoring", data);
    });
    socket.on("progress-update", (data) => {
      io.to(`quiz:${data.quizId}`).emit("status-update", data);
    });
  });

  // --- General Settings ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
