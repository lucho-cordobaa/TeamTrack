import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let db: Firestore | null = null;
let isFirebaseConfigured = false;

if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('Dummy') &&
  firebaseConfig.apiKey !== 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX'
) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    isFirebaseConfigured = true;
    console.log('🔥 Firebase Firestore inicializado en cliente frontend.');
  } catch (err) {
    console.warn('No se pudo conectar con Firebase en el cliente. Usando sincronización en tiempo real vía backend:', err);
    isFirebaseConfigured = false;
  }
} else {
  console.info('ℹ️ Variables de Firebase no configuradas en frontend. Utilizando sincronización continua.');
}

export { db, isFirebaseConfigured, doc, onSnapshot };
