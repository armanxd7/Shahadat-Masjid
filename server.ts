import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

dotenv.config();

// Global trackers for sent push alerts to prevent duplicated FCM messages in the same minute
const globalSentMinutes = new Set<string>();

// In-memory active FCM token subscription registry for high-availability backup messaging
interface InMemorySub {
  token: string;
  userId: string;
  location: string;
  createdAt: string;
}
const registeredTokensMap = new Map<string, InMemorySub>();

const OVERRIDES_FILE = path.join(process.cwd(), "admin_overrides.json");

interface AdminOverrides {
  admins?: string[];
  notices?: Array<{
    id: string;
    text: string;
    createdAt: string;
    author: string;
    priority: "normal" | "urgent";
    active: boolean;
  }>;
  announcement: {
    text: string;
    active: boolean;
    type: string;
  };
  prayerTimes: Record<string, {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    distance?: string;
    angle?: string;
    compassRotation?: number;
  }>;
  customWisdoms: Array<{
    quote: string;
    source: string;
    category: string;
    explanation: string;
  }>;
  customDuas: Array<{
    id: string;
    title: string;
    arabic: string;
    translation: string;
    urduTranslation?: string;
    category: string;
    phonetic?: string;
  }>;
  donation?: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    branchName?: string;
    routingNumber?: string;
    bankQrUrl?: string;
    esewaQrUrl?: string;
    fonepayQrUrl?: string;
    upiQrUrl?: string;
    upiId?: string;
    esewaId?: string;
    instructions?: string;
    intlInstructions?: string;
    contactPhone?: string;
  };
}

const DEFAULT_OVERRIDES: AdminOverrides = {
  admins: ["armanorig7@gmail.com"],
  notices: [
    {
      id: "notice_default",
      text: "✨ Assalamu Alaikum! Welcome to our local gaun ko Masjid Notice Board. Admin can send real-time Islamic reminders, notifications, and emergency alerts directly here.",
      createdAt: new Date().toISOString(),
      author: "Shahadat Masjid Committee",
      priority: "normal",
      active: true
    }
  ],
  announcement: {
    text: "✨ Welcome to Shahadat Masjid! Keep tracking your spiritual habits.",
    active: true,
    type: "info"
  },
  prayerTimes: {},
  customWisdoms: [],
  customDuas: [],
  donation: {
    bankName: "Global IME Bank Limited",
    accountHolder: "Shahadat Masjid Committee",
    accountNumber: "0102030405060708",
    branchName: "Kathmandu Branch",
    routingNumber: "",
    bankQrUrl: "",
    esewaQrUrl: "",
    fonepayQrUrl: "",
    upiQrUrl: "",
    upiId: "shahadatmasjid@sbi",
    esewaId: "+977-9844444444",
    instructions: "remarks core 'Masjid Donation' use gari dinu hola.",
    intlInstructions: "Indian and international donors can use the Indian UPI QR or UPI ID, or NEFT/IMPS bank transfer.",
    contactPhone: "+977-9841123456"
  }
};

// Load firebase config dynamically at module scope to share across helpers
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.error("Error loading firebase-applet-config.json:", err);
}

// Memory caching for admin settings to prevent infinite DB queries
let cachedOverrides: AdminOverrides | null = null;

function getFirestoreDb() {
  try {
    if (getApps().length > 0) {
      return firebaseConfig.firestoreDatabaseId 
        ? getFirestore(getApp(), firebaseConfig.firestoreDatabaseId)
        : getFirestore();
    }
  } catch (err) {
    console.error("Error obtaining Firestore DB:", err);
  }
  return null;
}

async function fetchOverridesFromFirestore(): Promise<AdminOverrides> {
  if (cachedOverrides) {
    return cachedOverrides;
  }
  try {
    const db = getFirestoreDb();
    if (db) {
      const docRef = db.collection("settings").doc("overrides");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data() as AdminOverrides;
        cachedOverrides = data;
        return data;
      }
    }
  } catch (err) {
    console.warn("Could not read overrides from Firestore (using local fallback if available):", err instanceof Error ? err.message : String(err));
  }

  // Fallback to local files
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      const content = fs.readFileSync(OVERRIDES_FILE, "utf-8");
      const data = JSON.parse(content);
      cachedOverrides = data;
      return data;
    }
  } catch (err) {
    console.error("Error reading fallback overrides file:", err);
  }

  cachedOverrides = DEFAULT_OVERRIDES;
  return DEFAULT_OVERRIDES;
}

