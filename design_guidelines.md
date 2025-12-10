# Design Guidelines: C.P.A. Protocol 2.0 - Exam Preparation Platform

## Design Approach: Productivity-First System

**Selected Approach:** Design System (Hybrid of Linear + Notion aesthetics)

**Justification:** This is a utility-focused productivity application where clarity, efficiency, and focus are paramount. Users need to concentrate on learning, not navigate complex interfaces. Drawing inspiration from Linear's clean typography and Notion's organized content structure.

**Core Principles:**
- Minimize cognitive load during study sessions
- Clear information hierarchy for quick scanning
- Distraction-free interfaces for flashcards and quizzes
- Data visualization for progress tracking

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts CDN) - entire application
- Headings: 600-700 weight
- Body: 400-500 weight
- UI elements: 500-600 weight

**Hierarchy:**
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Metadata/Labels: text-sm font-medium
- Small UI Text: text-xs font-medium

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16

**Common Patterns:**
- Card padding: p-6
- Section gaps: gap-6 or gap-8
- Component spacing: space-y-4
- Button padding: px-6 py-3
- Input padding: px-4 py-2.5

**Container Widths:**
- Dashboard max-width: max-w-7xl
- Content areas: max-w-4xl
- Flashcard interface: max-w-2xl (centered, focused)
- Forms: max-w-md

**Grid Layouts:**
- Material cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Stats dashboard: grid-cols-2 lg:grid-cols-4
- Flashcard review: single column, centered

---

## Component Library

### Navigation
- **Top Header:** Fixed header with logo, navigation items, user menu (h-16)
- **Sidebar (Dashboard):** Collapsible left sidebar (w-64) with navigation links, progress widget
- Sticky positioning for both, minimal shadows

### Cards
- **Material Card:** Rounded corners (rounded-xl), subtle border, hover lift effect
  - Title, type badge, metadata (flashcard count, status)
  - Action buttons (view, delete) in top-right corner
  
- **Flashcard Display:** Large centered card (min-h-96) with flip animation
  - Front/back content centered
  - Difficulty indicator badge
  - Response buttons at bottom (Facile, Difficile, Non Ricordo)

- **Stats Card:** Compact metric display
  - Large number (text-4xl font-bold)
  - Label (text-sm)
  - Optional trend indicator

### Forms
- **Input Fields:** Consistent height (h-11), rounded-lg borders
  - Labels above inputs (text-sm font-medium, mb-2)
  - Error states with red accent and helper text
  
- **File Upload:** Drag-and-drop zone with dashed border
  - Large upload icon (<!-- CUSTOM ICON: upload cloud -->)
  - Instructions text
  - File preview list below

- **Buttons:**
  - Primary: solid fill, rounded-lg, font-medium
  - Secondary: border variant
  - Sizes: px-6 py-3 (default), px-4 py-2 (small)

### Data Display
- **Progress Bars:** Rounded-full, height h-2 or h-3
  - Fill animation on load
  - Percentage label above or inline

- **Tags/Badges:** Small rounded pills (rounded-full px-3 py-1)
  - Type indicators (Normativa, Giurisprudenza, Manuale)
  - Difficulty levels (Facile, Medio, Difficile)
  - Status labels (Pending, Processing, Completed)

- **Tables:** Simple striped or hover rows
  - Compact padding (px-4 py-3)
  - Sortable headers with icons

### Overlays
- **Modals:** Centered overlay with backdrop blur
  - Max-width constraints (max-w-lg to max-w-2xl)
  - Header with title and close button
  - Footer with action buttons

- **Toast Notifications:** Top-right corner
  - Success/error states with icons (Heroicons)
  - Auto-dismiss after 5 seconds

### Study Interface Components
- **Pomodoro Timer:** Circular progress indicator (fixed bottom-right or top header)
  - Large time display (text-3xl)
  - Start/pause/reset controls
  - Session count indicator

- **Quiz Interface:** 
  - Question card with number indicator (Domanda 3/10)
  - Answer options as full-width buttons (rounded-lg, min-h-14)
  - Progress bar at top
  - Navigation buttons (Avanti, Indietro) at bottom

---

## Key Screens Layout

### Login Page
- Centered card layout (max-w-md)
- Logo/title at top
- Simple email/password form
- Remember me checkbox
- CTA button (full-width)

### Dashboard
- Left sidebar navigation (Sessions, Materials, Flashcards, Quiz, Statistics)
- Main content area:
  - Welcome header with user name and level
  - Quick stats grid (4 cards: Total Materials, Cards Due Today, Study Streak, Level Progress)
  - Recent materials section (3-column grid)
  - Upcoming reviews section (compact list)

### Materials Page
- Header with "Upload Material" button (top-right)
- Filter/sort controls (Type dropdown, search bar)
- Grid of material cards (3 columns on desktop)
- Empty state with upload prompt for new users

### Flashcard Review
- Minimalist centered interface
- Large flashcard in center (click to flip)
- Progress indicator at top (e.g., "15/50")
- Tag display below card
- Three response buttons at bottom (arranged horizontally)
- Exit/pause button (top-left corner)

### Quiz Interface
- Question header with progress
- Question text (text-xl)
- Multiple-choice options (stacked buttons)
- Submit/Next button at bottom
- Results modal at completion showing score, time, and wrong answer review

### Statistics Page
- Time period selector (Week, Month, Year)
- Charts section: Study time graph, accuracy trends
- Detailed metrics grid
- Recent quiz results table

---

## Icons
**Library:** Heroicons (via CDN)
**Common Icons:**
- Navigation: DocumentTextIcon, AcademicCapIcon, ChartBarIcon
- Actions: PlusIcon, TrashIcon, PencilIcon, ArrowDownTrayIcon
- Status: CheckCircleIcon, XCircleIcon, ClockIcon
- UI: ChevronRightIcon, XMarkIcon, Bars3Icon

---

## Special Considerations

**Focus Mode:** Flashcard and Quiz interfaces remove all navigation elements to eliminate distractions

**Accessibility:** Maintain WCAG AA contrast ratios, keyboard navigation for all interactive elements, clear focus states

**Responsive Behavior:**
- Mobile: Collapse sidebar to hamburger menu, stack all grids to single column
- Tablet: 2-column grids, persistent sidebar
- Desktop: Full 3-column layouts, expanded sidebar

**Loading States:** Skeleton screens for cards, spinner for button actions, progress bars for file uploads

**Empty States:** Friendly illustrations with clear CTAs (e.g., "Upload your first study material")