import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Plus, 
  Coins, 
  TrendingUp, 
  Clock, 
  Sunset, 
  Sun,
  Award,
  CheckCircle,
  HelpCircle,
  PiggyBank,
  Check,
  Search,
  BookOpen,
  Info,
  Heart,
  Moon,
  ChevronDown,
  ChevronUp,
  Star
} from "lucide-react";

interface Festival {
  id: string;
  name: string;
  arabicName: string;
  urduName: string;
  gregorianDate: string; // e.g., "May 27, 2026"
  hijriDate: string; // e.g., "10 Dhu al-Hijjah 1447"
  badge: string; // e.g., "Holy Feast", "Holy Month", "Night of Remembrance"
  description: string;
  descriptionUrdu: string;
  significance: string;
  significanceUrdu: string;
  howToCelebrate: string;
  howToCelebrateUrdu: string;
  primaryColor: string; // e.g., "gold", "emerald", "amber"
}

const FAITH_FESTIVALS: Festival[] = [
  {
    id: "eid_adha_2026",
    name: "Eid al-Adha",
    arabicName: "عيد الأضحى",
    urduName: "عید الاضحیٰ",
    gregorianDate: "May 27, 2026",
    hijriDate: "10 Dhu al-Hijjah 1447 AH",
    badge: "Major Holiday",
    description: "The Festival of Sacrifice, commemorating Prophet Ibrahim's (Abraham) willingness to sacrifice his son as an act of absolute obedience to Allah.",
    descriptionUrdu: "قربانی کا تہوار، جو اللہ تعالی کے حکم پر اور حضرت ابراہیم علیہ السلام کی اپنے رب کی فرماں برداری میں قربانی کی یاد دلاتا ہے۔",
    significance: "Honors faith, selflessness, and charity. Muslims sacrifice a livestock animal (Qurbani) and divide the meat into three parts: family, friends, and the poor.",
    significanceUrdu: "یہ ایمان، ایثار اور سخاوت کو ظاہر کرتا ہے۔ مسلمان حلال جانور کی قربانی کرتے ہیں اور گوشت غریبوں، رشتہ داروں اور اپنے لیے برابر حصوں میں تقسیم کرتے ہیں۔",
    howToCelebrate: "Morning congregational Eid prayers, charity, sharing meals, sacrificial Qurbani acts, wearing new clothes, and visiting loved ones.",
    howToCelebrateUrdu: "عید کی نماز ادا کرنا، قربانی کرنا، صدقات و خیرات دینا، نئے یا صاف ستھرے ملبوسات پہننا، رشتہ داروں اور دوستوں سے ملنا جلنا۔",
    primaryColor: "emerald"
  },
  {
    id: "hijri_new_year_2026",
    name: "Islamic New Year",
    arabicName: "رأس السنة الهجرية",
    urduName: "اسلامی نیا سال (ہجری)",
    gregorianDate: "June 16, 2026",
    hijriDate: "1 Muharram 1448 AH",
    badge: "Sacred Day",
    description: "The beginning of the Hijri year (1448 AH). It marks the historic migration (Hijrah) of Prophet Muhammad (PBUH) from Mecca to Medina in 622 CE.",
    descriptionUrdu: "نئے ہجری سال کا آغاز (یکم محرم)۔ یہ پیارے نبی حضرت محمد ﷺ کی مکہ مکرمہ سے مدینہ منورہ کی تاریخی ہجرت کی یادگار ہے۔",
    significance: "A time of reflection, renewal, gratitude, and setting spiritual intentions for the upcoming blessed calendar year.",
    significanceUrdu: "یہ وقت گناہوں سے توبہ کرنے، گزشتہ سال کے اعمال کا جائزہ لینے اور آنے والے سال کے لیے دینی ارادے پختہ کرنے کا ہے۔",
    howToCelebrate: "Reflective prayers, storytelling about Prophet's migration journeys, reading historic Islamic histories, and planning spiritual commitments.",
    howToCelebrateUrdu: "مسجدوں میں خصوصی دعائیں کرنا، ہجرتِ مدینہ کے مبارک سفر اور صحابہ کرام کی قربانیوں کا تذکرہ کرنا، اور نیا سال نیکیوں کے ساتھ شروع کرنا۔",
    primaryColor: "gold"
  },
  {
    id: "ashura_2026",
    name: "Day of Ashura",
    arabicName: "عاشوراء",
    urduName: "یومِ عاشورہ",
    gregorianDate: "June 25, 2026",
    hijriDate: "10 Muharram 1448 AH",
    badge: "Recommended Fast",
    description: "The 10th day of Muharram, marking the day Allah saved Prophet Musa (Moses) and the Israelites from the tyrant Pharaoh by parting the Red Sea.",
    descriptionUrdu: "محرم الحرام کی دسویں تاریخ، جس دن اللہ تعالیٰ نے حضرت موسیٰ علیہ السلام اور آپ کی قوم بنی اسرائیل کو ظالم فرعون سے نجات دی تھی۔",
    significance: "A highly sacred day showcasing victory of truth over tyranny. Prophet Muhammad (PBUH) fasted on this day and recommended believers to fast as well.",
    significanceUrdu: "یہ کفر پر حق کی فتح کا عظیم ترین سچا دن ہے۔ ہمارے پیارے نبی کریم ﷺ اس کا روزہ خود بھی رکھتے تھے اور امت کو بھی رغبت دلائی۔",
    howToCelebrate: "Fasting on the 9th and 10th (or 10th and 11th) of Muharram, increasing acts of charity, and dedicating hours to sincere supplications.",
    howToCelebrateUrdu: "9 اور 10 محرم (یا 10 اور 11 محرم) کا روزہ رکھنا، صدقات و خیرات کی کثرت کرنا اور گریہ و زاری کے ساتھ دعائیں مانگنا۔",
    primaryColor: "amber"
  },
  {
    id: "mawlid_2026",
    name: "Mawlid al-Nabi",
    arabicName: "مولد النبي",
    urduName: "میلاد النبی ﷺ",
    gregorianDate: "September 14, 2026",
    hijriDate: "12 Rabi' al-Awwal 1448 AH",
    badge: "Remembrance",
    description: "The birth anniversary of our beloved Prophet Muhammad (peace be upon him), sent as a mercy to all of human creation.",
    descriptionUrdu: "تمام جہانوں اور انسانوں کے لیے رحمت بنا کر بھیجے گئے ہمارے صاحبِ لولاک پیارے نبی حضرت محمد مصطفیٰ ﷺ کا یومِ ولادتِ سعید۔",
    significance: "Prophet Muhammad's life, excellent character, and timeless teachings are celebrated. It promotes peaceful dialogue, mercy, and compassion.",
    significanceUrdu: "رسول پاک ﷺ کے پاکیزہ اخلاق، سیرتِ طیبہ اور تعلیمات کو یاد کر کے زندگی کو سنتوں کے مطابق بسر کرنے کا عزم کرنا۔",
    howToCelebrate: "Reciting Salawat (blessings upon the Prophet), hosting gatherings of remembrance (Dhikr), singing nasheeds, and sharing food with the poor.",
    howToCelebrateUrdu: "زیادہ سے زیادہ درود و سلام کا نذرانہ پیش کرنا، محافلِ نعت اور مساجد میں ذکرِ الہی کا انعقاد کرنا اور فقراء میں لنگر تقسیم کرنا۔",
    primaryColor: "emerald"
  },
  {
    id: "shab_barat_2027",
    name: "Shab-e-Barat",
    arabicName: "ليلة البراءة",
    urduName: "شبِ برات",
    gregorianDate: "January 23, 2027",
    hijriDate: "15 Sha'ban 1448 AH",
    badge: "Night of Salvation",
    description: "The Night of True Forgiveness and Salvation. It is believed that on this night, Allah decrees destiny, livelihoods, and lifespans for the coming year.",
    descriptionUrdu: "مقدس رات جس کو نجات اور گناہوں سے معافی کی رات کہا جاتا ہے۔ روایت ہے کہ اس رات سال بھر کے رزق، فیصلوں اور عمروں کا تعین ہوتا ہے۔",
    significance: "A transitional night of deep introspection, pleading to Allah for forgiveness of all past sins and welcoming high spiritual elevation.",
    significanceUrdu: "سچے دل سے استغفار کرنے، پچھلے گناہوں پر اللہ سے مغفرت مانگنے اور اگلے سال کی عافیت و تندرستی کی دعا کا بہترین موقع۔",
    howToCelebrate: "Staying up in nocturnal prayers, reciting the Holy Quran, hosting family gatherings of prayer, and fasting on the following day (15th of Sha'ban).",
    howToCelebrateUrdu: "پوری رات نوافل پڑھنا، تلاوتِ قرآن مجید کرنا، دعاؤں کے اجتماعات کرنا اور پندرہ شعبان کا روزہ رکھنا۔",
    primaryColor: "gold"
  },
  {
    id: "ramadan_2027",
    name: "Ramadan Start",
    arabicName: "شهر رمضان المبارك",
    urduName: "آغازِ رمضان المبارک",
    gregorianDate: "February 8, 2027",
    hijriDate: "1 Ramadan 1448 AH",
    badge: "Holy Blessed Month",
    description: "The commencement of the holiest month of the Islamic calendar, during which the Holy Quran was first revealed to Prophet Muhammad.",
    descriptionUrdu: "اسلامی سال کے سب سے برکت والے مہینے کا آغاز، جس کی ایک خاص بابرکت رات میں لوحِ محفوظ سے دنیا پر قرآن پاک کا نزول شروع ہوا۔",
    significance: "A period of complete spiritual discipline, dawn-to-sunset fasting, extensive prayers, patience, and massive community charity support.",
    significanceUrdu: "تقویٰ حاصل کرنے، نفس پر قابو پانے، سحر و افطار کے روزوں کی پابندی، صلہ رحمی، اور محتاجوں کی دل کھول کر مدد کرنے کا مہینہ۔",
    howToCelebrate: "Keeping daily fasts, performing nightly Taraweeh prayers in congregation, constant Quran reading, and organizing community Suhoor and Iftar.",
    howToCelebrateUrdu: "باقاعدگی سے روزے رکھنا، مساجد میں نمازِ تراویح باجماعت پڑھنا، تلاوتِ قرآن پاک کرنا اور نیکیوں اور زکوٰۃ کی ادائیگی بڑھانا۔",
    primaryColor: "emerald"
  },
  {
    id: "laylat_qadr_2027",
    name: "Laylat al-Qadr",
    arabicName: "ليلة القدر",
    urduName: "لیلتہ القدر (شبِ قدر)",
    gregorianDate: "March 6, 2027",
    hijriDate: "27 Ramadan 1448 AH",
    badge: "Night of Power",
    description: "The Night of Power and Destiny, better and more blessed than a thousand months of worship. It falls on one of the odd nights of Ramadan's last ten days.",
    descriptionUrdu: "عظمت اور تقدیر والی عظیم رات جو ایک ہزار مہینوں کی مسلسل نفلی عبادت سے زیادہ افضل و بہتر ہے۔ یہ رمضان کی آخری طاق راتوں میں ہوتی ہے۔",
    significance: "The angels descend to Earth bringing intense blessings and divine peace. Simple prayers on this night are multiplied tremendously in reward.",
    significanceUrdu: "اس رات حضرت جبرائیل علیہ السلام دیگر فرشتوں کے ساتھ امن و رحمت لے کر زمین پر اترتے ہیں اور شب بیداری کی ہر دعا قبول ہوتی ہے۔",
    howToCelebrate: "Continuous nocturnal prayers, searching in devotion during Ramadan's last 10 days, excessive charity, and intense heartfelt repentance.",
    howToCelebrateUrdu: "اکیس، تئیس، پچیس، ستائیس اور انتیس کی شب میں جاگنا، اعتکاف میں وقت بتانا، استغفار کی تسبیحات پڑھنا اور گریہ و زاری کرنا۔",
    primaryColor: "purple"
  },
  {
    id: "eid_fitr_2027",
    name: "Eid al-Fitr",
    arabicName: "عيد الفطر",
    urduName: "عید الفطر",
    gregorianDate: "March 9, 2027",
    hijriDate: "1 Shawwal 1448 AH",
    badge: "Major Holiday",
    description: "The Festival of Breaking the Fast, celebrating the successful completion of the blessed month of Ramadan fasting.",
    descriptionUrdu: "شوال کی پہلی تاریخ کو روزہ افطار کرنے کا پیارا تہوار، جو رمضان المبارک کی عبادتوں اور روزوں کی تکمیل پر اللہ کی طرف سے انعام ہے۔",
    significance: "A beautiful reward from Allah showcasing unified celebration, gratitude, and joy. It is obligatory to pay Zakat al-Fitr (charity) before the prayer starts.",
    significanceUrdu: "مسلمانوں کی باہمی محبت، شکر گزاری اور خوشی کا دن۔ عید کی نماز سے پہلے غریبوں کے لیے فطرانہ ادا کرنا ہر صاحبِ استطاعت پر واجب ہے۔",
    howToCelebrate: "Morning congregational Eid prayers, giving Zakat al-Fitr food/money, wearing fine white outfits, sweet desserts sharing, and festive children items.",
    howToCelebrateUrdu: "صبح سویرے عیدگاہ میں نماز ادا کرنا، صدقہ فطر دینا، بچوں کو عیدی دینا، مٹھائیاں اور سویاں کھانا کھلانا اور ایک دوسرے سے گلے ملنا۔",
    primaryColor: "gold"
  }
];

