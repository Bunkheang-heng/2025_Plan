/**
 * Utility script to set user roles
 * 
 * Usage:
 * 1. Import this function in a page or component
 * 2. Call setUserRoleForEmail('monika@example.com', 'restricted')
 * 
 * Or use in browser console:
 * import { setUserRole } from '@/utils/userRole'
 * const userId = 'USER_ID_HERE'
 * await setUserRole(userId, 'restricted', 'monika@example.com', 'Phan Chan Monika')
 */

import { setUserRole } from './userRole'
import { auth } from '../../firebase'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'

/**
 * Set role for a user by email
 */
export async function setUserRoleForEmail(email: string, role: 'admin' | 'restricted' | 'partner', name?: string): Promise<void> {
  try {
    const db = getFirestore()
    
    // Find user by email in Firestore (if you store emails)
    // Or you can manually get the userId from Firebase Auth console
    
    // For now, this is a helper - you'll need to provide the userId
    console.log('To set role for user:', email)
    console.log('1. Go to Firebase Console > Authentication')
    console.log('2. Find the user by email:', email)
    console.log('3. Copy their UID')
    console.log('4. Use setUserRole(userId, role, email, name)')
    
    throw new Error('Please use setUserRole directly with userId. See console for instructions.')
  } catch (error) {
    console.error('Error setting user role:', error)
    throw error
  }
}

/**
 * Set role for current authenticated user
 */
export async function setCurrentUserRole(role: 'admin' | 'restricted' | 'partner', name?: string): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('No user is currently authenticated')
  }
  
  await setUserRole(user.uid, role, user.email || undefined, name)
  console.log(`Role set to "${role}" for user: ${user.email}`)
}


