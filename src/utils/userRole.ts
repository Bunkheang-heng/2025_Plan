import { auth } from '../../firebase'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

export type UserRole = 'admin' | 'restricted' | 'partner'

export interface UserProfile {
  role: UserRole
  email?: string
  name?: string
}

/**
 * Get the user's role from Firestore
 * Defaults to 'restricted' if no role is set (security-first)
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const db = getFirestore()
    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (userDoc.exists()) {
      const data = userDoc.data()
      return (data.role as UserRole) || 'restricted'
    }
    
    // If user doesn't exist in users collection, default to restricted
    return 'restricted'
  } catch (error) {
    console.error('Error fetching user role:', error)
    // Default to restricted on error
    return 'restricted'
  }
}

/**
 * Set the user's role in Firestore
 */
export async function setUserRole(userId: string, role: UserRole, email?: string, name?: string, isNewUser: boolean = false): Promise<void> {
  try {
    const db = getFirestore()
    const userData: any = {
      role,
      email: email || null,
      name: name || null,
      updatedAt: new Date().toISOString()
    }
    
    // Add createdAt only for new users
    if (isNewUser) {
      userData.createdAt = new Date().toISOString()
    }
    
    await setDoc(doc(db, 'users', userId), userData, { merge: true })
  } catch (error) {
    console.error('Error setting user role:', error)
    throw error
  }
}

/**
 * Get user profile (role and other info)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const db = getFirestore()
    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile
    }
    
    return null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Check if user has access to a specific route
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
  if (role === 'admin') {
    return true // Admins can access everything
  }
  
  // Restricted users can only access couple saving page
  if (role === 'restricted') {
    return path === '/couple_saving' || path.startsWith('/couple_saving')
  }

  // Trading partners can only access trading partner page
  if (role === 'partner') {
    return path === '/trading_partner' || path.startsWith('/trading_partner')
  }
  
  return false
}

