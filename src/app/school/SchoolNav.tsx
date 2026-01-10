'use client'
import React from 'react'
import { usePathname, useRouter } from 'next/navigation'

type SchoolRoute = '/school' | '/school/classes' | '/school/assignments'

const options: Array<{ value: SchoolRoute; label: string; description: string }> = [
  { value: '/school', label: 'Calendar', description: 'See month view + open a date details page' },
  { value: '/school/classes', label: 'Manage Classes', description: 'Weekly schedule (Mon–Sun)' },
  { value: '/school/assignments', label: 'Manage Assignments', description: 'All deadlines list' }
]

function normalizeSchoolRoute(pathname: string): SchoolRoute {
  if (pathname.startsWith('/school/classes')) return '/school/classes'
  if (pathname.startsWith('/school/assignments')) return '/school/assignments'
  return '/school'
}

export function SchoolNav() {
  const router = useRouter()
  const pathname = usePathname()
  const current = normalizeSchoolRoute(pathname)

  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-400 text-xs">School</p>
          <p className="text-white font-extrabold text-xl">Planner</p>
        </div>
        <div className="w-full sm:w-[320px]">
          <select
            value={current}
            onChange={(e) => router.push(e.target.value as SchoolRoute)}
            className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-indigo-500"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-gray-400 text-xs mt-2">
            {options.find(o => o.value === current)?.description}
          </p>
        </div>
      </div>
    </div>
  )
}



