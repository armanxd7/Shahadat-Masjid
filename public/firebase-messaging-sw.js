importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjVEoTx4jVt-dvkVVejEmi7z-bZTtU0mQ",
  authDomain: "methodical-girder-p07pf.firebaseapp.com",
  projectId: "methodical-girder-p07pf",
  storageBucket: "methodical-girder-p07pf.firebasestorage.app",
  messagingSenderId: "821191760171",
  appId: "1:821191760171:web:efdda307345fafd8064d6e"
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const title = payload.notification?.title || payload.data?.title || 'Salah Notification';
  const body = payload.notification?.body || payload.data?.body || 'It is time for prayer.';
  const icon = payload.notification?.icon || payload.data?.icon || 'https://prod-aida-usercontent-singapore.s3.ap-southeast-1.amazonaws.com/user_attachments/8c3be992-628f-4acc-bda1-7fc3c1265bca/original_image.png';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: icon,
    data: payload.data || {},
    tag: payload.data?.tag || 'prayer-time-alert',
    renotify: true
  };

  self.registration.showNotification(title, notificationOptions);
});
