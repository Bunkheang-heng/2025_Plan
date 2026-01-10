'use client'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore'
import { auth } from '../../../firebase'

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sun

export type SchoolClass = {
  id: string
  userId: string
  weekdays: Weekday[] // Multiple days per week (e.g., [1, 3, 5] for Mon, Wed, Fri)
  title: string
  startTime: string // HH:MM
  endTime: string // HH:MM
  semesterStart: string // YYYY-MM-DD
  semesterEnd: string // YYYY-MM-DD
  room?: string
  teacher?: string
  color?: string
  createdAt?: Date
  updatedAt?: Date
}

export type SchoolAssignment = {
  id: string
  userId: string
  dueDate: string // YYYY-MM-DD
  title: string
  course?: string
  dueTime?: string // HH:MM optional
  notes?: string
  status: 'pending' | 'done'
  createdAt?: Date
  updatedAt?: Date
}

export const weekdayLong: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
}

export const weekdaysShort: Array<{ key: Weekday; label: string }> = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 0, label: 'Sun' }
]

// Helper function to format date in local timezone (YYYY-MM-DD)
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return {
    year,
    month,
    daysInMonth: lastDay.getDate(),
    startingDayOfWeek: firstDay.getDay()
  }
}

export async function fetchSchoolClasses(): Promise<SchoolClass[]> {
  const user = auth.currentUser
  if (!user) return []
  const db = getFirestore()

  try {
    const q = query(
      collection(db, 'schoolClasses'),
      where('userId', '==', user.uid),
      orderBy('title', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const data: any = d.data()
      // Handle migration: if weekday exists (old format), convert to weekdays array
      const weekdays = data.weekdays 
        ? (Array.isArray(data.weekdays) ? data.weekdays.map((w: any) => Number(w) as Weekday) : [Number(data.weekdays) as Weekday])
        : data.weekday !== undefined 
          ? [Number(data.weekday) as Weekday]
          : []
      
      return {
        id: d.id,
        ...data,
        weekdays,
        createdAt: data.createdAt?.toDate?.() || undefined,
        updatedAt: data.updatedAt?.toDate?.() || undefined
      } as SchoolClass
    })
  } catch (e: any) {
    // Fallback if index is not ready
    if (e?.code === 'failed-precondition' || String(e?.message || '').includes('index')) {
      const q = query(collection(db, 'schoolClasses'), where('userId', '==', user.uid))
      const snap = await getDocs(q)
      return snap.docs.map(d => {
        const data: any = d.data()
        // Handle migration: if weekday exists (old format), convert to weekdays array
        const weekdays = data.weekdays 
          ? (Array.isArray(data.weekdays) ? data.weekdays.map((w: any) => Number(w) as Weekday) : [Number(data.weekdays) as Weekday])
          : data.weekday !== undefined 
            ? [Number(data.weekday) as Weekday]
            : []
        
        return {
          id: d.id,
          ...data,
          weekdays,
          createdAt: data.createdAt?.toDate?.() || undefined,
          updatedAt: data.updatedAt?.toDate?.() || undefined
        } as SchoolClass
      })
    }
    throw e
  }
}

// Helper function to get classes for a specific date
export function getClassesForDate(classes: SchoolClass[], date: Date): SchoolClass[] {
  const dateStr = formatLocalDate(date)
  const weekday = date.getDay() as Weekday
  
  return classes.filter(c => {
    // Check if class is on this weekday
    if (!c.weekdays.includes(weekday)) return false
    
    // Check if date is within semester
    if (dateStr < c.semesterStart || dateStr > c.semesterEnd) return false
    
    return true
  }).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export async function fetchSchoolAssignmentsForMonth(date: Date): Promise<SchoolAssignment[]> {
  const user = auth.currentUser
  if (!user) return []
  const db = getFirestore()

  const start = formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1))
  const end = formatLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))

  try {
    const q = query(
      collection(db, 'schoolAssignments'),
      where('userId', '==', user.uid),
      where('dueDate', '>=', start),
      where('dueDate', '<=', end),
      orderBy('dueDate', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const data: any = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || undefined,
        updatedAt: data.updatedAt?.toDate?.() || undefined
      } as SchoolAssignment
    })
  } catch (e: any) {
    // Fallback if index is not ready
    if (e?.code === 'failed-precondition' || String(e?.message || '').includes('index')) {
      const q = query(collection(db, 'schoolAssignments'), where('userId', '==', user.uid))
      const snap = await getDocs(q)
      return snap.docs
        .map(d => {
          const data: any = d.data()
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || undefined,
            updatedAt: data.updatedAt?.toDate?.() || undefined
          } as SchoolAssignment
        })
        .filter(a => a.dueDate >= start && a.dueDate <= end)
    }
    throw e
  }
}

export async function createOrUpdateClass(editingId: string | null, payload: Omit<SchoolClass, 'id' | 'createdAt' | 'updatedAt'> & { room?: string | null; teacher?: string | null; color?: string | null }) {
  const db = getFirestore()
  const data = {
    ...payload,
    weekdays: payload.weekdays || [],
    updatedAt: new Date()
  }
  if (editingId) {
    await updateDoc(doc(db, 'schoolClasses', editingId), data)
  } else {
    await addDoc(collection(db, 'schoolClasses'), { ...data, createdAt: new Date() })
  }
}

export async function deleteClassById(id: string) {
  const db = getFirestore()
  await deleteDoc(doc(db, 'schoolClasses', id))
}

export async function createOrUpdateAssignment(
  editingId: string | null,
  payload: Omit<SchoolAssignment, 'id' | 'createdAt' | 'updatedAt'> & { course?: string | null; dueTime?: string | null; notes?: string | null }
) {
  const db = getFirestore()
  if (editingId) {
    await updateDoc(doc(db, 'schoolAssignments', editingId), { ...payload, updatedAt: new Date() })
  } else {
    await addDoc(collection(db, 'schoolAssignments'), { ...payload, createdAt: new Date(), updatedAt: new Date() })
  }
}

export async function deleteAssignmentById(id: string) {
  const db = getFirestore()
  await deleteDoc(doc(db, 'schoolAssignments', id))
}

export async function toggleAssignmentDone(id: string, nextStatus: 'pending' | 'done') {
  const db = getFirestore()
  await updateDoc(doc(db, 'schoolAssignments', id), { status: nextStatus, updatedAt: new Date() })
}



