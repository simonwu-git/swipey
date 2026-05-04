# CLAUDE.md

## Design system guidelines

The visual design lives in `src/app/globals.css` as CSS variables. **Always go through the tokens — never reach for raw Tailwind palette classes.**

### Color

- Use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `text-destructive`.
- **Never use** `text-gray-*`, `bg-gray-*`, `text-black`, `bg-white`, `border-gray-*`, etc. They break dark mode and ignore the brand palette.
- For semantic states (success, warning, info) that aren't first-class tokens, prefer pairs like `bg-green-50 dark:bg-green-950/20` so both modes work, and pair foreground colors the same way.

### Hover and interactive surfaces

- Neutral hover (icons, ghost/outline buttons, list rows, menu items) → `hover:bg-muted`. **Do not use `hover:bg-accent`** — `accent` is a semantic brand color (currently amber `#f59e0b`) and will flash yellow on hover.
- Destructive actions get `hover:bg-destructive/10 hover:text-destructive`.
- Hovered text on neutral surfaces → `hover:text-foreground` (from muted) or `hover:text-primary` (to highlight a link/CTA).
- The shadcn `accent` / `accent-foreground` tokens are reserved for true brand-accent surfaces (e.g. amber callouts), not for neutral hover. If you find them used as a hover, treat it as a bug.

### Typography

- Body uses `--font-sans` (Plus Jakarta Sans), display headings use `--font-display` (Space Grotesk). Both are wired via `next/font` in `app/layout.tsx`.
- Headings (`h1`–`h6`) automatically get the display font + tight letter-spacing via `globals.css`. Don't re-declare font-family on headings unless intentionally overriding.
- For inline display type (e.g., big stats), use `font-display`.

### Dark mode

- Dark mode toggles a `.dark` class on `<html>` (see `lib/theme.tsx`, `components/ThemeScript.tsx`). All semantic tokens have dark-mode equivalents in `globals.css`.
- Any new component must visually verify in both modes. The two failure modes to watch for: (a) hardcoded grays that disappear in dark mode, (b) light-mode-only `bg-white`/`text-black` that produce unreadable contrast.

### Radius, shadows, spacing

- Default radius is `var(--radius)` (0.5rem). Use Tailwind `rounded-md` / `rounded-lg` / `rounded-xl` which are all derived from it.
- Shadows are purple-tinted via `--sw-shadow-*`. Use the Tailwind `shadow-sm`/`md`/`lg` utilities — they're mapped to the brand shadows in the `@theme inline` block.
- Spacing follows Tailwind defaults (4px base). No project-specific scale.

### Charts

- Chart colors come from `--chart-1` through `--chart-5` (defined in both light and dark). Reference them as `var(--chart-N)` or via the chart config color field.
- Per-account colors live in `lib/accountColors.ts` — extend that, don't hardcode hex in components.
- Primary chart accents (totals, primary lines) should use `var(--primary)` so they re-theme automatically.

### When adding new shadcn primitives

shadcn defaults sometimes use `bg-accent` / `focus:bg-accent` for hover/focus states (e.g. dropdown items, dialog close buttons). Swap these to `bg-muted` / `focus:bg-muted` on install — see `ui/select.tsx`, `ui/dialog.tsx`, `ui/button.tsx` for the pattern.

## Workflow gotchas

### Always restart `next dev` after a Prisma schema change

`next dev` caches the generated `@prisma/client` in its Node module graph. Running `npx prisma migrate dev` (or `prisma generate`) regenerates the client on disk, but the running server keeps using the old in-memory copy. Symptoms when this is missed:

- Writes to a newly added column silently no-op (Prisma drops the unknown field).
- Reads of a new column come back `undefined`.
- Cache-write paths appear to succeed (no error thrown) but the row never updates, so every request looks like a cache miss.

Fix: stop and restart `next dev` after every migration. Hot reload is not enough.
