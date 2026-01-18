# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Protocollo C.P.A. 2.0** - A comprehensive Italian civil service exam preparation platform combining spaced repetition learning (SRS), AI-powered study tools, and wellness features.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + TailwindCSS + Radix UI
- Backend: Express.js + TypeScript
- Database: PostgreSQL with Drizzle ORM
- AI: OpenRouter (multi-model fallback: Claude, GPT-4o, Gemini)
- Deployment: Vercel (serverless functions)

## Common Development Commands

### Development
```bash
npm install                    # Install dependencies
npm run dev                    # Start development server (client + server via tsx)
```

### Building
```bash
npm run build                  # Build client only (Vite)
npm run build:full            # Build both client and server
npm run check                  # TypeScript type checking
```

### Database
```bash
npm run db:push               # Push schema changes to database (Drizzle Kit)
```

### Production
```bash
npm start                     # Start production server (requires built files)
```

## Project Structure

```
├── client/                   # React frontend (Vite root)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context (Auth, Fase3, Benessere)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities (queryClient, authUtils)
│   │   ├── pages/           # Route components
│   │   └── App.tsx          # Main router with protected routes
│   └── index.html
├── server/                   # Express backend
│   ├── routes*.ts           # API route handlers by feature
│   ├── storage*.ts          # Database abstraction layer
│   ├── services/            # Business logic (AI, audit, email)
│   ├── middleware/          # Auth, audit logging, admin checks
│   ├── utils/               # Helper functions
│   ├── app.ts               # Express app configuration
│   ├── index.ts             # Server entry point
│   └── db.ts                # Drizzle ORM initialization
├── shared/                   # Type-safe schema definitions
│   ├── schema.ts            # Main schema exports
│   ├── schema-*.ts          # Feature-specific schemas
│   └── (Zod validation)
├── api/                      # Vercel serverless entry point
│   └── index.ts
├── migrations/               # Drizzle SQL migrations
├── uploads/                  # File storage (materials, PDFs)
└── attached_assets/          # Static assets
```

## Architecture Overview

### Full-Stack Type Safety

The project uses **Drizzle ORM** for end-to-end type safety:

1. Database schema defined in `shared/schema*.ts`
2. Drizzle generates TypeScript types from schema
3. Types exported via Zod for runtime validation
4. Both client and server import same types from `@shared`

Example flow:
```typescript
// shared/schema.ts
export const flashcards = pgTable("flashcards", { ... });
export type Flashcard = typeof flashcards.$inferSelect;

// server/routes.ts
const card: Flashcard = await storage.getFlashcard(id);

// client/pages/FlashcardsPage.tsx
const { data: cards } = useQuery<Flashcard[]>({...});
```

### Authentication Flow

- **OIDC-based** authentication via Passport.js (`server/replitAuth.ts`)
- Session management with PostgreSQL backend (`connect-pg-simple`)
- Mock auth auto-injected in development (see `server/app.ts:69-103`)
- Protected routes check `req.user` object
- Frontend checks auth via `AuthContext` and `/api/auth/user`

### Storage Layer Pattern

All database operations go through the **Storage Interface** (`server/storage.ts`):
- `IStorage` interface defines contracts
- `DatabaseStorage` class implements using Drizzle
- Feature-specific storage modules:
  - `storage-sq3r.ts`: SQ3R study method
  - `storage-libreria.ts`: Public document library
  - `storage-simulazioni.ts`: Mock exams
  - `storage-normativa.ts`: Regulatory documents

### API Route Organization

Routes are split by feature in `server/routes-*.ts`:
- `routes.ts`: Core (concorsi, materials, flashcards, calendar)
- `routes-sq3r.ts`: SQ3R study method (Phase 1)
- `routes-fase3.ts`: Error tracking, drill sessions, recovery plans (Phase 3)
- `routes-simulazioni.ts`: Mock exams and quizzes
- `routes-benessere.ts`: Wellness features (hydration, sleep, nutrition)
- `routes-mnemotecniche.ts`: Memory techniques
- `routes-admin.ts`: Admin panel functions
- `routes-audit.ts`: Audit log queries
- `routes-libreria.ts`: Public document library
- `routes-podcast.ts`: Podcast management

All routes registered in `server/app.ts:initializeApp()`

### AI Service Architecture

**Multi-Model Fallback System** (`server/services/ai.ts`):
- OpenRouter as gateway to multiple AI providers
- Task-specific model chains (e.g., `flashcards_generate` → Gemini → GPT-4o → Claude)
- `generateWithFallback()`: Tries primary model, falls back on failure
- `cleanJson()`: Extracts JSON from markdown-wrapped responses
- Rate limiting: 10 requests/minute for AI routes

