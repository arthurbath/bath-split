

# Module-Specific Bookmarking

## Goal
When a user bookmarks or saves-to-home-screen any page within a module, the bookmark should:
1. Use the module's name as the title (e.g. "Budget", not "BathOS")
2. Use the module-specific icon from `/public`
3. Navigate directly to the exact page bookmarked (e.g. `/budget/summary`, not `/`)

Platform pages (launcher, account, auth) keep "BathOS" title and default icons.

## How It Works

Browsers capture `document.title`, `<link rel="icon">`, and `<link rel="apple-touch-icon">` at save time. By dynamically updating these on every route change, the correct metadata is present when the user saves. The bookmark URL is automatically the current page URL -- no special handling needed for point 3 above, as long as we are not interfering with it (e.g. via a `<base>` tag or manifest `start_url` override).

## Implementation

### 1. Add `iconPath` to the module registry

In `src/platform/modules.ts`, add an `iconPath` field to `PlatformModule` and populate it:

| Module | iconPath |
|---|---|
| Budget | `/module-budget.png` |
| Drawer Planner | `/module-drawer-planner.png` |
| Garage | `/module-garage.png` |
| Administration | `/module-administration.png` |

### 2. Create `useDocumentHead` hook

New file: `src/platform/hooks/useDocumentHead.ts`

This hook runs on every route change and:
- Reads the current module via `useHostModule()`
- Looks up the module's `name` and `iconPath` via `getModuleById()`
- Sets `document.title` to the module name, or "BathOS" for non-module pages
- Updates `<link rel="icon">` and `<link rel="apple-touch-icon">` href attributes to the module icon, or the defaults (`/favicon.png`, `/apple-touch-icon.png`)

It uses `useLocation()` to re-run on navigation.

### 3. Mount in App.tsx

Add a render-less `<DocumentHead />` component inside `BrowserRouter` that calls the hook. Placed alongside `<AuthCallbackToasts />`.

### 4. Verify manifest.json does not override

The existing `manifest.json` has `start_url: "/"` which is correct for the PWA install from root. Individual bookmarks and "Add to Dock" / "Add to Home Screen" use the current URL, not the manifest start_url, so no manifest changes are needed. The bookmark for `/budget/summary` will point to `https://bath.garden/budget/summary` (or the equivalent preview/published URL) automatically.

## Metadata mapping

```text
Route              title             icon                      apple-touch-icon
---------------------------------------------------------------------------------
/                  BathOS            /favicon.png              /apple-touch-icon.png
/account           BathOS            /favicon.png              /apple-touch-icon.png
/forgot-password   BathOS            /favicon.png              /apple-touch-icon.png
/budget/summary    Budget            /module-budget.png        /module-budget.png
/budget/expenses   Budget            /module-budget.png        /module-budget.png
/drawers/plan      Drawer Planner    /module-drawer-planner.png /module-drawer-planner.png
/garage/due        Garage            /module-garage.png        /module-garage.png
/admin             Administration    /module-administration.png /module-administration.png
```

## Files changed

- `src/platform/modules.ts` -- add `iconPath` to interface and each module definition
- `src/platform/hooks/useDocumentHead.ts` -- new file (~30 lines)
- `src/App.tsx` -- mount `<DocumentHead />` inside the router

