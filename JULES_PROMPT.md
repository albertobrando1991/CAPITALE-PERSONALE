<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<active_errors>
File: Fase3Dashboard.tsx Line 456: Type 'string' is not assignable to type 'number'.
</active_errors>
<artifacts>
--- CURRENT TASK CHECKLIST ---
# Oral Exam AI - Implementation Checklist

## Restore Point
- [x] Create git tag `pre-oral-exam-feature`

## Phase 1: Database & Backend Foundation
- [x] Create `oral_exam_sessions` table schema
- [x] Add migration via `drizzle-kit push`
- [x] Create `oral_exam` AI task in `ai.ts` with Persona prompts
- [x] Create `routes-oral-exam.ts` with endpoints:
  - `POST /api/oral-exam/start` (create session)
  - `POST /api/oral-exam/:sessionId/message` (send user message, get AI reply)
  - `POST /api/oral-exam/:sessionId/end` (close session, get feedback)
  - `GET /api/oral-exam/:sessionId` (get session transcript)

## Phase 2: Frontend Core
- [x] Create `OralExamPage.tsx` with three phases:
  - Setup: Persona + Topic selection
  - Session: Chat UI with voice I/O
  - Feedback: Score display + suggestions
- [x] Add route in `App.tsx`

## Phase 3: Visual & Audio
- [x] PersonaAvatar reactive states (listening/speaking/thinking) - inline in OralExamPage
- [x] Integrate Web Speech API (TTS for AI, STT for user)
- [x] Prepare Persona images (generated AI avatars: Male/Female in listening/speaking states)
- [x] Add ambient audio / Immersive Background

## Phase 4: Premium Guard & Polish
- [x] Add `BillingGuard` check (Premium only - implemented in backend routes)
- [x] Session limits (10/day for premium)
- [x] Redesign SimulazioniPage (Written vs Oral cards)
- [x] Immersive Exam Room UI
- [x] Error handling & loading states
- [x] Immersive Exam Room UI
- [x] Error handling & loading states
- [x] Mobile responsiveness
- [x] Update background to HQ User Image
- [x] Implement OpenAI TTS (Natural Voice) to replace Robot Voice

## Phase 5: Testing & Deploy
- [x] Manual testing of full flow
- [x] Deploy to Railway/Vercel
- [x] Create walkthrough

--- IMPLEMENTATION PLAN ---
# Fix Fase 3 CORS & Authentication Errors

## Problem

When accessing **Fase 3 (Consolidamento)**, the frontend fails to load data due to:

1. **CORS Error**: `cache-control` header blocked by preflight
2. **401 Unauthorized**: Multiple endpoints rejecting authenticated requests

## Root Cause Analysis

### CORS Issue
The client in `Fase3Context.tsx` sends `Cache-Control: no-cache` header, but the server's CORS configuration in `app.ts` doesn't include it in the allowed headers list.

**Current server configuration (line 53):**
```javascript
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
```

**Client request (line 163):**
```javascript
headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
}
```

---

## Proposed Changes

### Backend (Server)

#### [MODIFY] [app.ts](file:///c:/Users/alber/Desktop/CAPITALE-PERSONALE-1/server/app.ts)

Update `Access-Control-Allow-Headers` to include `Cache-Control` and `Pragma`:

```diff
-res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
+res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma");
```

---

## Verification Plan

### Manual Verification

1. **Deploy to Railway** (already connected to git)
   - Push commit to trigger automatic deployment
   - Wait for deployment to complete (~2-3 minutes)

2. **Test in Browser**
   - Navigate to Fase 3 (Consolidamento) page on Vercel production
   - Open browser DevTools → Network tab
   - Verify no CORS errors appear
   - Verify `error-bins`, `progress`, `srs/due-today` endpoints return 200

3. **Check Console**
   - Confirm no `Access-Control-Allow-Headers` errors in console
   - Confirm no 401 errors for authenticated endpoints
</artifacts>
</workspace_context>
<mission_brief>[Describe your task here...]</mission_brief>