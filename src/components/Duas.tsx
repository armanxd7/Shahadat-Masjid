import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sun, 
  Moon, 
  Compass, 
  Plane, 
  Play, 
  Pause, 
  Search, 
  CheckCircle2, 
  Heart, 
  Share2, 
  Bookmark,
  ChevronRight,
  Sparkles,
  Award,
  Volume2,
  Music,
  X,
  VolumeX
} from "lucide-react";
import { DuaItem } from "../types";

const DUA_PRESETS_DATA: DuaItem[] = [
  {
    id: "dua_anxiety",
    title: "Dua for Anxiety & Grief",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice.",
    urduTranslation: "اے اللہ! میں فکر اور غم، عاجزی اور سستی، بخل اور بزدلی سے تیری پناہ مانگتا ہوں۔",
    category: "Morning",
    phonetic: "Allahumma inni a'udhu bika minal-hammi wal-hazan..."
  },
  {
    id: "dua_forgiveness",
    title: "Dua for Seeking Forgiveness",
    arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    translation: "My Lord, forgive me and accept my repentance, indeed You are the Accepting of repentance, the Merciful.",
    urduTranslation: "اے میرے رب! مجھے بخش دے اور میری توبہ قبول فرما، بیشک تو توبہ قبول کرنے والا، نہایت رحم کرنے والا ہے۔",
    category: "Morning",
    phonetic: "Rabbighfir li wa tub 'alayya innaka Antat-Tawwabur-Rahim."
  },
  {
    id: "dua_mosque",
    title: "Dua for Entering the Mosque",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    translation: "O Allah, open for me the gates of Your mercy.",
    urduTranslation: "اے اللہ! میرے لیے اپنی رحمت کے دروازے کھول دے۔",
    category: "After Prayer",
    phonetic: "Allahumma-ftah li abwaba rahmatik."
  },
  {
    id: "dua_patience",
    title: "Dua for Patience",
    arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا",
    translation: "Our Lord, pour upon us patience and plant firmly our feet.",
    urduTranslation: "اے ہمارے رب! ہم پر صبر کے دہانے کھول دے اور ہمارے قدموں کو ثابت قدم رکھ۔",
    category: "Travel",
    phonetic: "Rabbana afrigh 'alayna sabran wa thabbit aqdamana."
  },
  {
    id: "dua_evening",
    title: "Evening Protection Shield",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    translation: "In the name of Allah with whose name nothing can harm on earth nor in heaven, and He is the All-Hearing, All-Knowing.",
    urduTranslation: "اللہ کے نام کے ساتھ جس کے نام کی برکت سے زمین اور آسمان میں کوئی چیز نقصان نہیں پہنچا سکتی، اور وہ سب کچھ سننے والا، سب کچھ جاننے والا ہے۔",
    category: "Evening",
    phonetic: "Bismillahil-ladhi la yadurru ma'as-mihi shay'un..."
  }
];

