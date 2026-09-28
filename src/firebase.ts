import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || (firebaseConfigJson as any).databaseURL,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DB_ID || (firebaseConfigJson as any).firestoreDatabaseId || 'default',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId === 'default' ? undefined : firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
  signInAnonymously,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot
};
export type { FirebaseUser };

/**
 * Utility to strip undefined properties recursively before writing to Firestore
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}
