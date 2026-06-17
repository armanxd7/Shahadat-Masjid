import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Home as HomeIcon, 
  Compass, 
  CheckSquare, 
  BookOpen, 
  Calendar, 
  User,
  Heart,
  Sparkles,
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Music,
  Pause,
  Play,
  Check,
  X
} from "lucide-react";

import { AppScreen, DayHabit, SavingGoal, SavingTransaction } from "./types";
import Splash from "./components/Splash";
import Home from "./components/Home";
// @ts-ignore
import deenLogo from "./assets/images/deen_circle_logo_1779544307640.png";
import PrayerTimes from "./components/PrayerTimes";
import Habits from "./components/Habits";
import Quran from "./components/Quran";
import Duas from "./components/Duas";
import Planner from "./components/Planner";
import Profile from "./components/Profile";
import AIDeen from "./components/AIDeen";
import DhikrCounter from "./components/DhikrCounter";
import Settings from "./components/Settings";
import { syncStoredTokenWithBackend } from "./utils/fcm";
import { 
  LOCATION_DATA, 
  parseTimeToMinutes, 
  getActiveTimes, 
  normalizeTimeCheck 
} from "./utils/prayerTimesHelpers";

import { 
  auth, 
  db, 
  onAuthStateChanged, 
  FirebaseUser, 
  handleFirestoreError, 
  OperationType,
  logoutUser
} from "./firebase";
import { 
  doc, 
  setDoc,
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";

const DEFAULT_HABITS: DayHabit[] = [
  { id: "h_salah", name: "Salah (5 Prayers)", completed: true, type: "salah", extraInfo: "Active" },
  { id: "h_quran", name: "Quran Recitation", completed: false, type: "quran", extraInfo: "20 min" },
  { id: "h_dhikr", name: "Morning & Evening Dhikr", completed: true, type: "dhikr" },
  { id: "h_charity", name: "Daily Act of Kindness", completed: false, type: "charity" }
];

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("splash");
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  // --- GLOBAL PRAYER ALARMS SYSTEM ---
  const [adminPrayerTimes, setAdminPrayerTimes] = useState<Record<string, any>>({});
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);

  const [activeAdhanAlert, setActiveAdhanAlert] = useState<{
    key: string;
    label: string;
    time: string;
    location: string;
    muezzinId: string;
  } | null>(null);

  const [activeOffsetAlert, setActiveOffsetAlert] = useState<{
    key: string;
    label: string;
    time: string;
    offset: number;
    location: string;
  } | null>(null);

  const [showPostAdhanDua, setShowPostAdhanDua] = useState<boolean>(false);
  const [isAdhanMuted, setIsAdhanMuted] = useState<boolean>(false);
  const [isAdhanPaused, setIsAdhanPaused] = useState<boolean>(false);
  const [globalAdhanPlaying, setGlobalAdhanPlaying] = useState<boolean>(false);
  const [globalAdhanName, setGlobalAdhanName] = useState<string>("");
  const [globalAdhanMuezzin, setGlobalAdhanMuezzin] = useState<string>("");

  const lastGlobalTriggerRef = useRef<string>("");
  const lastGlobalOffsetTriggerRef = useRef<string>("");

  // Fetch public specifications/overrides from backend
  useEffect(() => {
    const fetchPublicConfigGlobal = async () => {
      try {
        const res = await fetch("/api/public/config");
        if (res.ok) {
          const data = await res.json();
          if (data.prayerTimes) {
            setAdminPrayerTimes(data.prayerTimes);
          }
        }
      } catch (err) {
        console.error("Error loading overrides in app entry:", err);
      }
    };
    fetchPublicConfigGlobal();
    window.addEventListener("deen_config_updated", fetchPublicConfigGlobal);
    return () => window.removeEventListener("deen_config_updated", fetchPublicConfigGlobal);
  }, []);

  // Main high-precision polling loop for early alarms and exact Adhans
  useEffect(() => {
    const checkAlarmsInterval = setInterval(() => {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();

      const pad = (n: number) => String(n).padStart(2, '0');
      const currentMinutes = hrs * 60 + mins;

      // 1. Resolve dynamic client state directly from localStorage to ensure instant updates
      const location = localStorage.getItem("deen_selected_location") || "Cape Town, South Africa";
      const customTimesStr = localStorage.getItem("deen_custom_prayer_times");
      const customTimes = customTimesStr ? JSON.parse(customTimesStr) : null;
      
      const savedMuted = localStorage.getItem("deen_muted_prayers");
      const mutedPrayers = savedMuted ? JSON.parse(savedMuted) : {
        fajr: false,
        dhuhr: true, // defaults
        asr: false,
        maghrib: false,
        isha: false
      };

      const savedOffsets = localStorage.getItem("deen_reminder_offsets");
      const reminderOffsets = savedOffsets ? JSON.parse(savedOffsets) : {
        fajr: 10,
        dhuhr: 10,
        asr: 10,
        maghrib: 10,
        isha: 10
      };

      const activeMuezzin = localStorage.getItem("deen_selected_muezzin") || "makkah";

      // 2. Resolve target prayer times
      const activeTimes = getActiveTimes(location, customTimes, adminPrayerTimes);
      const { fajr, dhuhr, asr, maghrib, isha } = activeTimes;

      const prayers = [
        { key: "fajr", label: "Fajr", time: fajr },
        { key: "dhuhr", label: "Dhuhr", time: dhuhr },
        { key: "asr", label: "Asr", time: asr },
        { key: "maghrib", label: "Maghrib", time: maghrib },
        { key: "isha", label: "Isha", time: isha },
      ];

      const currentMinuteKey = `${location}_${hrs}_${mins}`;

      for (const p of prayers) {
        if (!p.time || p.time === "--:--" || p.time.includes("--")) continue;

        const prayerMinutes = parseTimeToMinutes(p.time);
        const offset = reminderOffsets[p.key] !== undefined ? reminderOffsets[p.key] : 10;
        const isMuted = mutedPrayers[p.key];

        // A. Process exact prayer minute (Adhan playing time)
        if (currentMinutes === prayerMinutes) {
          const exactTriggerKey = `${p.key}_exact_${currentMinuteKey}`;
          
          if (lastGlobalTriggerRef.current !== exactTriggerKey) {
            lastGlobalTriggerRef.current = exactTriggerKey;
            
            // Fire Browser native alert
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification(`Salah Alert: ${p.label}`, {
                  body: `🕌 Adhan is playing for ${p.label} at ${location.split(",")[0]}.`,
                  icon: "/favicon.ico"
                });
              } catch (err) {
                console.error("Native notification failed:", err);
              }
            }

            // Play automatic Adhan audio if not silenced/muted
            if (!isMuted) {
              triggerGlobalAdhan(p.label, p.key, activeMuezzin, location);
            } else {
              // Still show visual silent cue
              setActiveOffsetAlert({
                key: p.key,
                label: p.label,
                time: p.time,
                offset: 0,
                location
              });
            }
          }
        }

        // B. Process early offset reminder (Preparation)
        if (offset > 0) {
          const targetMinutes = prayerMinutes - offset;
          if (currentMinutes === targetMinutes) {
            const offsetTriggerKey = `${p.key}_offset_${offset}_${currentMinuteKey}`;

            if (lastGlobalOffsetTriggerRef.current !== offsetTriggerKey) {
              lastGlobalOffsetTriggerRef.current = offsetTriggerKey;

              // Fire browser notification
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                try {
                  new Notification(`Salah Early Reminder`, {
                    body: `⏰ ${p.label} starts in ${offset} minutes at ${location.split(",")[0]}.`,
                    icon: "/favicon.ico"
                  });
                } catch (err) {
                  console.error("Native reminder failed:", err);
                }
              }

              // Fire beautiful sliding in-app interactive toast card
              setActiveOffsetAlert({
                key: p.key,
                label: p.label,
                time: p.time,
                offset,
                location
              });
            }
          }
        }
      }
    }, 4500); // Fast cycle to catch target minute transitions precisely

    return () => clearInterval(checkAlarmsInterval);
  }, [adminPrayerTimes]);

  const triggerGlobalAdhan = (prayerLabel: string, prayerKey: string, muezzinId: string, location: string) => {
    const muezzins = [
      { id: "makkah", name: "Sheikh Ali Ahmed Mulla (Makkah)", url: "https://www.islamcan.com/audio/adhan/azan2.mp3", fallbackUrl: "https://archive.org/download/Adhan_Athan_Azaan/Makkah_128kb.mp3" },
      { id: "madinah", name: "Sheikh Abdul Majeed (Madinah)", url: "https://www.islamcan.com/audio/adhan/azan3.mp3", fallbackUrl: "https://archive.org/download/Adhan-from-Madinah/Adhan-from-Madinah_64kb.mp3" },
      { id: "egypt", name: "Famous Muezzin (Cairo, Egypt)", url: "https://www.islamcan.com/audio/adhan/azan16.mp3", fallbackUrl: "https://archive.org/download/Adhan_Athan_Azaan/Adhan_80kb.mp3" },
      { id: "yusuf", name: "Yusuf Islam (Aesthetic Clear)", url: "https://www.islamcan.com/audio/adhan/azan1.mp3", fallbackUrl: "https://archive.org/download/Adhan-from-Madinah/Adhan-from-Madinah_64kb.mp3" }
    ];

    const choice = muezzins.find(m => m.id === muezzinId) || muezzins[0];
    
    // Stop any active thread
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
    }

    const aud = new Audio(choice.url);
    aud.preload = "auto";
    
    aud.addEventListener("error", () => {
      console.warn("Primary stream errored, using high-availability fallback...");
      aud.src = choice.fallbackUrl;
      aud.play().catch(e => console.error("Autoplay muted by host policies:", e));
    });

    globalAudioRef.current = aud;
    setGlobalAdhanPlaying(true);
    setGlobalAdhanName(`${prayerLabel} Adhan`);
    setGlobalAdhanMuezzin(choice.name);
    setIsAdhanMuted(false);
    setIsAdhanPaused(false);

    setActiveAdhanAlert({
      key: prayerKey,
      label: prayerLabel,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location,
      muezzinId: choice.id
    });

    aud.play().catch(err => {
      console.warn("Browser interactive gesture policy delayed instant autoplay. Displaying visual play override:", err);
    });

    aud.addEventListener("ended", () => {
      setGlobalAdhanPlaying(false);
      setTimeout(() => {
        setActiveAdhanAlert(null);
        setShowPostAdhanDua(true); // Automatically display supplication modal on end!
      }, 1200);
    });
  };

  const handleTogglePlayPauseAdhan = () => {
    if (globalAudioRef.current) {
      if (isAdhanPaused) {
        globalAudioRef.current.play().catch(console.error);
        setIsAdhanPaused(false);
      } else {
        globalAudioRef.current.pause();
        setIsAdhanPaused(true);
      }
    }
  };

  const handleToggleMuteAdhan = () => {
    if (globalAudioRef.current) {
      const next = !isAdhanMuted;
      globalAudioRef.current.muted = next;
      setIsAdhanMuted(next);
    }
  };

  const handleDismissAdhanNotification = () => {
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current = null;
    }
    setGlobalAdhanPlaying(false);
    setIsAdhanPaused(false);
    setIsAdhanMuted(false);
    setActiveAdhanAlert(null);
  };

  const handleShowDuaModalFromPlayer = () => {
    handleDismissAdhanNotification();
    setShowPostAdhanDua(true);
  };

  // Splash timer to allow beautiful animated lanterns & greeting to play on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Streaks (default is 7 as represented in screenshots!)
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem("deen_streak");
    return saved ? parseInt(saved) : 7;
  });

  // Daily Habits checklist
  const [habits, setHabits] = useState<DayHabit[]>(() => {
    const saved = localStorage.getItem("deen_habits");
    return saved ? JSON.parse(saved) : DEFAULT_HABITS;
  });

  // Savings Fund calculations
  const [savingsTotal, setSavingsTotal] = useState<number>(() => {
    const saved = localStorage.getItem("deen_savings_total");
    return saved ? parseFloat(saved) : 3240; // Default $3,240 like screenshot mock!
  });

  const [savingsTransactions, setSavingsTransactions] = useState<SavingTransaction[]>(() => {
    const saved = localStorage.getItem("deen_savings_transactions");
    return saved ? JSON.parse(saved) : [
      { id: "t_init", amount: 3240, date: "May 22, 2026", note: "Starting Balance" }
    ];
  });

  // Journal Reflections counts
  const [reflectionsCount, setReflectionsCount] = useState(0);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);

  // 1. Maintain authentication state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Handle moving beyond the splash screen on initial mount if authenticated
  useEffect(() => {
    if (!isSplashLoading && currentUser) {
      const savedScreen = (localStorage.getItem("deen_screen") as AppScreen) || "home";
      setScreen(savedScreen === "splash" ? "home" : savedScreen);
    }
  }, [isSplashLoading, currentUser]);

  // 2. Sync state with cloud when authenticated
  useEffect(() => {
    if (!currentUser) {
      setLoadingSync(false);
      return;
    }

    const nameToSave = currentUser.displayName || localStorage.getItem("deen_username") || "Deen Traveler";
    localStorage.setItem("deen_username", nameToSave);

    // Sync FCM background token with backend memory table
    const storedLocation = localStorage.getItem("deen_selected_location") || "Cape Town, South Africa";
    syncStoredTokenWithBackend(currentUser.uid, storedLocation);

    // Fetch / Sync main profile doc
    const userDocRef = doc(db, "users", currentUser.uid);
    setLoadingSync(true);

    const unsubscribeUserDoc = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStreak(data.streak);
        setSavingsTotal(data.savingsTotal);
        if (data.username) {
          localStorage.setItem("deen_username", data.username);
        }
      } else {
        try {
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            username: nameToSave,
            selectedLocation: localStorage.getItem("deen_selected_location") || "Cape Town, South Africa",
            streak: streak,
            savingsTotal: savingsTotal
          });
        } catch (err) {
          if (auth.currentUser?.uid === currentUser.uid) {
            handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
          }
        }
      }
      setLoadingSync(false);
    }, (err) => {
      if (auth.currentUser?.uid === currentUser.uid) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
      }
      setLoadingSync(false);
    });

    // Sync Habits Subcollection
    const habitsCollRef = collection(db, "users", currentUser.uid, "habits");
    const unsubscribeHabits = onSnapshot(habitsCollRef, async (snap) => {
      if (!snap.empty) {
        const loadedHabits = snap.docs.map(doc => doc.data() as DayHabit);
        setHabits(loadedHabits);
        localStorage.setItem("deen_habits", JSON.stringify(loadedHabits));
      } else {
        // Write existing local actions
        try {
          for (const h of habits) {
            await setDoc(doc(db, "users", currentUser.uid, "habits", h.id), {
              id: h.id,
              userId: currentUser.uid,
              name: h.name,
              completed: h.completed,
              type: h.type,
              extraInfo: h.extraInfo || ""
            });
          }
        } catch (err) {
          if (auth.currentUser?.uid === currentUser.uid) {
            handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/habits`);
          }
        }
      }
    }, (err) => {
      if (auth.currentUser?.uid === currentUser.uid) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/habits`);
      }
    });

    // Sync Transactions Subcollection
    const txCollRef = collection(db, "users", currentUser.uid, "transactions");
    const unsubscribeTx = onSnapshot(txCollRef, async (snap) => {
      if (!snap.empty) {
        const loadedTx = snap.docs.map(doc => doc.data() as SavingTransaction);
        loadedTx.sort((a, b) => b.id.localeCompare(a.id));
        setSavingsTransactions(loadedTx);
        localStorage.setItem("deen_savings_transactions", JSON.stringify(loadedTx));
      } else {
        try {
          for (const tx of savingsTransactions) {
            await setDoc(doc(db, "users", currentUser.uid, "transactions", tx.id), {
              id: tx.id,
              userId: currentUser.uid,
              amount: tx.amount,
              date: tx.date,
              note: tx.note
            });
          }
        } catch (err) {
          if (auth.currentUser?.uid === currentUser.uid) {
            handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/transactions`);
          }
        }
      }
    }, (err) => {
      if (auth.currentUser?.uid === currentUser.uid) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/transactions`);
      }
    });

    // Sync Reflections Subcollection
    const reflectionsCollRef = collection(db, "users", currentUser.uid, "reflections");
    const unsubscribeReflections = onSnapshot(reflectionsCollRef, async (snap) => {
      const loadedRefs = snap.docs.map(doc => doc.data());
      setReflectionsCount(loadedRefs.length);
      const localFormat = loadedRefs.map(r => ({
        date: r.date,
        ayah: r.ayats,
        note: r.content
      }));
      localStorage.setItem("deen_reflections", JSON.stringify(localFormat));
      window.dispatchEvent(new Event("storage")); // Trigger local storage updates in Home
    }, (err) => {
      if (auth.currentUser?.uid === currentUser.uid) {
        handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/reflections`);
      }
    });

    return () => {
      unsubscribeUserDoc();
      unsubscribeHabits();
      unsubscribeTx();
      unsubscribeReflections();
    };
  }, [currentUser]);

  useEffect(() => {
    // Only count local if not connected; firebase state updater handles connected counts
    if (!currentUser) {
      const savedReflections = localStorage.getItem("deen_reflections");
      if (savedReflections) {
        setReflectionsCount(JSON.parse(savedReflections).length);
      }
    }
  }, [screen, currentUser]);

  // Persists values
  const handleNavigate = (target: AppScreen) => {
    if (target === "settings") {
      localStorage.setItem("deen_prev_screen", screen);
    }
    setScreen(target);
    localStorage.setItem("deen_screen", target);
  };

  const handleToggleHabit = async (id: string) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        const nextCompleted = !h.completed;
        return { ...h, completed: nextCompleted };
      }
      return h;
    });
    setHabits(updated);
    localStorage.setItem("deen_habits", JSON.stringify(updated));

    // Dynamic Streak adaptation
    const newlyCompleted = updated.filter(h => h.completed).length;
    const oldCompleted = habits.filter(h => h.completed).length;
    let nextStreak = streak;
    if (newlyCompleted === updated.length && oldCompleted !== updated.length) {
      nextStreak = streak + 1;
      setStreak(nextStreak);
      localStorage.setItem("deen_streak", String(nextStreak));
    } else if (newlyCompleted !== updated.length && oldCompleted === updated.length) {
      nextStreak = Math.max(streak - 1, 0);
      setStreak(nextStreak);
      localStorage.setItem("deen_streak", String(nextStreak));
    }

    if (currentUser) {
      try {
        const habitToUpdate = updated.find(h => h.id === id);
        if (habitToUpdate) {
          await setDoc(doc(db, "users", currentUser.uid, "habits", id), {
            id: habitToUpdate.id,
            userId: currentUser.uid,
            name: habitToUpdate.name,
            completed: habitToUpdate.completed,
            type: habitToUpdate.type,
            extraInfo: habitToUpdate.extraInfo || ""
          });
        }
        if (nextStreak !== streak) {
          await updateDoc(doc(db, "users", currentUser.uid), {
            streak: nextStreak
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/habits/${id}`);
      }
    }
  };

  const handleAddCustomHabit = async (name: string, type: 'salah' | 'quran' | 'dhikr' | 'charity' | 'custom', extra?: string) => {
    const newHabit: DayHabit = {
      id: "h_" + Date.now(),
      name,
      completed: false,
      type,
      extraInfo: extra || ""
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    localStorage.setItem("deen_habits", JSON.stringify(updated));

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "habits", newHabit.id), {
          id: newHabit.id,
          userId: currentUser.uid,
          name: newHabit.name,
          completed: newHabit.completed,
          type: newHabit.type,
          extraInfo: newHabit.extraInfo || ""
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/habits/${newHabit.id}`);
      }
    }
  };

  const handleRemoveCustomHabit = async (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    localStorage.setItem("deen_habits", JSON.stringify(updated));

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "habits", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/habits/${id}`);
      }
    }
  };

  const handleAddSavingsTransaction = async (amount: number, note: string) => {
    const newTx: SavingTransaction = {
      id: "t_" + Date.now(),
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      note
    };
    const updatedTx = [newTx, ...savingsTransactions];
    setSavingsTransactions(updatedTx);
    localStorage.setItem("deen_savings_transactions", JSON.stringify(updatedTx));

    const updatedTotal = savingsTotal + amount;
    setSavingsTotal(updatedTotal);
    localStorage.setItem("deen_savings_total", String(updatedTotal));

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "transactions", newTx.id), {
          id: newTx.id,
          userId: currentUser.uid,
          amount: newTx.amount,
          date: newTx.date,
          note: newTx.note
        });
        await updateDoc(doc(db, "users", currentUser.uid), {
          savingsTotal: updatedTotal
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/transactions/${newTx.id}`);
      }
    }
  };

  const handleResetData = async () => {
    localStorage.clear();
    setStreak(7);
    setHabits(DEFAULT_HABITS);
    setSavingsTotal(3240);
    setSavingsTransactions([
      { id: "t_init", amount: 3240, date: "May 22, 2026", note: "Starting Balance" }
    ]);
    setReflectionsCount(0);
    if (currentUser) {
      await logoutUser();
    }
    setScreen("splash");
  };

  const handleLogout = async () => {
    localStorage.removeItem("deen_username");
    localStorage.removeItem("deen_screen");
    localStorage.setItem("deen_habits", JSON.stringify(DEFAULT_HABITS));
    localStorage.setItem("deen_savings_total", "3240");
    localStorage.setItem("deen_savings_transactions", JSON.stringify([
      { id: "t_init", amount: 3240, date: "May 22, 2026", note: "Starting Balance" }
    ]));
    localStorage.setItem("deen_reflections", "[]");

    if (currentUser) {
      await logoutUser();
    }
    setStreak(7);
    setHabits(DEFAULT_HABITS);
    setSavingsTotal(3240);
    setSavingsTransactions([
      { id: "t_init", amount: 3240, date: "May 22, 2026", note: "Starting Balance" }
    ]);
    setReflectionsCount(0);
    setScreen("splash");
  };

  const habitsLeft = habits.filter(h => !h.completed).length;


  return (
    <div className="min-h-screen bg-cream-bg text-on-surface flex flex-col font-sans selection:bg-[#fed65b] relative">
      
      {/* Islamic Background Pattern Sheet watermark */}
      <div className="absolute inset-0 islamic-pattern-bg opacity-[0.03] pointer-events-none z-0"></div>

      {/* Persistent App Header with Logo */}
      {screen !== "splash" && (
        <header className="max-w-md w-full mx-auto px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#012d1d]/10 relative z-20 bg-cream-bg/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full border border-gold-accent/40 overflow-hidden bg-transparent shadow-sm flex-shrink-0 flex items-center justify-center p-[2px]">
              <img 
                src={deenLogo} 
                alt="Shahadat Masjid Logo" 
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-serif text-sm font-black text-[#012d1d] tracking-tight leading-none uppercase">Shahadat Masjid</h1>
              <p className="text-[9px] font-sans font-extrabold text-[#735c00] tracking-wider leading-none mt-0.5">YOUR FAITHFUL GUIDE</p>
            </div>
          </div>
        </header>
      )}

      {/* Main Container viewport */}
      <main className={`flex-grow max-w-md w-full mx-auto relative z-10 flex flex-col ${screen === "splash" ? "px-0 pt-0 pb-0" : "px-5 pt-4 pb-28"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full flex-grow flex flex-col"
          >
            {screen === "splash" && (
              <Splash onEnterApp={() => handleNavigate("home")} />
            )}
            {screen === "home" && (
              <Home 
                onNavigate={handleNavigate} 
                streak={streak} 
                habitsLeft={habitsLeft}
                totalHabits={habits.length}
                savingsTotal={savingsTotal}
              />
            )}
            {screen === "prayer" && (
              <PrayerTimes onNavigate={handleNavigate} />
            )}
            {screen === "habits" && (
              <Habits 
                habits={habits}
                streak={streak}
                onToggleHabit={handleToggleHabit}
                onAddCustomHabit={handleAddCustomHabit}
                onRemoveCustomHabit={handleRemoveCustomHabit}
              />
            )}
            {screen === "quran" && (
              <Quran />
            )}
            {screen === "duas" && (
              <Duas />
            )}
            {screen === "planner" && (
              <Planner />
            )}
            {screen === "aideen" && (
              <AIDeen />
            )}
            {screen === "profile" && (
              <Profile 
                streak={streak}
                totalHabitsCompleted={habits.filter(h => h.completed).length}
                totalReflections={reflectionsCount}
                onResetAllData={handleResetData}
                onLogout={handleLogout}
                currentUser={currentUser}
                onNavigate={handleNavigate}
                habits={habits}
              />
            )}
            {screen === "dhikr" && (
              <DhikrCounter onBack={() => handleNavigate("home")} />
            )}
            {screen === "settings" && (
              <Settings onBack={() => {
                // Return to prayer if they came from prayer, or profile
                const lastScreen = localStorage.getItem("deen_prev_screen") || "profile";
                handleNavigate(lastScreen as any);
              }} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Anchored Nav bar on the bottom. Hidden if view is Splash */}
      {screen !== "splash" && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#012d1d]/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl flex items-center justify-around py-3 px-4 max-w-md mx-auto">
          {/* Home Nav */}
          <button 
            onClick={() => handleNavigate("home")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "home" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "home" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <HomeIcon className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Home</span>
          </button>

          {/* Prayer Times / Compass Nav */}
          <button 
            onClick={() => handleNavigate("prayer")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "prayer" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "prayer" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Compass className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Prayer</span>
          </button>

          {/* Checklist Habits Nav */}
          <button 
            onClick={() => handleNavigate("habits")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "habits" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "habits" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <CheckSquare className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Habits</span>
          </button>

          {/* Quran Nav */}
          <button 
            onClick={() => handleNavigate("quran")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "quran" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "quran" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <BookOpen className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Quran</span>
          </button>

          {/* Duas Nav */}
          <button 
            onClick={() => handleNavigate("duas")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "duas" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "duas" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Heart className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Duas</span>
          </button>

          {/* Deen Planner Nav */}
          <button 
            onClick={() => handleNavigate("planner")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "planner" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "planner" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Calendar className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Planner</span>
          </button>

          {/* AI Deen Chat Nav */}
          <button 
            onClick={() => handleNavigate("aideen")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "aideen" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "aideen" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">AI Deen</span>
          </button>

          {/* Profile Statistics Nav */}
          <button 
            onClick={() => handleNavigate("profile")}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-colors border-none bg-transparent cursor-pointer ${screen === "profile" ? "text-gold-accent" : "text-white/60 hover:text-white"}`}
          >
            <motion.div
              animate={{ scale: screen === "profile" ? 1.25 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <User className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] font-bold font-sans tracking-wide">Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
}