export default function Duas() {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Morning' | 'Evening' | 'After Prayer' | 'Travel'>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [playDuaId, setPlayDuaId] = useState<string | null>(null);
  const [favoriteDuas, setFavoriteDuas] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("deen_fav_duas");
    return saved ? JSON.parse(saved) : {};
  });
  const [notifyToast, setNotifyToast] = useState<string | null>(null);

  // Sound synthesis states for Dua recitation & multilingual speaker
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [isPlayingDuaSpeech, setIsPlayingDuaSpeech] = useState(false);
  const [speechMode, setSpeechMode] = useState<'arabic' | 'translation' | 'urdu'>('arabic');
  const [customDuas, setCustomDuas] = useState<DuaItem[]>([]);
  const [memorizeSpeed, setMemorizeSpeed] = useState<number>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchCustomDuas = async () => {
    try {
      const res = await fetch("/api/public/config");
      if (res.ok) {
        const data = await res.json();
        if (data.customDuas) {
          setCustomDuas(data.customDuas);
        }
      }
    } catch (err) {
      console.error("Error fetching custom duas in Duas component:", err);
    }
  };

  // Load available system language voices dynamically
  useEffect(() => {
    fetchCustomDuas();
    window.addEventListener("deen_config_updated", fetchCustomDuas);

    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const list = window.speechSynthesis.getVoices();
        setVoices(list);
        
        // Find best initial voice
        const defaultVoice = list.find(v => v.lang.startsWith("ne") || v.lang.startsWith("ur") || v.lang.startsWith("hi")) ||
                             list.find(v => v.lang.startsWith("en")) ||
                             list[0];
        if (defaultVoice && !selectedVoiceName) {
          setSelectedVoiceName(defaultVoice.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      window.removeEventListener("deen_config_updated", fetchCustomDuas);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setNotifyToast(msg);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const handleToggleFavorite = (id: string, title: string) => {
    const nextState = !favoriteDuas[id];
    const updated = { ...favoriteDuas, [id]: nextState };
    setFavoriteDuas(updated);
    localStorage.setItem("deen_fav_duas", JSON.stringify(updated));
    showToast(nextState ? `Added "${title}" to Favorites! ❤️` : `Removed "${title}" from Favorites`);
  };

  const allDuas = [...customDuas, ...DUA_PRESETS_DATA];

  const handlePlayDua = (id: string, mode: 'arabic' | 'translation' | 'urdu' = 'arabic', targetSpeed?: number) => {
    // 1. Stop any currently playing audio or speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const speedToUse = targetSpeed !== undefined ? targetSpeed : memorizeSpeed;

    // 2. If clicking on the already-playing item with same mode, just stop / pause
    if (playDuaId === id && isPlayingDuaSpeech && speechMode === mode && targetSpeed === undefined) {
      setIsPlayingDuaSpeech(false);
      setPlayDuaId(null);
      return;
    }

    const selectedDua = allDuas.find(d => d.id === id);
    if (!selectedDua) return;

    setPlayDuaId(id);
    setSpeechMode(mode);
    setIsPlayingDuaSpeech(true);

    let textToPlay = "";
    let langCode = "";

    if (mode === 'arabic') {
      textToPlay = selectedDua.arabic;
      langCode = 'ar';
    } else if (mode === 'urdu') {
      textToPlay = selectedDua.urduTranslation || "";
      langCode = 'ur';
    } else {
      textToPlay = selectedDua.translation;
      langCode = 'en';
    }

    if (!textToPlay) {
      setIsPlayingDuaSpeech(false);
      setPlayDuaId(null);
      return;
    }

    // Prepare text format for synthesis: strip brackets and annotations
    let cleanText = textToPlay;
    if (langCode === 'ur' || langCode === 'ar') {
      cleanText = textToPlay
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/[a-zA-Z]/g, "")
        .trim();
    } else {
      cleanText = textToPlay.replace(/\([^)]*\)/g, "").trim();
    }

    // Helper to play via Google TTS (Alternative Fallback)
    const playGoogleTts = () => {
      const googleTtsUrl = `/api/tts?tl=${langCode}&q=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(googleTtsUrl);
      audioRef.current = audio;
      
      // Set customized dynamic playback speed rate
      try {
        audio.playbackRate = speedToUse;
      } catch (err) {
        console.warn("Could not set playbackRate directly, waiting for metadata loading...");
      }

      audio.onplay = () => {
        setIsPlayingDuaSpeech(true);
        // Direct enforcement of speed
        try {
          audio.playbackRate = speedToUse;
        } catch (e) {}
      };

      audio.onended = () => {
        setIsPlayingDuaSpeech(false);
        setPlayDuaId(null);
      };

      audio.onerror = () => {
        console.warn("Both SpeechSynthesis and Google TTS failed.");
        setIsPlayingDuaSpeech(false);
        setPlayDuaId(null);
      };

      audio.play().catch((err) => {
        console.warn("Google TTS audio play failed:", err);
        setIsPlayingDuaSpeech(false);
        setPlayDuaId(null);
      });
    };

    // Primary: Web Speech API SpeechSynthesis (100% Client-Side, never rate-limited)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        let matchLang = 'en-US';
        if (langCode === 'ar') matchLang = 'ar';
        else if (langCode === 'ur') matchLang = 'ur';

        // Find system voice matching chosen langCode prefix
        const elegidos = voices.filter(v => v.lang.toLowerCase().startsWith(matchLang));
        if (elegidos.length > 0) {
          // If playing english, prefer user-selected custom system voice if match
          const userSelected = voices.find(v => v.name === selectedVoiceName);
          if (langCode === 'en' && userSelected) {
            utterance.voice = userSelected;
            utterance.lang = userSelected.lang;
          } else {
            utterance.voice = elegidos[0];
            utterance.lang = elegidos[0].lang;
          }
        } else {
          utterance.lang = langCode === 'ar' ? 'ar-SA' : (langCode === 'ur' ? 'ur-PK' : 'en-US');
        }

        // Apply dynamic speed setting to speech rate
        utterance.rate = speedToUse * (langCode === 'ar' ? 0.8 : 0.9);
        
        utterance.onstart = () => {
          setIsPlayingDuaSpeech(true);
        };
        utterance.onend = () => {
          setIsPlayingDuaSpeech(false);
          setPlayDuaId(null);
        };
        utterance.onerror = (e) => {
          console.warn("SpeechSynthesis error, falling back to server TTS:", e);
          playGoogleTts();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("SpeechSynthesis execution failed, falling back to server TTS:", err);
        playGoogleTts();
      }
    } else {
      playGoogleTts();
    }

    showToast(`Reciting at ${speedToUse}x speed: ${mode === 'arabic' ? 'Arabic' : (mode === 'urdu' ? 'Urdu' : 'English')} 🔊`);
  };

  const handlePlaySpeedChange = (speed: number) => {
    setMemorizeSpeed(speed);
    if (playDuaId) {
      setTimeout(() => {
        handlePlayDua(playDuaId, speechMode, speed);
      }, 50);
    }
  };

  // Filter logic
  const selectedPlayingDua = allDuas.find(d => d.id === playDuaId);

  const filteredDuas = allDuas.filter((dua) => {
    const matchesCategory = activeCategory === 'All' || dua.category === activeCategory;
    const matchesSearch = dua.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dua.arabic.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
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

      {/* Header and description */}
      <div className="py-2">
        <h2 className="font-serif text-2xl font-bold text-primary-base mb-1">Dua Library</h2>
        <p className="text-xs text-on-surface-variant max-w-sm">
          Find spiritual tranquility through Duas of the Prophet (PBUH) and Quranic supplications.
        </p>
      </div>

      {/* Quick Category Bento Selection Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Morning */}
        <div 
          onClick={() => setActiveCategory("Morning")}
          className={`p-5 rounded-[24px] flex flex-col justify-between aspect-square md:aspect-auto md:h-28 cursor-pointer transition-all border ${activeCategory === 'Morning' ? "bg-primary-base text-gold-accent border-gold-accent shadow-md" : "bg-white text-primary-base border-outline-variant/30 hover:border-gold-accent/20"}`}
        >
          <Sun className="w-6 h-6 text-gold-accent" />
          <div>
            <h3 className="font-serif text-[13.5px] font-bold">Morning</h3>
            <span className="text-[9px] opacity-60 font-semibold">12 Supplications</span>
          </div>
        </div>

        {/* Evening */}
        <div 
          onClick={() => setActiveCategory("Evening")}
          className={`p-5 rounded-[24px] flex flex-col justify-between aspect-square md:aspect-auto md:h-28 cursor-pointer transition-all border ${activeCategory === 'Evening' ? "bg-gold-accent text-primary-base border-gold-accent shadow-md" : "bg-white text-[#735c00] border-outline-variant/30 hover:border-gold-accent/20"}`}
        >
          <Moon className="w-6 h-6 text-[#735c00]" />
          <div>
            <h3 className="font-serif text-[13.5px] font-bold">Evening</h3>
            <span className="text-[9px] opacity-60 font-semibold">15 Supplications</span>
          </div>
        </div>

        {/* After Prayer */}
        <div 
          onClick={() => setActiveCategory("After Prayer")}
          className={`p-5 rounded-[24px] flex flex-col justify-between aspect-square md:aspect-auto md:h-28 cursor-pointer transition-all border ${activeCategory === 'After Prayer' ? "bg-emerald-800 text-white border-gold-accent/30 shadow-md" : "bg-white text-emerald-800 border-outline-variant/30 hover:border-gold-accent/20"}`}
        >
          <Compass className="w-6 h-6 text-emerald-600" />
          <div>
            <h3 className="font-serif text-[13.5px] font-bold">After Salah</h3>
            <span className="text-[9px] opacity-65 font-semibold">8 Supplications</span>
          </div>
        </div>

        {/* Travel */}
        <div 
          onClick={() => setActiveCategory("Travel")}
          className={`p-5 rounded-[24px] flex flex-col justify-between aspect-square md:aspect-auto md:h-28 cursor-pointer transition-all border ${activeCategory === 'Travel' ? "bg-indigo-950 text-white border-gold-accent/30 shadow-md" : "bg-white text-indigo-950 border-outline-variant/30 hover:border-gold-accent/20"}`}
        >
          <Plane className="w-6 h-6 text-indigo-500" />
          <div>
            <h3 className="font-serif text-[13.5px] font-bold">Travel</h3>
            <span className="text-[9px] opacity-65 font-semibold">5 Supplications</span>
          </div>
        </div>
      </div>

      {/* Recommended Today Card - AnxietySupplication card */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#012d1d] text-white shadow-lg border border-gold-accent/35 p-6">
        <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Award className="w-64 h-64 text-gold-accent" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-3 py-1 bg-gold-accent text-primary-base font-sans text-[8.5px] font-extrabold tracking-widest rounded-full mb-2">
                DAILY RECOMMENDATION
              </span>
              <h3 className="font-serif text-lg font-bold text-gold-accent">Dua for Anxiety & Grief</h3>
            </div>
            <button 
              onClick={() => showToast("Supplication details shared! 🔗")}
              className="w-9 h-9 border border-white/10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-gold-accent" />
            </button>
          </div>

          <p className="font-arabic text-2xl text-right text-white font-semibold leading-relaxed">
            اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ
          </p>

          <div className="h-[1px] bg-white/10 w-full"></div>

          <p 
            onClick={() => handlePlayDua("dua_anxiety", "translation")}
            className="font-sans text-xs italic text-[#a5d0b9] leading-relaxed cursor-pointer hover:text-white hover:bg-white/5 p-1.5 px-2.5 rounded-xl transition-all flex items-center gap-1.5 select-none"
            title="Click to speak English"
          >
            <Volume2 className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
            <span>"O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice..."</span>
          </p>

          <p 
            onClick={() => handlePlayDua("dua_anxiety", "urdu")}
            className="text-right text-xs text-[#fed65b] font-sans font-semibold leading-relaxed cursor-pointer hover:text-[#fff176] hover:bg-white/5 p-1.5 px-2.5 rounded-xl transition-all flex items-center justify-end gap-1.5 select-none" 
            dir="rtl"
            title="اردو میں سننے کے لیے کلک کریں"
          >
            <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>اے اللہ! میں فکر اور غم، عاجزی اور سستی، بخل اور بزدلی سے تیری پناہ مانگتا ہوں۔</span>
          </p>

          <p className="text-[10px] text-on-primary-container font-semibold italic">
             — Al-Bukhari 7/158
          </p>

          <div className="space-y-4 pt-2">
            {/* System Audio Voice config for Translation speaking */}
            <div className="flex items-center gap-2 max-w-sm">
              <span className="text-[9px] font-bold text-[#a5d0b9] uppercase tracking-wider">Translation Voice:</span>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="text-[9px] font-bold tracking-wider bg-white/15 hover:bg-white/20 border border-white/25 rounded px-2.5 py-1 text-[#a5d0b9] focus:outline-none focus:ring-1 focus:ring-gold-accent cursor-pointer transition-all"
              >
                <option value="" disabled className="text-primary-base">Choose System Voice</option>
                {voices.length === 0 ? (
                  <option value="" className="text-primary-base">Loading...</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.name} value={v.name} className="text-primary-base text-[9px]">
                      {v.lang.toUpperCase()} - {v.name.slice(0, 15)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Play Arabic button */}
              <button 
                onClick={() => handlePlayDua("dua_anxiety", "arabic")}
                className="flex-1 py-3 bg-[#fed65b] text-primary-base font-sans font-extrabold text-[11px] rounded-full flex items-center justify-center gap-1.5 shadow hover:scale-[1.02] duration-150 cursor-pointer border-none"
              >
                {playDuaId === "dua_anxiety" && isPlayingDuaSpeech && speechMode === 'arabic' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-primary-base fill-primary-base animate-pulse" />
                    <span>Pause Holy Recitation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-primary-base fill-primary-base" />
                    <span>Recite Holy Arabic</span>
                  </>
                )}
              </button>

              {/* Play Translation button */}
              <button 
                onClick={() => handlePlayDua("dua_anxiety", "translation")}
                className="flex-1 py-3 bg-emerald-800 text-white font-sans font-extrabold text-[11px] rounded-full flex items-center justify-center gap-1.5 shadow hover:scale-[1.02] duration-150 cursor-pointer border-none"
              >
                {playDuaId === "dua_anxiety" && isPlayingDuaSpeech && speechMode === 'translation' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-white fill-white animate-pulse" />
                    <span>Pause Translation</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                    <span>Speak English</span>
                  </>
                )}
              </button>

              {/* Play Urdu translation button */}
              <button 
                onClick={() => handlePlayDua("dua_anxiety", "urdu")}
                className="flex-1 py-3 bg-amber-600 text-white font-sans font-extrabold text-[11px] rounded-full flex items-center justify-center gap-1.5 shadow hover:scale-[1.02] duration-150 cursor-pointer border-none"
              >
                {playDuaId === "dua_anxiety" && isPlayingDuaSpeech && speechMode === 'urdu' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-white fill-white animate-pulse" />
                    <span>Pause Urdu Speak</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                    <span>Speak Urdu (اردو)</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => handleToggleFavorite("dua_anxiety", "Dua for Anxiety & Grief")}
                className={`w-12 h-12 border rounded-full flex items-center justify-center transition-colors cursor-pointer ${favoriteDuas["dua_anxiety"] ? "bg-gold-accent/20 border-gold-accent text-gold-accent" : "border-white/20 hover:bg-white/10 text-white"}`}
              >
                <Heart className={`w-4 h-4 ${favoriteDuas["dua_anxiety"] ? "fill-gold-accent animate-pulse" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Input and Categories filters */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <input 
              type="text"
              placeholder="Search for a specific Supplication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-outline-variant/30 rounded-full bg-white text-xs text-primary-base font-semibold focus:ring-1 focus:ring-gold-accent outline-none"
            />
            <Search className="w-4 h-4 text-on-surface-variant absolute left-4 top-3.5" />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
            {['All', 'Morning', 'Evening', 'After Prayer', 'Travel'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${activeCategory === cat ? "bg-primary-base text-white border-primary-base" : "bg-white text-on-surface-variant/70 border-outline-variant/40 hover:bg-surface-container-low"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Supplication lists */}
        {filteredDuas.length === 0 ? (
          <div className="text-center py-6 bg-white border border-outline-variant/30 rounded-2xl p-6 text-on-surface-variant text-xs font-semibold">
            No matching supplications found. Try resetting search Query.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDuas.map((dua) => (
              <div 
                key={dua.id}
                className="bg-white rounded-2xl p-5 border border-outline-variant/35 shadow-sm space-y-3 group hover:border-gold-accent/25"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold-accent animate-pulse"></span>
                      <h4 className="font-serif text-sm font-bold text-primary-base">{dua.title}</h4>
                      <span className="text-[7.5px] uppercase font-bold tracking-widest text-[#735c00] bg-gold-accent/10 px-2 py-0.5 rounded-full ml-auto select-none">
                        {dua.category}
                      </span>
                    </div>

                    <p className="font-arabic text-xl text-right text-primary-base font-semibold leading-relaxed pt-2">
                      {dua.arabic}
                    </p>

                    <p 
                      onClick={() => handlePlayDua(dua.id, 'translation')}
                      className="text-xs text-on-surface-variant leading-relaxed cursor-pointer hover:bg-black/5 hover:text-black p-1.5 px-2.5 rounded-xl border border-transparent hover:border-black/5 transition-all flex items-center gap-1.5 select-none"
                      title="Click to hear English translation"
                    >
                      <Volume2 className="w-3 h-3 text-primary-base opacity-60 flex-shrink-0" />
                      <span>{dua.translation}</span>
                    </p>

                    {dua.urduTranslation && (
                      <div 
                        onClick={() => handlePlayDua(dua.id, 'urdu')}
                        className="bg-gold-accent/[0.04] hover:bg-gold-accent/[0.08] p-2.5 rounded-xl border border-gold-accent/10 mt-1.5 cursor-pointer transition-all flex items-center justify-between gap-2.5 select-none" 
                        dir="rtl"
                        title="اردو میں سننے کے لیے کلک کریں"
                      >
                        <p className="text-right text-[12.5px] text-[#735c00] font-sans font-semibold leading-relaxed flex-1">
                          {dua.urduTranslation}
                        </p>
                        <Volume2 className="w-3.5 h-3.5 text-[#735c00] opacity-80 flex-shrink-0 mr-1.5" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-outline-variant/20">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Recite Arabic icon/button */}
                        <button 
                          onClick={() => handlePlayDua(dua.id, 'arabic')}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border-none ${playDuaId === dua.id && isPlayingDuaSpeech && speechMode === 'arabic' ? 'bg-[#012d1d] text-white' : 'bg-gold-accent/15 text-primary-base hover:bg-gold-accent/25'}`}
                          title="Recite Arabic Supplication aloud"
                        >
                          {playDuaId === dua.id && isPlayingDuaSpeech && speechMode === 'arabic' ? (
                            <Pause className="w-3 h-3 text-white fill-white animate-pulse" />
                          ) : (
                            <Play className="w-3 h-3 text-primary-base fill-primary-base" />
                          )}
                          <span>Recite Arabic</span>
                        </button>

                        {/* Speak Translation with voice */}
                        <button 
                          onClick={() => handlePlayDua(dua.id, 'translation')}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border-none ${playDuaId === dua.id && isPlayingDuaSpeech && speechMode === 'translation' ? 'bg-primary-base text-white' : 'bg-primary-base/5 text-primary-base hover:bg-primary-base/10'}`}
                          title="Speak Translation voice output"
                        >
                          {playDuaId === dua.id && isPlayingDuaSpeech && speechMode === 'translation' ? (
                            <Pause className="w-3 h-3 text-white fill-white animate-pulse" />
                          ) : (
                            <Volume2 className="w-3 h-3 text-primary-base" />
                          )}
                          <span>Speak Translate</span>
                        </button>

                        {/* Speak Urdu Translation with voice */}
                        {dua.urduTranslation && (
                          <button 
                            onClick={() => handlePlayDua(dua.id, 'urdu')}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border-none ${playDuaId === dua.id && isPlayingDuaSpeech && speechMode === 'urdu' ? 'bg-amber-600 text-white' : 'bg-amber-600/10 text-amber-700 hover:bg-amber-600/20'}`}
                            title="Speak Urdu translation using system voice"
                          >
                            {playDuaId === dua.id && isPlayingDuaSpeech && speechMode === 'urdu' ? (
                              <Pause className="w-3 h-3 text-white fill-white animate-pulse" />
                            ) : (
                              <Volume2 className="w-3 h-3 text-amber-600" />
                            )}
                            <span>Speak Urdu</span>
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] italic text-on-surface-variant font-medium select-none max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                        {dua.phonetic}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 align-middle">
                    <button 
                      onClick={() => handleToggleFavorite(dua.id, dua.title)}
                      className="p-1 text-on-surface-variant/40 hover:text-red-500 rounded transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${favoriteDuas[dua.id] ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Decorative Elegant Footer Quote matching screenshot details */}
      <section className="text-center py-6 border-t border-outline-variant/20 relative">
        <p className="font-serif text-base text-primary-base italic max-w-sm mx-auto leading-relaxed">
          "Dua is the essence of worship."
        </p>
        <span className="text-[9px] text-[#735c00] font-sans font-bold uppercase tracking-widest block mt-2">
          — PROPHET MUHAMMAD (PBUH)
        </span>
      </section>

      {/* Floating Bottom Memorization Audio Companion Player */}
      <AnimatePresence>
        {playDuaId && selectedPlayingDua && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            className="fixed bottom-[84px] left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-sm bg-[#012d1d]/95 backdrop-blur-md rounded-2xl p-4 border border-gold-accent/40 shadow-2xl flex flex-col gap-3 text-white"
          >
            {/* Top Info section */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Glowing sound wave animation code */}
                <div className="flex items-center gap-[2px] h-4 px-1.5 py-1 bg-gold-accent/15 border border-gold-accent/30 rounded-lg">
                  {isPlayingDuaSpeech ? (
                    <>
                      <span className="w-[2px] h-2.5 bg-gold-accent rounded-full animate-[bounce_1.2s_infinite_100ms] origin-bottom"></span>
                      <span className="w-[2px] h-3.5 bg-gold-accent rounded-full animate-[bounce_1.2s_infinite_300ms] origin-bottom"></span>
                      <span className="w-[2px] h-1.5 bg-gold-accent rounded-full animate-[bounce_1.2s_infinite_500ms] origin-bottom"></span>
                      <span className="w-[2px] h-3 bg-gold-accent rounded-full animate-[bounce_1.2s_infinite_200ms] origin-bottom"></span>
                    </>
                  ) : (
                    <>
                      <span className="w-[2px] h-1 bg-gold-accent/65 rounded-full"></span>
                      <span className="w-[2px] h-1.5 bg-gold-accent/65 rounded-full"></span>
                      <span className="w-[2px] h-1 bg-gold-accent/65 rounded-full"></span>
                      <span className="w-[2px] h-1.5 bg-gold-accent/65 rounded-full"></span>
                    </>
                  )}
                </div>
                <div className="overflow-hidden">
                  <span className="text-[8px] uppercase tracking-widest font-black text-gold-accent font-sans block mb-0.5">
                    RECITING AUDIO • MEMORIZING SUPPORT
                  </span>
                  <h5 className="font-serif text-[13px] font-bold text-white truncate max-w-[210px]">
                    {selectedPlayingDua.title}
                  </h5>
                </div>
              </div>

              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                  }
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  setIsPlayingDuaSpeech(false);
                  setPlayDuaId(null);
                }}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors cursor-pointer border-none"
                title="Stop & close player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Middle panel - speech mode controller */}
            <div className="bg-black/20 rounded-xl p-1.5 grid grid-cols-3 gap-1 text-[10px] uppercase font-bold tracking-wider text-center">
              <button
                onClick={() => handlePlayDua(playDuaId, 'arabic')}
                className={`py-1.5 rounded-lg transition-all border-none cursor-pointer ${speechMode === 'arabic' ? 'bg-[#fed65b] text-[#012d1d] shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                Holy Arabic
              </button>
              <button
                onClick={() => handlePlayDua(playDuaId, 'translation')}
                className={`py-1.5 rounded-lg transition-all border-none cursor-pointer ${speechMode === 'translation' ? 'bg-[#012d1d] text-white shadow-sm border border-gold-accent/30' : 'text-white/70 hover:text-white'}`}
              >
                English
              </button>
              <button
                onClick={() => {
                  if (selectedPlayingDua.urduTranslation) {
                    handlePlayDua(playDuaId, 'urdu');
                  } else {
                    showToast("No Urdu translation for this Dua.");
                  }
                }}
                className={`py-1.5 rounded-lg transition-all border-none cursor-pointer ${speechMode === 'urdu' ? 'bg-amber-600 text-white shadow-sm' : 'text-white/70 hover:text-white'} ${!selectedPlayingDua.urduTranslation ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Urdu (اردو)
              </button>
            </div>

            {/* Bottom panel - speed slider / segment control */}
            <div className="flex items-center justify-between gap-2.5 pt-1 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-[8.5px] font-bold text-white/60 tracking-wider">RECITATION SPEED</span>
                <span className="text-[10px] font-semibold text-[#fed65b]">
                  {memorizeSpeed === 0.65 ? "🐢 Slow (Best for Memorizing)" : memorizeSpeed === 1.0 ? "👤 Regular Pace" : "⚡ Fluent Pace"}
                </span>
              </div>
              
              <div className="flex gap-1 bg-black/15 p-1 rounded-lg border border-white/5">
                {[0.65, 1.0, 1.3].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaySpeedChange(rate)}
                    className={`px-2 py-1 rounded text-[9px] font-bold transition-all border-none cursor-pointer ${memorizeSpeed === rate ? 'bg-[#fed65b] text-[#012d1d]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
