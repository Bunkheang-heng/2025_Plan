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

  /**
   * IMPORTANT:
   * We should not silently fall back to "projectId only" because that makes the Admin SDK try
   * Google Application Default Credentials (ADC). In most deployments (Vercel/GitHub Actions),
   * ADC is not available and you'll get: "Could not load the default credentials".
   *
   * Supported setups:
   * - Recommended: FIREBASE_SERVICE_ACCOUNT (stringified JSON service account)
   * - Optional: GOOGLE_APPLICATION_CREDENTIALS (path to JSON file on disk) for ADC
   */
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT

  if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
    const raw = JSON.parse(serviceAccountJson)
    // Fix common issue where private_key is stored with escaped newlines in env vars.
    if (typeof raw?.private_key === 'string') {
      raw.private_key = raw.private_key.replace(/\\n/g, '\n')
    }
    const projectId =
      (typeof raw?.project_id === 'string' && raw.project_id) ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

    adminApp = initializeApp({
      credential: cert(raw),
      projectId,
    })
    return adminApp
  }

  // Allow ADC only when explicitly configured.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = initializeApp()
    return adminApp
  }

  throw new Error(
    'Firebase Admin credentials not configured. Set FIREBASE_SERVICE_ACCOUNT (recommended) or GOOGLE_APPLICATION_CREDENTIALS.'
  )

  return adminApp
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp())
}