interface PlannerProps {}

export default function Planner({}: PlannerProps) {
  // Tab control: 'ramadan' (Fasting Dashboard) vs 'festivals' (Holidays Directory)
  const [activeTab, setActiveTab] = useState<'ramadan' | 'festivals'>(() => {
    return (localStorage.getItem("deen_planner_tab") as 'ramadan' | 'festivals') || "ramadan";
  });

  const handleTabChange = (tab: 'ramadan' | 'festivals') => {
    setActiveTab(tab);
    localStorage.setItem("deen_planner_tab", tab);
  };

  // Ramadan Fasting state
  const [fastingActive, setFastingActive] = useState(() => {
    return localStorage.getItem("deen_fast_active") === "true";
  });
  
  const [countdownStr, setCountdownStr] = useState("14h 25m 10s");
  const [notifyToast, setNotifyToast] = useState<string | null>(null);

  // Festivals search and interactive state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFestivalId, setExpandedFestivalId] = useState<string | null>(null);
  const [pinnedFestivals, setPinnedFestivals] = useState<string[]>(() => {
    const saved = localStorage.getItem("deen_pinned_festivals");
    return saved ? JSON.parse(saved) : [];
  });

  // Dynamic Fasting Clock countdown loop
  useEffect(() => {
    if (!fastingActive) return;

    let initialSeconds = 14 * 3600 + 25 * 60 + 10;
    const interval = setInterval(() => {
      if (initialSeconds <= 0) {
        setFastingActive(false);
        localStorage.setItem("deen_fast_active", "false");
        showToast("Iftar Time! Happy Fast-breaking! 🎉");
        clearInterval(interval);
        return;
      }
      initialSeconds--;
      
      const hrs = Math.floor(initialSeconds / 3600);
      const mins = Math.floor((initialSeconds % 3600) / 60);
      const secs = initialSeconds % 60;
      setCountdownStr(`${hrs}h ${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [fastingActive]);

  const showToast = (msg: string) => {
    setNotifyToast(msg);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const handleToggleFast = () => {
    const nextState = !fastingActive;
    setFastingActive(nextState);
    localStorage.setItem("deen_fast_active", String(nextState));
    
    if (nextState) {
      showToast("Suhoor completed! Your fast is active 💫");
    } else {
      showToast("Fast paused / broken");
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let nextPinned;
    if (pinnedFestivals.includes(id)) {
      nextPinned = pinnedFestivals.filter(pId => pId !== id);
      showToast("Removed from your highlights list");
    } else {
      nextPinned = [...pinnedFestivals, id];
      showToast("Added to your highlighted items! ⭐");
    }
    setPinnedFestivals(nextPinned);
    localStorage.setItem("deen_pinned_festivals", JSON.stringify(nextPinned));
  };

  // Helper function to calculate exact days remaining
  const calculateDaysRemaining = (targetDateStr: string): number => {
    const target = new Date(targetDateStr);
    const today = new Date();
    
    // Set May 23, 2026 as the baseline if current machine clock is in the past
    const referenceDate = today < new Date("2026-05-23") ? new Date("2026-05-23") : today;
    
    // Reset hours to count whole days cleanly
    target.setHours(0, 0, 0, 0);
    referenceDate.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - referenceDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter and sort festivals (favorites pinned on top, then chronological remaining)
  const filteredFestivals = FAITH_FESTIVALS.filter(f => {
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.badge.toLowerCase().includes(q) ||
      f.hijriDate.toLowerCase().includes(q) ||
      f.gregorianDate.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    // If pinned, boost ranking
    const aPinned = pinnedFestivals.includes(a.id);
    const bPinned = pinnedFestivals.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Else sort by days remaining chronologically
    const aDays = calculateDaysRemaining(a.gregorianDate);
    const bDays = calculateDaysRemaining(b.gregorianDate);
    
    // Keep closest upcoming first, followed by past ones
    if (aDays >= 0 && bDays < 0) return -1;
    if (aDays < 0 && bDays >= 0) return 1;
    return aDays - bDays;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {notifyToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary-base text-white px-5 py-3 rounded-full shadow-xl text-xs font-semibold z-50 flex items-center gap-2 border border-gold-accent"
          >
            <CheckCircle className="w-4 h-4 text-gold-accent" />
            <span>{notifyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header title & Tab control */}
      <div className="py-2 space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-primary-base mb-1">Ramadan & Festivals</h2>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Keep track of special holy dates, blessed Hijri months, and Ramadan fasting indicators.
          </p>
        </div>

        {/* Sliding Navigation Tabs */}
        <div className="flex bg-[#012d1d]/5 p-1 rounded-xl border border-black/5 max-w-full">
          <button 
            onClick={() => handleTabChange('ramadan')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${activeTab === 'ramadan' ? 'bg-[#012d1d] text-white shadow-md' : 'text-[#011c12] hover:bg-black/5'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ramadan Planner</span>
          </button>
          <button 
            onClick={() => handleTabChange('festivals')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${activeTab === 'festivals' ? 'bg-[#012d1d] text-white shadow-md' : 'text-[#011c12] hover:bg-black/5'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Islamic Festivals</span>
          </button>
        </div>
      </div>

      {/* RENDER RAMADAN PLANNER TAB */}
      {activeTab === 'ramadan' && (
        <section className="bg-white border border-outline-variant/40 rounded-[32px] p-6 shadow-md relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none transform translate-x-1/6 -translate-y-1/6 z-0">
            <Calendar className="w-48 h-48 text-gold-accent" />
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-[#735c00] bg-gold-accent/15 px-3 py-1 rounded-full">
                Ramadan Timing Dashboard
              </span>
              <span className="text-xs font-serif font-bold text-primary-base">Ramadan 1445</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Suhoor Ends */}
              <div className="bg-primary-base/5 border border-primary-base/10 rounded-2xl p-4 flex flex-col gap-1.5 align-middle text-left">
                <span className="text-[9px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-gold-accent" />
                  Suhoor ends
                </span>
                <span className="font-serif text-lg font-extrabold text-primary-base">04:20 AM</span>
              </div>

              {/* Iftar Begins */}
              <div className="bg-[#fed65b]/10 border border-[#fed65b]/20 rounded-2xl p-4 flex flex-col gap-1.5 align-middle text-left">
                <span className="text-[9px] uppercase font-bold text-[#735c00] flex items-center gap-1">
                  <Sunset className="w-3.5 h-3.5 text-[#735c00]" />
                  Iftar Starts
                </span>
                <span className="font-serif text-lg font-extrabold text-primary-base">18:45 PM</span>
              </div>
            </div>

            {/* Today's Fasting Dua */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 relative">
              <span className="text-[8px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">
                Fasting Supplication Note
              </span>
              <p className="font-arabic text-right text-[#012d1d] text-lg font-bold leading-none mb-1">
                وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ
              </p>
              <p className="font-serif text-xs font-bold text-primary-base italic">
                "Ya Allah, I intend to keep the fast for tomorrow..."
              </p>
            </div>

            {/* Fast Status metrics */}
            <div className="space-y-3 pt-1">
              {fastingActive ? (
                <div className="bg-[#012d1d] p-4 text-white rounded-2xl border border-gold-accent/30 text-center space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gold-accent font-sans font-bold uppercase tracking-wider block">
                      FAST ACTIVE 💫
                    </span>
                    <span className="bg-gold-accent/20 px-2.5 py-1 text-[10px] text-gold-accent rounded-full font-bold">
                      Countdown to Iftar
                    </span>
                  </div>
                  <div className="text-xl font-serif font-extrabold text-[#fed65b] tracking-wider animate-pulse pt-1">
                    {countdownStr}
                  </div>
                </div>
              ) : (
                <div className="bg-[#fed65b]/20 text-[#735c00] border border-[#fed65b]/30 p-3.5 rounded-xl text-center text-xs font-semibold">
                  Start your fast loop to display active countdown trackers.
                </div>
              )}

              <button 
                onClick={handleToggleFast}
                className={`w-full py-3.5 rounded-full font-sans font-extrabold text-xs uppercase tracking-widest shadow transition-all active:scale-95 cursor-pointer ${fastingActive ? "bg-red-700 hover:bg-red-800 text-white" : "bg-primary-base hover:bg-primary-light text-white"}`}
              >
                {fastingActive ? "Pause/Break Fast" : "Start Fast Timer"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RENDER ISLAMIC FESTIVALS DIRECTORY */}
      {activeTab === 'festivals' && (
        <div className="space-y-4 animate-fade-in relative z-10">
          
          {/* Quick Search Filtering */}
          <div className="relative">
            <Search className="w-4 h-4 text-primary-base/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search festivals, holy nights, or dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-outline-variant/30 text-xs font-medium text-[#011c12] placeholder-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-gold-accent focus:border-gold-accent shadow-sm"
            />
          </div>

          {/* Guidelines / Hijri note info header */}
          <div className="bg-gold-accent/10 border border-gold-accent/20 rounded-2xl p-4 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-[#735c00] font-extrabold uppercase tracking-wider text-[10px]">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Lunar Calendar Realities</span>
            </div>
            <p className="text-[#011c12]/80 leading-normal font-sans font-medium">
              Islamic festivals are based on the lunar Hijri calendar. Gregorian dates shown are approximate and may shift slightly upon authoritative regional sighting of the crescent moon.
            </p>
          </div>

          {/* Festival List */}
          <div className="space-y-3">
            {filteredFestivals.length > 0 ? (
              filteredFestivals.map((fest) => {
                const daysLeft = calculateDaysRemaining(fest.gregorianDate);
                const isExpanded = expandedFestivalId === fest.id;
                const isPinned = pinnedFestivals.includes(fest.id);
                
                // Color mapping for premium aesthetics
                let accentBg = "bg-primary-base/5 border-primary-base/15";
                let textAccent = "text-primary-base";
                let badgeStyle = "bg-primary-base/10 text-primary-base";
                
                if (fest.primaryColor === "gold") {
                  accentBg = "bg-gold-accent/10 border-gold-accent/25";
                  textAccent = "text-[#735c00]";
                  badgeStyle = "bg-gold-accent/20 text-[#735c00]";
                } else if (fest.primaryColor === "amber") {
                  accentBg = "bg-amber-500/5 border-amber-500/20";
                  textAccent = "text-amber-700";
                  badgeStyle = "bg-amber-500/15 text-amber-800";
                } else if (fest.primaryColor === "purple") {
                  accentBg = "bg-purple-600/5 border-purple-600/20";
                  textAccent = "text-purple-700";
                  badgeStyle = "bg-purple-600/15 text-purple-800";
                }

                return (
                  <div 
                    key={fest.id}
                    onClick={() => setExpandedFestivalId(isExpanded ? null : fest.id)}
                    className="bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                  >
                    <div className="flex justify-between items-start gap-2.5">
                      <div className="space-y-1 flex-grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full ${badgeStyle}`}>
                            {fest.badge}
                          </span>
                          
                          {/* Display Live Countdown */}
                          <span className={`text-[9px] font-extrabold ${daysLeft === 0 ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded' : daysLeft < 0 ? 'text-gray-400 font-normal' : 'text-gold-accent animate-pulse font-sans'}`}>
                            {daysLeft === 0 
                              ? "✨ HAPPENING TODAY! 🎉" 
                              : daysLeft < 0 
                                ? `Passed ${Math.abs(daysLeft)} days ago` 
                                : `• ${daysLeft} days left`
                            }
                          </span>
                        </div>

                        {/* Title of event */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <h3 className="font-serif text-base font-extrabold text-primary-base leading-none">
                            {fest.name}
                          </h3>
                          <span className="text-xs font-semibold text-emerald-800 tracking-normal" dir="rtl">
                            ({fest.urduName})
                          </span>
                          <span className="font-arabic text-[11px] font-bold text-gold-accent" dir="rtl">
                            {fest.arabicName}
                          </span>
                        </div>

                        {/* Dates row */}
                        <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-semibold select-none">
                          <span className="flex items-center gap-1 bg-[#012d1d]/5 px-2 py-0.5 rounded-md">
                            <Calendar className="w-3 h-3 text-[#012d1d]/60" />
                            {fest.gregorianDate}
                          </span>
                          <span className="flex items-center gap-1 bg-gold-accent/10 px-2 py-0.5 rounded-md text-[#735c00]">
                            <Moon className="w-3 h-3 text-gold-accent" />
                            {fest.hijriDate}
                          </span>
                        </div>
                      </div>

                      {/* Right Hand Actions */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => handleTogglePin(fest.id, e)}
                          className="p-2 rounded-full hover:bg-[#012d1d]/5 transition-colors cursor-pointer border-none bg-transparent"
                        >
                          <Star className={`w-4 h-4 ${isPinned ? "text-[#735c00] fill-[#735c00]" : "text-gray-300"}`} />
                        </button>
                        <div className="p-1 text-primary-base/40">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Explanatory description drawer details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden mt-3.5 pt-3.5 border-t border-dashed border-outline-variant/30 space-y-4 text-left text-xs"
                          onClick={(e) => e.stopPropagation()} // Prevent collapse toggling inside details
                        >
                          {/* Description box */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-b border-[#012d1d]/5 pb-3">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-[#735c00] tracking-widest flex items-center gap-1 font-sans">
                                <Info className="w-3 h-3" />
                                Historical Background
                              </span>
                              <p className="text-on-surface-variant font-medium leading-relaxed font-sans">
                                {fest.description}
                              </p>
                            </div>
                            <div className="space-y-1 bg-emerald-50/20 p-2.5 rounded-xl border border-emerald-800/10 text-right" dir="rtl">
                              <span className="text-[10px] font-bold text-emerald-800 flex items-center justify-start gap-1 font-sans">
                                <Info className="w-3 h-3 text-gold-accent" />
                                تاریخی پس منظر
                              </span>
                              <p className="text-primary-base font-semibold leading-relaxed text-xs pt-0.5">
                                {fest.descriptionUrdu}
                              </p>
                            </div>
                          </div>

                          {/* Significance Box */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-b border-[#012d1d]/5 pb-3">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-primary-base tracking-widest flex items-center gap-1 font-sans">
                                <BookOpen className="w-3 h-3 text-gold-accent" />
                                Core Divine Significance
                              </span>
                              <p className="text-on-surface-variant font-medium leading-relaxed font-sans">
                                {fest.significance}
                              </p>
                            </div>
                            <div className="space-y-1 bg-amber-50/25 p-2.5 rounded-xl border border-gold-accent/15 text-right" dir="rtl">
                              <span className="text-[10px] font-bold text-[#735c00] flex items-center justify-start gap-1 font-sans">
                                <BookOpen className="w-3 h-3 text-[#735c00]" />
                                مذہبی اہمیت اور پیغام
                              </span>
                              <p className="text-primary-base font-semibold leading-relaxed text-xs pt-0.5">
                                {fest.significanceUrdu}
                              </p>
                            </div>
                          </div>

                          {/* Sunnah / Celebration Tips */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-gold-accent/5 p-3 rounded-2xl border border-gold-accent/15">
                            <div className="space-y-1.5">
                              <span className="text-[9px] uppercase font-bold text-primary-base tracking-widest flex items-center gap-1 font-sans">
                                <Sparkles className="w-3 h-3 text-gold-accent" />
                                Sunnah & Practices (How to Celebrate)
                              </span>
                              <p className="text-primary-base font-semibold leading-relaxed font-sans text-[11px]">
                                {fest.howToCelebrate}
                              </p>
                            </div>
                            <div className="space-y-1.5 text-right" dir="rtl">
                              <span className="text-[10px] font-bold text-[#735c00] flex items-center justify-start gap-1 font-sans">
                                <Sparkles className="w-3 h-3 text-gold-accent" />
                                سنت مبارکہ اور منانے کا عزم
                              </span>
                              <p className="text-emerald-950 font-bold leading-relaxed text-xs pt-0.5">
                                {fest.howToCelebrateUrdu}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-outline-variant/30 rounded-2xl p-8 text-center text-xs text-on-surface-variant/70 space-y-1">
                <p className="font-bold">No Islamic festivals matching your search query.</p>
                <p className="text-[10px]">Try searching "Eid", "Muharram", or "Ramadan".</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
