# AGENTS.md — Vibe-Loop Developer Guide

This file provides guidelines and commands for AI agents working on the Vibe-Loop project.

---

## 1. Build Commands

```bash
pnpm dev          # Start development server (port 3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking
pnpm storybook    # Start Storybook (port 6006)
pnpm build-storybook  # Build Storybook
```

For running a single test: No test framework configured yet. If you add Vitest/Jest later:
- `pnpm vitest run` or `pnpm vitest run --reporter=verbose path/to/test.test.ts`

---

## 2. Project Structure

```
/app               # Next.js App Router (pages, API routes, layouts)
/src/components    # React components (ui/, map/, etc.)
/src/lib           # Utilities, hooks, Supabase client
/supabase/migrations  # Database migrations
middleware.ts      # Authentication guard
```

---

## 3. Code Style Guidelines

### Imports & Organization

- Use absolute imports (from `~/components/...` after path alias setup)
- Group imports: external → internal → types
- Use `clsx` and `tailwind-merge` for conditional classes
- Never use default exports for components

### Naming Conventions

- Components: PascalCase (`EventCard.tsx`, `MapView.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`, `useEvents.ts`)
- Utilities: camelCase (`formatDate.ts`, `cn.ts`)
- Types/Interfaces: PascalCase (`ButtonProps`, `Event`)
- Files: kebab-case for non-component files (`auth-client.ts`, `zod-schemas.ts`)

### TypeScript Rules

- **NEVER use `any`** — use `unknown` or proper typing
- Use explicit return types for utility functions
- Use interfaces for object shapes, types for unions/intersections
- Enable strict mode in tsconfig (already configured)

### Component Patterns

- Default to Server Components, use `"use client"` only when needed
- Use `forwardRef` for components that need ref forwarding
- Define Props with TypeScript interfaces
- Use `lucide-react` for icons (already in dependencies)
- Use `date-fns` for date formatting

### Tailwind CSS

- Use `clsx()` for conditional classes, `tailwindMerge()` to deduplicate
- Follow the color palette from `tailwind.config.ts` (background: #0a0a0f, surface: #13131a, border: #1f1f2e)
- Use `focus:ring-violet-500/50` for focus states (accessibility)
- Use `transition-all duration-200` for smooth transitions

### Error Handling

- Use `react-hot-toast` for user-facing errors/toasts
- Never expose internal errors to the client
- Wrap async operations in try/catch with proper error messages
- Use Zod for input validation in API routes

### Supabase & Database

- All tables MUST have Row Level Security (RLS) policies
- Use the Supabase client from `~/lib/supabase/client.ts`
- Use typed queries with proper TypeScript annotations
- Never commit secrets — use `.env.local` for sensitive values

### State Management

- Use **Zustand** for global client state (stores in `~/lib/stores/`)
- Use **SWR** for server state / data fetching
- Use React `useState` for component-local state

---

## 4. Required Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 5. Key Dependencies

| Category | Library |
|----------|---------|
| Framework | Next.js 15, React 19, TypeScript |
| Auth/DB | Supabase (@supabase/ssr, @supabase/supabase-js) |
| Maps | MapLibre GL, react-map-gl, supercluster |
| State | Zustand, SWR |
| Styling | Tailwind CSS, clsx, tailwind-merge |
| Icons | lucide-react |
| Dates | date-fns |
| Payments | Stripe |
| UI | react-hot-toast |

---

## 6. Working with Agents

For complex features, break down the work:

```
Task("UI", "Create React component X in /components/...")
Task("API", "Create API route /app/api/... with Zod validation")
Task("DB", "Write Supabase migration for table ...")
Task("Test", "Write tests for component X and route Y")
```

---

## 7. Known Conventions

- Custom Tailwind colors: `background` (#0a0a0f), `surface` (#13131a), `border` (#1f1f2e)
- Font families: `sans` (Inter), `heading` (Syne)
- Button variants: primary, secondary, ghost, danger
- Button sizes: sm, md, lg
- Always use `pnpm` — never npm or yarn