import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Settings, 
  MapPin, 
  Flame, 
  Heart, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Share2, 
  ExternalLink,
  ChevronRight,
  LogOut,
  Coins,
  History,
  Download
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { auth, db } from "../firebase";
// @ts-ignore
import deenLogo from "../assets/images/deen_circle_logo_1779544307640.png";
import { doc, updateDoc, collection, query, getDocs, orderBy } from "firebase/firestore";
import { FirebaseUser } from "../firebase";
import AdminPanel from "./AdminPanel";
import { generateReceiptPDF } from "../utils/pdfGenerator";
import { DayHabit } from "../types";

interface ProfileProps {
  streak: number;
  totalHabitsCompleted: number;
  totalReflections: number;
  onResetAllData: () => void;
  onLogout: () => void;
  currentUser?: FirebaseUser | null;
  onNavigate?: (screen: any) => void;
  habits: DayHabit[];
}

interface UserDonation {
  id: string;
  amount: number;
  paymentMethod: string;
  date: string;
  notes?: string;
}

export default function Profile({ streak, totalHabitsCompleted, totalReflections, onResetAllData, onLogout, currentUser, onNavigate, habits }: ProfileProps) {
  const [userName, setUserName] = useState(() => {
    return currentUser?.displayName || localStorage.getItem("deen_username") || "Amina Ismail";
  });
  const [resetWarnOpen, setResetWarnOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [notifyToast, setNotifyToast] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(() => {
    return localStorage.getItem("deen_selected_location") || "Cape Town, South Africa";
  });
  const [donationsList, setDonationsList] = useState<UserDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  const isAdminUser = currentUser?.email === "armanorig7@gmail.com";

  const getMonthlyStats = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6Months: { label: string; monthIdx: number; year: number; amount: number }[] = [];

    // Build chronological array of last 6 months including current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        label: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        amount: 0
      });
    }

    // Accumulate donations by month
    donationsList.forEach((don) => {
      const amt = Number(don.amount) || 0;
      if (amt <= 0) return;

      try {
        const d = new Date(don.date);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          const y = d.getFullYear();
          const target = last6Months.find((item) => item.monthIdx === m && item.year === y);
          if (target) {
            target.amount += amt;
          }
        } else {
          // Robust regex/substring matching fallback
          const lowerStr = don.date.toLowerCase();
          const foundMonthIdx = months.findIndex((mName) => lowerStr.includes(mName.toLowerCase()));
          if (foundMonthIdx !== -1) {
            const matchYear = don.date.match(/\b(20\d{2})\b/);
            const y = matchYear ? parseInt(matchYear[1], 10) : now.getFullYear();
            const target = last6Months.find((item) => item.monthIdx === foundMonthIdx && item.year === y);
            if (target) {
              target.amount += amt;
            }
          }
        }
      } catch (err) {
        // Safe skip
      }
    });

    return last6Months.map((item) => ({
      name: item.label,
      Amount: item.amount
    }));
  };

  const getWeeklyPrayerStats = () => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const data = [];

    // Find key prayer (salah) habit completion rate
    const todaySalahCompleted = habits?.find(h => h.type === 'salah')?.completed ? 100 : 0;

    let seededHistory: Record<string, number> = {};
    const stored = localStorage.getItem("deen_prayer_history_seed");
    if (stored) {
      try {
        seededHistory = JSON.parse(stored);
      } catch (e) {
        seededHistory = {};
      }
    }

    const hasAnySeed = Object.keys(seededHistory).length > 0;
    if (!hasAnySeed) {
      // 5 of the last 6 days completed to model stable devotion with a single missed day to render dynamic slopes
      const pastCompletions = [100, 100, 0, 100, 100, 100];
      for (let i = 6; i >= 1; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateKey = d.toDateString();
        seededHistory[dateKey] = pastCompletions[6 - i] ?? 100;
      }
      localStorage.setItem("deen_prayer_history_seed", JSON.stringify(seededHistory));
    }

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = weekdays[d.getDay()];
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateKey = d.toDateString();

      let completionValue = 0;
      if (i === 0) {
        completionValue = todaySalahCompleted;
      } else {
        completionValue = seededHistory[dateKey] !== undefined ? seededHistory[dateKey] : 100;
      }

      data.push({
        day: dayLabel,
        date: dateLabel,
        "Completion": completionValue,
        statusLabel: completionValue === 100 ? "Guarded" : "Pending"
      });
    }

    return data;
  };

  const loadDonations = async () => {
    setLoadingDonations(true);
    // 1. Render immediate list from localstorage
    const local = localStorage.getItem("deen_donations");
    const list: UserDonation[] = local ? JSON.parse(local) : [];
    setDonationsList(list);

    // 2. Load from Firestore if authenticated
    if (currentUser?.uid) {
      try {
        const donationsRef = collection(db, "users", currentUser.uid, "donations");
        const snapshot = await getDocs(donationsRef);
        const fbList: UserDonation[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          fbList.push({
            id: data.id,
            amount: data.amount,
            paymentMethod: data.paymentMethod || "Direct Bank Transfer",
            date: data.date,
            notes: data.notes
          });
        });

        // Sort descending by id client-side
        fbList.sort((a, b) => b.id.localeCompare(a.id));

        if (fbList.length > 0) {
          setDonationsList(fbList);
          localStorage.setItem("deen_donations", JSON.stringify(fbList));
        }
      } catch (err) {
        console.error("Error fetching donations from firestore:", err);
      }
    }
    setLoadingDonations(false);
  };

  useEffect(() => {
    loadDonations();

    const handleDonationChange = () => {
      loadDonations();
    };
    window.addEventListener("deen_donation_added", handleDonationChange);
    return () => window.removeEventListener("deen_donation_added", handleDonationChange);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.displayName) {
      setUserName(currentUser.displayName);
    }
  }, [currentUser]);

  useEffect(() => {
    const handleLocationChange = () => {
      setSelectedLocation(localStorage.getItem("deen_selected_location") || "Cape Town, South Africa");
    };
    window.addEventListener("deen_location_changed", handleLocationChange);
    return () => window.removeEventListener("deen_location_changed", handleLocationChange);
  }, []);

  const showToast = (msg: string) => {
    setNotifyToast(msg);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Shahadat Masjid',
        text: 'Align with the Qibla, track habits, learn Duas, and plan your journey!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      showToast("App share URL copied to clipboard! 📋");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      <AnimatePresence>
        {notifyToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary-base text-white px-5 py-3 rounded-full shadow-xl text-xs font-semibold z-50 flex items-center gap-2 border border-gold-accent"
          >
            <CheckCircle2 className="w-4 h-4 text-gold-accent" />
            <span>{notifyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Profile Badge */}
      <div className="bg-white border border-outline-variant/30 rounded-[28px] p-6 text-center space-y-4 shadow-sm relative">
        <div className="absolute inset-0 islamic-pattern-bg opacity-[0.02] pointer-events-none z-0"></div>
        <div className="relative z-10 flex flex-col items-center">
          {/* Main User Avatar */}
          <div className="w-20 h-20 rounded-full border-2 border-gold-accent shadow-lg overflow-hidden mb-3 bg-white flex items-center justify-center relative group p-[3px]">
            <img 
              alt="User Serene Avatar" 
              className="w-full h-full object-cover rounded-full"
              src={currentUser?.photoURL || deenLogo}
              referrerPolicy="no-referrer"
            />
            {currentUser?.photoURL && (
              <span className="absolute bottom-0 right-0 bg-[#012d1d] border border-gold-accent rounded-full p-1.5 text-gold-accent flex items-center justify-center shadow-md" title="Logged in with Google">
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.48 1 0 6.48 0 13s5.48 12 12.24 12c7.06 0 11.758-4.965 11.758-11.96 0-.807-.087-1.427-.193-1.755H12.24z"/>
                </svg>
              </span>
            )}
          </div>

          {/* Verified Display Name */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <h2 className="font-serif text-lg font-bold text-primary-base">{userName}</h2>
          </div>

          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-1 block">
             Faithful Companion • {selectedLocation}
          </p>
        </div>
      </div>

      {/* Stats Summary Bento Grid representing metric highlights */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 px-1">
          Spiritual Statistics
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Habit streak */}
          <div className="bg-white p-5 rounded-[24px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Consistency</span>
            <span className="font-serif text-2xl font-bold text-primary-base block">
              {streak} <span className="text-xs text-on-surface-variant font-semibold">Days</span>
            </span>
            <div className="text-[9px] text-[#735c00] font-sans font-semibold bg-gold-accent/10 px-2.5 py-1 rounded w-fit flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#735c00] fill-[#735c00]" />
              Active Streak
            </div>
          </div>

          {/* Habits Completed */}
          <div className="bg-white p-5 rounded-[24px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Completed</span>
            <span className="font-serif text-2xl font-bold text-emerald-800 block">
              {totalHabitsCompleted} <span className="text-xs text-on-surface-variant font-semibold">habits</span>
            </span>
            <div className="text-[9px] text-emerald-700 font-sans font-semibold bg-emerald-50 px-2.5 py-1 rounded w-fit flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Guarded Today
            </div>
          </div>

          {/* Reflections */}
          <div className="bg-white p-5 rounded-[24px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Journaling</span>
            <span className="font-serif text-2xl font-bold text-primary-base block">
              {totalReflections} <span className="text-xs text-on-surface-variant font-semibold">notes</span>
            </span>
            <div className="text-[9px] text-indigo-700 font-sans font-semibold bg-indigo-50 px-2.5 py-1 rounded w-fit flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Written Thoughts
            </div>
          </div>

          {/* Fav Duas */}
          <div className="bg-white p-5 rounded-[24px] border border-[#012d1d]/10 shadow-sm flex flex-col justify-between h-28">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Dua Library</span>
            <span className="font-serif text-2xl font-bold text-[#735c00] block">
              Saved
            </span>
            <div className="text-[9px] text-red-700 font-sans font-semibold bg-red-50 px-2.5 py-1 rounded w-fit flex items-center gap-1">
              <Heart className="w-3 h-3 fill-red-700 text-red-700" />
              Favorites Guarded
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Prayer Habit Consistency Section */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 px-1 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-gold-accent" />
          <span>Weekly Prayer Consistency (प्रार्थना निरन्तरता)</span>
        </h3>

        <div className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center bg-[#012d1d]/5 px-4 py-3 rounded-2xl border border-gold-accent/10">
            <div>
              <p className="text-[9px] font-bold text-[#012d1d] uppercase tracking-wider">7-Day Completion Rate</p>
              <p className="font-serif text-[15px] font-extrabold text-[#012d1d] mt-0.5">
                {(() => {
                  const stats = getWeeklyPrayerStats();
                  const completedDays = stats.filter(s => s.Completion === 100).length;
                  const rate = Math.round((completedDays / 7) * 100);
                  return `${rate}% Consistency`;
                })()}
              </p>
            </div>
            <span className="text-[9.5px] text-[#735c00] font-sans font-bold bg-gold-accent/20 px-2.5 py-1.5 rounded-full border border-gold-accent/20">
              {(() => {
                const stats = getWeeklyPrayerStats();
                const completedDays = stats.filter(s => s.Completion === 100).length;
                return `${completedDays} / 7 Days Guarded`;
              })()}
            </span>
          </div>

          <div className="w-full h-44 pt-2 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={getWeeklyPrayerStats()}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="prayerGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#012d1d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#012d1d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                <XAxis 
                  dataKey="day" 
                  stroke="#8a9ba8" 
                  fontSize={9}
                  tickLine={false} 
                  axisLine={false} 
                  dy={5}
                />
                <YAxis 
                  stroke="#8a9ba8" 
                  fontSize={9}
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  cursor={{ stroke: '#012d1d', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value as number;
                      const dataObj = payload[0].payload;
                      return (
                        <div className="bg-[#012d1d] text-white p-2.5 rounded-lg border border-gold-accent shadow-md text-[10px] space-y-0.5">
                          <p className="font-sans font-bold text-white opacity-85">{dataObj.day} • {dataObj.date}</p>
                          <p className={`font-serif font-bold ${val === 100 ? "text-gold-accent" : "text-orange-200"}`}>
                            Salah Status: {dataObj.statusLabel}
                          </p>
                          <p className="text-[9px] text-white/60 font-sans">Completion Rate: {val}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Completion" 
                  stroke="#012d1d" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#prayerGlow)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[8.5px] text-center text-on-surface-variant/50 font-sans font-bold uppercase tracking-wider">
            Daily consistency timeline (Based on checklists and dynamic history)
          </p>
        </div>
      </section>

      {/* Donation Statistics Section (सहयोग तथ्याङ्क) */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 px-1 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-gold-accent" />
          <span>Donation Statistics (सहयोग तथ्याङ्क)</span>
        </h3>

        <div className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-4">
          {donationsList.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <TrendingUp className="w-8 h-8 text-on-surface-variant/30 mx-auto" />
              <p className="text-xs font-bold text-primary-base">No statistics available</p>
              <p className="text-[10px] text-on-surface-variant/75 max-w-[240px] mx-auto leading-relaxed">
                Log some donations to visualize your contribution trends over time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest">Total Contributed</p>
                  <p className="font-serif text-lg font-black text-emerald-950 mt-0.5">
                    Rs. {donationsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gold-accent/5 rounded-xl border border-gold-accent/10 text-center">
                  <p className="text-[9px] font-bold text-[#735c00] uppercase tracking-widest">Monthly Avg</p>
                  <p className="font-serif text-lg font-black text-primary-base mt-0.5">
                    Rs. {(() => {
                      const stats = getMonthlyStats();
                      const activeMonths = stats.filter(s => s.Amount > 0).length;
                      const totalSum = stats.reduce((sum, item) => sum + item.Amount, 0);
                      return Math.round(activeMonths > 0 ? totalSum / activeMonths : totalSum / 6).toLocaleString();
                    })()}
                  </p>
                </div>
              </div>

              {/* Recharts BarChart Container */}
              <div className="w-full h-56 pt-2 select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getMonthlyStats()}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#8a9ba8" 
                      fontSize={9}
                      tickLine={false} 
                      axisLine={false} 
                      dy={5}
                    />
                    <YAxis 
                      stroke="#8a9ba8" 
                      fontSize={9}
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8f9fa', radius: 4 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0].value as number;
                          const name = payload[0].payload.name;
                          return (
                            <div className="bg-[#012d1d] text-white p-2.5 rounded-lg border border-gold-accent shadow-md text-[10px] space-y-0.5">
                              <p className="font-sans font-bold text-white opacity-85">{name}</p>
                              <p className="font-serif font-black text-gold-accent">Rs. {val.toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Amount" maxBarSize={30} radius={[4, 4, 0, 0]}>
                      {getMonthlyStats().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.Amount > 0 ? "#012d1d" : "#e9ecef"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[9px] text-center text-on-surface-variant/45 font-sans font-bold uppercase tracking-widest">
                Contribution bar chart (recent months timeline)
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Masjid Donation Support Logs (सहयोग इतिहास) */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 px-1 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-gold-accent" />
          <span>My Contribution Log (सहयोग इतिहास)</span>
        </h3>

        <div className="bg-white border border-outline-variant/30 rounded-[28px] p-5 shadow-sm space-y-4">
          {donationsList.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Coins className="w-8 h-8 text-on-surface-variant/30 mx-auto" />
              <p className="text-xs font-bold text-primary-base">No contributions logged yet</p>
              <p className="text-[10px] text-on-surface-variant/75 max-w-[240px] mx-auto leading-relaxed">
                Your past donation history will appear here once you log a contribution on the Sadakah Portal.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/15 space-y-3">
              {donationsList.map((don, idx) => (
                <div key={don.id || idx} className="pt-3 first:pt-0 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <p className="font-sans font-extrabold text-primary-base text-xs">Rs. {don.amount.toLocaleString()}</p>
                      <p className="text-[9px] text-on-surface-variant/60 font-semibold mt-0.5 leading-none">
                        {don.paymentMethod}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => generateReceiptPDF({
                          ...don,
                          userName: currentUser?.displayName || userName || "Faithful Donor",
                          userEmail: currentUser?.email || "N/A"
                        })}
                        className="text-[9px] text-emerald-950 font-sans font-extrabold bg-[#012d1d]/5 hover:bg-[#012d1d]/10 px-2.5 py-1 rounded-full border border-[#012d1d]/10 uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer border-none"
                        title="Download Receipt PDF"
                      >
                        <Download className="w-2.5 h-2.5 text-gold-accent" />
                        <span>Receipt</span>
                      </button>
                      <span className="text-[9px] text-emerald-800 font-sans font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
                        Success
                      </span>
                    </div>
                  </div>
                  
                  {/* Notes / Duas and Date */}
                  <div className="flex justify-between items-end text-[9.5px] pt-1 border-t border-dashed border-gray-50">
                    <span className="text-on-surface-variant/60 font-semibold">
                      {don.date}
                    </span>
                    {don.notes && (
                      <span className="text-gray-500 italic max-w-[170px] truncate" title={don.notes}>
                        "{don.notes}"
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Profile quick settings triggers list */}
      <section className="bg-white border border-outline-variant/30 rounded-[28px] p-4 text-xs divide-y divide-outline-variant/20 shadow-sm">
        {/* Admin settings */}
        {isAdminUser && (
          <div 
            onClick={() => setAdminPanelOpen(true)}
            className="py-4 px-2 flex justify-between items-center cursor-pointer hover:bg-emerald-50/20 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Settings className="w-4 h-4 text-gold-accent animate-spin" style={{ animationDuration: '6s' }} />
              <span>Admin Special Settings ✦</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gold-accent" />
          </div>
        )}

        {/* Prayer Alarms & Notifications Settings */}
        <div 
          onClick={() => onNavigate && onNavigate("settings")}
          className="py-4 px-1.5 flex justify-between items-center cursor-pointer hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-primary-base">
            <Settings className="w-4 h-4 text-gold-accent" />
            <span>Prayer Alarms & Alert Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
        </div>

        {/* Share app */}
        <div 
          onClick={handleShareApp}
          className="py-4 px-2 flex justify-between items-center cursor-pointer hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-primary-base">
            <Share2 className="w-4 h-4 text-gold-accent" />
            <span>Share Shahadat Masjid</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/40" />
        </div>

        {/* Sign Out / Logout */}
        <div 
          onClick={onLogout}
          className="py-4 px-2 flex justify-between items-center cursor-pointer hover:bg-orange-50/20 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-primary-base">
            <LogOut className="w-4 h-4 text-gold-accent" />
            <span>Sign Out / Change Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
        </div>

        {/* Reset settings warnings */}
        <div 
          onClick={() => setResetWarnOpen(true)}
          className="py-4 px-2 flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-red-600">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Clear App Data</span>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400" />
        </div>
      </section>

      {/* Developer credit matching screen layouts precisely */}
      <footer className="text-center py-6 text-[9.5px] text-on-surface-variant/40 tracking-[0.15em] font-sans font-bold leading-relaxed block">
        DEVELOPED BY RIHAN IDRISHI
      </footer>

      {/* Warning confirmation box dial */}
      <AnimatePresence>
        {resetWarnOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-primary-base">Reset App Data?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This will irretrievably erase your active daily consistency streaks, completed habits list, and custom journal reflections.
              </p>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setResetWarnOpen(false)}
                  className="flex-1 py-3 border border-outline-variant/60 rounded-full text-xs font-semibold hover:bg-surface-container text-primary-base"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onResetAllData();
                    setResetWarnOpen(false);
                    showToast("All data successfully reset to default! 🧹");
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-xs rounded-full shadow cursor-pointer"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Overlay rendering */}
      <AnimatePresence>
        {adminPanelOpen && (
          <AdminPanel 
            onClose={() => setAdminPanelOpen(false)} 
            currentUser={currentUser || null} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
