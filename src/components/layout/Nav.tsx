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

// Module-level constant — no runtime dependencies on props/state
const ALL_NAV_LINKS: NavLink[] = [
  { path: '/', label: 'Dashboard', icon: <DashIcon /> },
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
      { path: '/trading/charts', label: 'Live Charts', group: 'Market Intel' },
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

function NavIcon({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer ${
          active ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:bg-emerald-50 hover:text-emerald-600'
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

  const navLinks = useMemo(() => {
    if (roleLoading) return []
    return ALL_NAV_LINKS.filter((link) => {
      if (link.subLinks?.some(sub => sub.path.startsWith('/admin')) && role !== 'admin') return false
      if (link.path && !canAccessRoute(role, link.path)) return false
      if (link.subLinks) return link.subLinks.some((sub) => canAccessRoute(role, sub.path))
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
          className="w-9 h-9 flex items-center justify-center bg-emerald-600 rounded-lg mb-2 hover:bg-emerald-700 transition-colors cursor-pointer text-white"
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
            />
          ))}

        <div className="mt-auto" />

        {/* Settings + Sign out */}
        {isAuthenticated && (
          <>
            <NavIcon
              icon={<SettingsIcon />}
              label="AI Settings"
              active={pathname === '/settings/ai'}
              onClick={() => router.push('/settings/ai')}
            />
            <div className="w-6 h-px bg-stone-200 my-1" />
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
          </>
        )}
      </aside>

      {/* Desktop sub-link flyout panel */}
      {openDropdown && (() => {
        const activeLink = navLinks.find(l => l.label === openDropdown)
        if (!activeLink?.subLinks) return null
        return (
          <div className="fixed left-14 top-0 h-full w-48 bg-white border-r border-stone-200 z-40 py-3 overflow-y-auto">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{activeLink.label}</p>
            </div>
            <nav className="space-y-0.5 px-2">
              {activeLink.subLinks.map((sub) => (
                <button
                  key={sub.path}
                  onClick={() => { router.push(sub.path); setOpenDropdown(null) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === sub.path
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </nav>
          </div>
        )
      })()}

      {/* Overlay to close flyout when clicking outside */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200 h-14">
        <div className="flex items-center justify-between px-4 h-full">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
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
                      if (link.path) { router.push(link.path); setMobileOpen(false) }
                      else setOpenDropdown(openDropdown === link.label ? null : link.label)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isLinkActive(link) ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className={isLinkActive(link) ? 'text-emerald-600' : 'text-stone-400'}>{link.icon}</span>
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
                            pathname === sub.path ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            <div className="pt-2 border-t border-stone-100 space-y-1">
              <button
                onClick={() => { router.push('/settings/ai'); setMobileOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/settings/ai' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
              >
                <span className={pathname === '/settings/ai' ? 'text-emerald-600' : 'text-stone-400'}><SettingsIcon /></span>
                AI Settings
              </button>
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
