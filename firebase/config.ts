import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Volta a usar o banco de dados (default) onde estão os dados originais
export const storage = getStorage(app);

// Messaging só funciona em ambientes que suportam Service Workers e Push
export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};