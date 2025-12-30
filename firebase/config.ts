import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDokxFKjgXtLUHt4AHGe41K6wMKpsrA-cw",
  authDomain: "territorio-70c0c.firebaseapp.com",
  projectId: "territorio-70c0c",
  storageBucket: "territorio-70c0c.firebasestorage.app",
  messagingSenderId: "396161771960",
  appId: "1:396161771960:web:1cc07e5e1fff041d6f074d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Messaging só funciona em ambientes que suportam Service Workers e Push
export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};