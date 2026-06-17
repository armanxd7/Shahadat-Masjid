import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Settings, 
  Megaphone, 
  MapPin, 
  Sparkles, 
  Heart, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Clock, 
  ShieldCheck, 
  Info,
  BookOpen,
  Coins,
  Upload,
  History,
  Download,
  Search,
  FileText
} from "lucide-react";
import { FirebaseUser, db } from "../firebase";
import { LOCATION_DATA } from "../utils/prayerTimesHelpers";
import { collection, collectionGroup, getDocs, query, orderBy } from "firebase/firestore";
import { generateReceiptPDF } from "../utils/pdfGenerator";

interface AdminPanelProps {
  onClose: () => void;
  currentUser: FirebaseUser | null;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

const LOCATION_CITIES = [
  "Cape Town, South Africa",
  "Mecca, Saudi Arabia",
  "Medina, Saudi Arabia",
  "London, United Kingdom",
  "Cairo, Egypt",
  "New York, United States",
  "Kathmandu, Nepal",
  "New Delhi, India"
];

export default function AdminPanel({ onClose, currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"general" | "prayer" | "wisdom" | "duas" | "donation" | "contributions">("general");
  const [loading, setLoading] = useState(true);
  const [allDonations, setAllDonations] = useState<any[]>([]);
  const [loadingDonationsList, setLoadingDonationsList] = useState(false);
  const [contributionsSearchQuery, setContributionsSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const queryClean = contributionsSearchQuery.trim().toLowerCase();
  const filteredDonations = allDonations.filter(don => {
    if (!queryClean) return true;
    return (
      don.userName.toLowerCase().includes(queryClean) ||
      don.userEmail.toLowerCase().includes(queryClean) ||
      don.id.toLowerCase().includes(queryClean) ||
      don.paymentMethod.toLowerCase().includes(queryClean) ||
      (don.notes && don.notes.toLowerCase().includes(queryClean))
    );
  });

  const totalSum = filteredDonations.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = filteredDonations.length;
  const averageAmount = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;

  const fetchAllDonations = async () => {
    setLoadingDonationsList(true);
    try {
      let snapshot;
      try {
        // Try to query the unified global_donations collection first (fast, reliable, no index required)
        const globalRef = collection(db, "global_donations");
        snapshot = await getDocs(globalRef);
      } catch (globalErr) {
        console.warn("Global donations query failed, trying collectionGroup fallback:", globalErr);
        const q = collectionGroup(db, "donations");
        snapshot = await getDocs(q);
      }

      const list: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: data.id || docSnap.id,
          userId: data.userId || "",
          userName: data.userName || "Faithful Donor",
          userEmail: data.userEmail || "N/A",
          amount: Number(data.amount) || 0,
          paymentMethod: data.paymentMethod || "Direct Bank Transfer",
          date: data.date || "N/A",
          notes: data.notes || ""
        });
      });
      // Sort client-side by id descending to put newest on top
      list.sort((a, b) => b.id.localeCompare(a.id));
      setAllDonations(list);
    } catch (err) {
      console.error("Error loading contributions: ", err);
      showToast("Could not load contributions database from cloud.");
    } finally {
      setLoadingDonationsList(false);
    }
  };

  useEffect(() => {
    if (activeTab === "contributions") {
      fetchAllDonations();
    }
  }, [activeTab]);

  const exportGlobalDonationsCSV = () => {
    if (allDonations.length === 0) {
      showToast("No donation records available to export ⚠️");
      return;
    }
    const headers = ["Transaction ID", "User ID", "Donor Name", "Email", "Amount", "Payment Route", "Date", "Remarks"];
    const rows = allDonations.map(don => [
      don.id,
      don.userId,
      don.userName,
      don.userEmail,
      don.amount,
      don.paymentMethod,
      don.date,
      don.notes ? don.notes.replace(/"/g, '""') : ""
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shahadat_masjid_donations_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Global Donations CSV exported successfully! 📁");
  };

  // States mirroring AdminOverrides
  const [announcement, setAnnouncement] = useState({
    text: "",
    active: false,
    type: "info"
  });
  const [prayerTimes, setPrayerTimes] = useState<Record<string, any>>({});
  const [customWisdoms, setCustomWisdoms] = useState<any[]>([]);
  const [customDuas, setCustomDuas] = useState<any[]>([]);
  const [admins, setAdmins] = useState<string[]>(["armanorig7@gmail.com"]);
  const [notices, setNotices] = useState<any[]>([]);
  const [donationConfig, setDonationConfig] = useState({
    bankName: "Global IME Bank Limited",
    accountHolder: "Shahadat Masjid Committee",
    accountNumber: "0102030405060708",
    branchName: "Kathmandu Branch",
    routingNumber: "",
    bankQrUrl: "",       // base64 image or local path for Bank account QR
    esewaQrUrl: "",      // base64 image or local path
    fonepayQrUrl: "",    // base64 image or local path
    upiQrUrl: "",        // base64 image for India/International
    upiId: "shahadatmasjid@sbi",
    esewaId: "+977-9844444444",
    instructions: "remarks core 'Masjid Donation' use gari dinu hola.",
    intlInstructions: "Indian and international donors can use the Indian UPI QR or UPI ID, or NEFT/IMPS bank transfer.",
    contactPhone: "+977-9841123456"
  });

  // Selected city for prayer times edit
  const [selectedCity, setSelectedCity] = useState("Kathmandu, Nepal");
  const [cityTimes, setCityTimes] = useState({
    fajr: "",
    dhuhr: "",
    asr: "",
    maghrib: "",
    isha: ""
  });

  // Adding item states
  const [newWisdom, setNewWisdom] = useState({
    quote: "",
    source: "",
    category: "Hadith",
    explanation: ""
  });

  const [newDua, setNewDua] = useState({
    title: "",
    arabic: "",
    translation: "",
    urduTranslation: "",
    category: "Morning",
    phonetic: ""
  });

  // Inviting administrative members and notices states
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newNoticeText, setNewNoticeText] = useState("");
  const [newNoticeAuthor, setNewNoticeAuthor] = useState("Shahadat Masjid Committee");
  const [newNoticePriority, setNewNoticePriority] = useState<"normal" | "urgent">("normal");

  const isSuperAdmin = currentUser?.email === "armanorig7@gmail.com";

  // Fetch current overrides on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Update form values when selected city changes
  useEffect(() => {
    if (prayerTimes[selectedCity]) {
      setCityTimes({
        fajr: prayerTimes[selectedCity].fajr || "",
        dhuhr: prayerTimes[selectedCity].dhuhr || "",
        asr: prayerTimes[selectedCity].asr || "",
        maghrib: prayerTimes[selectedCity].maghrib || "",
        isha: prayerTimes[selectedCity].isha || ""
      });
    } else if (LOCATION_DATA[selectedCity]) {
      // Auto-populate from default static database for streamlined editing
      setCityTimes({
        fajr: LOCATION_DATA[selectedCity].fajr || "",
        dhuhr: LOCATION_DATA[selectedCity].dhuhr || "",
        asr: LOCATION_DATA[selectedCity].asr || "",
        maghrib: LOCATION_DATA[selectedCity].maghrib || "",
        isha: LOCATION_DATA[selectedCity].isha || ""
      });
    } else {
      // Default fallback strings
      setCityTimes({
        fajr: "",
        dhuhr: "",
        asr: "",
        maghrib: "",
        isha: ""
      });
    }
  }, [selectedCity, prayerTimes]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings?email=${encodeURIComponent(currentUser?.email || "")}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncement(data.announcement || { text: "", active: false, type: "info" });
        setPrayerTimes(data.prayerTimes || {});
        setCustomWisdoms(data.customWisdoms || []);
        setCustomDuas(data.customDuas || []);
        setAdmins(data.admins || ["armanorig7@gmail.com"]);
        setNotices(data.notices || []);
        if (data.donation) {
          setDonationConfig(prev => ({ ...prev, ...data.donation }));
        }
      } else {
        showToast("Failed to fetch admin overrides ⚠️");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error fetching settings.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveAll = async (updatedPayload?: any, customSuccessMsg?: string) => {
    setSaving(true);
    const payload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas,
      admins,
      notices,
      donation: donationConfig,
      ...updatedPayload
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser?.email,
          overrides: payload
        })
      });
      if (res.ok) {
        showToast(customSuccessMsg || "Admin settings saved successfully! ✦");
        // Dispatch custom event to notify components that config has changed
        window.dispatchEvent(new Event("deen_config_updated"));
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error writing overrides.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = () => {
    if (!newAdminEmail) {
      showToast("Please enter an email address.");
      return;
    }
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      showToast("Please enter a valid email address.");
      return;
    }
    if (admins.includes(cleanEmail)) {
      showToast("This email is already an administrator.");
      return;
    }
    const updated = [...admins, cleanEmail];
    setAdmins(updated);
    setNewAdminEmail("");

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas,
      admins: updated,
      notices
    };
    handleSaveAll(nextPayload);
    showToast(`Added ${cleanEmail} to Admin list!`);
  };

  const handleDeleteAdmin = (emailToDelete: string) => {
    if (emailToDelete === "armanorig7@gmail.com") {
      showToast("Super admin email cannot be removed.");
      return;
    }
    const updated = admins.filter(email => email !== emailToDelete);
    setAdmins(updated);

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas,
      admins: updated,
      notices
    };
    handleSaveAll(nextPayload);
    showToast(`Removed ${emailToDelete} from administrators list.`);
  };

  const handleAddNotice = () => {
    if (!newNoticeText) {
      showToast("Please write notice text.");
      return;
    }
    const cleanText = newNoticeText.trim();
    const noticeItem = {
      id: "notice_" + Date.now(),
      text: cleanText,
      createdAt: new Date().toISOString(),
      author: newNoticeAuthor.trim() || "Shahadat Masjid Committee",
      priority: newNoticePriority,
      active: true
    };

    // Automatically deactivate all other older announcements
    const updated = [noticeItem, ...notices.map(n => ({ ...n, active: false }))];
    setNotices(updated);
    setNewNoticeText("");
    
    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas,
      admins,
      notices: updated
    };
    handleSaveAll(nextPayload);
    showToast("New notice posted! Old notices automatically deactivated.");
  };

  const handleDeleteNotice = (noticeId: string) => {
    const updated = notices.filter(n => n.id !== noticeId);
    setNotices(updated);

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas,
      admins,
      notices: updated
    };
    handleSaveAll(nextPayload);
    showToast("Notice removed from notice board.");
  };

  const handleToggleNoticeActive = (noticeId: string) => {
    // If we are activating this notice, automatically deactivate all other notices
    const isActivating = !notices.find(n => n.id === noticeId)?.active;
    
    const updated = notices.map(n => {
      if (n.id === noticeId) {
        return { ...n, active: !n.active };
      }
      // If we are activating this one, set other notices as inactive. If we are deactivating, others remain as they are.
      return isActivating ? { ...n, active: false } : n;
    });
    
    setNotices(updated);

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas,
      admins,
      notices: updated
    };
    handleSaveAll(nextPayload);
    showToast(isActivating ? "Notice activated! Others automatically deactivated 📢" : "Notice deactivated.");
  };

  const handleUpdateCityTimes = () => {
    if (!cityTimes.fajr || !cityTimes.dhuhr || !cityTimes.asr || !cityTimes.maghrib || !cityTimes.isha) {
      showToast("Please fill all namaz times first.");
      return;
    }

    const updatedTimes = {
      ...prayerTimes,
      [selectedCity]: {
        ...cityTimes,
        // Carry over other values if they previously existed
        distance: prayerTimes[selectedCity]?.distance || "4,640",
        angle: prayerTimes[selectedCity]?.angle || "261.2° W",
        compassRotation: prayerTimes[selectedCity]?.compassRotation || 261.2
      }
    };

    setPrayerTimes(updatedTimes);
    
    // Save directly for a flawless user experience
    const nextPayload = {
      announcement,
      prayerTimes: updatedTimes,
      customWisdoms,
      customDuas,
      admins,
      notices
    };
    handleSaveAll(
      nextPayload, 
      `Successfully applied and saved ${selectedCity.split(",")[0]} prayer times! 🕋`
    );
  };

  const handleAddWisdom = () => {
    if (!newWisdom.quote || !newWisdom.source || !newWisdom.explanation) {
      showToast("Please complete all custom wisdom fields.");
      return;
    }

    const updated = [newWisdom, ...customWisdoms];
    setCustomWisdoms(updated);
    setNewWisdom({
      quote: "",
      source: "",
      category: "Hadith",
      explanation: ""
    });

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms: updated,
      customDuas,
      admins,
      notices
    };
    handleSaveAll(nextPayload);
    showToast("Islamic wisdom added to Daily wisdom rotation!");
  };

  const handleDeleteWisdom = (index: number) => {
    const updated = customWisdoms.filter((_, i) => i !== index);
    setCustomWisdoms(updated);

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms: updated,
      customDuas,
      admins,
      notices
    };
    handleSaveAll(nextPayload);
    showToast("Wisdom quote removed.");
  };

  const handleAddDua = () => {
    if (!newDua.title || !newDua.arabic || !newDua.translation) {
      showToast("Please complete Dua Title, Arabic, and Translation.");
      return;
    }

    const itemToAdd = {
      ...newDua,
      id: "dua_custom_" + Date.now()
    };

    const updated = [itemToAdd, ...customDuas];
    setCustomDuas(updated);
    setNewDua({
      title: "",
      arabic: "",
      translation: "",
      urduTranslation: "",
      category: "Morning",
      phonetic: ""
    });

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas: updated,
      admins,
      notices
    };
    handleSaveAll(nextPayload);
    showToast("Custom Dua added to library!");
  };

  const handleDeleteDua = (id: string) => {
    const updated = customDuas.filter(d => d.id !== id);
    setCustomDuas(updated);

    const nextPayload = {
      announcement,
      prayerTimes,
      customWisdoms,
      customDuas: updated,
      admins,
      notices
    };
    handleSaveAll(nextPayload);
    showToast("Custom Dua removed.");
  };

  return (
    <div className="fixed inset-0 bg-cream-bg flex flex-col z-50 overflow-hidden font-sans">
      {/* Toast Feedbacks */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 bg-primary-base text-white px-5 py-3 rounded-full shadow-xl text-xs font-semibold z-[60] flex items-center gap-2 border border-gold-accent"
          >
            <Check className="w-4 h-4 text-gold-accent" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <header className="px-5 py-4 border-b border-[#012d1d]/10 flex items-center justify-between bg-white relative">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold-accent animate-pulse" />
          <div>
            <h1 className="font-serif text-sm font-black text-primary-base uppercase">Admin Command Panel</h1>
            <p className="text-[9px] font-bold text-[#735c00] tracking-wider leading-none mt-0.5">EXCLUSIVE CENTRAL OVERRIDES</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
        >
          <X className="w-5 h-5 text-primary-base" />
        </button>
      </header>

      {/* Tab bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 border-b border-outline-variant/30 bg-white divide-x divide-y divide-outline-variant/10">
        {( [
          { id: "general", label: "App Setup", icon: Megaphone },
          { id: "prayer", label: "Namaz Times", icon: Clock },
          { id: "wisdom", label: "Quotes", icon: Sparkles },
          { id: "duas", label: "Duas", icon: Heart },
          { id: "donation", label: "Donation QRs", icon: Coins },
          { id: "contributions", label: "All Donations", icon: History }
        ] as const).map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 text-center flex flex-col items-center justify-center gap-1 cursor-pointer border-none bg-transparent relative transition-all duration-200 ${
                isSelected ? "text-primary-base font-bold bg-[#012d1d]/5" : "text-gray-400 font-semibold hover:text-primary-base/70 hover:bg-gray-50/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isSelected ? "text-gold-accent scale-110" : "text-gray-400"}`} />
              <span className="text-[9px] uppercase font-sans tracking-wider whitespace-nowrap">{tab.label}</span>
              {isSelected && (
                <motion.div 
                  layoutId="admin_tab_active" 
                  className="absolute bottom-0 left-0 right-0 h-0.75 bg-gold-accent"
                />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-gold-accent border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#735c00]">Decrypting Database...</span>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto p-5 space-y-5 pb-28">
          
          {/* TAB 1: Notice Board & Administrators Setup */}
          {activeTab === "general" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              
              {/* Masjid Notice Board Manager Card */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Megaphone className="w-4.5 h-4.5 text-emerald-800" />
                  <div>
                    <h3 className="font-serif text-sm font-black text-primary-base uppercase">Masjid Notice Board</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Post notices, reminders & village masjid updates</p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-500">Notice text / Alert message</label>
                    <textarea
                      value={newNoticeText}
                      onChange={(e) => setNewNoticeText(e.target.value)}
                      rows={3}
                      placeholder="e.g. Assalamu Alaikum, isaal-e-sawab program will start today after Maghrib namaz. Free dinner for everyone..."
                      className="w-full p-3 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base focus:border-gold-accent outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-500">Notice Author</label>
                      <input
                        type="text"
                        value={newNoticeAuthor}
                        onChange={(e) => setNewNoticeAuthor(e.target.value)}
                        placeholder="e.g. Masjid Committee"
                        className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base focus:border-gold-accent outline-none font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-500">Alert Priority</label>
                      <div className="flex gap-2">
                        {(["normal", "urgent"] as const).map((priority) => (
                          <button
                            key={priority}
                            type="button"
                            onClick={() => setNewNoticePriority(priority)}
                            className={`flex-1 py-2 text-center capitalize rounded-lg text-[10px] font-bold border cursor-pointer ${
                              newNoticePriority === priority 
                                ? priority === "urgent"
                                  ? "border-red-500 bg-red-500/10 text-red-900"
                                  : "border-emerald-600 bg-emerald-600/10 text-emerald-950"
                                : "border-gray-200 bg-transparent text-gray-400"
                            }`}
                          >
                            {priority === "urgent" ? "🚨 Urgent Alert" : "📌 Standard"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAddNotice}
                    className="w-full py-2.5 bg-emerald-900 text-white rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-950 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-gold-accent" />
                    Post on Notice Board
                  </button>
                </div>
              </div>

              {/* List of Active Notices in the app */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-3.5 shadow-sm">
                <h4 className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#735c00]">Active Posted Notices ({notices.length})</h4>
                
                {notices.length === 0 ? (
                  <p className="text-gray-400 text-xs italic py-2 text-center">No active alerts. Add above to post to users instantly.</p>
                ) : (
                  <div className="space-y-3">
                    {notices.map((notice) => (
                      <div 
                        key={notice.id} 
                        className={`p-3.5 border rounded-xl flex items-start justify-between gap-3 ${
                          notice.priority === "urgent" 
                            ? "bg-red-500/5 border-red-500/15" 
                            : "bg-[#012d1d]/5 border-emerald-950/10"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-grow">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                              notice.priority === "urgent" 
                                ? "bg-red-500/20 text-red-950" 
                                : "bg-emerald-900/15 text-emerald-950"
                            }`}>
                              {notice.priority === "urgent" ? "🔴 Urgent Announcement" : "📌 Notice"}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400">
                              By {notice.author} • {new Date(notice.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-primary-base font-semibold leading-relaxed break-words">{notice.text}</p>
                          
                          <button
                            onClick={() => handleToggleNoticeActive(notice.id)}
                            className="text-[9px] font-black underline bg-transparent border-none text-emerald-800 hover:text-emerald-950 cursor-pointer pt-1 block"
                          >
                            {notice.active ? "🟢 Showing to Users" : "⚪ Hidden from Users"}
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteNotice(notice.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/60 p-1.5 rounded-lg transition-colors border-none cursor-pointer flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Masjid Administrators configuration */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <ShieldCheck className="w-4.5 h-4.5 text-gold-accent" />
                  <div>
                    <h3 className="font-serif text-sm font-black text-primary-base uppercase">Administrative Panel Users</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Manage who can change prayer timings and post notices</p>
                  </div>
                </div>

                {isSuperAdmin ? (
                  <div className="space-y-3">
                    <p className="text-[10px] text-[#735c00] font-semibold leading-relaxed">
                      As Super Administrator (<strong>{currentUser?.email}</strong>), you can authorize more villagers (e.g. Masjid management committee members) to login and update Masjid parameters.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="armanorig7@gmail.com, committee@gmail.com"
                        className="flex-grow p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base focus:border-gold-accent outline-none font-semibold"
                      />
                      <button
                        onClick={handleAddAdmin}
                        className="px-4 bg-emerald-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-950 flex items-center justify-center gap-1 cursor-pointer border-none"
                      >
                        <Plus className="w-4 h-4 text-gold-accent" /> Add Admin
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gold-accent/10 border border-gold-accent/25 rounded-xl text-[10px] text-yellow-950 font-semibold space-y-1">
                    <p>⭐ Authorized Administrative Account Status: <strong>{currentUser?.email}</strong></p>
                    <p className="text-gray-400">Only the village Super Administrator (armanorig7@gmail.com) is dynamically authorized to invite or revoke other administrative profiles.</p>
                  </div>
                )}

                <div className="space-y-2 pt-1.5">
                  <h4 className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-gray-400 px-1">Active Administrators List ({admins.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {admins.map((email) => {
                      const isSelfSuperAdmin = email === "armanorig7@gmail.com";
                      return (
                        <div 
                          key={email} 
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                            isSelfSuperAdmin 
                              ? "bg-gold-accent/10 border-gold-accent text-yellow-950" 
                              : "bg-emerald-900/5 border-emerald-950/20 text-[#012d1d]"
                          }`}
                        >
                          <span className="truncate max-w-[180px]">{email}</span>
                          {isSelfSuperAdmin ? (
                            <span className="text-[8px] bg-[#735c00]/10 text-[#735c00] px-1 rounded-full uppercase scale-90">Super Admin</span>
                          ) : (
                            isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteAdmin(email)}
                                className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer text-[10px] p-0 font-bold ml-1"
                              >
                                ✕
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950 p-4 rounded-xl border border-gold-accent text-white flex gap-3 text-xs">
                <Info className="w-5 h-5 text-gold-accent flex-shrink-0" />
                <p className="leading-relaxed">
                  <strong>Multi-admin authorization:</strong> Added administrators will be able to log sign-in on their Gmail credentials and instantly utilize all Masjid schedules, duas, wisdom, and notice panels!
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Namaz Times Offset */}
          {activeTab === "prayer" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-accent" />
                  <h3 className="font-serif text-xs font-bold text-primary-base uppercase">Override Prayer Timings</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-extrabold uppercase tracking-wide text-gray-500 block">Select Target City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent cursor-pointer font-bold"
                  >
                    {LOCATION_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-gold-accent/5 border border-gold-accent/25 rounded-xl text-[10px] text-[#735c00] leading-relaxed font-semibold">
                  💡 <strong>Checklist Checklist:</strong> Once applied, please make sure you (and Masjid users) have selected <strong>"{selectedCity.split(",")[0]}"</strong> on the main <strong>Prayer Times dropdown list</strong> to view and activate these custom overridden timings!
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  {[
                    { key: "fajr", label: "Fajr Adhan" },
                    { key: "dhuhr", label: "Dhuhr Prayer" },
                    { key: "asr", label: "Asr Prayer" },
                    { key: "maghrib", label: "Maghrib Prayer" },
                    { key: "isha", label: "Isha Prayer" }
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 capitalize">{field.label}</label>
                      <input
                        type="text"
                        placeholder="e.g. 04:36 AM"
                        value={(cityTimes as any)[field.key]}
                        onChange={(e) => setCityTimes(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent font-semibold"
                      />
                    </div>
                  ))}
                </div>

                 <button
                  onClick={handleUpdateCityTimes}
                  disabled={saving}
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 border ${
                    saving 
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                      : "bg-gold-accent/20 text-[#735c00] border-gold-accent/40 hover:bg-gold-accent/30 cursor-pointer active:scale-[0.99]"
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#735c00] border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Timings...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#735c00]" />
                      <span>Apply {selectedCity.split(",")[0]} Timings</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 3: Islamic Daily Wisdom Pool */}
          {activeTab === "wisdom" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Form to add a quote */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-800" />
                  <h3 className="font-serif text-xs font-bold text-primary-base uppercase">Add Custom Wisdom Quote</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 block">Category</label>
                  <div className="flex gap-2">
                    {["Hadith", "Quran", "Scholar"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewWisdom(prev => ({ ...prev, category: cat }))}
                        className={`py-1.5 px-3 rounded-lg text-[10px] font-extrabold uppercase border cursor-pointer ${
                          newWisdom.category === cat 
                            ? "border-gold-accent bg-gold-accent/10 text-primary-base" 
                            : "border-gray-200 bg-transparent text-gray-400"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Quote Text</label>
                  <textarea
                    rows={2}
                    placeholder="Enter the beautiful quote..."
                    value={newWisdom.quote}
                    onChange={(e) => setNewWisdom(prev => ({ ...prev, quote: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Source / Attribution</label>
                  <input
                    type="text"
                    placeholder="e.g. Prophet Muhammad (ﷺ) [Sahih al-Bukhari]"
                    value={newWisdom.source}
                    onChange={(e) => setNewWisdom(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Practical Explanation</label>
                  <textarea
                    rows={2}
                    placeholder="A beautiful explanation on how to act upon it today..."
                    value={newWisdom.explanation}
                    onChange={(e) => setNewWisdom(prev => ({ ...prev, explanation: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent"
                  />
                </div>

                <button
                  onClick={handleAddWisdom}
                  className="w-full py-2.5 bg-[#012d1d] text-white rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-1.5 hover:bg-opacity-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Wisdom to rotation
                </button>
              </div>

              {/* List of Custom Wisdom Pool Items */}
              {customWisdoms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-gray-400 px-1">Active Overridden Quotes ({customWisdoms.length})</h4>
                  {customWisdoms.map((w, idx) => (
                    <div key={idx} className="bg-white border border-outline-variant/20 rounded-xl p-3.5 flex justify-between items-start gap-4 shadow-xs">
                      <div className="space-y-1 text-xs">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-gold-accent bg-gold-accent/10 px-1.5 py-0.5 rounded">
                          {w.category}
                        </span>
                        <p className="font-serif font-bold italic text-primary-base">"{w.quote}"</p>
                        <p className="font-mono text-[10px] text-gray-400">— {w.source}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteWisdom(idx)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/60 p-1.5 rounded-lg transition-colors border-none cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: Duas Library */}
          {activeTab === "duas" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#735c00]" />
                  <h3 className="font-serif text-xs font-bold text-primary-base uppercase">Add Custom Dua</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">Dua Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Dua for Protection"
                      value={newDua.title}
                      onChange={(e) => setNewDua(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">Category / Occasion</label>
                    <select
                      value={newDua.category}
                      onChange={(e) => setNewDua(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent font-semibold cursor-pointer"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="After Prayer">After Prayer</option>
                      <option value="Travel">Travel</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Arabic Scripture</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    placeholder="كتب الدعاء هنا باللغة العربية..."
                    value={newDua.arabic}
                    onChange={(e) => setNewDua(prev => ({ ...prev, arabic: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-sm text-primary-base font-serif font-bold text-right outline-none focus:border-gold-accent leading-loose"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Phonetic / Transliteration</label>
                  <input
                    type="text"
                    placeholder="e.g. Bismillahil-ladhi la yadurru..."
                    value={newDua.phonetic}
                    onChange={(e) => setNewDua(prev => ({ ...prev, phonetic: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">English Translation</label>
                  <textarea
                    rows={2}
                    placeholder="In the name of Allah who makes all matters easy..."
                    value={newDua.translation}
                    onChange={(e) => setNewDua(prev => ({ ...prev, translation: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Urdu Translation (Optional)</label>
                  <textarea
                    rows={1}
                    placeholder="اللّہ كے مبارک نام سے جو بڑی برکت والا ہے۔۔"
                    value={newDua.urduTranslation}
                    onChange={(e) => setNewDua(prev => ({ ...prev, urduTranslation: e.target.value }))}
                    className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base outline-none focus:border-gold-accent"
                  />
                </div>

                <button
                  onClick={handleAddDua}
                  className="w-full py-2.5 bg-emerald-900 text-white rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-1.5 hover:bg-opacity-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-gold-accent" /> Add Dua to App Library
                </button>
              </div>

              {/* Custom Duas List */}
              {customDuas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-gray-400 px-1">Added Custom Duas ({customDuas.length})</h4>
                  {customDuas.map((dua, i) => (
                    <div key={dua.id} className="bg-white border border-outline-variant/30 rounded-xl p-3.5 flex justify-between items-start gap-4 shadow-xs">
                      <div className="text-xs space-y-1 w-full">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#735c00] bg-gold-accent/10 px-1.5 py-0.5 rounded">
                          {dua.category}
                        </span>
                        <h4 className="font-serif font-black text-primary-base">{dua.title}</h4>
                        <p className="font-serif leading-relaxed text-right text-emerald-950 font-bold max-w-full pb-1 overflow-x-auto">{dua.arabic}</p>
                        <p className="text-[10px] text-gray-500 border-l-2 border-gold-accent/40 pl-2">{dua.translation}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDua(dua.id)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/60 p-1.5 rounded-lg transition-colors border-none cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "donation" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Introduction Banner */}
              <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 border border-gold-accent/20 rounded-2xl p-4 text-white shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-gold-accent" />
                  <h3 className="font-serif text-sm font-black uppercase text-white">Donation QR & Bank Setup</h3>
                </div>
                <p className="text-[10px] text-emerald-100 font-medium leading-relaxed">
                  Only authorized Masjid Committee members can configure donation channels. Any values saved here are rendered dynamically on the public Donation Portal for both Nepalese and Indian/International donors!
                </p>
              </div>

              {/* SECTION 1: Bank Account Details */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-sm font-sans">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-900 flex items-center justify-center text-xs font-bold font-mono">1</div>
                  <h4 className="font-serif text-xs font-black text-primary-base uppercase">Bank Account Details (NPR/INR Hub)</h4>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Bank Name</label>
                    <input 
                      type="text"
                      value={donationConfig.bankName}
                      onChange={(e) => setDonationConfig(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="e.g. Global IME Bank Limited"
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Account Holder Name</label>
                      <input 
                        type="text"
                        value={donationConfig.accountHolder}
                        onChange={(e) => setDonationConfig(prev => ({ ...prev, accountHolder: e.target.value }))}
                        placeholder="Shahadat Masjid..."
                        className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-[#735c00] uppercase tracking-wider block">Account Number</label>
                      <input 
                        type="text"
                        value={donationConfig.accountNumber}
                        onChange={(e) => setDonationConfig(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Account digits..."
                        className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Branch Name / Area</label>
                      <input 
                        type="text"
                        value={donationConfig.branchName}
                        onChange={(e) => setDonationConfig(prev => ({ ...prev, branchName: e.target.value }))}
                        placeholder="e.g. Kathmandu Branch"
                        className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Contact Phone Number</label>
                      <input 
                        type="text"
                        value={donationConfig.contactPhone}
                        onChange={(e) => setDonationConfig(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="e.g. +977-9844..."
                        className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                      />
                    </div>
                  </div>

                  {/* Bank QR Code image Upload */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-[10.5px] font-bold text-gray-700 block">Bank Account / Transfer QR Code Image</label>
                    <div className="flex items-center gap-4">
                      {donationConfig.bankQrUrl ? (
                        <div className="w-18 h-18 bg-gray-50 p-1 border border-[#012d1d]/15 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                          <img src={donationConfig.bankQrUrl} alt="Bank QR Code Preview" className="w-full h-full object-contain" />
                          <button 
                            type="button"
                            onClick={() => setDonationConfig(prev => ({ ...prev, bankQrUrl: "" }))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] border-none font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-18 h-18 bg-surface-container-low border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-gray-400 font-bold flex-shrink-0 select-none">
                          <Coins className="w-5 h-5 text-gray-300 animate-pulse" />
                          <span className="text-[8px] uppercase mt-1">No QR</span>
                        </div>
                      )}

                      <div className="flex-grow">
                        <label className="px-3.5 py-2 border border-[#012d1d]/20 hover:bg-[#012d1d]/5 text-emerald-950 font-bold text-[10.5px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 active:scale-95">
                          <Upload className="w-3.5 h-3.5 text-gold-accent" />
                          <span>Choose Bank QR File</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                const compressed = await compressImage(f);
                                setDonationConfig(prev => ({ ...prev, bankQrUrl: compressed }));
                              } catch (err) {
                                console.error(err);
                                showToast("Could not process image file.");
                              }
                            }}
                            className="hidden" 
                          />
                        </label>
                        <p className="text-[9px] text-gray-400 mt-1">Accepts any photo of your Bank Account QR Code.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Nepal Residents (eSewa & QR Config) */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-sm font-sans">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <div className="w-5 h-5 rounded-lg bg-green-50 text-emerald-900 flex items-center justify-center text-xs font-bold font-mono">2</div>
                  <h4 className="font-serif text-xs font-black text-primary-base uppercase">Nepal Residents Channel (NPR)</h4>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">eSewa Wallet ID (Phone number / Email)</label>
                    <input 
                      type="text"
                      value={donationConfig.esewaId}
                      onChange={(e) => setDonationConfig(prev => ({ ...prev, esewaId: e.target.value }))}
                      placeholder="eSewa ID..."
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Nepal Remarks & Instructions</label>
                    <textarea 
                      rows={2}
                      value={donationConfig.instructions}
                      onChange={(e) => setDonationConfig(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="Enter specific guidance for Nepalese donors..."
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-medium outline-none focus:border-gold-accent"
                    />
                  </div>

                  {/* Nepal QR Code image Upload */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-[10.5px] font-bold text-gray-700 block">Masjid eSewa / Fonepay QR Code Image</label>
                    
                    <div className="flex items-center gap-4">
                      {donationConfig.esewaQrUrl ? (
                        <div className="w-18 h-18 bg-gray-50 p-1 border border-[#012d1d]/15 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                          <img src={donationConfig.esewaQrUrl} alt="Nepal QR Code Preview" className="w-full h-full object-contain" />
                          <button 
                            type="button"
                            onClick={() => setDonationConfig(prev => ({ ...prev, esewaQrUrl: "" }))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] border-none font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-18 h-18 bg-surface-container-low border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-gray-400 font-bold flex-shrink-0 select-none">
                          <Coins className="w-5 h-5 text-gray-300 animate-pulse" />
                          <span className="text-[8px] uppercase mt-1">No QR</span>
                        </div>
                      )}

                      <div className="flex-grow">
                        <label className="px-3.5 py-2 border border-[#012d1d]/20 hover:bg-[#012d1d]/5 text-emerald-950 font-bold text-[10.5px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 active:scale-95">
                          <Upload className="w-3.5 h-3.5 text-gold-accent" />
                          <span>Choose Nepal QR File</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                const compressed = await compressImage(f);
                                setDonationConfig(prev => ({ ...prev, esewaQrUrl: compressed }));
                              } catch (err) {
                                console.error(err);
                                showToast("Could not process image file.");
                              }
                            }}
                            className="hidden" 
                          />
                        </label>
                        <p className="text-[9px] text-gray-400 mt-1">Accepts any photo of your eSewa, Fonepay or Nepal Bank QR.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Indian & International Residents (INR UPI & Swift Config) */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-sm font-sans">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <div className="w-5 h-5 rounded-lg bg-amber-50 text-amber-950 flex items-center justify-center text-xs font-bold font-mono">3</div>
                  <h4 className="font-serif text-xs font-black text-primary-base uppercase">Indian / International Channel (INR/USD)</h4>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Indian UPI ID</label>
                    <input 
                      type="text"
                      value={donationConfig.upiId}
                      onChange={(e) => setDonationConfig(prev => ({ ...prev, upiId: e.target.value }))}
                      placeholder="e.g. shahadatmasjid@sbi"
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-semibold outline-none focus:border-gold-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Indian Remarks & Instructions</label>
                    <textarea 
                      rows={2}
                      value={donationConfig.intlInstructions}
                      onChange={(e) => setDonationConfig(prev => ({ ...prev, intlInstructions: e.target.value }))}
                      placeholder="Enter step-by-step guidance for Indian and other foreign contributors..."
                      className="w-full p-2.5 bg-cream-bg/30 border border-outline-variant/50 rounded-xl text-xs text-primary-base font-medium outline-none focus:border-gold-accent"
                    />
                  </div>

                  {/* India UPI QR Code image Upload */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-[10.5px] font-bold text-gray-700 block">Indian UPI / International QR Image</label>
                    
                    <div className="flex items-center gap-4">
                      {donationConfig.upiQrUrl ? (
                        <div className="w-18 h-18 bg-gray-50 p-1 border border-[#012d1d]/15 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                          <img src={donationConfig.upiQrUrl} alt="Indian QR Code Preview" className="w-full h-full object-contain" />
                          <button 
                            type="button"
                            onClick={() => setDonationConfig(prev => ({ ...prev, upiQrUrl: "" }))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] border-none font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-18 h-18 bg-surface-container-low border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-gray-400 font-bold flex-shrink-0 select-none">
                          <Coins className="w-5 h-5 text-gray-300 animate-pulse" />
                          <span className="text-[8px] uppercase mt-1">No QR</span>
                        </div>
                      )}

                      <div className="flex-grow">
                        <label className="px-3.5 py-2 border border-[#012d1d]/20 hover:bg-[#012d1d]/5 text-emerald-950 font-bold text-[10.5px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 active:scale-95">
                          <Upload className="w-3.5 h-3.5 text-gold-accent" />
                          <span>Choose India QR File</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                const compressed = await compressImage(f);
                                setDonationConfig(prev => ({ ...prev, upiQrUrl: compressed }));
                              } catch (err) {
                                console.error(err);
                                showToast("Could not process image file.");
                              }
                            }}
                            className="hidden" 
                          />
                        </label>
                        <p className="text-[9px] text-gray-400 mt-1">Accepts any photo of your UPI QR, fonepay, Paytm or GPay India.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Tip Info */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-amber-900 leading-normal flex gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold">
                  Once your updates are finalized, click the primary <strong>"Save Settings"</strong> button below to publish the QR links to all devices instantly!
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 6: All Donations Ledger */}
          {activeTab === "contributions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Stats highlights card */}
              <div className="bg-white border border-[#012d1d]/10 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gold-accent animate-pulse" />
                    <div>
                      <h3 className="font-serif text-sm font-black text-primary-base uppercase">Mosque Sadakah Ledger</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Audit and verify all village contributions securely</p>
                    </div>
                  </div>
                  
                  {/* Export Ledger Log */}
                  <button
                    type="button"
                    onClick={exportGlobalDonationsCSV}
                    className="text-[9.5px] text-emerald-950 hover:text-white font-sans font-extrabold bg-[#012d1d]/5 hover:bg-[#012d1d]/100 px-3 py-1.5 rounded-full transition-all active:scale-95 flex items-center gap-1 border border-[#012d1d]/15 cursor-pointer"
                    title="Export global donations to CSV"
                  >
                    <FileText className="w-3 h-3 text-gold-accent shrink-0" />
                    <span>Export CSV Log</span>
                  </button>
                </div>

                {/* Ledger metrics overview row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-cream-bg/30 border border-outline-variant/30 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Total Collected</p>
                    <p className="text-xs font-serif font-black text-primary-base mt-1">
                      Rs. {totalSum.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-cream-bg/30 border border-outline-variant/30 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-bold text-[#735c00] uppercase">Transactions</p>
                    <p className="text-xs font-serif font-black text-[#735c00] mt-1">{totalCount}</p>
                  </div>
                  <div className="bg-cream-bg/30 border border-outline-variant/30 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-bold text-emerald-800 uppercase">Avg Amount</p>
                    <p className="text-xs font-serif font-black text-emerald-800 mt-1">
                      Rs. {averageAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filtering / Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contributionsSearchQuery}
                  onChange={(e) => setContributionsSearchQuery(e.target.value)}
                  placeholder="Search by donor name, email, transaction, remarks..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant/50 rounded-full text-xs text-primary-base font-semibold outline-none focus:border-gold-accent shadow-sm font-sans"
                />
              </div>

              {/* Ledger list container */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
                {loadingDonationsList ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-6 h-6 border-2 border-gold-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-[10px] uppercase tracking-widest text-[#735c00] font-bold font-sans">Querying cloud registry...</p>
                  </div>
                ) : filteredDonations.length === 0 ? (
                  <div className="text-center py-12 space-y-2 text-gray-400">
                    <Coins className="w-10 h-10 mx-auto opacity-20 text-emerald-950 animate-bounce" />
                    <p className="text-xs font-bold text-primary-base">No contributions found</p>
                    <p className="text-[10px] max-w-xs mx-auto">Either no one has logged a contribution yet, or no records match your active search filter query.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 space-y-4 max-h-[440px] overflow-y-auto pr-1">
                    {filteredDonations.map((don, idx) => (
                      <div key={don.id || idx} className="pt-3 first:pt-0 space-y-2 text-left">
                        {/* Donor Details and amount row */}
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-extrabold text-primary-base tracking-tight flex items-center gap-1.5 font-sans">
                              <span>{don.userName}</span>
                              <span className="text-[8px] bg-[#012d1d]/5 text-emerald-900 border border-[#012d1d]/10 px-1.5 py-0.5 rounded font-sans uppercase">
                                {don.paymentMethod}
                              </span>
                            </h4>
                            <p className="text-[9.5px] text-gray-400 leading-none font-semibold font-sans">{don.userEmail}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-sans font-black text-emerald-900 select-all">Rs. {don.amount.toLocaleString()}</p>
                            <p className="text-[8px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider font-sans">{don.date}</p>
                          </div>
                        </div>

                        {/* Middle Remarks block */}
                        {don.notes && (
                          <div className="p-2 bg-gray-50 rounded-lg text-[10px] text-gray-500 italic border border-dashed border-gray-100 font-sans">
                            "{don.notes}"
                          </div>
                        )}

                        {/* Admin Action Bar */}
                        <div className="flex justify-between items-center bg-cream-bg/25 px-2.5 py-1.5 rounded-lg border border-outline-variant/10">
                          <span className="text-[8.5px] text-primary-base font-semibold font-mono tracking-tight text-gray-400">
                            TxID: {don.id}
                          </span>

                          <button
                            type="button"
                            onClick={() => generateReceiptPDF(don)}
                            className="text-[9px] text-emerald-950 hover:text-white font-sans font-extrabold bg-[#012d1d]/5 hover:bg-emerald-950 px-3 py-1.5 rounded-full transition-all active:scale-95 flex items-center gap-1 border border-[#012d1d]/15 cursor-pointer"
                            title="Generate & Download PDF Receipt"
                          >
                            <Download className="w-2.5 h-2.5 text-gold-accent" />
                            <span>Download Receipt PDF</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* Persistent Sticky floating save & close button footer */}
      {!loading && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#012d1d]/10 bg-white/95 backdrop-blur-md flex gap-3 shadow-lg z-20">
          <button
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="flex-1 py-3 bg-emerald-950 hover:bg-[#012d1d] disabled:opacity-50 text-white font-sans font-bold text-xs rounded-full shadow-md flex items-center justify-center gap-1.5 border-none cursor-pointer active:scale-95 transition-transform"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving settings config...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-gold-accent" />
                Save Settings
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-outline-variant/60 hover:bg-gray-50 text-xs font-semibold rounded-full text-primary-base cursor-pointer active:scale-95 transition-transform"
          >
            Close Panel
          </button>
        </div>
      )}
    </div>
  );
}
