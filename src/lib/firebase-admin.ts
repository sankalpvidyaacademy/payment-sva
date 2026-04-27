import * as admin from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'

// Firebase Admin SDK singleton for server-side use
// This bypasses all Firestore security rules and is only used in API routes

const globalForFirebase = globalThis as unknown as {
  firebaseApp: admin.app.App | undefined
}

function getFirebaseApp(): admin.app.App {
  if (globalForFirebase.firebaseApp) {
    return globalForFirebase.firebaseApp
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin SDK environment variables. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local'
    )
  }

  // Handle escaped newlines in private key
  privateKey = privateKey.replace(/\\n/g, '\n')

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForFirebase.firebaseApp = app
  }

  return app
}

// Initialize and export Firestore instance
let _db: admin.firestore.Firestore | null = null

export function getDb(): admin.firestore.Firestore {
  if (!_db) {
    const app = getFirebaseApp()
    _db = app.firestore()

    // Configure Firestore settings for better performance
    _db.settings({
      ignoreUndefinedProperties: true,
    })
  }
  return _db
}

// Export a convenience alias matching the old Prisma pattern
// So `import { db } from '@/lib/firebase-admin'` works as a drop-in
export const db = {
  // We use getter to ensure db is initialized lazily (after env vars are loaded)
  get collection() {
    return getDb().collection.bind(getDb())
  },
}

// Helper: Generate a unique ID (replaces Prisma's cuid())
export function generateId(): string {
  return uuidv4().replace(/-/g, '').slice(0, 25)
}

// Helper: Get a Firestore timestamp from a Date
export function toTimestamp(date: Date | string | null): admin.firestore.Timestamp | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return admin.firestore.Timestamp.fromDate(d)
}

// Helper: Convert Firestore timestamp to ISO string for API responses
export function fromTimestamp(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null
  return ts.toDate().toISOString()
}

// Helper: Get current Firestore server timestamp
export function serverTimestamp(): admin.firestore.FieldValue {
  return admin.firestore.FieldValue.serverTimestamp()
}

// Re-export admin for convenience
export { admin }
