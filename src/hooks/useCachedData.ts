import useSWR, { SWRConfiguration } from 'swr'
import { getFirestore, collection, query, where, getDocs, limit, QueryConstraint, DocumentData } from 'firebase/firestore'

// Default SWR configuration for better performance
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // Dedupe requests within 60 seconds
  errorRetryCount: 3,
}

// Generic Firestore fetcher
async function firestoreFetcher<T>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> {
  const db = getFirestore()
  const q = query(collection(db, collectionName), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as T[]
}

// Hook for fetching tasks with caching
export function useCachedTasks<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  config?: SWRConfiguration
) {
  // Create a stable key from the collection and constraints
  const key = `firestore:${collectionName}:${JSON.stringify(constraints.map(c => c.type))}`
  
  const { data, error, isLoading, mutate } = useSWR<T[]>(
    key,
    () => firestoreFetcher<T>(collectionName, constraints),
    { ...defaultConfig, ...config }
  )

  return {
    data: data || [],
    error,
    isLoading,
    refresh: mutate,
  }
}

// Hook for fetching daily tasks
export function useDailyTasks(date: string, limitCount: number = 10) {
  return useCachedTasks(
    'daily',
    [where('date', '==', date), limit(limitCount)],
    { revalidateOnFocus: false }
  )
}

// Hook for fetching recent tasks (for dashboard)
export function useRecentTasks(date: string, status: string = 'Not Started', limitCount: number = 3) {
  return useCachedTasks(
    'daily',
    [where('date', '==', date), where('status', '==', status), limit(limitCount)],
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )
}

// Hook for trading stats
export function useTradingStats(userId: string | null) {
  const key = userId ? `trading:stats:${userId}` : null
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      if (!userId) return { totalPnL: 0, winRate: 0 }
      
      const db = getFirestore()
      const q = query(collection(db, 'trading_records'), where('userId', '==', userId))
      const snapshot = await getDocs(q)
      
      let totalPnL = 0
      let wins = 0
      let total = 0
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        totalPnL += data.pnl || 0
        if (data.pnl > 0) wins++
        total++
      })
      
      return {
        totalPnL,
        winRate: total > 0 ? (wins / total) * 100 : 0
      }
    },
    { ...defaultConfig, dedupingInterval: 120000 } // Cache for 2 minutes
  )

  return {
    stats: data || { totalPnL: 0, winRate: 0 },
    error,
    isLoading,
    refresh: mutate,
  }
}
