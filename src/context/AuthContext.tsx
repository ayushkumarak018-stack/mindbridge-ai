import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged, 
  signInAnonymously,
  doc, 
  getDoc, 
  setDoc,
  sanitizePayload,
  FirebaseUser 
} from '../firebase';
import { UserProfile, AppLanguage } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemoUser: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileSettings: (settings: Partial<UserProfile>) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Auth & restore guest session if applicable
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'settings');
          const snap = await getDoc(profileDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || (currentUser.isAnonymous ? 'MindBridge Guest' : 'Explorer'),
              photoURL: currentUser.photoURL,
              language: 'en',
              memoryEnabled: true,
              proactiveInsightsEnabled: true,
              notificationsEnabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(profileDocRef, sanitizePayload(initialProfile));
            } catch (writeErr) {
              console.warn('[Auth] Could not write initial profile to Firestore:', writeErr);
            }
            setProfile(initialProfile);
          }
        } catch (err: any) {
          console.warn('[Auth] Error fetching user profile from Firestore:', err);
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || (currentUser.isAnonymous ? 'MindBridge Guest' : 'Explorer'),
            photoURL: currentUser.photoURL,
            language: 'en',
            memoryEnabled: true,
            proactiveInsightsEnabled: true,
            notificationsEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        // Check if there is an active local guest session
        const isLocalGuest = typeof window !== 'undefined' && localStorage.getItem('mindbridge_guest_active') === 'true';
        if (isLocalGuest) {
          const guestUid = localStorage.getItem('mindbridge_guest_uid') || `guest_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('mindbridge_guest_uid', guestUid);
          const guestUser: any = {
            uid: guestUid,
            isAnonymous: true,
            displayName: 'MindBridge Guest',
            email: null,
            photoURL: null,
            getIdToken: async () => '',
          };
          setUser(guestUser);
          setProfile({
            uid: guestUid,
            email: null,
            displayName: 'MindBridge Guest',
            photoURL: null,
            language: 'en',
            memoryEnabled: true,
            proactiveInsightsEnabled: true,
            notificationsEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activateLocalGuestSession = () => {
    const guestUid = localStorage.getItem('mindbridge_guest_uid') || `guest_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mindbridge_guest_uid', guestUid);
      localStorage.setItem('mindbridge_guest_active', 'true');
    }
    const guestUser: any = {
      uid: guestUid,
      isAnonymous: true,
      displayName: 'MindBridge Guest',
      email: null,
      photoURL: null,
      getIdToken: async () => '',
    };
    setUser(guestUser);
    setProfile({
      uid: guestUid,
      email: null,
      displayName: 'MindBridge Guest',
      photoURL: null,
      language: 'en',
      memoryEnabled: true,
      proactiveInsightsEnabled: true,
      notificationsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mindbridge_guest_active');
      }
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('[Auth] Google sign in error:', err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError('Firebase Error: Admin restricted operation. Google Sign-In or User creation is disabled in Firebase Console -> Authentication -> Sign-in method.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Current domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemoUser = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.warn('[Auth] Anonymous sign in error:', err);
      // If Firebase anonymous sign-in is disabled in Firebase Console, gracefully fall back to local guest mode
      if (
        err.code === 'auth/admin-restricted-operation' ||
        err.code === 'auth/operation-not-allowed' ||
        err.message?.includes('admin-restricted-operation')
      ) {
        console.info('[Auth] Anonymous provider not enabled in Firebase Console. Activating local guest session...');
        activateLocalGuestSession();
        return;
      }
      setError(err.message || 'Instant guest sign-in failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mindbridge_guest_active');
        localStorage.removeItem('mindbridge_guest_uid');
      }
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error('[Auth] Sign out error:', err);
      setError(err.message);
    }
  };

  const updateProfileSettings = async (settings: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updated = {
        ...(profile || {}),
        ...settings,
        updatedAt: new Date().toISOString(),
      } as UserProfile;

      setProfile(updated);

      try {
        const profileDocRef = doc(db, 'users', user.uid, 'profile', 'settings');
        await setDoc(profileDocRef, sanitizePayload(updated), { merge: true });
      } catch (firestoreErr) {
        console.warn('[Auth] Could not persist profile to Firestore:', firestoreErr);
      }
    } catch (err: any) {
      console.error('[Auth] Error updating profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInAsDemoUser,
        signOut,
        updateProfileSettings,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
