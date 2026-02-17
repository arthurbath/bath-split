

# BathOS Platform Upgrade Plan

## Overview

Transform the current Split expenses app into a multi-module platform called BathOS. This phase focuses on infrastructure: restructuring routes, database tables, authentication flows, theming, and documentation -- without building new modules.

---

## 1. Database table renaming

Rename all existing tables with a `budget_` prefix. Add a `bathos_` prefix to shared platform tables.

| Current table | New name |
|---|---|
| `profiles` | `bathos_profiles` |
| `households` | `budget_households` |
| `household_members` | `budget_household_members` |
| `income_streams` | `budget_income_streams` |
| `expenses` | `budget_expenses` |
| `categories` | `budget_categories` |
| `linked_accounts` | `budget_linked_accounts` |
| `budgets` | `budget_budgets` |
| `restore_points` | `budget_restore_points` |

A new shared table `bathos_user_roles` will be created for the admin system, and a `bathos_user_settings` table for platform-level user preferences.

All RLS policies, functions (`is_household_member`, `handle_new_user`), and triggers will be updated to reference the new table names. All frontend hooks and components referencing Supabase tables will be updated accordingly.

**Important**: The Live/production database has existing data. A migration query will be provided to run on the Live environment before publishing so data is preserved.

---

## 2. Admin role system

- Create `bathos_user_roles` table with the `app_role` enum (`admin`, `user`).
- Create a `has_role` security definer function.
- Insert an admin role for `arthurbath@icloud.com` (looked up from `auth.users` by email).
- The admin badge will show on the `/account` page but not unlock any special UI at this time.

---

## 3. Routing and subdomain handling

Since this is a single Lovable project deployed to `bath.garden`, subdomains like `budget.bath.garden` will be handled via client-side hostname detection:

- `bath.garden` (or `www.bath.garden`) -- serves the launcher page and platform-level pages (`/account`, `/forgot-password`, `/reset-password`, future public pages like TOS).
- `budget.bath.garden` -- serves the Budget (formerly Split) module routes (`/expenses`, `/incomes`, `/summary`, `/config`, `/backup`).

A `useHostModule()` hook will detect the current hostname and return the active module (or `null` for the platform root). The router will conditionally render module routes based on this.

For Lovable preview/development, when the hostname does not match a known subdomain, we will fall back to path-based routing (`/budget/expenses`, etc.) so everything remains testable.

You will need to configure the following custom domains in Lovable project settings (Settings > Domains):
- `bath.garden`
- `www.bath.garden`
- `budget.bath.garden`

All three should point their A records to `185.158.133.1` with appropriate TXT verification records.

---

## 4. Theme and design system overhaul

Replace the current green-primary color scheme with a neutral, black-and-white minimalistic theme:

- **Primary**: Near-black/charcoal (for buttons, links, focus rings)
- **Green**: Success states only
- **Gold/amber**: Warning states only
- **Red**: Danger/error states only
- **Blue**: Info/help states only
- **Purple**: Admin privilege badge only
- Remove all existing green primary usage from CSS variables and replace with neutral tones
- No gradients; shadows used sparingly and only for functional layering
- Update CSS variables in `index.css` for both light and dark modes

---

## 5. Noto Emoji font

- Copy the `NotoEmoji-Bold.woff2` font file from the Bango project into `public/fonts/`.
- Add `@font-face` declarations in `index.css` matching Bango's approach (with unicode-range for emoji codepoints).
- Add a `font-noto-emoji` utility class in Tailwind config.
- Emojis used in the UI will use this class for consistent rendering.

---

## 6. Account management page (`/account`)

Build a dedicated `/account` page accessible from the header bar across all modules. Modeled after Bango's profile page, it will include:

- Display name (editable)
- Email address (change email dialog with password confirmation)
- Change password dialog
- Delete account dialog (with email confirmation)
- Forgot password flow (`/forgot-password` page)
- Reset password flow (`/reset-password` page, handles `PASSWORD_RECOVERY` event)
- Admin badge (visible if user has admin role, does nothing else yet)

