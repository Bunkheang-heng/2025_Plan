'use client'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { useEffect, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { canAccessRoute } from '@/utils/userRole'

interface AuthButtonProps {
  isLoggedIn: boolean
}

interface SubLink {
  path: string;
  label: string;
}

interface NavLink {
  path?: string;
  label: string;
  icon: () => React.JSX.Element;
  subLinks?: SubLink[];
}

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { role, isLoading: roleLoading } = useUserRole()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user)
    })
    return () => unsubscribe()
  }, [])

  const allNavLinks: NavLink[] = [
    { path: '/', label: 'Dashboard', icon: DashboardIcon },
    { path: '/task/daily', label: 'Daily', icon: CalendarDayIcon },
    { path: '/task/weekly', label: 'Weekly', icon: CalendarWeekIcon },
    { path: '/task/monthly', label: 'Monthly', icon: CalendarMonthIcon },
    { 
      label: 'Trading', 
      icon: TradingIcon,
      subLinks: [
        { path: '/trading/trading_pnl', label: 'Trading P&L' },
        { path: '/trading/trading_news', label: 'Trading News' },
        { path: '/trading/trading_ai_predication', label: 'Trading AI Predication' },
        { path: '/trading/gold_info', label: 'Gold Market Information' }
      ]
    },
    { path: '/chat', label: 'AI Chat', icon: ChatIcon },
    { path: '/working_project', label: 'Working Project', icon: WorkingProjectIcon },
    { path:'/business_idea', label: 'Business Idea', icon: BusinessIdeaIcon},
    { path:'/couple_saving', label: 'Couple Saving', icon: CoupleSavingIcon},
    { path:'/admin/set-role', label: 'Admin: Set Role', icon: AdminIcon},
    { path:'/admin/create-account', label: 'Admin: Create Account', icon: AdminIcon},
  ]

  // Filter nav links based on user role
  const navLinks = useMemo(() => {
    if (roleLoading) return []
    
    return allNavLinks.filter(link => {
      // Admin-only pages (like admin/set-role) should only show for admins
      if (link.path?.startsWith('/admin') && role !== 'admin') {
        return false
      }
      
      // Check main path
      if (link.path && !canAccessRoute(role, link.path)) {
        return false
      }
      
      // Check sublinks - if any sublink is accessible, show the parent
      if (link.subLinks) {
        const hasAccessibleSubLink = link.subLinks.some(subLink => 
          canAccessRoute(role, subLink.path)
        )
        return hasAccessibleSubLink
      }
      
      return true
    })
  }, [role, roleLoading])

  function DashboardIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h7v7H3V3zM14 3h7v7h-7V3zM14 14h7v7h-7v-7zM3 14h7v7H3v-7z" />
      </svg>
    )
  }

  function CalendarDayIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      </svg>
    )
  }

  function CalendarWeekIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 10h18M3 21h18" />
      </svg>
    )
  }

  function CalendarMonthIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 8h18M3 21h18" />
      </svg>
    )
  }

  function ChatIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.97 9.97 0 01-4-.8L3 20l1.2-4.2A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  }

  function TradingIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }

  // WORKING PROJECT = Briefcase Icon
  function WorkingProjectIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M3 7h18a1 1 0 011 1v11a2 2 0 01-2 2H4a2 2 0 01-2-2V8a1 1 0 011-1z"
        />
      </svg>
    )
  }

  // BUSINESS IDEA = Lightbulb Icon
  function BusinessIdeaIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3a7 7 0 017 7c0 2.281-1.218 4.177-3.09 5.207A2.992 2.992 0 0112 21m0 0a2.992 2.992 0 01-3.91-5.793C6.218 14.177 5 12.281 5 10a7 7 0 017-7zm0 14v1m-3-1h6"
        />
      </svg>
    )
  }

  // COUPLE SAVING = Heart with Dollar Icon
  function CoupleSavingIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 21C12 21 4 13.476 4 8.727A4.727 4.727 0 0112 4a4.727 4.727 0 018 4.727C20 13.476 12 21 12 21z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.5 11.5a1.5 1.5 0 11-3 0c0-.828.896-1.5 2-1.5s2 .672 2 1.5z"
        />
        <text
          x="12"
          y="15"
          textAnchor="middle"
          fontSize="5"
          fill="currentColor"
          fontFamily="monospace"
          dy=".3em"
        >$</text>
      </svg>
    )
  }

  // ADMIN = Shield Icon
  function AdminIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    )
  }

  const NavItem = ({ link }: { link: NavLink }) => {
    // Check if any sublink is active
    const isSubLinkActive = link.subLinks?.some(sub => pathname === sub.path)
    const active = link.path ? pathname === link.path : false
    const isOpen = openDropdown === link.label

    if (link.subLinks) {
      return (
        <div>
          <button
            onClick={() => setOpenDropdown(isOpen ? null : link.label)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-r-lg transition-colors duration-200 text-sm font-medium ${
              isSubLinkActive
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg'
                : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`flex items-center justify-center w-6 h-6 ${isSubLinkActive ? 'text-black' : 'text-gray-300'}`}>
                <link.icon />
              </span>
              <span>{link.label}</span>
            </div>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isOpen && (
            <div className="ml-4 mt-1 space-y-1 animate-slide-down">
              {link.subLinks.map((subLink) => (
                <button
                  key={subLink.path}
                  onClick={() => router.push(subLink.path)}
                  className={`w-full text-left px-4 py-2 rounded-r-lg transition-colors duration-200 text-sm ${
                    pathname === subLink.path
                      ? 'bg-yellow-500/20 text-yellow-400 border-l-2 border-yellow-400'
                      : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800/30'
                  }`}
                >
                  {subLink.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        onClick={() => router.push(link.path!)}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-r-lg transition-colors duration-200 text-sm font-medium ${
          active
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg'
            : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50'
        }`}
      >
        <span className={`flex items-center justify-center w-6 h-6 ${active ? 'text-black' : 'text-gray-300'}`}>
          <link.icon />
        </span>
        <span>{link.label}</span>
      </button>
    )
  }

  const MobileNavItem = ({ link }: { link: NavLink }) => {
    const isSubLinkActive = link.subLinks?.some(sub => pathname === sub.path)
    const isOpen = openDropdown === link.label

    if (link.subLinks) {
      return (
        <div>
          <button
            onClick={() => setOpenDropdown(isOpen ? null : link.label)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-150 ${
              isSubLinkActive ? 'text-yellow-400 bg-gray-800/50' : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6"><link.icon /></span>
                <span>{link.label}</span>
              </div>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {isOpen && (
            <div className="ml-9 mt-1 space-y-1">
              {link.subLinks.map((subLink) => (
                <button
                  key={subLink.path}
                  onClick={() => {
                    router.push(subLink.path)
                    setMobileOpen(false)
                    setOpenDropdown(null)
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 text-sm ${
                    pathname === subLink.path
                      ? 'text-yellow-400 bg-gray-800/50'
                      : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800/30'
                  }`}
                >
                  {subLink.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        onClick={() => {
          router.push(link.path!)
          setMobileOpen(false)
        }}
        className="w-full text-left px-4 py-3 rounded-lg transition-colors duration-150 text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50"
      >
        <div className="flex items-center space-x-3">
          <span className="w-6 h-6"><link.icon /></span>
          <span>{link.label}</span>
        </div>
      </button>
    )
  }

  const AuthButton = ({ isLoggedIn }: AuthButtonProps) => (
    <button
      onClick={
        isLoggedIn
          ? async () => {
              await auth.signOut()
              router.push('/login')
            }
          : () => router.push('/login')
      }
      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        isLoggedIn
          ? 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50'
          : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg'
      }`}
    >
      {isLoggedIn ? 'Sign Out' : 'Sign In'}
    </button>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 z-50 flex-col bg-gradient-to-b from-gray-900 to-black border-r border-yellow-500/20 shadow-xl p-4">
        <div className="flex items-center space-x-3 mb-6 cursor-pointer" onClick={() => router.push('/')}>
          <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg border border-yellow-300">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">J.A.R.V.I.S</h1>
            <p className="text-xs text-gray-400">Personal Assistant</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {isLoggedIn && navLinks.map((l) => <NavItem key={l.label} link={l} />)}
        </nav>

        <div className="mt-4">
          <AuthButton isLoggedIn={isLoggedIn} />
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 to-black border-b border-yellow-500/20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">J.A.R.V.I.S</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md text-gray-300 hover:text-yellow-400 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div>
              <AuthButton isLoggedIn={isLoggedIn} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-gradient-to-b from-gray-900 to-black border-t border-yellow-500/10 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4 space-y-2">
            {isLoggedIn && navLinks.map((l) => <MobileNavItem key={l.label} link={l} />)}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
