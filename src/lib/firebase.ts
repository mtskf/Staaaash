import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getDatabase, ref, set, get, onValue, type Unsubscribe } from 'firebase/database';
import type { Group } from '@/types';

// Firebase configuration
// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

/**
 * Sign in with Google using Chrome Identity API
 * This provides a seamless auth experience in Chrome extensions
 */
export async function signInWithGoogle(): Promise<User> {
  return new Promise((resolve, reject) => {
    // Use chrome.identity for Chrome extension OAuth
    chrome.identity.getAuthToken({ interactive: true }, async (result) => {
      const tokenString = result?.token;
      if (chrome.runtime.lastError || !tokenString) {
        reject(new Error(chrome.runtime.lastError?.message || 'Failed to get auth token'));
        return;
      }

      try {
        // Create credential from the token
        const credential = GoogleAuthProvider.credential(null, tokenString);
        const authResult = await signInWithCredential(auth, credential);
        resolve(authResult.user);
      } catch (error) {
        // If the token is invalid, remove it and try again
        chrome.identity.removeCachedAuthToken({ token: tokenString }, () => {
          reject(error);
        });
      }
    });
  });
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  // Revoke the Chrome identity token
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, async (result) => {
      const tokenString = result?.token;
      if (tokenString) {
        // Remove cached token
        chrome.identity.removeCachedAuthToken({ token: tokenString }, async () => {
          try {
            // Revoke token on Google's servers
            await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${tokenString}`);
          } catch {
            // Ignore revocation errors
          }
        });
      }

      try {
        await firebaseSignOut(auth);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get user's groups from Firebase
 */
export async function getGroupsFromFirebase(userId: string): Promise<Group[]> {
  const groupsRef = ref(database, `users/${userId}/groups`);
  const snapshot = await get(groupsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  // Convert object to array
  return Object.values(data) as Group[];
}

/**
 * Save groups to Firebase
 */
export async function saveGroupsToFirebase(userId: string, groups: Group[]): Promise<void> {
  const groupsRef = ref(database, `users/${userId}/groups`);

  // Convert array to object with group IDs as keys for efficient updates
  const groupsObject: Record<string, Group> = {};
  groups.forEach(group => {
    groupsObject[group.id] = group;
  });

  await set(groupsRef, groupsObject);
}

/**
 * Subscribe to real-time updates for user's groups
 */
export function subscribeToGroups(
  userId: string,
  callback: (groups: Group[]) => void
): Unsubscribe {
  const groupsRef = ref(database, `users/${userId}/groups`);

  return onValue(groupsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const groups = Object.values(data) as Group[];
    callback(groups);
  });
}

export { auth, database };
export type { User };