---

## 7. Platform launcher page

At `bath.garden`, authenticated users see a simple launcher showing available modules as cards/tiles. Currently only "Budget" (the renamed Split module) will appear. Each card links to `budget.bath.garden`.

Unauthenticated visitors see a minimal splash/gateway page with BathOS branding and login/signup links.

---

## 8. Module file organization

Restructure `src/` to separate platform-level code from module-specific code:

```text
src/
  platform/          -- shared platform code
    components/       -- header, account page, launcher, auth forms
    hooks/            -- useAuth, useHostModule, usePlatformSettings
    contexts/         -- AuthContext
  modules/
    budget/           -- the renamed Split module
      components/     -- ExpensesTab, IncomesTab, SummaryTab, etc.
      hooks/          -- useIncomes, useExpenses, useCategories, etc.
      types/
  components/ui/      -- shadcn/ui primitives (shared)
  lib/                -- shared utilities
  integrations/       -- Supabase client and types
```

All existing Split component and hook files move into `src/modules/budget/`. Platform-level auth, navigation, and account management go into `src/platform/`.

---

## 9. Documentation

Create a `/docs` folder with central context documents:

- **`/docs/ARCHITECTURE.md`**: Platform structure, module isolation principles, the rule that removing a module should not require surgery on other modules.
- **`/docs/STYLE_GUIDE.md`**: Design language (B&W minimalism, semantic color usage, no gradients, no exclamation points, pragmatic voice, Noto Emoji usage rules, font stack, sizing conventions).
- **`/docs/MODULE_GUIDE.md`**: How to add a new module (DB table prefix convention, file structure, routing, PWA manifest, group entity isolation).

These will also be added to the project's Lovable knowledge base for persistent context.

---

## 10. PWA support

- Update `index.html` and add a `manifest.json` that supports PWA installation.
- Default BathOS icon (placeholder) used until a custom icon is supplied.
- Each module can override the manifest icon via module-specific metadata (future capability, stubbed now).

---

## 11. Data grid library evaluation

This will be a research deliverable included alongside the implementation. I will evaluate:

- **TanStack Table** (headless, fully customizable, React-native)
- **AG Grid Community** (feature-rich, opinionated rendering)
- **Glide Data Grid** (canvas-based, spreadsheet-like)

Criteria: inline editing, keyboard navigation, sorting/filtering/grouping, mobile usability, bundle size, customization flexibility, and alignment with the B&W minimalist design system.

The evaluation will be documented in `/docs/DATA_GRID_EVALUATION.md` with a recommendation. No migration will happen until you approve the choice.

---

## Technical details

### Migration SQL (abbreviated)

The database migration will:
1. Rename all tables using `ALTER TABLE ... RENAME TO ...`
2. Update all RLS policies to reference new table names
3. Update the `is_household_member` and `handle_new_user` functions
4. Create `bathos_user_roles` table with RLS
5. Create `has_role` function
6. Create `bathos_user_settings` table
7. Insert admin role for the specified user

### Code changes scope

- ~15 hook/component files updated for new table names
- ~10 new files for platform infrastructure (auth pages, account page, launcher, contexts)
- ~5 files moved/reorganized into module structure
- Tailwind config and `index.css` updated for new theme
- `App.tsx` rewritten with hostname-aware routing
- Supabase types will auto-regenerate after migration

### Risk areas

- **Table renaming on Live**: Must run migration on Live before publishing. A pre-migration SQL script will be provided.
- **Subdomain routing in preview**: Lovable preview uses its own domain, so development will fall back to path-based routing. The hostname detection hook handles both modes.
- **Existing bookmarks/URLs**: Current `/expenses`, `/summary` etc. will break if accessed on `bath.garden` instead of `budget.bath.garden`. A redirect can be added if needed.

