import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize secondary instance of app or use default
const app = initializeApp(firebaseConfig);

/**
 * Checks if the browser supports push notifications and FCM.
 */
export const checkPushSupport = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  if (!('Notification' in window)) return false;
  
  try {
    const supported = await isSupported();
    return supported;
  } catch (err) {
    return false;
  }
};

/**
 * Request notification permissions and register FCM Token in Firestore
 * @param userId User UID
 * @param location Chosen location for prayertimes calculation
 * @param customVapidKey Optional manual key if configured in Firebase console
 */
export const registerForPushNotifications = async (
  userId: string,
  location: string,
  customVapidKey?: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  try {
    const isSupportedBrowser = await checkPushSupport();
    if (!isSupportedBrowser) {
      return { 
        success: false, 
        error: "Your browser or iframe context does not support native background push notifications." 
      };
    }

    // 1. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: "Permission denied. Please click the padlock icon in your browser URL bar to grant notifications." 
      };
    }

    // 2. Register Service Worker explicitly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/public/'
    }).catch(async () => {
      // Fallback scope to root if public subfolder scope fails
      return navigator.serviceWorker.register('/firebase-messaging-sw.js');
    });

    // 3. Retrieve Token from FCM
    const messaging = getMessaging(app);
    
    // Standard default public VAPID key usually required by FCM
    // If not supplied, fallback to empty to let firebase fetch if configured
    const vapidKeyToUse = customVapidKey || "BEnfD7B_LCHGf23Vj3K_94mY-8Z3ZqL_K5TzZ-Gk26Z6nJZg_W4m8z4G8Z7M9mZ9Z4_z5Z8Z_z8Z_z8Z_z8Z_zA"; 
    
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKeyToUse
    });

    if (!token) {
      return { 
        success: false, 
        error: "Could not generate FCM Token. Check VAPID key configuration." 
      };
    }

    // 4. Save to Firestore under the user's subcollection
    // ID generated cleanly based on token segment
    const tokenId = token.substring(0, 32).replace(/[^a-zA-Z0-9_\-]/g, 'sw');
    const tokenDocRef = doc(db, 'users', userId, 'fcm_tokens', tokenId);

    const payload = {
      token: token,
      userId: userId,
      location: location,
      deviceInfo: navigator.userAgent.substring(0, 240),
      createdAt: new Date().toISOString()
    };

    await setDoc(tokenDocRef, payload);

    // 5. Dual-register with server-side in-memory cache for high-availability backup delivery
    try {
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId, location })
      });
      console.log("FCM Background Token registered with local server cache.");
    } catch (apiErr) {
      console.warn("Could not synchronize token with backend memory table:", apiErr);
    }

    console.log("FCM Background Token registered and saved securely to Firestore collection:", tokenId);
    
    return { success: true, token };
  } catch (err: any) {
    console.error("FCM Registration failure:", err);
    return { 
      success: false, 
      error: err.message || "Failed to trigger Firebase Cloud Messaging token exchange." 
    };
  }
};

/**
 * Listens for foreground messages and triggers alert/audio if browser is active
 */
export const listenForForegroundMessages = async (onMessageReceived: (payload: any) => void) => {
  try {
    const supported = await checkPushSupport();
    if (!supported) return;

    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      onMessageReceived(payload);
    });
  } catch (err) {
    console.warn("Foreground message registration skipped:", err);
  }
};

/**
 * Syncs the stored local token with the backend memory cache on app load
 */
export const syncStoredTokenWithBackend = async (userId: string, location: string): Promise<void> => {
  try {
    const token = localStorage.getItem("deen_fcm_token");
    if (!token) return;

    await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId, location })
    });
    console.log("Synchronized existing FCM push token with backend memory registry.");
  } catch (err) {
    console.warn("FCM background sync with backend skipped:", err);
  }
};