**Common AI Tasks:**
- `flashcards_generate`: Generate flashcard sets from materials
- `flashcard_explain`: Detailed explanations for cards
- `quiz_generate`: Create quiz questions with distractors
- `fase3_drill_generate`: Generate targeted drill questions
- `recovery_plan`: AI-powered recovery plans for weak areas
- `sq3r_generate`: Chapter summaries for SQ3R method

### File Upload Handling

**Multer Configuration** (in route files):
- Storage: Disk storage in `/uploads/materials` or `/tmp/uploads` (Vercel)
- Size limits: 500MB for materials, 10MB for Fase 3
- Allowed types: PDF, Word, MP3, MP4
- PDF text extraction via `pdf-parse` library
- Extracted text fed to AI for flashcard generation

**Important**: Vercel uses ephemeral `/tmp` filesystem - permanent storage requires cloud integration.

### State Management (Client)

**React Context API** for global state:
- `AuthContext`: User authentication and profile
- `Fase3Context`: Error bins, progress, SRS items
- `BenessereContext`: Wellness module state
- `PomodoroContext`: Pomodoro timer
- `SpecialistaContext`: Specialization tracking

**TanStack React Query** for server state:
- Configured in `client/src/lib/queryClient.ts`
- No auto-retry, no refetch on window focus
- Uses `apiRequest()` helper for fetching

## Key Features & Concepts

### SQ3R Study Method (Fase 1)

**Survey, Question, Read, Recite, Review** framework:
- Organize materials by subject (`materieSQ3R`)
- Break down into chapters (`capitoliSQ3R`)
- Link study sources (`fontiStudio`): Edises books, personal docs, NotebookLM, library
- AI-generated chapter explanations via OpenRouter
- Routes: `/api/sq3r/*`

### Flashcards & Spaced Repetition

