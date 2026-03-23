import dotenv from 'dotenv';
dotenv.config();
console.log("FIREBASE_SERVICE_ACCOUNT:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
console.log("VITE_VAPID_KEY:", !!process.env.VITE_VAPID_KEY);
console.log("VITE_VAPID_KEY value:", process.env.VITE_VAPID_KEY);
