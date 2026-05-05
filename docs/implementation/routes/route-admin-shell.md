# Route: Admin Shell — Sidebar Layout

> **Domain:** Layout / Navigation
> **Route:** All `(admin)/*` routes
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`../../architecture/system-design.md`](../../architecture/system-design.md) · [`../../design-system/design-system-ai-guidelines.md`](../../design-system/design-system-ai-guidelines.md)

---

## What This Route Does

The admin shell is the persistent layout that wraps every page inside the `(admin)` route group. It provides:

- A collapsible sidebar with permission-aware navigation links
- A top header bar with the current user's avatar, role badge, and logout action
- A skip-to-content link for keyboard and screen-reader users
- Active route highlighting driven by `usePathname()`
- Mobile-responsive drawer behavior

This is not a page — it is `src/app/(admin)/layout.tsx`, which Next.js App Router applies automatically to every child route.

---

## API / Data

No API calls. The shell reads the current user's role from the `PermissionsProvider` context already in place. Navigation items are a static config array — no fetch required.

---

## File Map

| File                                      | Type             | Purpose                                              |
|-------------------------------------------|------------------|------------------------------------------------------|
| `src/app/(admin)/layout.tsx`              | Server Component | Root layout — renders `AdminShell` with `{children}` |
| `src/components/organisms/AdminShell.tsx` | Client Component | Sidebar + header composition                         |
| `src/components/organisms/SidebarNav.tsx` | Client Component | Nav link list, collapse state                        |
| `src/components/molecules/NavItem.tsx`    | Client Component | Single nav link with icon + active indicator         |
| `src/components/molecules/UserMenu.tsx`   | Client Component | Avatar, role badge, logout button                    |
| `src/i18n/locales/en/nav.json`            | i18n             | All navigation labels                                |

---

## Implementation Steps

### Step 1 — Create `nav.json`

`src/i18n/locales/en/nav.json`

```json
{
  "nav": {
    "runs":        "Runs",
    "cargos":      "Cargos",
    "lotacoes":    "Lotações",
    "users":       "Users",
    "departments": "Departments",
    "audit":       "Audit Trail",
    "collapse":    "Collapse sidebar",
    "expand":      "Expand sidebar",
    "logout":      "Sign out",
    "profile":     "My profile"
  }
}
```

Register `"nav"` in `src/i18n/config.ts` alongside the existing namespaces.

---

### Step 2 — Define the nav config

Create a typed config array. Place it in `src/components/organisms/AdminShell.tsx` or a dedicated `src/config/nav.ts`:

```text
export interface NavItemConfig {
  href: string;
  labelKey: string;       // key inside nav.json
  icon: string;           // Lucide icon name
  permission?: string;    // if set, wrapped in <Can>
}

export const NAV_ITEMS: NavItemConfig[] = [
  { href: "/runs", labelKey: "nav.runs", icon: "ClipboardList", permission: "run:view" },
  { href: "/cargos", labelKey: "nav.cargos", icon: "Briefcase", permission: "cargo:view" },
  { href: "/lotacoes", labelKey: "nav.lotacoes", icon: "MapPin", permission: "lotacao:view" },
  { href: "/users", labelKey: "nav.users", icon: "Users", permission: "user:view" },
  { href: "/departments", labelKey: "nav.departments", icon: "Building2", permission: "department:view" },
  { href: "/audit", labelKey: "nav.audit", icon: "ScrollText", permission: "audit:view" },
];
```

---

### Step 3 — Create `NavItem` molecule

```
File: src/components/molecules/NavItem.tsx
"use client"

Props:
  href: string
  label: string
  icon: LucideIcon
  isCollapsed: boolean

Behavior:
  - Uses next/link
  - Detects active route with usePathname() — applies aria-current="page"
  - When isCollapsed: show icon only + tooltip via title attribute
  - When expanded: show icon + label side by side
  - Active styles: bg-brand-primary/10 text-brand-primary font-semibold
  - Inactive styles: text-neutral-700 hover:bg-neutral-100
```

---

### Step 4 — Create `SidebarNav` organism

```
File: src/components/organisms/SidebarNav.tsx
"use client"

Props:
  items: NavItemConfig[]
  isCollapsed: boolean
  onToggle: () => void

Behavior:
  - Renders <nav aria-label="Main navigation">
  - Maps items through <Can perform={item.permission}> gate
  - Renders collapse/expand toggle button at the bottom
    aria-expanded={!isCollapsed}, aria-label from nav.collapse / nav.expand
  - Sidebar width: w-60 expanded, w-16 collapsed (transition-all duration-200)
```

---

### Step 5 — Create `UserMenu` molecule

```
File: src/components/molecules/UserMenu.tsx
"use client"

Props:
  name: string
  role: UserRole
  avatarUrl: string | null

Renders:
  - <Avatar> atom with name initials fallback
  - Role badge using <Badge> atom
  - Logout button — calls signOut() from auth service
  - When sidebar is collapsed: avatar only
```

---

### Step 6 — Create `AdminShell` organism

```text
File: src/components/organisms/AdminShell.tsx
"use client"

Props:
  children: ReactNode

State:
  - isCollapsed: boolean — initialized from cookie "sidebar_collapsed"
  - Persists collapse state to cookie on toggle

Layout structure:
  <div className="flex h-screen overflow-hidden">
    <SidebarNav isCollapsed={isCollapsed} onToggle={toggle} items={NAV_ITEMS} />
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="h-14 border-b border-neutral-200 flex items-center px-4">
        <UserMenu ... />
      </header>
      <main id="main-content" className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  </div>
```

---

### Step 7 — Create `(admin)/layout.tsx`

```text
// src/app/(admin)/layout.tsx
// Server Component — no "use client"

import type { ReactNode } from "react";
import { AdminShell } from "@/components/organisms/AdminShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <AdminShell>{children}</AdminShell>
    </>
  );
}
```

---

### Step 8 — Verify existing `/runs` page still works

The existing `src/app/(admin)/runs/page.tsx` renders with outer main padding (`mx-auto w-full max-w-5xl p-6`). Once the shell is in place, remove that outer padding from the page because the shell main container already provides `p-6`.

---

## Accessibility Checklist

- [ ] `<nav aria-label="Main navigation">` wraps all nav links
- [ ] Active link has `aria-current="page"`
- [ ] Collapse toggle has `aria-expanded` and `aria-label`
- [ ] Skip-to-content link targets `id="main-content"`
- [ ] Collapsed icon-only links have visible tooltip (`title` attribute)
- [ ] Focus order is logical: skip link → sidebar → header → main content

---

## Common Mistakes

| Mistake                                 | Correct Approach                              |
|-----------------------------------------|-----------------------------------------------|
| Putting collapse state in URL params    | Use cookie — survives navigation              |
| Importing `next/router`                 | Use `usePathname()` from `next/navigation`    |
| Hardcoding nav labels                   | All labels via `useTranslation("nav")`        |
| Role check with `if (role === "ADMIN")` | Wrap nav item in `<Can perform={permission}>` |
| Forgetting mobile breakpoint            | Sidebar becomes a drawer on `< md` screens    |
