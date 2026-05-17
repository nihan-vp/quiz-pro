# QuizForm Pro

Production-ready quiz and exam platform with anti-cheat controls, role-based workflows, real-time monitoring, and performance analytics.

## Overview

QuizForm Pro is a full-stack TypeScript application for creating, delivering, and monitoring quizzes/exams. It includes:

- Role-based access for `ADMIN`, `CREATOR`, and `STUDENT`
- Quiz/form builder with multiple question types
- Real-time exam monitoring with Socket.IO
- Anti-cheat event capture (tab switch, blur, fullscreen exit, copy/paste restrictions)
- Attempt tracking, scoring, history, and report/export capabilities

## Tech Stack

- Frontend: React 19, Vite, TypeScript, React Router, Zustand, Tailwind CSS, Sonner
- Backend: Express, Socket.IO, TypeScript (`tsx` runtime in dev)
- Auth/Security: JWT (`jose`), bcrypt, cookie-based auth
- Database: MongoDB with Prisma ORM
- Build: Vite + esbuild

## Project Structure

```text
quizform-pro/
   prisma/
      schema.prisma
   src/
      components/
      hooks/
         useAntiCheat.ts
      lib/
         api.ts
         auth.ts
         middleware.ts
         prisma.ts
      pages/
      store/
   server.ts
   package.json
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB instance (Atlas or local)

## Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority"
JWT_SECRET="your-very-strong-secret-at-least-32-characters"
NODE_ENV="development"
```

Notes:

- `DATABASE_URL` is required by Prisma.
- `JWT_SECRET` is required for token signing/verification.
- Server currently runs on fixed port `3000` in `server.ts`.

## Installation

```bash
npm install
```

After install, Prisma client is generated automatically via `postinstall`.

## Database Setup

For MongoDB + Prisma schema sync:

```bash
npx prisma db push
```

Optional:

```bash
npx prisma studio
```

## Running the App

Development:

```bash
npm run dev
```

This starts the combined backend/frontend server via `tsx server.ts`.

Production build:

```bash
npm run build
npm run start
```

## Available Scripts

- `npm run dev` - Start app in development mode
- `npm run build` - Build client with Vite and bundle server with esbuild
- `npm run start` - Run compiled server from `dist/server.js`
- `npm run lint` - Type-check with `tsc --noEmit`
- `npm run clean` - Remove build artifacts

## Authentication and Roles

- Auth is cookie-based (`token` cookie) with JWT payload validation.
- Protected routes are enforced in both frontend route guards and backend middleware.
- Supported roles:
   - `ADMIN`: full system access
   - `CREATOR`: create/manage forms and reports
   - `STUDENT`: take quizzes, view results/history

## Key Features

- Quiz creation with configurable question types
- Publish/share workflow
- Timed attempts and completion states
- Violation logging during exam sessions
- Monitoring dashboard for creators/admins
- Student progress and score reporting
- CSV export support for form results

## API Highlights

Representative endpoints (not exhaustive):

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/forms`
- `GET /api/forms/:id/export`

## Troubleshooting

### Port 3000 already in use

On Windows PowerShell:

```powershell
$pids = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($pids) { $pids | ForEach-Object { Stop-Process -Id $_ -Force } }
```

### Prisma client issues

```bash
npx prisma generate
```

### Type-check errors

```bash
npm run lint
```

## Security Notes

- Use a long, random `JWT_SECRET` in all environments.
- Cookies are configured with `httpOnly`, `secure`, and `sameSite: "none"`; ensure HTTPS in deployed environments.
- Restrict CORS origins before production release.

## License

No license file is currently included. Add a `LICENSE` file if you plan to distribute this project publicly.
