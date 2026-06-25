# UI Redesign — Super Assistent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inconsistent blue/dark-mode-bleeding UI with a fully consistent emerald + warm-white design system across every page.

**Architecture:** Single source of truth in `globals.css` CSS variables → consumed by Tailwind custom colors → all components and pages use those tokens. Nav becomes a 56px icon-only sidebar with hover tooltips. Every card is white on warm-white background, stone-200 border, no shadows.

**Tech Stack:** Next.js 14, Tailwind CSS, React, TypeScript. No new dependencies.

---

## Design Token Reference (use these everywhere)

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#fafaf9` | Page background |
| `--bg-card` | `#ffffff` | Card background |
| `--border-primary` | `#e7e5e4` | All card/input borders |
| `--text-primary` | `#1c1917` | Headings, body |
| `--text-secondary` | `#78716c` | Subtitles, labels |
| `--text-muted` | `#a8a29e` | Placeholders, hints |
| `--accent-primary` | `#059669` | Buttons, active nav, links |
| `--accent-hover` | `#047857` | Button hover state |
| `--accent-light` | `#ecfdf5` | Active nav bg, badge bg |
| `--accent-border` | `#d1fae5` | Accent-tinted borders |
| `--success` | `#16a34a` | Profit, done status |
| `--error` | `#dc2626` | Loss, danger |
| `--warning` | `#d97706` | Medium priority |

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/app/globals.css` | Modify | All CSS variables → emerald palette; remove all heavy shadow/glow/hover-lift utilities |
| `src/components/layout/Nav.tsx` | Rewrite | Icon-only 56px sidebar with tooltips; mobile hamburger stays |
| `src/app/layout.tsx` | Modify | `md:pl-72` → `md:pl-14` (56px = 3.5rem) |
| `src/components/ui/Button.tsx` | Modify | Blue → emerald; remove shadow/transform hover |
| `src/components/ui/Badge.tsx` | Modify | Blue info/warning → emerald; keep red danger |
| `src/components/ui/Card.tsx` | Modify | Remove `shadow-lg`; use `border-stone-200` |
| `src/components/ui/Input.tsx` | Modify | Blue focus → emerald focus |
| `src/components/ui/Loading.tsx` | Modify | Blue → emerald; remove `shadow-2xl` |
| `src/components/ui/StatCard.tsx` | Modify | Blue gradient → emerald solid |
| `src/app/trading/_pnl/PnLDashboardUI.tsx` | Modify | Update Card, Badge, BtnPrimary, inputClassName |
| `src/app/page.tsx` | Modify | Remove remaining dark-mode classes, emerald icons |
| `src/app/login/page.tsx` | Modify | Already partially done; final cleanup |
| `src/app/task/daily/page.tsx` | Modify | Header badge, month nav buttons |
| `src/app/task/daily/[date]/page.tsx` | Modify | Page header and task list styles |
| `src/app/task/weekly/page.tsx` | Modify | Consistent header + card styles |
| `src/app/task/monthly/page.tsx` | Modify | Consistent header + card styles |
| `src/app/chat/page.tsx` | Modify | Chat bubbles, header |
| `src/app/trading/trading_pnl/page.tsx` | Already uses PnLDashboardUI — covered by Task 5 |
| `src/app/trading/gold_info/page.tsx` | Modify | Consistent card/header styles |
| `src/app/trading/trading_news/page.tsx` | Modify | Consistent card/header styles |
| `src/app/setup/page.tsx` | Modify | Consistent card/header styles |
| `src/app/couple_saving/page.tsx` | Modify | Consistent card/header styles |
| `src/app/business_idea/page.tsx` | Modify | Consistent card/header styles |
| `src/app/working_project/page.tsx` | Modify | Consistent card/header styles |

---

## Task 1: Update CSS Variables & Global Utilities

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace all `:root` CSS variables**

Replace the entire `:root` block in `src/app/globals.css`:

```css
:root {
  --bg-primary: #fafaf9;
  --bg-secondary: #f5f4f2;
  --bg-tertiary: #ede9e4;
  --bg-card: #ffffff;
  --bg-card-hover: #fafaf9;
  --bg-overlay: rgba(28, 25, 23, 0.45);

  --text-primary: #1c1917;
  --text-secondary: #78716c;
  --text-tertiary: #a8a29e;
  --text-muted: #c4bfb8;

  --border-primary: #e7e5e4;
  --border-secondary: #e7e5e4;
  --border-tertiary: #d6d3d0;

  --accent-primary: #059669;
  --accent-secondary: #047857;
  --accent-light: #ecfdf5;
  --accent-border: #d1fae5;

  --success: #16a34a;
  --warning: #d97706;
  --error: #dc2626;
  --info: #059669;

  --shadow-sm: 0 1px 3px rgba(28, 25, 23, 0.06);
  --shadow-md: 0 1px 3px rgba(28, 25, 23, 0.06);
  --shadow-lg: 0 1px 3px rgba(28, 25, 23, 0.06);
  --shadow-accent: 0 2px 8px rgba(5, 150, 105, 0.15);

  --nav-bg: #ffffff;
  --nav-border: #e7e5e4;

  --input-bg: #ffffff;
  --input-border: #e7e5e4;
  --input-focus-border: #059669;

  --scrollbar-track: #f5f4f2;
  --scrollbar-thumb: #d6d3d0;
  --scrollbar-thumb-hover: #a8a29e;

  --background: #fafaf9;
  --foreground: #1c1917;
  --primary: #059669;
  --secondary: #047857;
  --accent: #059669;
  --terminal-bg: #ffffff;
  --terminal-border: #e7e5e4;
  --glow-cyan: rgba(5, 150, 105, 0.12);
  --glow-blue: rgba(5, 150, 105, 0.12);
  --glow-purple: rgba(5, 150, 105, 0.12);
}
```

- [ ] **Step 2: Replace hover/card utility classes**

Find and replace these blocks in `globals.css`:

```css
/* Hover effects */
.hover-glow:hover { box-shadow: none; }
.hover-lift:hover { transform: translateY(-1px); }
.hover-terminal:hover { border-color: var(--accent-border); }