function getOverrides(): AdminOverrides {
  if (cachedOverrides) {
    return cachedOverrides;
  }
  // Synchronous local file fallback
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      const content = fs.readFileSync(OVERRIDES_FILE, "utf-8");
      const data = JSON.parse(content);
      cachedOverrides = data;
      return data;
    }
  } catch (err) {
    // Suppress
  }
  return DEFAULT_OVERRIDES;
}

async function saveOverrides(data: AdminOverrides) {
  cachedOverrides = data;
  try {
    // Write local cash file
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing overrides file:", err);
  }

  try {
    const db = getFirestoreDb();
    if (db) {
      await db.collection("settings").doc("overrides").set(data);
    }
  } catch (err) {
    console.warn("Could not save overrides to Firestore (saved locally):", err instanceof Error ? err.message : String(err));
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Load firebase config dynamically to acquire the custom databaseId and projectId
  let firebaseConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading firebase-applet-config.json inside server.ts:", err);
  }

  // Safe Firebase Admin SDK Initialization
  try {
    if (getApps().length === 0) {
      initializeApp({
        projectId: firebaseConfig.projectId || "methodical-girder-p07pf"
      });
      console.log("Firebase Admin SDK initialized successfully.");
    }
  } catch (adminErr) {
    console.warn("Could not load default Firebase credentials. Background push alerts will run in simulation mode.", adminErr);
  }

  // Define static locations and helpers for server-side prayer estimation
  const SERVER_LOCATION_DATA: Record<string, { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }> = {
    "Cape Town, South Africa": { fajr: "04:36 AM", dhuhr: "12:58 PM", asr: "04:38 PM", maghrib: "06:45 PM", isha: "08:05 PM" },
    "Mecca, Saudi Arabia": { fajr: "04:52 AM", dhuhr: "12:22 PM", asr: "03:41 PM", maghrib: "07:05 PM", isha: "08:35 PM" },
    "Medina, Saudi Arabia": { fajr: "04:48 AM", dhuhr: "12:24 PM", asr: "03:48 PM", maghrib: "07:08 PM", isha: "08:38 PM" },
    "London, United Kingdom": { fajr: "03:12 AM", dhuhr: "01:05 PM", asr: "05:22 PM", maghrib: "09:10 PM", isha: "10:45 PM" },
    "Cairo, Egypt": { fajr: "04:02 AM", dhuhr: "11:58 AM", asr: "03:32 PM", maghrib: "06:56 PM", isha: "08:24 PM" },
    "New York, United States": { fajr: "04:15 AM", dhuhr: "12:55 PM", asr: "04:50 PM", maghrib: "08:12 PM", isha: "09:48 PM" },
    "Kathmandu, Nepal": { fajr: "04:02 AM", dhuhr: "12:10 PM", asr: "03:35 PM", maghrib: "06:52 PM", isha: "08:18 PM" },
    "New Delhi, India": { fajr: "04:12 AM", dhuhr: "12:21 PM", asr: "03:48 PM", maghrib: "07:08 PM", isha: "08:34 PM" }
  };

  function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr || timeStr.includes("--") || timeStr === "--:--") return 0;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes("PM");
    const isAM = clean.includes("AM");
    const timeOnly = clean.replace("AM", "").replace("PM", "").trim();
    const parts = timeOnly.split(":");
    if (parts.length < 2) return 0;
    let hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (isNaN(hrs) || isNaN(mins)) return 0;
    if (isPM && hrs < 12) hrs += 12;
    if (isAM && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  }

  // Background polling thread check for prayer times across registered tokens
  setInterval(async () => {
    try {
      if (getApps().length === 0) return;

      const now = new Date();
      // Calculate local hours and minutes
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const currentMinutes = hrs * 60 + mins;

      const overrides = getOverrides();
      const adminTimes = overrides.prayerTimes || {};

      // Resolve active tokens list via Firestore or in-memory backup fallback
      let activeTokens: Array<{ token: string; location: string; userId: string }> = [];

      try {
        const dbAdmin = firebaseConfig.firestoreDatabaseId 
          ? getFirestore(getApp(), firebaseConfig.firestoreDatabaseId)
          : getFirestore();
        // Using collectionGroup to gather any active FCM security tokens registered in the database
        const tokensSnapshot = await dbAdmin.collectionGroup("fcm_tokens").get();
        if (!tokensSnapshot.empty) {
          for (const docSnapshot of tokensSnapshot.docs) {
            const data = docSnapshot.data();
            if (data.token && data.userId) {
              activeTokens.push({
                token: data.token,
                location: data.location || "Cape Town, South Africa",
                userId: data.userId
              });
            }
          }
        }
      } catch (dbErr: any) {
        const errStr = dbErr.message || String(dbErr);
        if (errStr.includes("PERMISSION_DENIED") || errStr.includes("NOT_FOUND") || errStr.includes("insufficient permissions")) {
          // Normal sandbox permission boundary, print a short high-level status instead of system crash traces
          if (registeredTokensMap.size > 0 && Math.random() < 0.1) {
            console.log(`[FCM Poller] Using isolated sandbox memory fallback. Active subscribers: ${registeredTokensMap.size}`);
          }
        } else {
          console.warn("[FCM Poller] Firestore recovery warning:", errStr);
        }

        // Populate from our persistent memory registry
        for (const sub of registeredTokensMap.values()) {
          activeTokens.push({
            token: sub.token,
            location: sub.location,
            userId: sub.userId
          });
        }
      }

      if (activeTokens.length === 0) return;

      const minuteKey = `${hrs}:${mins}`;

      for (const item of activeTokens) {
        const token = item.token;
        const location = item.location || "Cape Town, South Africa";
        const userId = item.userId;

        if (!token) continue;

        // Resolve prayer configurations
        const pTimes = adminTimes[location] || SERVER_LOCATION_DATA[location] || SERVER_LOCATION_DATA["Cape Town, South Africa"];
        if (!pTimes) continue;

        const prayers = [
          { key: "fajr", label: "Fajr", time: pTimes.fajr },
          { key: "dhuhr", label: "Dhuhr", time: pTimes.dhuhr },
          { key: "asr", label: "Asr", time: pTimes.asr },
          { key: "maghrib", label: "Maghrib", time: pTimes.maghrib },
          { key: "isha", label: "Isha", time: pTimes.isha }
        ];

        for (const p of prayers) {
          if (!p.time || p.time.includes("--")) continue;
          const prayerMinutes = parseTimeToMinutes(p.time);

          // If current local time matches prayer activation minute
          if (currentMinutes === prayerMinutes) {
            const sentKey = `sent_${userId}_${p.key}_${minuteKey}`;

            if (!globalSentMinutes.has(sentKey)) {
              globalSentMinutes.add(sentKey);

              // Limit size of tracker to prevent resource bloat
              if (globalSentMinutes.size > 5000) {
                globalSentMinutes.clear();
              }

              console.log(`[FCM] Sending Background Prayer notification payload: ${p.label} at location ${location}`);

              const messagePayload = {
                token: token,
                notification: {
                  title: `${p.label} Prayer Alert 🕌`,
                  body: `Assalamu Alaikum! It is now time for ${p.label} prayer in ${location.split(",")[0]}.`
                },
                data: {
                  title: `${p.label} Prayer Alert`,
                  body: `Assalamu Alaikum! It is now time for ${p.label} prayer in ${location.split(",")[0]}.`,
                  tag: `prayer-alert-${p.key}`,
                  location: location,
                  prayerKey: p.key
                }
              };

              await getMessaging().send(messagePayload).catch(err => {
                console.warn(`[FCM] Failed to deliver background message for token of user ${userId}:`, err.message);
              });
            }
          }
        }
      }
    } catch (pollingErr) {
      console.error("[FCM] Error in background polling thread:", pollingErr);
    }
  }, 45000); // Check every 45 seconds

  // Register token for background alerts in server-side memory for high-availability backup
  app.post("/api/push/register", (req, res) => {
    try {
      const { token, userId, location } = req.body;
      if (!token || !userId) {
        return res.status(400).json({ error: "token and userId are required." });
      }

      registeredTokensMap.set(token, {
        token,
        userId,
        location: location || "Cape Town, South Africa",
        createdAt: new Date().toISOString()
      });

      console.log(`[FCM Memory Register] Registered/updated token for user ${userId}, location: ${location}`);
      res.json({ success: true, count: registeredTokensMap.size });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Instant test-firing route for verifying background push messaging integration
  app.post("/api/push/test", async (req, res) => {
    try {
      const { token, title, body, location, prayerLabel } = req.body;
      if (!token) {
        return res.status(400).json({ error: "FCM token is required to test-fire notification." });
      }

      if (getApps().length === 0) {
        return res.status(503).json({ error: "Firebase Admin is not configured. Messaging capability is disabled." });
      }

      const payload = {
        token: token,
        notification: {
          title: title || `${prayerLabel || 'Test'} Alert 🕌`,
          body: body || `This is a high-availability background push notification test representing ${prayerLabel || 'Adhan'} at ${location || 'Shahadat Masjid'}.`
        },
        data: {
          title: title || `${prayerLabel || 'Test'} Alert`,
          body: body || `This is a high-availability background push notification test representing ${prayerLabel || 'Adhan'} at ${location || 'Shahadat Masjid'}.`,
          tag: "test-prayer-push-alarm"
        }
      };

      console.log(`[FCM API] Dispatching live payload to token: ${token}`);
      const resultId = await getMessaging().send(payload);

      res.json({ 
        success: true, 
        message: "Notification successfully dispatched to FCM gateway!",
        messageId: resultId 
      });
    } catch (err: any) {
      console.error("[FCM API Error] Service failed:", err);
      res.status(500).json({ 
        error: err.message || "Failed to deliver message payload",
        details: err.code || "FCM_DELIVERY_FAILURE"
      });
    }
  });

  // Initialize Gemini client lazily/safely
  let ai: GoogleGenAI | null = null;
  const getGeminiClient = (): GoogleGenAI => {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined. Please add it to Settings -> Secrets.");
      }
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  };

  // API router for AI Deen Chatbot
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const client = getGeminiClient();

      const sysInstruction = `You are "AI Deen", a highly knowledgeable, compassionate, and wise Islamic AI Scholar & Advisor integrated inside the "Shahadat Masjid" app.
Your objective is to provide accurate, authentic, respectful, and well-contextualized answers about Deen (Islam), referencing the Quran, Sunnah, Hadith, and scholarly rulings.
Instructions:
1. When quoting Quranic verses, please provide the references (Surah:Ayah, e.g., Surah Al-Baqarah 2:183) and translations.
2. When mentioning Hadiths, reference authentic collections like Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, etc.
3. Support the user gently with educational guidance. Speak clearly and with wisdom.
4. If a user asks questions completely unrelated to Islam or moral guidance (e.g., programming questions, general entertainment, or politics), politely decline and tell them that as "AI Deen", you are specialized in answering spiritual, moral, and Islamic questions to guide people in their Deen.
5. Provide response answers formatted nicely with Markdown, headers, paragraphs, lists, and bold words for beautiful legibility.`;

      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const item of history) {
          contents.push({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.content }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      let response;
      let errorToThrow = null;
      const modelsToTry = [
        "gemini-2.5-flash", 
        "gemini-2.5-pro"
      ];

      for (const modelName of modelsToTry) {
        let attempts = 2; // Failover faster to fallback models when under load
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            console.log(`Calling ${modelName} (Attempt ${attempt}/${attempts})...`);
            response = await client.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                systemInstruction: sysInstruction,
              }
            });
            break; // Succeeded! Break the retry loop
          } catch (err: any) {
            console.error(`Attempt ${attempt} of ${modelName} failed:`, err);
            errorToThrow = err;

            // Check if error is retryable (like transient 503 SERVICE_UNAVAILABLE or 429 RESOURCE_EXHAUSTED)
            const isTransient =
              err?.status === 503 ||
              err?.status === 429 ||
              err?.message?.includes("503") ||
              err?.message?.includes("429") ||
              err?.message?.includes("UNAVAILABLE") ||
              err?.message?.includes("RESOURCE_EXHAUSTED") ||
              err?.message?.includes("busy") ||
              err?.message?.includes("high demand");

            if (isTransient && attempt < attempts) {
              const delay = 400 * attempt;
              console.log(`Transient error encountered. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break; // Not a transient error, or max attempts reached. Try fallback model.
            }
          }
        }
        if (response) {
          break; // Successfully got response from this model, stop trying other models
        }
      }

      if (!response) {
        throw errorToThrow || new Error("All attempts and fallback models exhausted.");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Curated database of Islamic wisdom quotes used for daily seeding and offline fallback
  const CURATED_WISDOMS = [
    {
      quote: "The best of deeds are those done consistently, even if they are small.",
      source: "Prophet Muhammad (ﷺ) [Sahih al-Bukhari]",
      category: "Hadith",
      explanation: "True faith is built upon small, sincere, daily acts of devotion and love rather than rare, sporadic actions."
    },
    {
      quote: "Do not lose hope, nor be sad, for you will surely be victorious if you are true believers.",
      source: "Quran 3:139",
      category: "Quran",
      explanation: "A comforting divine reassurance that under all distress or confusion, faith is our primary shield and beacon of ultimate success."
    },
    {
      quote: "Indeed, in the remembrance of Allah do hearts find rest.",
      source: "Quran 13:28",
      category: "Quran",
      explanation: "No material possession or comfort can satisfy the spiritual void of the heart except sweet connection with the Divine."
    },
    {
      quote: "If you are grateful, I will surely increase you in favor.",
      source: "Quran 14:7",
      category: "Quran",
      explanation: "Gratitude (Shukr) is a powerful catalyst; expressing thankfulness serves as an open invitation for further spiritual blessings."
    },
    {
      quote: "Speak a good word, or remain silent.",
      source: "Prophet Muhammad (ﷺ) [Sahih al-Bukhari]",
      category: "Hadith",
      explanation: "This Hadith sets a high ethical standard. Protecting others from our words and maintaining peaceful speech is an act of faith."
    },
    {
      quote: "Had Allah uncovered the veil for His servant to see how He governs his affairs, the servant's heart would melt out of love.",
      source: "Ibn al-Qayyim [Al-Fawa'id]",
      category: "Scholar",
      explanation: "Divine wisdom often operates in subtle, invisible ways. Perfect trust in Allah (Tawakkul) brings peace and clarity to any situation."
    },
    {
      quote: "The heart is like a vessel: if it is not filled with truth and love, it will be filled with false desires.",
      source: "Hasan al-Basri [Al-Zuhd]",
      category: "Scholar",
      explanation: "A reminder to active-nurture our thoughts and daily routines with noble principles so distraction can find no room to enter."
    },
    {
      quote: "Indeed, patience is only at the first stroke of a sudden calamity.",
      source: "Prophet Muhammad (ﷺ) [Sahih al-Bukhari]",
      category: "Hadith",
      explanation: "True patience (Sabr) is demonstrating calm resilience and trust in Allah at the very instant a trial presents itself."
    },
    {
      quote: "What has he found who has lost Allah? And what has he lost who has found Allah?",
      source: "Ibn Ata'illah al-Iskandari [Al-Hikam]",
      category: "Scholar",
      explanation: "An evocative contemplation of faith. To know God is to possess everything of eternal value, regardless of earthly status."
    },
    {
      quote: "Allah does not look at your appearances or your wealth, but He looks at your hearts and your actions.",
      source: "Prophet Muhammad (ﷺ) [Sahih Muslim]",
      category: "Hadith",
      explanation: "We are evaluated by the sincerity of our intentions and the goodness of our character rather than superficial elements."
    },
    {
      quote: "My mercy encompasses all things.",
      source: "Quran 7:156",
      category: "Quran",
      explanation: "An absolute guarantee of divine compassion, reassuring us that no matter our mistakes, His door of mercy is always open."
    },
    {
      quote: "He who takes a path in search of knowledge, Allah will make easy for him the path to Paradise.",
      source: "Prophet Muhammad (ﷺ) [Sahih Muslim]",
      category: "Hadith",
      explanation: "Seeking both spiritual and beneficial worldly knowledge is a holy journey that refines the soul and elevates one's status."
    },
    {
      quote: "Let your tongue remain wet with the remembrance of Allah.",
      source: "Prophet Muhammad (ﷺ) [Sunan At-Tirmidhi]",
      category: "Hadith",
      explanation: "The constant soft whisper of Dhikr cleanses the mind, keeping us grounded, calm, and connected throughout the busy day."
    },
    {
      quote: "The ultimate peak of character is to do good to those who have mistreated you.",
      source: "Imam Al-Ghazali [Ihya Ulum al-Din]",
      category: "Scholar",
      explanation: "Overcoming personal grudge to deliver kindness to those who offended us is a supreme test and manifestation of spiritual refinement."
    }
  ];

  // Daily Wisdom API Endpoint
  app.get("/api/wisdom", async (req, res) => {
    try {
      const forceAi = req.query.force_ai === "true";
      const overrides = await fetchOverridesFromFirestore();
      
      let pool = [...CURATED_WISDOMS];
      if (overrides.customWisdoms && overrides.customWisdoms.length > 0) {
        pool = [...overrides.customWisdoms, ...CURATED_WISDOMS];
      }
      
      // Calculate daily index based on day of year
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      
      const defaultWisdom = pool[dayOfYear % pool.length];

      if (forceAi) {
        let response = null;
        let lastError = null;
        const modelsToTry = [
          "gemini-2.5-flash",
          "gemini-2.5-pro"
        ];

        for (const modelName of modelsToTry) {
          let attempts = 2; // Retry once on transient errors
          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              const client = getGeminiClient();
              const p = `Generate a highly authentic and deeply inspiring Islamic daily wisdom quote from the Quran, Hadith, or a classic scholar (e.g. Ibn al-Qayyim, Hasan al-Basri, Imam Al-Ghazali, Rumi). Return a JSON object with this exact schema (containing ONLY the valid JSON, no markdown boxes):
              {
                "quote": "The quote text inside...",
                "source": "Reference (e.g. Sahih al-Bukhari, Quran 4:29, or scholar name)",
                "category": "Quran" or "Hadith" or "Scholar",
                "explanation": "A beautiful, modern, 1-2 sentence explanation of how to practice this wisdom today."
              }`;

              console.log(`[Wisdom API] Querying model ${modelName} (Attempt ${attempt}/${attempts})...`);
              const result = await client.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: p }] }],
                config: {
                  responseMimeType: "application/json"
                }
              });

              if (result && result.text) {
                const parsed = JSON.parse(result.text.trim());
                if (parsed.quote && parsed.source) {
                  response = parsed;
                  break; // Succeeded! Break the retry loop
                }
              }
            } catch (err: any) {
              console.warn(`[Wisdom API] Attempt ${attempt} of ${modelName} failed:`, err?.message || err);
              lastError = err;

              // Retry on typical transient errors
              const isTransient =
                err?.status === 503 ||
                err?.status === 429 ||
                err?.message?.includes("503") ||
                err?.message?.includes("429") ||
                err?.message?.includes("UNAVAILABLE") ||
                err?.message?.includes("RESOURCE_EXHAUSTED") ||
                err?.message?.includes("busy") ||
                err?.message?.includes("high demand");

              if (isTransient && attempt < attempts) {
                const delay = 300 * attempt;
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                break; // Try next model or fallback
              }
            }
          }
          if (response) {
            return res.json(response);
          }
        }
        
        if (lastError) {
          console.warn("[Wisdom API] All Gemini models exhausted for daily wisdom, playing fallback seed:", lastError?.message || lastError);
        }
      }

      // Return the elegant seeded quote for today
      return res.json(defaultWisdom);
    } catch (err: any) {
      console.error("Error in /api/wisdom:", err);
      // Fail-proof fallback
      return res.json({
        quote: "And speak to people good words.",
        source: "Quran 2:83",
        category: "Quran",
        explanation: "Prophetic etiquette emphasizing kindness, patience, and gentle phrasing in conversations."
      });
    }
  });

  // Public global app overrides configuration
  app.get("/api/public/config", async (req, res) => {
    try {
      const config = await fetchOverridesFromFirestore();
      res.json({
        announcement: config.announcement,
        prayerTimes: config.prayerTimes,
        customDuas: config.customDuas,
        admins: config.admins || ["armanorig7@gmail.com"],
        notices: config.notices || [],
        donation: config.donation || DEFAULT_OVERRIDES.donation
      });
    } catch (err: any) {
      console.error("Error fetching public config:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin settings management endpoints
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const email = req.query.email as string;
      const config = await fetchOverridesFromFirestore();
      const isSuperAdmin = email === "armanorig7@gmail.com";
      const isExtraAdmin = config.admins && config.admins.includes(email);
      
      if (!email || (!isSuperAdmin && !isExtraAdmin)) {
        return res.status(403).json({ error: "Access Denied: unauthorized user email profile." });
      }
      res.json(config);
    } catch (err: any) {
      console.error("Error in GET /api/admin/settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      const { email, overrides } = req.body;
      const config = await fetchOverridesFromFirestore();
      const isSuperAdmin = email === "armanorig7@gmail.com";
      const isExtraAdmin = config.admins && config.admins.includes(email);

      if (!email || (!isSuperAdmin && !isExtraAdmin)) {
        return res.status(403).json({ error: "Access Denied: unauthorized action." });
      }
      if (!overrides) {
        return res.status(400).json({ error: "Missing 'overrides' payload." });
      }

      // Safeguard: Ensure armanorig7@gmail.com is ALWAYS a super administrator
      let nextAdmins = overrides.admins || ["armanorig7@gmail.com"];
      if (!nextAdmins.includes("armanorig7@gmail.com")) {
        nextAdmins.push("armanorig7@gmail.com");
      }
      
      // Safeguard: Only the super administrator (armanorig7@gmail.com) can modify the admin roster.
      // If a secondary admin attempts to save settings, override with the existing configured administrators list.
      if (!isSuperAdmin) {
        overrides.admins = config.admins || ["armanorig7@gmail.com"];
      } else {
        overrides.admins = nextAdmins;
      }

      await saveOverrides(overrides);
      res.json({ success: true, message: "Settings saved successfully ✦", overrides });
    } catch (err: any) {
      console.error("Error in POST /api/admin/settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Safe server-side TTS proxy to bypass iframe CORS and Referrer policy blocks
  app.get("/api/tts", async (req, res) => {
    try {
      const q = req.query.q as string;
      const tl = (req.query.tl as string) || "ar";

      if (!q) {
        return res.status(400).json({ error: "Text query parameter 'q' is required." });
      }

      // Try gtx client first, which is highly robust and avoids captcha blocks
      const clients = ["gtx", "tw-ob"];
      let response;
      let lastError: any = null;

      for (const clientName of clients) {
        try {
          const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(tl)}&client=${clientName}&q=${encodeURIComponent(q)}`;
          response = await fetch(googleTtsUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
              "Referer": "https://translate.google.com/"
            }
          });
          if (response.ok) {
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error(`Google TTS request failed with status: ${response ? response.status : 'unknown'}`);
      }

      res.setHeader("Content-Type", "audio/mpeg");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error: any) {
      console.error("TTS Proxy error:", error);
      res.status(500).json({ error: error?.message || "Internal server error during TTS generation." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