**SM-2 Algorithm** (`server/sm2-algorithm.ts`):
- `easeFactor`: Difficulty (1.3-2.5)
- `intervalloGiorni`: Days until next review
- `numeroRipetizioni`: Repetition count
- Quality ratings: 0 (don't remember), 3 (easy)

**Workflow:**
1. Upload material (PDF/Word)
2. AI generates flashcard set
3. User reviews cards due today
4. Rate card quality (0-3)
5. SM-2 calculates next review date
6. Progress tracked in `userProgress`

### Fase 3 - Error Consolidation

**Purpose**: Track errors, identify weak areas, generate recovery plans

**Key Tables:**
- `fase3Progress`: Overall phase status
- `fase3ErrorBins`: Grouped errors by topic with difficulty scoring
- `fase3Errors`: Individual error records
- `fase3DrillSessions`: Practice session tracking
- `fase3GeneratedQuestions`: AI-generated drill questions

**Workflow:**
1. User makes error in quiz/flashcard
2. Error logged via `POST /api/fase3/track-error`
3. Errors grouped into bins by topic
4. Difficulty calculated for each bin
5. AI generates recovery plan when needed
6. Drill sessions created with targeted questions
7. Progress tracked (retention rate, drill hours, SRS reviews)

### Role-Based Access Control

**Schema** (`shared/schema-rbac.ts`):
- `userRoles`: User-to-role assignment
- `rolePermissions`: Role-to-permission mapping
- `userSuspensions`: Account suspension tracking

**Roles**: super_admin, admin, staff, user

**Middleware**: `middleware/adminAuth.ts`
- `requireAdminRole`: Checks user role in DB
- `requireSuperAdmin`: Restricts to super_admin only

### Audit Logging

**Service** (`server/services/auditLogService.ts`):
- Automatic logging of all user actions
- Captures: action, userId, category, timestamp, IP, user agent
- Categories: auth, users, content, subscriptions, admin, ai, system
- Middleware wrapper in `middleware/auditMiddleware.ts`
- Stored in `auditLogs` table

## Path Aliases

When importing, use these aliases:
- `@/`: Points to `client/src/`
- `@shared/`: Points to `shared/`
- `@assets/`: Points to `attached_assets/`

Example:
```typescript
import { useAuth } from "@/hooks/useAuth";
import { flashcards } from "@shared/schema";
```

## Environment Variables

Required for development:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `OPENROUTER_API_KEY`: AI service API key
- `NODE_ENV`: development/production

Optional:
- `ADMIN_EMAILS`: Comma-separated admin email list
- `REPL_ID`: Replit environment detection
- `VERCEL`: Vercel deployment detection

## Database Schema Patterns

### Adding New Tables

1. Create schema in `shared/schema-*.ts`:
```typescript
export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  // ... other columns
});

export type MyTable = typeof myTable.$inferSelect;
export type NewMyTable = typeof myTable.$inferInsert;
```

2. Export from `shared/schema.ts`
3. Run `npm run db:push` to migrate
4. Add storage methods in relevant `server/storage*.ts`

### Foreign Key Conventions

- User references: `userId: text("user_id").references(() => users.id)`
- Concorsi references: `concorsoId: integer("concorso_id").references(() => concorsi.id)`
- Cascade deletes where appropriate: `.onDelete("cascade")`

## Design System

**Typography**: Inter font (Google Fonts)
- Headings: `text-xl` to `text-3xl`, `font-semibold`
- Body: `text-base`, `font-normal`
- Metadata: `text-sm`, `font-medium`

**Spacing**: Tailwind units of 2, 4, 6, 8, 12, 16
- Card padding: `p-6`
- Section gaps: `gap-6` or `gap-8`
- Button padding: `px-6 py-3`

**Components**: Radix UI primitives with custom styling
- See `design_guidelines.md` for detailed design system

**Icons**: Lucide React (`lucide-react` package)

## Development Workflow Patterns

### Adding a New API Endpoint

1. Define route in appropriate `server/routes-*.ts`
2. Add storage methods in `server/storage*.ts`
3. Update schema if needed in `shared/schema-*.ts`
4. Create React Query hook in client if needed
5. Update UI components to use new endpoint

### Adding AI-Powered Features

1. Define task type in `server/services/ai.ts` → `getModelChain()`
2. Create prompt template in route handler
3. Call `generateWithFallback()` with task type
4. Handle JSON cleanup with `cleanJson()`
5. Add rate limiting if needed (see `/api/ai` route)

### Testing API Routes Locally

```bash
# Start dev server
npm run dev

# Server runs on http://localhost:5000
# Client proxies to server via Vite config
# Access routes at http://localhost:5173/api/*
```

### Mock Data for Development

Mock auth user auto-created in dev (see `server/app.ts:69-103`):
- Email: `albertobrando1991@gmail.com`
- Role: admin
- ID: `admin-user-123`

## Rate Limiting

**General API**: 100 requests per 15 minutes per IP
**AI routes** (`/api/ai/*`): 10 requests per 1 minute per IP

When adding AI routes, apply stricter limiter:
```typescript
app.use("/api/my-ai-feature", aiLimiter);
```

## Deployment (Vercel)

**Build Process:**
1. Vite builds client → `dist/`
2. esbuild via `script/build.ts` builds server → `dist-server/`
3. Vercel deploys serverless function at `/api/index.ts`

**Serverless Entry Point** (`api/index.ts`):
- Imports Express app from `dist-server/app.cjs`
- Initializes app once
- Handles request/response transformation

**Static Files**: Handled by Vercel, not Express in production

## Security Considerations

- **Authentication**: OIDC-based, HTTP-only cookies, SameSite=lax
- **Rate Limiting**: Prevents abuse and controls AI costs
- **Audit Logging**: All actions tracked with IP/user agent
- **File Upload**: MIME type validation, size limits, isolated storage
- **RBAC**: Role-based access control for sensitive operations
- **Environment Variables**: Never commit `.env` file

## Common Pitfalls

1. **Forgetting to run `db:push`** after schema changes - migrations won't apply
2. **Import paths**: Use aliases (`@/`, `@shared/`) instead of relative paths
3. **Mock auth in production**: Mock auth only works in development (see `NODE_ENV` check)
4. **Vercel file storage**: `/tmp` is ephemeral, need cloud storage for production
5. **AI rate limits**: Don't forget stricter rate limiting for AI routes
6. **Session secret**: Must be set in production for secure cookies
7. **Type imports**: Import types from `@shared/schema`, not raw Drizzle types

## Useful Database Queries

### Check user roles
```sql
SELECT u.email, ur.role FROM users u
JOIN user_roles ur ON u.id = ur.user_id;
```

### Check flashcards due today
```sql
SELECT * FROM flashcards
WHERE prossimo_ripasso <= CURRENT_DATE
ORDER BY prossimo_ripasso;
```

### Check Fase 3 error bins
```sql
SELECT * FROM fase3_error_bins
WHERE concorso_id = ? AND user_id = ?
ORDER BY difficulty_score DESC;
```
