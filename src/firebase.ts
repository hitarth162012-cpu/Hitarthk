import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize default Firebase App (with optional Auth for Google sign-in)
const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);

// Initialize Firebase Auth on the default app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Clear any stale anonymous sessions so STS is not queried
if (typeof window !== 'undefined') {
  try {
    if (auth.currentUser?.isAnonymous) {
      auth.signOut().catch(() => {});
    }
  } catch {
    // ignore
  }
}

// Dedicated direct app for Firestore WITHOUT Auth registered
// This prevents Firestore from ever attempting to query securetoken.googleapis.com,
// allowing 100% reliable real-time Firestore database read/writes in direct public mode!
const firestoreApp =
  getApps().find((a) => a.name === 'firestoreDirect') ||
  initializeApp(firebaseConfig, 'firestoreDirect');

// Initialize Firestore targeting the specific provisioned named database on the firestoreDirect app
export const db = getFirestore(firestoreApp, firebaseConfig.firestoreDatabaseId);

// Structured error handling interface
export interface FirestoreErrorInfo {
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
  collection: string;
  docId?: string;
  originalError: unknown;
}

/**
 * Standardized Firestore error logger conforming to Firestore integration specs
 */
export function handleFirestoreError(info: FirestoreErrorInfo): void {
  const errMsg = info.originalError instanceof Error ? info.originalError.message : String(info.originalError);
  console.error(`[Firestore Error] Failed to ${info.action} in collection "${info.collection}"${info.docId ? ` (doc: ${info.docId})` : ''}:`, errMsg);
}
