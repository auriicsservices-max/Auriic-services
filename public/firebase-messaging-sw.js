importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  // We need to fetch this or hardcode it
   // Actually, this sw runs in a separate context, it needs the config.
   // Vite public assets handling
};

// firebase.initializeApp(firebaseConfig);
// const messaging = firebase.messaging();
// 
// messaging.onBackgroundMessage((payload) => {
//   console.log('[firebase-messaging-sw.js] Received background message ', payload);
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: '/icon.png'
//   };
//
//   self.registration.showNotification(notificationTitle, notificationOptions);
// });
