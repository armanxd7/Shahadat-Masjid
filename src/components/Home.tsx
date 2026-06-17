import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  CalendarDays, 
  CheckCircle, 
  BookOpen, 
  Settings, 
  Quote, 
  ArrowRight,
  Heart,
  Plus,
  Bookmark,
  Calendar,
  Sparkles,
  Search,
  Coins,
  QrCode,
  Copy,
  Check,
  Phone
} from "lucide-react";
import { AppScreen } from "../types";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
// @ts-ignore
import deenLogo from "../assets/images/deen_circle_logo_1779544307640.png";
import { doc, setDoc } from "firebase/firestore";

interface HomeProps {
  onNavigate: (screen: AppScreen) => void;
  streak: number;
  habitsLeft: number;
  totalHabits: number;
  savingsTotal: number;
}

interface AyahPreset {
  text: string;
  source: string;
  context: string;
}

const AYAH_PRESETS: AyahPreset[] = [
  {
    text: "And He found you lost and guided you.",
    source: "Quran 93:7",
    context: "A reminder of divine grace, showing how Allah directs our steps through difficulties."
  },
  {
    text: "For indeed, with hardship [will be] ease.",
    source: "Surah Ash-Sharh 94:5",
    context: "A solace during trials, promising ease that accompanies every hardship."
  },
  {
    text: "So remember Me; I will remember you.",
    source: "Surah Al-Baqarah 2:152",
    context: "The reciprocal bond of remembrance (dhikr) connecting servant and Creator."
  },
  {
    text: "And speak to people good words.",
    source: "Surah Al-Baqarah 2:83",
    context: "Prophetic etiquette emphasizing kindness, patience, and gentle phrasing in conversations."
  },
  {
    text: "Indeed, my Lord is near and responsive.",
    source: "Surah Hud 11:61",
    context: "A beautiful reinforcement of the closeness of divine answer to our sincere prayers."
  }
];