/* Card hover effects */
.card-hover { transition: border-color 0.15s ease; }
.card-hover:hover { border-color: var(--border-tertiary); }
.card-terminal { background: #ffffff; border: 1px solid var(--border-primary); transition: border-color 0.15s ease; }
.card-terminal:hover { border-color: var(--accent-border); }

/* Button effects */
.btn-gradient { background-color: var(--accent-primary); color: #ffffff; transition: background-color 0.15s ease; }
.btn-gradient:hover { background-color: var(--accent-secondary); }
.btn-terminal { background: #ffffff; border: 1px solid var(--border-primary); color: var(--accent-primary); transition: border-color 0.15s ease; }
.btn-terminal:hover { border-color: var(--accent-primary); }

/* Chat bubble */
.chat-bubble-user { position: relative; background-color: var(--accent-secondary); }
.chat-bubble-user::after { content: ''; position: absolute; bottom: -8px; right: 20px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid var(--accent-secondary); }

/* Priority badges */
.priority-high {}
.priority-medium {}
.priority-low {}
```

- [ ] **Step 3: Update focus and selection styles**

```css
*:focus { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
::selection { background: rgba(5, 150, 105, 0.15); color: #1c1917; }
::-moz-selection { background: rgba(5, 150, 105, 0.15); color: #1c1917; }
```

- [ ] **Step 4: Remove the `@layer base` gradient overrides block entirely**

Delete the entire block starting with:
```css
@layer base {
  .bg-gradient-to-r,
  ...
```

This block was papering over dark-mode classes. We will fix the classes directly in each page instead.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style: update CSS variables to emerald + warm-white design system"
```

---

## Task 2: Rewrite Nav — Compact Icon Sidebar

**Files:**
- Rewrite: `src/components/layout/Nav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite `src/components/layout/Nav.tsx` completely**

```tsx
'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessRoute } from '@/utils/userRole'

interface NavLink {
  path?: string
  label: string
  icon: React.ReactNode
  subLinks?: { path: string; label: string; group?: string }[]
}

function DashIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
}
function CalendarIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
}
function TradingIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
}
function HeartIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21C12 21 4 13.5 4 8.7A5 5 0 0112 4a5 5 0 018 4.7C20 13.5 12 21 12 21z"/></svg>
}
function ChatIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.97 9.97 0 01-4-.8L3 20l1.2-4.2A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
}
function ProjectIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M3 7h18a1 1 0 011 1v11a2 2 0 01-2 2H4a2 2 0 01-2-2V8a1 1 0 011-1z"/></svg>
}
function SettingsIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
}
function AdminIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
}
function LogoutIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
}
function BoltIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  tooltip?: string
}

