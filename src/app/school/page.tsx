'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { Loading } from '@/components'
import { SchoolNav } from './SchoolNav'
import {
  fetchSchoolAssignmentsForMonth,
  fetchSchoolClasses,
  formatLocalDate,
  getDaysInMonth,
  getClassesForDate
} from './_shared'

export default function SchoolCalendarPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [classes, setClasses] = useState<any[]>([])
  const [classesByDate, setClassesByDate] = useState<Record<string, any[]>>({})
  const [assignmentCountsByDate, setAssignmentCountsByDate] = useState<Record<string, number>>({})

  const { daysInMonth, startingDayOfWeek, year, month } = useMemo(
    () => getDaysInMonth(currentDate),
    [currentDate]
  )

  const monthName = useMemo(
    () => currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentDate]
  )

  const load = useCallback(async () => {
    setError(null)
    const [allClasses, assignments] = await Promise.all([
      fetchSchoolClasses(),
      fetchSchoolAssignmentsForMonth(currentDate)
    ])

    setClasses(allClasses)

    // Calculate classes for each day in the month
    const classesByDateMap: Record<string, any[]> = {}
    const { year, month, daysInMonth } = getDaysInMonth(currentDate)
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = formatLocalDate(date)
      const classesForDay = getClassesForDate(allClasses, date)
      if (classesForDay.length > 0) {
        classesByDateMap[dateStr] = classesForDay
      }
    }
    setClassesByDate(classesByDateMap)

    const countsByDate: Record<string, number> = {}
    assignments.forEach(a => {
      countsByDate[a.dueDate] = (countsByDate[a.dueDate] || 0) + 1
    })
    setAssignmentCountsByDate(countsByDate)
  }, [currentDate])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
        return
      }
      load()
        .catch((e) => {
          console.error('School calendar load error:', e)
          setError(e instanceof Error ? e.message : 'Failed to load school calendar')
        })
        .finally(() => setIsLoading(false))
    })
    return () => unsubscribe()
  }, [router, load])

  // Reload when month changes
  useEffect(() => {
    if (!auth.currentUser) return
    load().catch(() => null)
  }, [currentDate, load])

  const changeMonth = (direction: number) => {
    const next = new Date(currentDate)
    next.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(next)
  }

  const openDate = (dateStr: string) => {
    router.push(`/school/date/${dateStr}`)
  }

  if (isLoading) return <Loading />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 pt-28 lg:pt-32 space-y-6">
        <SchoolNav />

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/10">
          <div className="p-6 border-b border-indigo-500/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => changeMonth(-1)}
                className="w-10 h-10 rounded-xl bg-gray-800/70 border border-gray-700 text-white hover:bg-gray-700/60 transition-all"
                aria-label="Previous month"
              >
                ‹
              </button>
              <div>
                <p className="text-gray-400 text-sm">Month</p>
                <p className="text-white font-extrabold text-2xl">{monthName}</p>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="w-10 h-10 rounded-xl bg-gray-800/70 border border-gray-700 text-white hover:bg-gray-700/60 transition-all"
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200">
                <b>Classes</b>: weekly schedule
              </div>
              <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <b>Assignments</b>: due date
              </div>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-px bg-gray-700/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-gray-900/70 p-3 text-center text-xs font-semibold text-gray-300">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-px bg-gray-700/40">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-900/40 min-h-[110px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const d = new Date(year, month, day)
              const dateStr = formatLocalDate(d)
              const classesForDay = classesByDate[dateStr] || []
              const classCount = classesForDay.length
              const dueCount = assignmentCountsByDate[dateStr] || 0
              const isToday = formatLocalDate(new Date()) === dateStr

              return (
                <button
                  key={dateStr}
                  onClick={() => openDate(dateStr)}
                  className="text-left bg-gray-900/60 hover:bg-gray-800/70 transition-all min-h-[110px] p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-bold ${isToday ? 'text-indigo-300' : 'text-gray-200'}`}>
                      {day}
                    </div>
                    {isToday && (
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200">
                        Today
                      </div>
                    )}
                  </div>

                  <div className="mt-2 space-y-2">
                    {classCount > 0 && (
                      <div className="space-y-1">
                        {classesForDay.slice(0, 2).map((c, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            <div className="text-[10px] text-indigo-200 truncate">
                              {c.title} {c.startTime}
                            </div>
                          </div>
                        ))}
                        {classCount > 2 && (
                          <div className="text-[10px] text-gray-400">
                            +{classCount - 2} more
                          </div>
                        )}
                      </div>
                    )}
                    {classCount === 0 && (
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                        <div className="text-xs text-gray-500">No classes</div>
                      </div>
                    )}
                    {dueCount > 0 && (
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div className="text-xs text-amber-200">
                          {dueCount} assignment{dueCount === 1 ? '' : 's'} due
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">Open details →</p>
                  </div>
                </button>
              )
            })}

            {(() => {
              const totalCells = startingDayOfWeek + daysInMonth
              const remainder = totalCells % 7
              const trailing = remainder === 0 ? 0 : 7 - remainder
              return Array.from({ length: trailing }).map((_, i) => (
                <div key={`trail-${i}`} className="bg-gray-900/40 min-h-[110px]" />
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}


