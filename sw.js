importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDokxFKjgXtLUHt4AHGe41K6wMKpsrA-cw",
  authDomain: "territorio-70c0c.firebaseapp.com",
  projectId: "territorio-70c0c",
  storageBucket: "territorio-70c0c.firebasestorage.app",
  messagingSenderId: "396161771960",
  appId: "1:396161771960:web:1cc07e5e1fff041d6f074d"
});

const messaging = firebase.messaging();

// Handler para mensagens recebidas quando o app está em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Mensagem recebida em segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || 'Nova Atualização';
  const notificationOptions = {
    body: payload.notification.body || 'Você tem uma nova notificação do sistema de territórios.',
    icon: 'map-icon.svg',
    badge: 'map-icon.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});