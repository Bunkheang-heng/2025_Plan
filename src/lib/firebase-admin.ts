import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let adminApp: App | null = null

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp
  }

  // Check if already initialized
  const existingApps = getApps()
  if (existingApps.length > 0) {
    adminApp = existingApps[0]
    return adminApp
  }

  // Initialize with service account credentials if available, otherwise use project ID
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson)
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    } catch (error) {
      console.error('Error parsing service account JSON:', error)
      // Fall back to project ID only
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }
  } else {
    // Initialize with project ID only (may require additional setup in production)
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }

  return adminApp
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp())
}

