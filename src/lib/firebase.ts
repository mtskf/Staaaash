import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { Group } from '@/types';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Google OAuth Client ID for Web application
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL || '';

// Initialize Firebase (Auth only, no Realtime DB SDK)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Sign in with Google using launchWebAuthFlow
 */
export async function signInWithGoogle(): Promise<User> {
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', 'openid email profile');

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
          return;
        }

        try {
          const url = new URL(responseUrl);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');

          if (!accessToken) {
            reject(new Error('No access token in response'));
            return;
          }

          const credential = GoogleAuthProvider.credential(null, accessToken);
          const result = await signInWithCredential(auth, credential);
          resolve(result.user);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
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
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get user's ID token for REST API calls
 */
async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Get user's groups from Firebase using REST API
 */
export async function getGroupsFromFirebase(userId: string): Promise<Group[]> {
  const token = await getIdToken();
  if (!token) return [];

  try {
    const response = await fetch(
      `${DATABASE_URL}/users/${userId}/groups.json?auth=${token}`
    );

    if (!response.ok) {
      console.error('Failed to fetch groups:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data) return [];

    // Ensure all groups have items array (Firebase drops empty arrays) and return
    return Object.values(data).map((group) => {
      const g = group as Group;
      return {
        ...g,
        items: g.items || []
      };
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

/**
 * Save groups to Firebase using REST API
 */
export async function saveGroupsToFirebase(userId: string, groups: Group[]): Promise<void> {
  const token = await getIdToken();
  if (!token) return;

  // Convert array to object with group IDs as keys
  const groupsObject: Record<string, Group> = {};
  groups.forEach(group => {
    groupsObject[group.id] = group;
  });

  const response = await fetch(
    `${DATABASE_URL}/users/${userId}/groups.json?auth=${token}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupsObject)
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to save groups: ${response.status}`);
  }
}

/**
 * Subscribe to groups changes using polling (REST API)
 * Returns unsubscribe function
 */
export function subscribeToGroups(
  userId: string,
  callback: (groups: Group[]) => void,
  intervalMs: number = 5000
): () => void {
  let isActive = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const poll = async () => {
    if (!isActive) return;

    try {
      const groups = await getGroupsFromFirebase(userId);
      if (isActive) {
        callback(groups);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }

    if (isActive) {
      timeoutId = setTimeout(poll, intervalMs);
    }
  };

  // Start polling
  poll();

  // Return unsubscribe function
  return () => {
    isActive = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

export { auth };
export type { User };
