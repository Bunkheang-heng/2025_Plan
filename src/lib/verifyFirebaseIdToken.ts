import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'

function resolveFirebaseProjectId(): string {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    ''
  return projectId.replace(/^["']|["']$/g, '')
}

function normPid(s: string): string {
  return s.trim().toLowerCase()
}

/** Project id embedded in Firebase Auth issuer URL. */
function projectIdFromFirebaseIss(iss: string | undefined): string | null {
  if (!iss) return null
  const m = iss.match(/^https:\/\/securetoken\.google\.com\/(.+)$/i)
  return m ? m[1].trim() : null
}

function firebaseAudMatchesProject(aud: string | undefined, projectId: string): boolean {
  if (!aud || !projectId) return false
  const p = normPid(projectId)
  for (const part of aud.split(',').map((x) => x.trim())) {
    if (normPid(part) === p) return true
    const fromUrl = part.match(/securetoken\.google\.com\/([^/?#]+)/i)?.[1]
    if (fromUrl && normPid(fromUrl) === p) return true
  }
  return false
}

async function tokenInfoAssertValidAndGetUid(idToken: string): Promise<string> {
  const projectId = resolveFirebaseProjectId()
  if (!projectId) {
    throw new Error(
      'Set NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID) so the server can verify your login, or configure FIREBASE_SERVICE_ACCOUNT for Admin SDK.'
    )
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      body.includes('Invalid token') || res.status === 400
        ? 'Invalid or expired ID token — sign out and sign in again'
        : 'Could not verify ID token with Google'
    )
  }

  const data = (await res.json()) as {
    aud?: string
    iss?: string
    user_id?: string
    sub?: string
    exp?: string
    error?: string
  }

  if (data.error) {
    throw new Error(String(data.error))
  }

  const pEnv = normPid(projectId)
  const issProject = projectIdFromFirebaseIss(data.iss)
  const issOk = issProject !== null && normPid(issProject) === pEnv
  const audOk = firebaseAudMatchesProject(data.aud, projectId)

  if (!issOk && !audOk) {
    throw new Error(
      `ID token does not match this app’s Firebase project (aud=${data.aud ?? '?'}, iss=${data.iss ?? '?'}; set NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId} on the server to match the project you sign in with)`
    )
  }

  const uid = data.user_id || data.sub
  if (!uid) {
    throw new Error('Invalid token: missing subject')
  }

  const expSec = Number(data.exp)
  if (Number.isFinite(expSec) && expSec * 1000 < Date.now() - 30_000) {
    throw new Error('ID token expired — refresh or sign in again')
  }

  return uid
}

/**
 * Verify a Firebase Auth ID token.
 * 1) Prefer Admin SDK when it loads and accepts the token.
 * 2) If that fails (no Admin, wrong SA project, etc.), use Google's tokeninfo + project id check.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<void> {
  try {
    const app = getAdminApp()
    await getAuth(app).verifyIdToken(idToken)
    return
  } catch {
    // Fall through: common when FIREBASE_SERVICE_ACCOUNT is missing, or SA is for another project.
  }

  await tokenInfoAssertValidAndGetUid(idToken)
}

/** Same as verifyFirebaseIdToken but returns the authenticated user's uid. */
export async function verifyFirebaseIdTokenAndGetUid(idToken: string): Promise<string> {
  try {
    const app = getAdminApp()
    const decoded = await getAuth(app).verifyIdToken(idToken)
    return decoded.uid
  } catch {
    /* fall through */
  }
  return tokenInfoAssertValidAndGetUid(idToken)
}