export default function Home({ onNavigate, streak, habitsLeft, totalHabits, savingsTotal }: HomeProps) {
  interface WisdomData {
    quote: string;
    source: string;
    category: string;
    explanation: string;
  }

  const [wisdom, setWisdom] = useState<WisdomData | null>(null);
  const [wisdomLoading, setWisdomLoading] = useState(true);
  const [isRefreshingWisdom, setIsRefreshingWisdom] = useState(false);
  const [notices, setNotices] = useState<Array<{ id: string; text: string; author: string; createdAt: string; priority: "normal" | "urgent"; active: boolean }>>([]);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [showReflectModal, setShowReflectModal] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [savedReflections, setSavedReflections] = useState<{ date: string; ayah: string; note: string }[]>(() => {
    const data = localStorage.getItem("deen_reflections");
    return data ? JSON.parse(data) : [];
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("deen_username") || "Amina Ismail";
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    return localStorage.getItem("deen_selected_location") || "Cape Town, South Africa";
  });
  const [reflectionSuccess, setReflectionSuccess] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // Donation-specific state hooks
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationOrigin, setDonationOrigin] = useState<'nepal' | 'india'>('nepal');
  const [paymentMethod, setPaymentMethod] = useState<'esewa' | 'bank'>('esewa');
  const [donation, setDonation] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationNotes, setDonationNotes] = useState<string>('');
  const [donationIsValidated, setDonationIsValidated] = useState<boolean>(false);
  const [donationLogSuccess, setDonationLogSuccess] = useState<boolean>(false);
  const [isLoggingDonation, setIsLoggingDonation] = useState<boolean>(false);
  const [confirmStatusChecked, setConfirmStatusChecked] = useState<boolean>(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/public/config");
      if (res.ok) {
        const data = await res.json();
        if (data.notices) {
          setNotices(data.notices.filter((n: any) => n.active));
        }
        if (data.donation) {
          setDonation(data.donation);
        }
      }
    } catch (err) {
      console.error("Error loading public config on home:", err);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  const fetchWisdom = async (forceAi = false) => {
    if (forceAi) {
      setIsRefreshingWisdom(true);
    } else {
      setWisdomLoading(true);
    }
    try {
      const res = await fetch(`/api/wisdom?force_ai=${forceAi}`);
      if (res.ok) {
        const data = await res.json();
        setWisdom(data);
      } else {
        throw new Error("Failed to fetch custom wisdom");
      }
    } catch (e) {
      console.error(e);
      setWisdom({
        quote: "And speak to people good words.",
        source: "Quran 2:83",
        category: "Quran",
        explanation: "Prophetic etiquette emphasizing kindness, patience, and gentle phrasing in conversations."
      });
    } finally {
      setWisdomLoading(false);
      setIsRefreshingWisdom(false);
    }
  };

  useEffect(() => {
    fetchWisdom(false);
    fetchConfig();

    const handleConfigUpdated = () => {
      fetchConfig();
      fetchWisdom(false); // Reload wisdom to grab overrides immediately
    };

    window.addEventListener("deen_config_updated", handleConfigUpdated);
    return () => {
      window.removeEventListener("deen_config_updated", handleConfigUpdated);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserPhoto(user.photoURL);
        if (user.displayName) {
          setUserName(user.displayName);
          localStorage.setItem("deen_username", user.displayName);
        }
      } else {
        setUserPhoto(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSyncStorage = () => {
      setSelectedLocation(localStorage.getItem("deen_selected_location") || "Cape Town, South Africa");
      setUserName(localStorage.getItem("deen_username") || "Amina Ismail");
      const storageData = localStorage.getItem("deen_reflections");
      if (storageData) {
        setSavedReflections(JSON.parse(storageData));
      }
    };
    window.addEventListener("deen_location_changed", handleSyncStorage);
    window.addEventListener("storage", handleSyncStorage);
    handleSyncStorage();
    return () => {
      window.removeEventListener("deen_location_changed", handleSyncStorage);
      window.removeEventListener("storage", handleSyncStorage);
    };
  }, []);

  const handleNextAyah = () => {
    setAyahIndex((prev) => (prev + 1) % AYAH_PRESETS.length);
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;
    const newReflection = {
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ayah: AYAH_PRESETS[ayahIndex].source,
      note: reflectionText.trim()
    };
    const updated = [newReflection, ...savedReflections];
    setSavedReflections(updated);
    localStorage.setItem("deen_reflections", JSON.stringify(updated));

    if (auth.currentUser) {
      const refId = "ref_" + Date.now();
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "reflections", refId), {
          id: refId,
          userId: auth.currentUser.uid,
          date: newReflection.date,
          feeling: "peaceful",
          ayats: newReflection.ayah,
          content: newReflection.note
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/reflections/${refId}`);
      }
    }

    setReflectionText("");
    setReflectionSuccess(true);
    setTimeout(() => {
      setReflectionSuccess(false);
      setShowReflectModal(false);
    }, 1500);
  };

  const handleOpenDonationModal = () => {
    setDonationAmount('');
    setDonationNotes('');
    setDonationIsValidated(false);
    setDonationLogSuccess(false);
    setConfirmStatusChecked(false);
    setIsLoggingDonation(false);
    setShowDonationModal(true);
  };

  const handleLogDonation = async () => {
    const amountNum = parseFloat(donationAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const donationId = "don_" + Date.now();
    const newDonation = {
      id: donationId,
      amount: amountNum,
      paymentMethod: 
        paymentMethod === 'esewa' ? 'eSewa Mobile Wallet' : 'Global IME Bank Transfer',
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      notes: donationNotes.trim() || undefined
    };

    // Save to localStorage
    const savedLocal = localStorage.getItem("deen_donations");
    const existingList = savedLocal ? JSON.parse(savedLocal) : [];
    const updated = [newDonation, ...existingList];
    localStorage.setItem("deen_donations", JSON.stringify(updated));

    // Save to Firestore
    if (auth.currentUser) {
      try {
        const donationData = {
          id: donationId,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || localStorage.getItem("deen_username") || "Faithful Donor",
          userEmail: auth.currentUser.email || "N/A",
          amount: amountNum,
          paymentMethod: 
            paymentMethod === 'esewa' ? 'eSewa Mobile Wallet' : 'Global IME Bank Transfer',
          date: newDonation.date,
          ...(donationNotes.trim() ? { notes: donationNotes.trim() } : {})
        };

        // 1. Save to user subcollection
        await setDoc(doc(db, "users", auth.currentUser.uid, "donations", donationId), donationData);
        // 2. Save to global donations collection for admin ledger
        await setDoc(doc(db, "global_donations", donationId), donationData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/donations/${donationId}`);
      }
    }

    setDonationLogSuccess(true);
    // Dispatch native window event so profiles reload donation history
    window.dispatchEvent(new Event("deen_donation_added"));
  };

  const currentAyah = AYAH_PRESETS[ayahIndex];
  const completionPercentage = totalHabits > 0 ? Math.round(((totalHabits - habitsLeft) / totalHabits) * 100) : 0;


  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-black/5 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border border-gold-accent/40 bg-transparent shadow-md flex-shrink-0 flex items-center justify-center p-[2px]">
            <img 
              alt="User Profile Logo" 
              className="w-full h-full object-cover rounded-full"
              src={userPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=0d5e42,d4af37,012d1d&fontFamily=Georgia,serif`} 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-serif text-[17px] font-bold text-primary-base leading-tight">Assalamu Alaikum</h1>
            <h2 className="text-xs font-sans font-extrabold text-gold-accent leading-tight mb-0.5">{userName}</h2>
            <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse"></span>
              {selectedLocation.split(",")[0]} • {timeStr}
            </p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate("profile")}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-base/5 text-primary-base hover:bg-primary-base/10 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Elegant dynamic Masjid Notice Board containing villagers notices & urgent notifications */}
      <AnimatePresence>
        {notices.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border border-gold-accent/20 rounded-[28px] p-5 shadow-soft space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#012d1d]/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">📢</span>
                <div>
                  <h3 className="font-serif text-[13px] font-black text-primary-base uppercase tracking-tight">Masjid Notice Board</h3>
                  <p className="text-[9px] font-bold text-[#735c00] uppercase tracking-wide">Community updates & notification alerts</p>
                </div>
              </div>
              <span className="text-[9px] font-bold bg-[#012d1d]/5 text-emerald-950 px-2 py-0.5 rounded-full uppercase scale-90">
                {notices.length} active
              </span>
            </div>

            <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
              {notices.map((notice) => (
                <div 
                  key={notice.id} 
                  className={`p-3 border rounded-2xl flex flex-col gap-1.5 transition-all text-xs relative ${
                    notice.priority === "urgent" 
                      ? "bg-red-500/10 border-red-500/20 text-red-950" 
                      : "bg-emerald-900/5 border-emerald-800/10 text-emerald-950"
                  }`}
                >
                  {notice.priority === "urgent" && (
                    <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-650 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-650"></span>
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest ${
                      notice.priority === "urgent" 
                        ? "bg-red-500/20 text-red-950" 
                        : "bg-emerald-900/15 text-emerald-950"
                    }`}>
                      {notice.priority === "urgent" ? "🔴 Urgent Announcement" : "📌 Announcement"}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">
                      By {notice.author}
                    </span>
                    <span className="text-[9px] font-black text-gray-400">
                      • {new Date(notice.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  
                  <p className="text-xs font-semibold leading-relaxed text-primary-base whitespace-pre-wrap">
                    {notice.text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Wisdom Section */}
      <div className="bg-gradient-to-tr from-[#fbf8ee] to-[#f4eee0] border border-gold-accent/25 rounded-[28px] p-6 shadow-soft relative overflow-hidden">
        {/* Abstract background graphics */}
        <div className="absolute top-1 right-2 opacity-[0.03] select-none pointer-events-none">
          <Quote className="w-24 h-24 text-gold-accent" />
        </div>

        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-[#735c00]/8 px-3 py-1 rounded-full border border-[#735c00]/10">
              <Sparkles className="w-3.5 h-3.5 text-gold-accent animate-pulse" />
              <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest text-[#735c00]">
                Daily Wisdom
              </span>
            </div>
            
            <button
              onClick={() => fetchWisdom(true)}
              disabled={isRefreshingWisdom || wisdomLoading}
              className="text-[10px] font-sans font-extrabold tracking-wide text-primary-base hover:text-gold-accent transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isRefreshingWisdom ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-primary-base" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Whispering...
                </>
              ) : (
                <>
                  <span>Seek Fresh Wisdom ✦</span>
                </>
              )}
            </button>
          </div>

          {wisdomLoading ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-2">
              <div className="w-5 h-5 border-2 border-gold-accent border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-sans font-medium text-on-surface-variant">Gathering beautiful words...</span>
            </div>
          ) : wisdom ? (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2.5"
            >
              {/* Quote text */}
              <p className="font-serif text-[15px] font-bold text-primary-base leading-relaxed tracking-normal italic select-text">
                "{wisdom.quote}"
              </p>
              
              {/* Quote details: Source and Category */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-sans font-extrabold text-[#735c00]">
                  — {wisdom.source}
                </span>
                <span className="px-2 py-0.5 bg-[#735c00]/6 text-[#735c00] rounded font-bold uppercase tracking-wider scale-90">
                  {wisdom.category}
                </span>
              </div>

              {/* Light divider line */}
              <div className="h-[1px] bg-gold-accent/15 w-full my-1" />

              {/* Explanation section */}
              <p className="text-[11px] font-sans font-medium text-on-surface-variant leading-relaxed">
                {wisdom.explanation}
              </p>
            </motion.div>
          ) : (
            <p className="text-xs text-on-surface-variant text-center py-4">
              Unable to load today's wisdom. Tap the button above to retry.
            </p>
          )}
        </div>
      </div>

      {/* Hero Welcome banner / Daily Deen Status */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-base to-primary-light text-white rounded-[28px] p-6 shadow-md border border-white/10 z-10">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-1/6 -translate-y-1/6">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-gold-accent animate-spin-slow" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-accent">Shahadat Masjid</span>
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2 text-white">Your streak is glowing!</h2>
          <p className="text-xs text-on-primary-container max-w-[260px] leading-relaxed mb-4">
            You are on a <strong className="text-gold-accent font-semibold">{streak} day streak</strong>. Keep completing your habits to preserve your momentum.
          </p>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate("habits")}
              className="px-4 py-2 bg-gold-accent hover:bg-[#c29d2b] text-primary-base font-sans font-bold text-xs rounded-full transition-all flex items-center gap-1 shadow-sm active:scale-95"
            >
              Continue Habits
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-on-primary-container block">Completed Today</span>
              <span className="text-sm font-sans font-bold text-white">{totalHabits - habitsLeft}/{totalHabits} • {completionPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Ayah block with Reflection capability */}
      <div className="relative bg-white border border-outline-variant/50 rounded-[28px] p-6 shadow-soft hover:shadow-md transition-shadow">
        <div className="absolute top-4 right-4 text-gold-accent/10 pointer-events-none">
          <Quote className="w-16 h-16" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#735c00] bg-gold-accent/10 px-3 py-1 rounded-full mb-3 inline-block">
            Today's Verse
          </span>
          <p className="font-serif text-lg md:text-xl font-bold leading-relaxed text-primary-base mb-3 italic">
            "{currentAyah.text}"
          </p>
          <p className="font-sans text-xs text-on-surface-variant font-semibold mb-5 flex items-center justify-between">
            <span>— {currentAyah.source}</span>
            <span className="text-[10px] text-[#735c00] font-normal italic bg-[#fed65b]/20 px-2 py-0.5 rounded-md">
              Tap to see others
            </span>
          </p>

          <div className="h-[1px] bg-outline-variant/40 w-full mb-4"></div>

          <div className="flex items-center justify-between gap-3">
            <button 
              onClick={handleNextAyah}
              className="text-xs font-semibold text-primary-base hover:text-primary-light flex items-center gap-1"
            >
              Next Verse
            </button>
            <button 
              onClick={() => setShowReflectModal(true)}
              className="px-5 py-2.5 bg-primary-base hover:bg-primary-light text-white font-sans font-bold text-xs rounded-full transition-colors active:scale-95 flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-gold-accent" />
              Write Reflection
            </button>
          </div>
        </div>
      </div>

      {/* AI Deen Assistant Banner */}
      <div 
        onClick={() => onNavigate("aideen")}
        className="relative overflow-hidden bg-[#fed65b]/8 border border-gold-accent/45 rounded-[28px] p-5 shadow-soft hover:shadow-md transition-all group cursor-pointer active:scale-[0.99]"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-accent/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex gap-4.5 items-center relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary-base text-[#fed65b] flex items-center justify-center font-bold text-xl drop-shadow-md group-hover:scale-105 transition-transform shrink-0">
            🤖
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-1.5 mb-1 select-none">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest text-[#735c00]">Ask AI Deen Scholar</span>
            </div>
            <h3 className="font-serif text-sm font-bold text-primary-base mb-1 group-hover:text-gold-accent transition-colors">
              Have questions about your Deen?
            </h3>
            <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed max-w-[250px]">
              Tap here to ask AI Deen about prayers, Hadiths, or Quranic wisdom instantly.
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-base/5 flex items-center justify-center text-primary-base group-hover:bg-primary-base group-hover:text-white transition-all shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 px-1">
          Quick Access
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onNavigate("prayer")}
            className="bg-white hover:bg-surface-container-low border border-outline-variant/50 p-5 rounded-[24px] shadow-sm flex flex-col items-start gap-4 text-left transition-all hover:border-gold-accent/40 group active:scale-95"
          >
            <div className="w-11 h-11 bg-primary-base/5 text-primary-base group-hover:bg-primary-base/10 rounded-2xl flex items-center justify-center transition-colors">
              <Compass className="w-5 h-5 text-primary-base" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-primary-base group-hover:text-gold-accent transition-colors">Prayer Times</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">{selectedLocation.split(",")[0]} & Compass</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate("habits")}
            className="bg-white hover:bg-surface-container-low border border-outline-variant/50 p-5 rounded-[24px] shadow-sm flex flex-col items-start gap-4 text-left transition-all hover:border-gold-accent/40 group active:scale-95"
          >
            <div className="w-11 h-11 bg-[#fed65b]/10 text-[#735c00] group-hover:bg-[#fed65b]/20 rounded-2xl flex items-center justify-center transition-colors">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-primary-base group-hover:text-gold-accent transition-colors">My Habits</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Salah, Quran & Charity</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate("quran")}
            className="bg-white hover:bg-surface-container-low border border-outline-variant/50 p-5 rounded-[24px] shadow-sm flex flex-col items-start gap-4 text-left transition-all hover:border-gold-accent/40 group active:scale-95"
          >
            <div className="w-11 h-11 bg-green-50 text-emerald-800 rounded-2xl flex items-center justify-center transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-primary-base group-hover:text-gold-accent transition-colors">Noble Quran</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Al-Fatihah, Al-Kahf & Audio</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate("planner")}
            className="bg-white hover:bg-surface-container-low border border-outline-variant/50 p-5 rounded-[24px] shadow-sm flex flex-col items-start gap-4 text-left transition-all hover:border-gold-accent/40 group active:scale-95"
          >
            <div className="w-11 h-11 bg-amber-50 text-amber-900 rounded-2xl flex items-center justify-center transition-colors">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-primary-base group-hover:text-gold-accent transition-colors">Deen Planner</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Ramadan Fasting Goals</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate("dhikr")}
            className="bg-white hover:bg-surface-container-low border border-outline-variant/50 p-5 rounded-[24px] shadow-sm flex flex-col items-start gap-4 text-left transition-all hover:border-gold-accent/40 group active:scale-95"
          >
            <div className="w-11 h-11 bg-indigo-50 text-indigo-800 rounded-2xl flex items-center justify-center transition-colors">
              <Sparkles className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-primary-base group-hover:text-gold-accent transition-colors">Dhikr Counter</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Auto-saved Daily Tasbih Goals</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate("duas")}
            className="bg-white hover:bg-surface-container-low border border-outline-variant/50 p-5 rounded-[24px] shadow-sm flex flex-col items-start gap-4 text-left transition-all hover:border-gold-accent/40 group active:scale-95"
          >
            <div className="w-11 h-11 bg-rose-50 text-rose-800 rounded-2xl flex items-center justify-center transition-colors">
              <Heart className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-primary-base group-hover:text-gold-accent transition-colors">Daily Duas</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Morning & After-Salah Prayers</p>
            </div>
          </button>
        </div>
      </div>

      {/* Masjid Donation Card (मस्जिद सहयोग पोर्टल) */}
      <div 
        onClick={handleOpenDonationModal}
        className="relative overflow-hidden bg-gradient-to-br from-[#012d1d] to-[#0b4a34] text-white rounded-[28px] p-6 shadow-lg border border-gold-accent/20 cursor-pointer hover:shadow-xl transition-all group active:scale-[0.99]"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transform translate-x-1/8 -translate-y-1/8 transition-transform group-hover:scale-110">
          <Coins className="w-32 h-32 text-gold-accent" />
        </div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 mb-1 bg-white/10 px-2.5 py-1 rounded-full w-fit">
              <Coins className="w-3.5 h-3.5 text-gold-accent" />
              <span className="text-[9px] uppercase font-sans font-extrabold tracking-widest text-[#fed65b]">Masjid Sadakah Portal</span>
            </div>
            <h3 className="font-serif text-lg font-black text-white leading-tight">
              Support Shahadat Masjid 🕌
            </h3>
            <p className="text-[10px] text-emerald-100 max-w-[280px] font-medium leading-relaxed">
              Help maintain your gaun ko masjid. Scan QR to pay via eSewa / Fonepay or Indian UPI channels instantly.
            </p>
          </div>
          <button 
            type="button"
            className="w-full py-2.5 bg-gold-accent hover:bg-[#c29d2b] text-primary-base font-sans font-black text-[11px] rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-md border-none cursor-pointer"
          >
            <span>Donate Now (सहयोग गर्नुहोस्)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Reflective Insights Log Showcase */}
      {savedReflections.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 px-1">
            My Recent Reflections
          </h3>
          <div className="space-y-3">
            {savedReflections.slice(0, 2).map((ref, i) => (
              <div key={i} className="bg-white border border-outline-variant/50 rounded-2xl p-4 text-xs shadow-inner">
                <div className="flex justify-between items-center mb-1 text-on-surface-variant select-none">
                  <span className="font-bold text-[#735c00]">{ref.ayah}</span>
                  <span>{ref.date}</span>
                </div>
                <p className="text-primary-base font-medium italic">"{ref.note}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reflection Journal entry modal */}
      <AnimatePresence>
        {showReflectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-serif text-lg font-bold text-primary-base">Ayah Reflection Notes</h3>
                  <p className="text-xs text-on-surface-variant">Write your personal insights on {currentAyah.source}</p>
                </div>
                <button 
                  onClick={() => setShowReflectModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary-base font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="bg-primary-base/5 p-3 rounded-xl border border-primary-base/15">
                <p className="text-xs italic text-primary-light font-serif">"{currentAyah.text}"</p>
              </div>

              <textarea 
                rows={3}
                placeholder="How does this ayah speak to your heart today? Reflect on your personal situation..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                className="w-full text-xs p-3.5 border border-outline-variant rounded-2xl focus:ring-1 focus:ring-gold-accent outline-none bg-surface-container-low"
              />

              {reflectionSuccess ? (
                <div className="bg-green-100 text-green-800 p-2.5 rounded-full text-center text-xs font-bold animate-pulse">
                  Reflection logged in your heart!
                </div>
              ) : (
                <button 
                  onClick={handleSaveReflection}
                  disabled={!reflectionText.trim()}
                  className="w-full py-3 bg-primary-base disabled:bg-primary-base/30 text-white font-bold text-xs rounded-full shadow hover:bg-primary-light transition-colors active:scale-95"
                >
                  Save Reflection
                </button>
              )}
            </motion.div>
          </div>
        )}

        {showDonationModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream-bg rounded-[28px] max-w-md w-full p-6 shadow-2xl relative border border-gold-accent/20 my-8 text-left"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-primary-base tracking-tight">Masjid Donation Support</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider text-gold-accent">Shahadat Masjid Cooperation Portal</p>
                </div>
                <button 
                  onClick={() => setShowDonationModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary-base font-bold text-sm border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {donationLogSuccess ? (
                /* SUCCESS SCREEN */
                <div className="space-y-4 py-4 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto border-2 border-gold-accent animate-bounce">
                    <Check className="w-8 h-8 text-semibold" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-lg font-black text-primary-base">SubhanAllah! Contribution Logged</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      JazakAllah Khair! Your donation of <strong className="text-emerald-800">Rs. {parseFloat(donationAmount).toLocaleString()}</strong> was logged successfully inside your profile history. May Allah accept your contribution!
                    </p>
                  </div>

                  {/* Summary Slip */}
                  <div className="bg-white border border-[#012d1d]/10 rounded-[20px] p-4 text-left text-xs space-y-2.5 font-sans relative">
                    <div className="absolute inset-0 islamic-pattern-bg opacity-[0.02] pointer-events-none rounded-[20px]"></div>
                    <div className="flex justify-between text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                      <span>Ref ID</span>
                      <span>{Date.now()}</span>
                    </div>
                    <div className="h-px bg-gray-100"></div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">To:</span>
                      <strong className="text-primary-base">Shahadat Masjid Support</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Donation Amount:</span>
                      <strong className="text-emerald-800 text-sm">Rs. {parseFloat(donationAmount).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Method:</span>
                      <strong className="text-primary-base font-semibold">
                        {paymentMethod === 'esewa' ? 'eSewa Wallet Transfer' : paymentMethod === 'bank' ? 'Global IME Bank Transfer' : 'Direct UPI / Paytm QR'}
                      </strong>
                    </div>
                    {donationNotes.trim() && (
                      <div className="flex justify-between items-start pt-1 border-t border-dashed border-gray-100">
                        <span className="text-gray-500 font-medium shrink-0">Notes & Duas:</span>
                        <span className="text-gray-600 font-medium text-right max-w-[200px] italic">"{donationNotes}"</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDonationModal(false)}
                    className="w-full py-3 mt-4 bg-[#012d1d] hover:bg-[#0d4d33] text-white font-sans font-bold text-xs rounded-full shadow transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Return to Home
                  </button>
                </div>
              ) : !donationIsValidated ? (
                /* STEP 1: FORM INPUTS WITH VALIDATION CHECK */
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-[#012d1d]/5 p-3.5 rounded-2xl border border-[#012d1d]/10 text-[11px] leading-relaxed text-[#012d1d]/90 font-medium">
                    🕌 Welcome! Enter your support amount and select a payments option to reveal the verified QR scans or direct bank deposit details.
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                      Support Amount (सहयोग रकम) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-[15px] top-1/2 -translate-y-1/2 font-serif text-sm font-black text-primary-base">Rs.</span>
                      <input 
                        type="number"
                        placeholder="e.g. 500"
                        min="1"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        className="w-full text-xs py-3.5 pl-10 pr-4 border border-outline-variant rounded-2xl focus:ring-1 focus:ring-gold-accent outline-none bg-white font-bold text-primary-base placeholder-on-surface-variant/40"
                      />
                    </div>

                    {/* Pre-select shortcuts for fast usage */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {[150, 500, 1000, 2500].map((shortcut) => (
                        <button
                          key={shortcut}
                          type="button"
                          onClick={() => setDonationAmount(shortcut.toString())}
                          className="py-1.5 bg-white border border-outline-variant/30 hover:border-gold-accent rounded-lg text-[10px] font-bold text-primary-base transition-all active:scale-[0.95]"
                        >
                          +{shortcut}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment option Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                      Choose Support Channel (भुक्तानी च्यानल रोज्नुहोस्) *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {/* eSewa Wallet */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('esewa');
                          setDonationOrigin('nepal');
                        }}
                        className={`p-3 rounded-2xl transition-all border text-left cursor-pointer flex flex-col justify-between h-auto gap-1 shadow-sm ${
                          paymentMethod === 'esewa' 
                            ? 'bg-emerald-950/5 border-[#012d1d] text-[#012d1d] ring-1 ring-[#012d1d]' 
                            : 'bg-white border-outline-variant/30 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${paymentMethod === 'esewa' ? 'bg-[#012d1d] text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-xs">eSewa Wallet</p>
                            <p className="text-[9px] text-[#735c00] font-bold">Local Nepal NPR</p>
                          </div>
                        </div>
                        <p className="text-[9.5px] mt-2 leading-relaxed opacity-80">Scan Fonepay/eSewa QR Code or enter mobile eSewa Wallet ID.</p>
                      </button>

                      {/* Bank Transfer */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('bank');
                          setDonationOrigin('nepal');
                        }}
                        className={`p-3 rounded-2xl transition-all border text-left cursor-pointer flex flex-col justify-between h-auto gap-1 shadow-sm ${
                          paymentMethod === 'bank' 
                            ? 'bg-emerald-950/5 border-[#012d1d] text-[#012d1d] ring-1 ring-[#012d1d]' 
                            : 'bg-white border-outline-variant/30 text-gray-500 hover:border-gray-300 font-sans'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-sans">
                          <div className={`p-1.5 rounded-lg ${paymentMethod === 'bank' ? 'bg-[#012d1d] text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <Coins className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-xs font-sans">Bank Transfer</p>
                            <p className="text-[9px] text-[#735c00] font-bold font-sans">Direct Deposit</p>
                          </div>
                        </div>
                        <p className="text-[9.5px] mt-2 leading-relaxed opacity-80 font-sans">Direct deposit with custom Bank QR or Global IME Account Number.</p>
                      </button>
                    </div>
                  </div>

                  {/* Optional Notes/Duas */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                      Notes & Duas (वैकल्पिक टिप्पणी वा दुआ)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. For general mosque upkeep, or a prayer request..."
                      value={donationNotes}
                      onChange={(e) => setDonationNotes(e.target.value)}
                      className="w-full text-xs p-3 border border-outline-variant rounded-2xl focus:ring-1 focus:ring-gold-accent outline-none bg-white placeholder-on-surface-variant/40"
                    />
                  </div>

                  {/* Proceed Validation Block */}
                  <button
                    type="button"
                    onClick={() => {
                      const num = parseFloat(donationAmount);
                      if (isNaN(num) || num <= 0) {
                        alert("Please enter a valid donation amount to proceed.");
                        return;
                      }
                      setDonationIsValidated(true);
                    }}
                    className="w-full py-3 bg-[#012d1d] hover:bg-[#0d4d33] text-white font-sans font-bold text-xs rounded-full shadow-lg transition-all active:scale-[0.98] cursor-pointer mt-4"
                  >
                    Proceed to View Details & Preview (विवरण हेर्नुहोस्)
                  </button>
                </div>
              ) : (
                /* STEP 2: PREVIEW CARD & BANK/QR DETAILS REVEALED */
                <div className="space-y-4 animate-fade-in text-xs font-sans">
                  
                  {/* --- VERIFIED PREVIEW CARD (displays selected option clearly) --- */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#012d1d] via-[#02402b] to-[#0d5e42] border-2 border-gold-accent/40 rounded-[24px] p-5 text-white shadow-xl flex flex-col justify-between">
                    <div className="absolute inset-0 islamic-pattern-bg opacity-[0.03] pointer-events-none"></div>
                    
                    {/* Header elements of preview slip */}
                    <div className="flex justify-between items-start mb-3 relative z-10 border-b border-white/10 pb-2">
                      <div className="text-left">
                        <span className="text-[8px] uppercase font-extrabold tracking-widest text-[#fed65b] block">Masjid Support Card</span>
                        <h4 className="font-serif text-xs font-bold text-[#fed65b]">Shahadat Masjid</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] bg-white/20 text-[#fed65b] border border-white/20 px-2 py-0.5 rounded-full font-bold uppercase font-sans">
                          {paymentMethod === 'esewa' ? 'ESEWA PREVIEW' : 'BANK PREVIEW'}
                        </span>
                      </div>
                    </div>

                    {/* Prominent display of amount and validation */}
                    <div className="text-center py-3 relative z-10">
                      <p className="text-[9px] text-[#dbfbf0] font-sans font-bold uppercase tracking-wider">Amount To Contribute</p>
                      <p className="font-serif text-2xl font-black text-[#fed65b] tracking-wider mt-1">
                        Rs. {parseFloat(donationAmount).toLocaleString()}
                      </p>
                    </div>

                    {/* Method Description and detail highlights */}
                    <div className="flex justify-between items-center bg-black/15 border border-white/5 p-2.5 rounded-xl text-[10px] relative z-10">
                      <div className="text-left font-sans">
                        <p className="text-emerald-200 font-bold text-[8.5px] uppercase font-sans">Selected Gate:</p>
                        <p className="font-semibold text-white mt-0.5 font-sans">
                          {paymentMethod === 'esewa' 
                            ? 'eSewa Mobile Wallet' 
                            : 'Global IME Direct Bank Account'}
                        </p>
                      </div>
                      <div className="text-right font-sans">
                        <p className="text-emerald-200 font-bold text-[8.5px] uppercase font-sans">Origin:</p>
                        <p className="font-sans font-semibold text-white mt-0.5 font-sans">🇳🇵 Nepal Account</p>
                      </div>
                    </div>
                  </div>

                  {/* QR SCAN DETAILS / TRANSFER PARAMETERS COPIERS */}
                  <div className="space-y-3 pt-1">
                    {paymentMethod === 'esewa' && (
                      <div className="space-y-3 animate-fade-in">
                        {/* Nepal QR Instructions */}
                        <p className="text-[10px] font-medium text-emerald-950 leading-relaxed bg-[#012d1d]/5 p-2.5 rounded-xl border border-[#012d1d]/10">
                          ℹ️ {(donation || {}).instructions || "कृपया eSewa वा Fonepay QR स्क्यान गरी शाहदत् मस्जिदलाई सहयोग प्रदान गर्नुहोस्।"}
                        </p>

                        {/* QR Code Container */}
                        <div className="p-3 bg-white rounded-2xl border border-outline-variant/40 shadow-inner flex flex-col items-center justify-center">
                          {(donation || {}).esewaQrUrl ? (
                            <div className="w-44 h-44 bg-white flex items-center justify-center relative p-1.5 border border-gray-100 rounded-xl shadow-sm">
                              <img 
                                src={(donation || {}).esewaQrUrl} 
                                alt="Masjid eSewa / Fonepay QR Code" 
                                className="w-full h-full object-contain" 
                              />
                            </div>
                          ) : (
                            <div className="w-44 h-44 bg-green-50/40 border border-dashed border-emerald-900/20 rounded-2xl flex flex-col items-center justify-center p-3 text-center select-none">
                              <QrCode className="w-10 h-10 text-emerald-900/40 mb-1 animate-pulse" />
                              <p className="text-[11px] font-bold text-emerald-950">eSewa QR Code Not Uploaded</p>
                            </div>
                          )}
                          <span className="text-[9px] text-[#735c00] font-extrabold uppercase mt-2 tracking-wider flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" /> Nepal Masjid Scan QR Code
                          </span>
                        </div>

                        {/* Wallet ID */}
                        {(donation || {}).esewaId && (
                          <div className="flex items-center justify-between p-2.5 bg-white border border-outline-variant/30 rounded-xl">
                            <div className="text-left text-[11px]">
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider leading-none">eSewa Wallet ID (Phone / Contact)</p>
                              <p className="text-xs font-bold text-emerald-950 font-mono mt-1">{(donation || {}).esewaId}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText((donation || {}).esewaId, 'esewa')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-sans font-bold text-[9px] rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1 active:scale-95"
                            >
                              {copiedField === 'esewa' ? (
                                <>
                                  <Check className="w-3 h-3 text-gold-accent" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy ID</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === 'bank' && (
                      <div className="space-y-3 animate-fade-in">
                        <p className="text-[10px] font-medium text-emerald-950 leading-relaxed bg-[#012d1d]/5 p-2.5 rounded-xl border border-[#012d1d]/10">
                          🏦 Please make the transfer using details below. Always ensure A/C number matches exactly before transferring.
                        </p>

                        {/* Direct Bank Account QR Image */}
                        {(donation || {}).bankQrUrl && (
                          <div className="p-3 bg-white rounded-2xl border border-outline-variant/40 shadow-inner flex flex-col items-center justify-center">
                            <div className="w-44 h-44 bg-white flex items-center justify-center relative p-1.5 border border-gray-100 rounded-xl shadow-sm">
                              <img 
                                src={(donation || {}).bankQrUrl} 
                                alt="Direct Bank Transfer QR Code" 
                                className="w-full h-full object-contain" 
                              />
                            </div>
                            <span className="text-[9px] text-[#735c00] font-extrabold uppercase mt-2 tracking-wider flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5" /> Direct Bank Account QR Code
                            </span>
                          </div>
                        )}

                        <div className="bg-white border border-outline-variant/30 rounded-2xl p-3.5 space-y-2.5">
                          <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl">
                            <div className="text-left text-[11px]">
                              <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Bank Name (बैंकको नाम)</p>
                              <p className="font-bold text-primary-base mt-1">{(donation || {}).bankName || "Global IME Bank Limited"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText((donation || {}).bankName || "Global IME Bank Limited", 'bankName')}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-base transition-colors border-none cursor-pointer"
                            >
                              {copiedField === 'bankName' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl">
                            <div className="text-left text-[11px]">
                              <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Account Name (खातावालाको नाम)</p>
                              <p className="font-bold text-primary-base mt-1">{(donation || {}).accountHolder || "Shahadat Masjid Committee"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText((donation || {}).accountHolder || "Shahadat Masjid Committee", 'accountHolder')}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-base transition-colors border-none cursor-pointer"
                            >
                              {copiedField === 'accountHolder' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex justify-between items-center bg-[#735c00]/5 border border-[#735c00]/15 p-2.5 rounded-xl">
                            <div className="text-left text-[11px]">
                              <p className="text-[8px] font-black text-[#735c00] uppercase leading-none">Account Number (खाता नम्बर)</p>
                              <p className="font-extrabold font-mono text-emerald-950 text-xs mt-1.5">{(donation || {}).accountNumber || "0102030405060708"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText((donation || {}).accountNumber || "0102030405060708", 'accountNumber')}
                              className="px-2.5 py-1 bg-[#735c00]/15 text-[#735c00] hover:bg-[#735c00]/25 font-sans font-black text-[9px] rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1"
                            >
                              {copiedField === 'accountNumber' ? (
                                <>
                                  <Check className="w-3 h-3 text-[#735c00]" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {((donation || {}).branchName) && (
                            <div className="bg-gray-50/50 p-2 rounded-xl text-left text-[11px]">
                              <p className="text-[8px] font-bold text-gray-400 uppercase leading-none font-sans">Branch / Area (शाखा)</p>
                              <p className="font-bold text-primary-base mt-1">{(donation || {}).branchName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                    {/* Inquiry phone */}
                    <div className="flex items-center gap-2 bg-[#012d1d]/5 p-2.5 rounded-xl border border-[#012d1d]/10 text-[9px] text-emerald-950 font-bold justify-center">
                      <Phone className="w-3 h-3 text-gold-accent shrink-0" />
                      <span>Committee Support: {(donation || {}).contactPhone || "+977-9841123456"}</span>
                    </div>

                    {/* Mandatory Payment Confirmation Option */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                      confirmStatusChecked 
                        ? 'bg-emerald-50/40 border-emerald-500/30 text-emerald-900 shadow-sm' 
                        : 'bg-amber-50/50 border-amber-200/50 text-amber-900 animate-pulse'
                    }`}>
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={confirmStatusChecked}
                          onChange={(e) => setConfirmStatusChecked(e.target.checked)}
                          className="w-4 h-4 rounded mt-0.5 border-amber-300 text-[#012d1d] focus:ring-[#012d1d] accent-[#012d1d]"
                        />
                        <div className="text-left">
                          <p className="font-extrabold text-[11px] uppercase tracking-wide">
                            Confirm Successful Transfer (भुक्तानी सम्पन्न भएको पुष्टि) *
                          </p>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-relaxed">
                            मैले माथि उल्लेखित विवरणमा सफलतापूर्वक रकम पठाइसकें र यो वास्तविक सहयोग हो भन्ने पुष्टि गर्दछु। (I confirm that I have successfully sent the payment and want to submit this log.)
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* ACTIONS BUTTONS FOR SAVING LOG */}
                    <div className="grid grid-cols-5 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDonationIsValidated(false)}
                        className="col-span-2 py-3 border border-outline-variant/60 rounded-full text-[11px] font-bold text-primary-base bg-white hover:bg-surface-container transition-all cursor-pointer border-none shadow-sm text-center"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleLogDonation}
                        disabled={!confirmStatusChecked}
                        className={`col-span-3 py-3 font-black text-[11px] rounded-full shadow-lg transition-all border-none flex items-center justify-center gap-1.5 ${
                          confirmStatusChecked
                            ? "bg-gradient-to-r from-gold-accent to-[#c29d2b] hover:from-[#c29d2b] hover:to-gold-accent text-primary-base cursor-pointer active:scale-[0.98]"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Log Contribution</span>
                      </button>
                    </div>
                  </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