function NavIcon({ icon, label, active, onClick }: NavItemProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer ${
          active
            ? 'bg-emerald-600 text-white'
            : 'text-stone-400 hover:bg-emerald-50 hover:text-emerald-600'
        }`}
        aria-label={label}
      >
        {icon}
      </button>
      <div className="absolute left-12 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-stone-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-stone-900" />
        </div>
      </div>
    </div>
  )
}

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, role, isLoading: roleLoading, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const allNavLinks: NavLink[] = [
    { path: '/', label: 'Dashboard', icon: <DashIcon /> },
    { path: '/settings/ai', label: 'AI Settings', icon: <SettingsIcon /> },
    {
      label: 'Tasks',
      icon: <CalendarIcon />,
      subLinks: [
        { path: '/task/daily', label: 'Daily Tasks' },
        { path: '/task/weekly', label: 'Weekly Tasks' },
        { path: '/task/monthly', label: 'Monthly Tasks' },
        { path: '/self_punishment', label: 'Self Punishment' },
      ],
    },
    {
      label: 'Trading',
      icon: <TradingIcon />,
      subLinks: [
        { path: '/trading/trading_pnl', label: 'Trading P&L', group: 'Trading' },
        { path: '/trading/bot_trading_pnl', label: 'Bot Trading P&L', group: 'Trading' },
        { path: '/trading/entry_checklist', label: 'Entry Checklist', group: 'Trading' },
        { path: '/trading/lessons', label: 'Lessons', group: 'Learning' },
        { path: '/trading/my_rule', label: 'My Rule', group: 'Learning' },
        { path: '/trading/tools', label: 'Tools', group: 'Learning' },
        { path: '/trading/trading_news', label: 'Trading News', group: 'Market Intel' },
        { path: '/trading/trading_ai_predication', label: 'AI Prediction', group: 'Market Intel' },
        { path: '/trading/gold_info', label: 'Gold Market Info', group: 'Market Intel' },
        { path: '/setup', label: 'My Setup', group: 'Trading' },
      ],
    },
    {
      label: 'Saving',
      icon: <HeartIcon />,
      subLinks: [
        { path: '/couple_saving', label: 'Couple Saving' },
        { path: '/business_idea', label: 'Business Idea' },
      ],
    },
    { path: '/chat', label: 'AI Chat', icon: <ChatIcon /> },
    { path: '/working_project', label: 'Working Project', icon: <ProjectIcon /> },
    {
      label: 'Admin',
      icon: <AdminIcon />,
      subLinks: [
        { path: '/admin/set-role', label: 'Set Role' },
        { path: '/admin/create-account', label: 'Create Account' },
      ],
    },
  ]

  const navLinks = useMemo(() => {
    if (roleLoading) return []
    return allNavLinks.filter((link) => {
      if (link.path?.startsWith('/admin') && role !== 'admin') return false
      if (link.path && !canAccessRoute(role, link.path)) return false
      if (link.subLinks) {
        return link.subLinks.some((sub) => canAccessRoute(role, sub.path))
      }
      return true
    })
  }, [role, roleLoading])

  const isLinkActive = (link: NavLink) => {
    if (link.path) return pathname === link.path
    if (link.subLinks) return link.subLinks.some((sub) => pathname.startsWith(sub.path))
    return false
  }

  const handleNavClick = (link: NavLink) => {
    if (link.path) {
      router.push(link.path)
    } else {
      setOpenDropdown(openDropdown === link.label ? null : link.label)
    }
  }

  return (
    <>
      {/* Desktop icon sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-14 z-50 flex-col items-center py-3 gap-1 bg-white border-r border-stone-200">
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center bg-emerald-600 rounded-lg mb-2 hover:bg-emerald-700 transition-colors cursor-pointer"
          aria-label="Home"
        >
          <BoltIcon />
        </button>

        <div className="w-6 h-px bg-stone-200 mb-1" />

        {/* Nav items */}
        {isAuthenticated &&
          navLinks.map((link) => (
            <NavIcon
              key={link.label}
              icon={link.icon}
              label={link.label}
              active={isLinkActive(link)}
              onClick={() => handleNavClick(link)}
              tooltip={link.label}
            />
          ))}

        <div className="mt-auto" />

        {/* Sign out */}
        {isAuthenticated && (
          <div className="relative group">
            <button
              onClick={async () => { await signOut(); router.push('/login') }}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
              aria-label="Sign Out"
            >
              <LogoutIcon />
            </button>
            <div className="absolute left-12 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="bg-stone-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap">
                Sign Out
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-stone-900" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BoltIcon />
            </div>
            <span className="text-sm font-bold text-emerald-600">Super Assistent</span>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-stone-200 max-h-[80vh] overflow-y-auto">
          <nav className="p-3 space-y-1">
            {isAuthenticated &&
              navLinks.map((link) => (
                <div key={link.label}>
                  <button
                    onClick={() => {
                      if (link.path) {
                        router.push(link.path)
                        setMobileOpen(false)
                      } else {
                        setOpenDropdown(openDropdown === link.label ? null : link.label)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isLinkActive(link)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className={isLinkActive(link) ? 'text-emerald-600' : 'text-stone-400'}>
                      {link.icon}
                    </span>
                    {link.label}
                    {link.subLinks && (
                      <svg className={`ml-auto w-4 h-4 transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                    )}
                  </button>
                  {link.subLinks && openDropdown === link.label && (
                    <div className="ml-9 mt-1 space-y-0.5">
                      {link.subLinks.map((sub) => (
                        <button
                          key={sub.path}
                          onClick={() => { router.push(sub.path); setMobileOpen(false); setOpenDropdown(null) }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === sub.path
                              ? 'bg-emerald-50 text-emerald-700 font-medium'
                              : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            <div className="pt-2 border-t border-stone-100">
              <button
                onClick={async () => { await signOut(); router.push('/login'); setMobileOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogoutIcon />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Update `src/app/layout.tsx` — change main content left padding**

```tsx
// Change:
<main className="flex-1 md:pl-72 pt-0 bg-theme-primary text-theme-primary">
// To:
<main className="flex-1 md:pl-14 pt-0 bg-[#fafaf9] text-stone-900">
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Nav.tsx src/app/layout.tsx
git commit -m "feat: replace wide sidebar with compact 56px icon sidebar + tooltips"
```

---

## Task 3: Update Shared UI Components

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Loading.tsx`
- Modify: `src/components/ui/StatCard.tsx`

- [ ] **Step 1: Rewrite `src/components/ui/Button.tsx`**

```tsx
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200 focus:ring-stone-300',
    outline: 'border border-stone-200 text-stone-700 hover:bg-stone-50 focus:ring-stone-200',
    ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:ring-stone-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  )
}

export default Button
```

- [ ] **Step 2: Rewrite `src/components/ui/Badge.tsx`**

```tsx
import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'priority-high' | 'priority-medium' | 'priority-low' | 'status-done' | 'status-inprogress' | 'status-notstarted'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  className?: string
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm', icon, className = '' }) => {
  const variants = {
    default: 'bg-stone-100 text-stone-600 border-stone-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'priority-high': 'bg-red-50 text-red-700 border-red-200',
    'priority-medium': 'bg-amber-50 text-amber-700 border-amber-200',
    'priority-low': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'status-done': 'bg-green-50 text-green-700 border-green-200',
    'status-inprogress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'status-notstarted': 'bg-stone-100 text-stone-600 border-stone-200',
  }
  const sizes = {
    sm: 'px-2 py-0.5 text-xs rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-lg',
  }
  return (
    <span className={`inline-flex items-center gap-1 font-medium border ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && icon}
      {children}
    </span>
  )
}

export default Badge
```

- [ ] **Step 3: Rewrite `src/components/ui/Card.tsx`**

```tsx
import React from 'react'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
  className?: string
}

const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
  className = '',
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  }

  return (
    <div
      className={`bg-white border border-stone-200 rounded-xl ${paddings[padding]} ${hover ? 'transition-colors duration-150 hover:border-stone-300' : ''} ${clickable ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
```

- [ ] **Step 4: Rewrite `src/components/ui/Input.tsx`**

```tsx
import React from 'react'

const baseInput = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-150'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  helperText?: string
}

const Input: React.FC<InputProps> = ({ label, error, icon, helperText, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</div>}
      <input className={`${baseInput} ${icon ? 'pl-9' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`} {...props} />
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {helperText && !error && <p className="text-xs text-stone-400">{helperText}</p>}
  </div>
)

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const TextArea: React.FC<TextAreaProps> = ({ label, error, helperText, className = '', rows = 4, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>}
    <textarea rows={rows} className={`${baseInput} resize-none ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`} {...props} />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {helperText && !error && <p className="text-xs text-stone-400">{helperText}</p>}
  </div>
)

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>}
    <select className={`${baseInput} ${error ? 'border-red-300' : ''} ${className}`} {...props}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export { Input, TextArea, Select }
```

- [ ] **Step 5: Rewrite `src/components/ui/Loading.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'

export default function Loading() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + Math.random() * 15))
    }, 200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
      <div className="w-full max-w-xs mx-auto px-6 text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">Super Assistent</h2>
          <p className="text-sm text-stone-500 mt-1">Loading your workspace...</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Initializing</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Rewrite `src/components/ui/StatCard.tsx`**

```tsx
import React from 'react'

interface StatCardProps {
  title: string
  total: number
  completed: number
  onClick?: () => void
  icon?: React.ReactNode
  description?: string
  type?: string
  showProgress?: boolean
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  title, total, completed, onClick, icon, description, type, showProgress = true, className = '',
}) => {
  const progress = total > 0 ? (completed / total) * 100 : 0

  return (
    <div
      className={`bg-white border border-stone-200 rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-stone-300 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            {icon}
          </div>
        )}
        {description && <span className="text-xs text-stone-400">{description}</span>}
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <p className="text-2xl font-bold text-stone-900">{Math.round(progress)}%</p>
        <p className="text-xs text-stone-400">{completed} of {total} completed</p>
        {showProgress && (
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        )}
        {onClick && (
          <p className="text-xs font-semibold text-emerald-600 pt-1">View {type || 'Details'} →</p>
        )}
      </div>
    </div>
  )
}

