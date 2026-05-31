importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBW8lAeE58sh7-Nx7Q4RWSVUqPTl8RZ5LY",
  authDomain: "territorio-70c0c.firebaseapp.com",
  projectId: "territorio-70c0c",
  storageBucket: "territorio-70c0c.firebasestorage.app",
  messagingSenderId: "396161771960",
  appId: "1:396161771960:web:2f52708dd2548b3a6f074d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/map-icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