export default StatCard
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/
git commit -m "style: update all UI primitives to emerald design system"
```

---

## Task 4: Update PnLDashboardUI (Trading shared components)

**Files:**
- Modify: `src/app/trading/_pnl/PnLDashboardUI.tsx`

- [ ] **Step 1: Update `PageShell`, `PageHeader`, `SectionTitle`, `Card`**

Find and replace in `PnLDashboardUI.tsx`:

```tsx
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-8 md:pt-10 pb-16">{children}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-stone-500 mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
    </div>
  )
}

export function SectionTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-stone-900">{children}</h2>
      {description ? <p className="text-xs text-stone-400 mt-0.5">{description}</p> : null}
    </div>
  )
}

export function Card({ children, className = '', padding = true }: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white ${padding ? 'p-5 sm:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Update `Badge`, `BtnGhost`, `BtnPrimary`, `inputClassName`, `labelClassName`**

```tsx
export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'info' | 'real' | 'funded' }) {
  const styles = {
    default: 'bg-stone-100 text-stone-600 border-stone-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    real: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    funded: 'bg-stone-100 text-stone-600 border-stone-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  )
}

export function BtnGhost({ children, onClick, className = '', ariaLabel, disabled = false }: { children: React.ReactNode; onClick?: () => void; className?: string; ariaLabel?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
    </button>
  )
}

export function BtnPrimary({ children, onClick, className = '', disabled = false }: { children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
    </button>
  )
}

export const inputClassName = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors'
export const labelClassName = 'block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5'
```

- [ ] **Step 3: Update `ModalShell` and `ModalHeader`**

```tsx
export function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ title, subtitle, badges, onClose }: { title: string; subtitle?: string; badges?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="px-6 py-5 border-b border-stone-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
          {badges && <div className="mt-2 flex gap-2 flex-wrap">{badges}</div>}
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors shrink-0 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `SegmentedControl`**

Find the `SegmentedControl` function and update:

```tsx
export function SegmentedControl<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-white text-stone-900 border border-stone-200'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/trading/_pnl/PnLDashboardUI.tsx
git commit -m "style: update PnLDashboardUI to emerald design system"
```

---

## Task 5: Rewrite Home Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the `HomeContent` return JSX entirely**

Replace the `return (...)` inside `HomeContent` with:

```tsx
return (
  <div className="min-h-screen bg-[#fafaf9]">
    <div className="max-w-5xl mx-auto px-5 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-stone-400 mb-1">{currentDate}</p>
          <h1 className="text-2xl font-bold text-stone-900">
            {greeting}, <span className="text-emerald-600">Commander</span>
          </h1>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl px-5 py-3 text-center min-w-[140px]">
          <p className="text-xs text-stone-400 mb-1">Current Time</p>
          <p className="text-xl font-bold text-stone-900 font-mono tracking-wide">
            {mounted ? currentTime : '00:00:00'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-stone-400 mb-1">Overall</p>
          <p className="text-2xl font-bold text-stone-900">{overallProgress}%</p>
          <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{completedTasks}/{totalTasks} tasks</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Daily</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.daily.completed}/{stats.daily.total}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Weekly</p>
          <p className="text-2xl font-bold text-stone-900">{stats.weekly.completed}/{stats.weekly.total}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Monthly</p>
          <p className="text-2xl font-bold text-stone-900">{stats.monthly.completed}/{stats.monthly.total}</p>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => router.push(action.route)}
              className="group bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors duration-150 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={action.icon} />
                  </svg>
                </div>
                {action.stats && (
                  <span className="text-xs font-bold text-stone-400">
                    {action.stats.total > 0 ? Math.round((action.stats.completed / action.stats.total) * 100) : 0}%
                  </span>
                )}
                {action.badge && (
                  <span className="text-xs font-bold text-emerald-600">{action.badge}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">{action.title}</p>
              <p className="text-xs text-stone-400 mt-0.5">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Tasks */}
      {recentTasks.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Upcoming Tasks</h2>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {recentTasks.map((task, i) => (
              <div
                key={task.id}
                onClick={() => router.push('/task/daily')}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors cursor-pointer ${i < recentTasks.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                <div className="w-4 h-4 rounded-full border-2 border-stone-200 flex-shrink-0" />
                <p className="text-sm text-stone-700 flex-1">{task.title}</p>
                {task.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                    task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                    task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>{task.priority}</span>
                )}
              </div>
            ))}
            <div className="px-5 py-3 border-t border-stone-100">
              <button
                onClick={() => router.push('/task/daily')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                View All Tasks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
)
```

- [ ] **Step 2: Remove inline `<style jsx>` block at bottom of `HomeContent`**

Delete the entire:
```tsx
<style jsx>{`
  @keyframes slide-in-up { ... }
  @keyframes digital-pulse { ... }
  ...
`}</style>
```

- [ ] **Step 3: Remove `AnimatedBackground` import and usage**

Remove the dynamic import of `AnimatedBackground` at the top and its `<AnimatedBackground />` JSX usage — the new design has no animated background.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: rewrite home page with emerald design system"
```

---

## Task 6: Update Login Page

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace the full return JSX**

```tsx
return (
  <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-4">
    <div className="w-full max-w-sm">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900">Super Assistent</h1>
          <p className="text-sm text-stone-400 mt-1">Sign in to continue</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-stone-400 text-center mt-5">Contact admin to create an account</p>
      </div>
    </div>
  </div>
)
```

- [ ] **Step 2: Replace loading state JSX**

```tsx
if (isLoading) {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
      <div className="flex items-center gap-3 text-stone-500 text-sm">
        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        Signing in...
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "style: rewrite login page with emerald design system"
```

---

## Task 7: Update Task Pages

**Files:**
- Modify: `src/app/task/daily/page.tsx`
- Modify: `src/app/task/daily/[date]/page.tsx`
- Modify: `src/app/task/weekly/page.tsx`
- Modify: `src/app/task/weekly/[slug]/page.tsx`
- Modify: `src/app/task/monthly/page.tsx`
- Modify: `src/app/task/monthly/[slug]/page.tsx`

- [ ] **Step 1: In `src/app/task/daily/page.tsx` replace all page-level wrapper and calendar styles**

Replace outer div and all stone-700 classes:
- `className="min-h-screen bg-theme-primary"` → `className="min-h-screen bg-[#fafaf9]"`
- `className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32"` → `className="max-w-4xl mx-auto px-5 py-8"`
- Badge wrapper: `className="inline-flex items-center px-4 py-2 bg-theme-secondary border border-theme-primary rounded-full text-emerald-600 text-sm font-semibold mb-6"` → `className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold mb-4"`
- Month nav prev/next buttons: `className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"` → `className="p-2 hover:bg-stone-100 rounded-lg transition-colors"`
- Calendar day buttons: `border-theme-secondary bg-theme-secondary hover:bg-stone-700/50` → `border-stone-200 bg-stone-50 hover:bg-stone-100`
- Active today: `border-blue-400 bg-blue-400/10` → `border-emerald-400 bg-emerald-50`
- Has plans, all completed: `border-green-500/50 bg-green-500/10 hover:bg-green-500/20` → `border-green-300 bg-green-50 hover:bg-green-100`
- Has plans, in progress: `border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20` → `border-emerald-300 bg-emerald-50 hover:bg-emerald-100`
- Day number today: `text-blue-600` → `text-emerald-600`
- Day count completed: `text-green-600` → `text-green-600` (keep)
- Day count in progress: `text-blue-600` → `text-emerald-600`
- h1 title: `text-blue-600` → `text-stone-900`

- [ ] **Step 2: Read `src/app/task/daily/[date]/page.tsx` and apply same patterns**

```bash
cat /Users/bunkheangheng/Desktop/Project/myPlan/src/app/task/daily/\[date\]/page.tsx
```

Replace in that file:
- All `bg-theme-primary` → `bg-[#fafaf9]`
- All `pt-28 lg:pt-32` → `py-8`
- All `border-blue-500/30` → `border-stone-200`
- All `bg-blue-500` (icon bg) → `bg-emerald-600`
- All `text-blue-600` (accent) → `text-emerald-600`
- All `bg-blue-500/20` badges → `bg-emerald-50`
- All `hover:bg-stone-700` → `hover:bg-stone-100`
- Add task button: `bg-blue-500 text-white` → `bg-emerald-600 text-white hover:bg-emerald-700`
- Status "Done" color `text-green-600` → keep
- Status "In Progress" color `text-blue-600` → `text-emerald-600`

- [ ] **Step 3: Apply same find/replace patterns to weekly and monthly pages**

For each of:
- `src/app/task/weekly/page.tsx`
- `src/app/task/weekly/[slug]/page.tsx`
- `src/app/task/monthly/page.tsx`
- `src/app/task/monthly/[slug]/page.tsx`

Apply this consistent search-and-replace:
- `bg-theme-primary` → `bg-[#fafaf9]`
- `bg-theme-card` → `bg-white`
- `border-blue-500/30` → `border-stone-200`
- `text-blue-600` → `text-emerald-600`
- `bg-blue-500` → `bg-emerald-600`
- `bg-blue-600` → `bg-emerald-600`
- `hover:bg-blue-400` → `hover:bg-emerald-700`
- `hover:bg-stone-700` → `hover:bg-stone-100`
- `pt-28 lg:pt-32` → `py-8`
- `shadow-lg` → (remove)
- `shadow-xl` → (remove)

- [ ] **Step 4: Commit**

```bash
git add src/app/task/
git commit -m "style: update all task pages to emerald design system"
```

---

## Task 8: Update Remaining Pages

**Files:**
- `src/app/chat/page.tsx`
- `src/app/setup/page.tsx`
- `src/app/couple_saving/page.tsx`
- `src/app/business_idea/page.tsx`
- `src/app/working_project/page.tsx`
- `src/app/working_project/[projectId]/page.tsx`
- `src/app/self_punishment/page.tsx`
- `src/app/self_punishment/[id]/page.tsx`
- `src/app/trading/gold_info/page.tsx`
- `src/app/trading/trading_news/page.tsx`
- `src/app/trading/entry_checklist/page.tsx`
- `src/app/trading/lessons/page.tsx`
- `src/app/trading/my_rule/page.tsx`
- `src/app/trading/tools/page.tsx`
- `src/app/trading/trading_ai_predication/page.tsx`
- `src/app/settings/ai/AiSettingsPageClient.tsx`
- `src/app/admin/create-account/page.tsx`
- `src/app/admin/set-role/page.tsx`

- [ ] **Step 1: For each page above, apply this universal find/replace**

Open each file and apply all of these replacements:

```
bg-theme-primary      →  bg-[#fafaf9]
bg-theme-secondary    →  bg-stone-100
bg-theme-card         →  bg-white
bg-theme-tertiary     →  bg-stone-200
text-theme-primary    →  text-stone-900
text-theme-secondary  →  text-stone-600
text-theme-tertiary   →  text-stone-400
text-theme-muted      →  text-stone-400
border-theme-primary  →  border-stone-200
border-theme-secondary → border-stone-200
border-blue-500/30    →  border-stone-200
border-blue-400/50    →  border-stone-200
bg-blue-500           →  bg-emerald-600
bg-blue-600           →  bg-emerald-600
text-blue-600         →  text-emerald-600
hover:text-blue-600   →  hover:text-emerald-600
hover:bg-blue-400     →  hover:bg-emerald-700
hover:bg-blue-600     →  hover:bg-emerald-700
focus:ring-blue-500   →  focus:ring-emerald-500
border-blue-500       →  border-emerald-500
bg-blue-500/20        →  bg-emerald-50
text-black (on colored bg) → text-white
shadow-xl             →  (remove class)
shadow-2xl            →  (remove class)
shadow-lg             →  (remove class)
pt-28 lg:pt-32        →  py-8
pt-28                 →  py-8
```

- [ ] **Step 2: Special handling for chat page (`src/app/chat/page.tsx`)**

For the chat UI, after applying the universal replacements also:
- User chat bubble: change `bg-blue-600` or `bg-accent-secondary` to `bg-emerald-600`
- AI chat bubble: `bg-white border border-stone-200`
- Chat input focus ring: `focus:ring-emerald-500/20 focus:border-emerald-500`
- Send button: `bg-emerald-600 hover:bg-emerald-700`

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "style: apply emerald design system to all remaining pages"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run the dev server and spot-check all pages**

```bash
cd /Users/bunkheangheng/Desktop/Project/myPlan
npm run dev
```

Open http://localhost:3000 and verify:
- [ ] Nav is 56px wide, icons only, tooltips appear on hover, active is emerald
- [ ] Dashboard: warm white bg, white cards, emerald accents, no colored borders
- [ ] Login: centered card, shadow-sm only
- [ ] Daily tasks: calendar uses emerald for today + in-progress days
- [ ] Trading P&L: all cards consistent, emerald buttons
- [ ] Chat: emerald send button, clean bubbles
- [ ] No page has: blue accent, heavy shadow, dark stone-700/800 classes
- [ ] Mobile: hamburger menu works, slides down correctly

- [ ] **Step 2: Check TypeScript build passes**

```bash
npm run build
```

Expected: no type errors, build completes successfully.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "style: complete emerald + warm-white UI redesign across all pages"
```
