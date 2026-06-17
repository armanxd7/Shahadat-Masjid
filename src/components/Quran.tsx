import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  BookOpen, 
  Sparkles, 
  ArrowRight,
  Share2,
  Bookmark,
  ChevronLeft,
  Volume2,
  Music,
  CheckCircle2,
  Heart
} from "lucide-react";
import { SurahItem } from "../types";

const SURAH_LIST_DATA: SurahItem[] = [
  { number: 1, name: "Al-Fatihah", englishName: "The Opening", englishNameTranslation: "The Opening", numberOfAyahs: 7, arabicName: "الفاتحة" },
  { number: 18, name: "Al-Kahf", englishName: "The Cave", englishNameTranslation: "The Cave", numberOfAyahs: 110, arabicName: "الكهف", readingNow: true },
  { number: 36, name: "Ya-Sin", englishName: "Ya-Sin", englishNameTranslation: "Ya-Sin", numberOfAyahs: 83, arabicName: "يس" },
  { number: 67, name: "Al-Mulk", englishName: "Al-Mulk", englishNameTranslation: "The Sovereignty", numberOfAyahs: 30, arabicName: "الملك" },
  { number: 112, name: "Al-Ikhlas", englishName: "Al-Ikhlas", englishNameTranslation: "The Sincerity", numberOfAyahs: 4, arabicName: "الإخلاص" }
];

interface SurahDetailVerse {
  num: number;
  arabic: string;
  english: string;
}

const SURAH_VERSES: Record<number, SurahDetailVerse[]> = {
  1: [
    { num: 1, arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", english: "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
    { num: 2, arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", english: "[All] praise is [due] to Allah, Lord of the worlds -" },
    { num: 3, arabic: "الرَّحْمَٰنِ الرَّحِيمِ", english: "The Entirely Merciful, the Especially Merciful," },
    { num: 4, arabic: "مَالِكِ يَوْمِ الدِّينِ", english: "Sovereign of the Day of Recompense." },
    { num: 5, arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", english: "It is You we worship and You we ask for help." },
    { num: 6, arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", english: "Guide us to the straight path -" },
    { num: 7, arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", english: "The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray." }
  ],
  18: [
    { num: 1, arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَنْزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَلْ لَهُ عِوَجًا", english: "[All] praise is [due] to Allah, who has sent down upon His Servant the Book and has not made therein any deviance." },
    { num: 2, arabic: "قَيِّمًا لِيُنْذِرَ بَأْسًا شَدِيدًا مِنْ لَدُنْهُ وَيُبَشِّرَ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا حَسَنًا", english: "[Making it] straight, to warn of severe punishment from Him and to give good tidings to the believers who do righteous deeds that they will have a good reward" },
    { num: 3, arabic: "مَاكِثِينَ فِيهِ أَبَدًا", english: "In which they will remain forever" },
    { num: 4, arabic: "وَيُنْذِرَ الَّذِينَ قَالُوا اتَّخَذَ اللَّهُ وَلَدًا", english: "And to warn those who say, 'Allah has taken a son.'" }
  ]
};

const getGlobalAyahNumber = (surahNum: number, ayahInSurah: number): number => {
  const surahStarts: Record<number, number> = {
    1: 1,      // Al-Fatihah
    18: 2117,  // Al-Kahf
    36: 3682,  // Ya-Sin
    67: 5258,  // Al-Mulk
    112: 6223  // Al-Ikhlas
  };
  return (surahStarts[surahNum] || 1) + ayahInSurah - 1;
};

export default function Quran() {
  const [activeTab, setActiveTab] = useState<'surah' | 'juz' | 'bookmarks' | 'reciters'>('surah');
  const [selectedSurah, setSelectedSurah] = useState<SurahItem | null>(null);
  const [aiStreaming, setAiStreaming] = useState(false);
  
  // Audios details
  const [playVerseIndex, setPlayVerseIndex] = useState<number | null>(null);
  const [ayahBookmarked, setAyahBookmarked] = useState(false);
  const [notifyToast, setNotifyToast] = useState<string | null>(null);

  // Dynamic Surah Directory
  const [surahList, setSurahList] = useState<SurahItem[]>(SURAH_LIST_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSurahs, setLoadingSurahs] = useState(false);

  // Dynamic API states for Urdu & English translations
  const [verses, setVerses] = useState<{ num: number; globalNum?: number; arabic: string; english: string; urdu: string; audio?: string; urduAudio?: string }[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'urdu' | 'both'>('both');

  // Audio & TTS Speech States
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [isRecitingPlaying, setIsRecitingPlaying] = useState(false);
  const [currentRecitingIndex, setCurrentRecitingIndex] = useState<number | null>(null);
  const [currentRecitingMode, setCurrentRecitingMode] = useState<'arabic' | 'urdu'>('arabic');
  const [isSpeechSpeaking, setIsSpeechSpeaking] = useState(false);
  const [currentSpeechIndex, setCurrentSpeechIndex] = useState<number | null>(null);
  const [recitingLoading, setRecitingLoading] = useState(false);
  const [playLanguageMode, setPlayLanguageMode] = useState<'arabic' | 'urdu'>('arabic');

  const recitingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch all 114 Holy Quran Surahs dynamically on load
  useEffect(() => {
    setLoadingSurahs(true);
    fetch("https://api.alquran.cloud/v1/surah")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load Surah directory list");
        return res.json();
      })
      .then((json) => {
        if (json.code === 200 && Array.isArray(json.data)) {
          const mapped: SurahItem[] = json.data.map((item: any) => ({
            number: item.number,
            name: item.englishName,
            englishName: item.englishName,
            englishNameTranslation: item.englishNameTranslation,
            numberOfAyahs: item.numberOfAyahs,
            arabicName: item.name,
            readingNow: item.number === 18
          }));
          setSurahList(mapped);
        }
      })
      .catch((err) => {
        console.warn("Quran index service offline - falling back to curated selection:", err);
      })
      .finally(() => {
        setLoadingSurahs(false);
      });
  }, []);

  // System voices loader for dynamic multilingual translations
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const list = window.speechSynthesis.getVoices();
        setVoices(list);
        
        // Find best first voice, preferring local translation languages if possible
        const defaultVoice = list.find(v => v.lang.startsWith("ur") || v.lang.startsWith("ne") || v.lang.startsWith("hi")) ||
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
      if (recitingAudioRef.current) {
        recitingAudioRef.current.pause();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Load from verified AlQuran cloud service including high-fidelity audio reciter edition
  useEffect(() => {
    if (!selectedSurah) {
      setVerses([]);
      return;
    }

    // Stop active audios when leaving or loading surahs
    if (recitingAudioRef.current) {
      recitingAudioRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsRecitingPlaying(false);
    setIsSpeechSpeaking(false);
    setCurrentRecitingIndex(null);
    setCurrentSpeechIndex(null);

    setLoadingVerses(true);
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah.number}/editions/quran-uthmani,en.sahih,ur.junagarhi,ar.alafasy,ur.khan`)
      .then((res) => {
        if (!res.ok) throw new Error("Translation API network failure");
        return res.json();
      })
      .then((json) => {
        if (json.code === 200 && json.data && json.data.length >= 4) {
          const arabList = json.data[0].ayahs;
          const engList = json.data[1].ayahs;
          const urdList = json.data[2].ayahs;
          const audioList = json.data[3] ? json.data[3].ayahs : [];
          const urduAudioList = json.data[4] ? json.data[4].ayahs : [];

          const combined = arabList.map((item: any, idx: number) => ({
            num: item.numberInSurah,
            globalNum: item.number,
            arabic: item.text,
            english: engList[idx] ? engList[idx].text : "",
            urdu: urdList[idx] ? urdList[idx].text : "",
            audio: audioList[idx] && audioList[idx].audio ? audioList[idx].audio : `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${item.number}.mp3`,
            urduAudio: urduAudioList[idx] && urduAudioList[idx].audio ? urduAudioList[idx].audio : `https://cdn.islamic.network/quran/audio/128/ur.khan/${item.number}.mp3`
          }));
          setVerses(combined);
        } else {
          throw new Error("Invalid translation package");
        }
      })
      .catch((err) => {
        console.warn("First API try failed, attempting lighter translation failover query...", err);
        // Failover: Load just Arabic, English and Urdu text editions
        return fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah.number}/editions/quran-uthmani,en.sahih,ur.junagarhi`)
          .then((res) => {
            if (!res.ok) throw new Error("Failover API network failure");
            return res.json();
          })
          .then((json) => {
            if (json.code === 200 && json.data && json.data.length >= 3) {
              const arabList = json.data[0].ayahs;
              const engList = json.data[1].ayahs;
              const urdList = json.data[2].ayahs;
              const combined = arabList.map((item: any, idx: number) => ({
                num: item.numberInSurah,
                globalNum: item.number,
                arabic: item.text,
                english: engList[idx] ? engList[idx].text : "",
                urdu: urdList[idx] ? urdList[idx].text : "",
                audio: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${item.number}.mp3`,
                urduAudio: `https://cdn.islamic.network/quran/audio/128/ur.khan/${item.number}.mp3`
              }));
              setVerses(combined);
            } else {
              throw new Error("Invalid failover data package");
            }
          })
          .catch((secondaryErr) => {
            console.warn("Spiritual cloud offline - applying local fallback database:", secondaryErr);
            const offlineList = SURAH_VERSES[selectedSurah.number] || [];
            // Generate basic fallback if we don't have offline verses for this surah
            const listToUse = offlineList.length > 0 
              ? offlineList 
              : Array.from({ length: selectedSurah.numberOfAyahs || 7 }, (_, i) => ({
                  num: i + 1,
                  arabic: "الْقُرْآنُ الْكَرِيمُ",
                  english: "Please check your internet connection to load translations dynamically from the cloud database."
                }));
            const fallback = listToUse.map((v) => ({
              num: v.num,
              globalNum: getGlobalAyahNumber(selectedSurah.number, v.num),
              arabic: v.arabic,
              english: v.english,
              urdu: "ترجمہ لوڈ کرنے کے لیے انٹرنیٹ آن کریں (Urdu translations require internet)",
              audio: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${getGlobalAyahNumber(selectedSurah.number, v.num)}.mp3`,
              urduAudio: `https://cdn.islamic.network/quran/audio/128/ur.khan/${getGlobalAyahNumber(selectedSurah.number, v.num)}.mp3`
            }));
            setVerses(fallback);
          });
      })
      .finally(() => {
        setLoadingVerses(false);
      });
  }, [selectedSurah]);

  const handleToggleAi = () => {
    setAiStreaming(!aiStreaming);
    showToast(aiStreaming ? "AI Recitation Deactivated" : "AI Recitation Activated! Reciting Tajweed AI... 🗣️");
  };

  const showToast = (msg: string) => {
    setNotifyToast(msg);
    setTimeout(() => setNotifyToast(null), 2500);
  };

  const handlePlayVerse = (index: number) => {
    let verse;
    if (index === 999) {
      verse = {
        num: 5,
        globalNum: 6094,
        arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
        english: "For indeed, with hardship [will be] ease.",
        urdu: "پس یقیناً مشکل के साथ आसानी ہے۔",
        audio: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/6094.mp3",
        urduAudio: "https://cdn.islamic.network/quran/audio/128/ur.khan/6094.mp3"
      };
    } else {
      verse = verses[index];
    }
    if (!verse) return;

    if (playVerseIndex === index) {
      setPlayVerseIndex(null);
      // Pause audios on close
      if (recitingAudioRef.current) {
        recitingAudioRef.current.pause();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsRecitingPlaying(false);
      setIsSpeechSpeaking(false);
      setCurrentRecitingIndex(null);
      setCurrentSpeechIndex(null);
    } else {
      setPlayVerseIndex(index);
      // Play automatically!
      setTimeout(() => {
        toggleRecitationAudio(verse, index, index === 999 ? 'arabic' : playLanguageMode);
      }, 50);
    }
  };

  const toggleRecitationAudio = (verse: any, index: number, mode: 'arabic' | 'urdu' = 'arabic') => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeechSpeaking(false);
    setCurrentSpeechIndex(null);

    if (recitingAudioRef.current && currentRecitingIndex === index && currentRecitingMode === mode) {
      if (isRecitingPlaying) {
        recitingAudioRef.current.pause();
        setIsRecitingPlaying(false);
      } else {
        setRecitingLoading(true);
        recitingAudioRef.current.play().then(() => {
          setIsRecitingPlaying(true);
          setRecitingLoading(false);
        }).catch(() => {
          setRecitingLoading(false);
          showToast("Autoplay blocked. Please click play again.");
        });
      }
      return;
    }

    if (recitingAudioRef.current) {
      recitingAudioRef.current.pause();
    }

    setRecitingLoading(true);
    setCurrentRecitingIndex(index);
    setCurrentRecitingMode(mode);
    setIsRecitingPlaying(true);

    const sNum = selectedSurah ? selectedSurah.number : 1;
    const sStr = String(sNum).padStart(3, '0');
    const aStr = String(verse.num).padStart(3, '0');
    const globalNumber = verse.globalNum || getGlobalAyahNumber(sNum, verse.num);

    const primaryUrl = mode === 'urdu' 
      ? (verse.urduAudio || `https://cdn.islamic.network/quran/audio/128/ur.khan/${globalNumber}.mp3`)
      : (verse.audio || `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNumber}.mp3`);

    const backupUrl = mode === 'urdu'
      ? `https://cdn.islamic.network/quran/audio/128/ur.khan/${globalNumber}.mp3`
      : `https://mirrors.quranicaudio.com/everyayah/data/Alafasy_128kbps/${sStr}${aStr}.mp3`;

    const audio = new Audio(primaryUrl);
    recitingAudioRef.current = audio;

    audio.oncanplay = () => {
      setRecitingLoading(false);
    };

    audio.onended = () => {
      setIsRecitingPlaying(false);
      setCurrentRecitingIndex(null);
    };

    audio.onerror = () => {
      if (audio.src === primaryUrl && mode !== 'urdu') {
        console.warn("Primary reciter CDN down or CORS blocked. Switching to backup SSL mirror...");
        audio.src = backupUrl;
        audio.load();
        audio.play().catch((e) => {
          console.warn("Backup audioplay failed:", e);
          setRecitingLoading(false);
          setIsRecitingPlaying(false);
          setCurrentRecitingIndex(null);
          showToast("Recitation service is offline. Please try again.");
        });
      } else {
        setRecitingLoading(false);
        setIsRecitingPlaying(false);
        setCurrentRecitingIndex(null);
        showToast("Audio recitation is temporarily unavailable.");
      }
    };

    audio.play().catch((err) => {
      console.warn("Primary play error, triggering failover:", err);
      if (audio.src === primaryUrl && mode !== 'urdu') {
        audio.src = backupUrl;
        audio.load();
        audio.play().then(() => {
          setRecitingLoading(false);
        }).catch((e) => {
          console.warn(e);
          setRecitingLoading(false);
          setIsRecitingPlaying(false);
          setCurrentRecitingIndex(null);
          showToast("Click play button again to authorize audio.");
        });
      } else {
        setRecitingLoading(false);
        showToast("Click play button again to authorize audio.");
      }
    });
  };

  const toggleTranslationSpeech = (verse: any, index: number, overrideLang?: 'english' | 'urdu') => {
    if (recitingAudioRef.current) {
      recitingAudioRef.current.pause();
    }
    setIsRecitingPlaying(false);
    setCurrentRecitingIndex(null);

    if (typeof window === "undefined" || !window.speechSynthesis) {
      showToast("Speech is not supported on this browser.");
      return;
    }

    if (isSpeechSpeaking && currentSpeechIndex === index) {
      window.speechSynthesis.cancel();
      setIsSpeechSpeaking(false);
      setCurrentSpeechIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    // Select text to speak based on chosen/override language
    const langToPlay = overrideLang || selectedLanguage;
    let textToSpeak = langToPlay === 'urdu' ? verse.urdu : verse.english;

    // Clean brackets or English chars from Urdu text
    if (langToPlay === 'urdu' && textToSpeak) {
      textToSpeak = textToSpeak
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/[a-zA-Z]/g, "")
        .trim();
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Pick voice automatically
    let voiceToUse = voices.find(v => v.name === selectedVoiceName);
    if (langToPlay === 'urdu') {
      const urdVoice = voices.find(v => v.lang.startsWith("ur") || v.lang.startsWith("hi") || v.lang.startsWith("ne"));
      if (urdVoice) {
        voiceToUse = urdVoice;
        utterance.lang = urdVoice.lang;
      } else {
        utterance.lang = 'ur-PK';
      }
    } else {
      if (voiceToUse) {
        utterance.lang = voiceToUse.lang;
      } else {
        utterance.lang = 'en-US';
      }
    }

    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }
    
    utterance.rate = langToPlay === 'urdu' ? 0.85 : 0.92;

    utterance.onstart = () => {
      setIsSpeechSpeaking(true);
      setCurrentSpeechIndex(index);
    };

    utterance.onend = () => {
      setIsSpeechSpeaking(false);
      setCurrentSpeechIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeechSpeaking(false);
      setCurrentSpeechIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const filteredSurahs = surahList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.number.toString() === q
    );
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

      {!selectedSurah ? (
        <>
          {/* AI Recitation Hero Banner with premium calligraphies background */}
          <section className="relative overflow-hidden rounded-[28px] p-6 min-h-[190px] flex flex-col justify-end shadow-md border border-white/10 group">
            <div className="absolute inset-0 z-0">
              <img 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 select-none brightness-[0.7]" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpMegAvFf8X89sph3nro4HAEgCHm6Aso5voBl32j6J_wFgW6qMAeSCgiL64ZJVnkRVMTRcXOgYJxN9fA_RCXLtbpUO6PiWQwFJxcx1_9u7Kzsy1NUXqHK-d02xAhZiOKyfksq5mf8AXI9ZPSrHF92F2k0fC0ydZOj3iao9pBiA_4LIUVroxGH_aTRYFMK1cOyaTBnZNOy17zOqXmPFtmsPnUOJBPaPaAv5D81M7ym9VOT0pHvi0zsdl42IEH8eldYPbQgtJJEXAA"
                alt="Calligraphy Gold Relief"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#012d1d] via-[#012d1d]/40 to-transparent"></div>
            </div>
            
            <div className="relative z-10 space-y-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#fed65b] text-primary-base font-sans text-[9px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                NEW: AI Recite-Voice
              </span>
              <h2 className="font-serif text-xl font-bold text-white leading-none">AI tajweed Recitations</h2>
              <p className="text-[10.5px] text-[#a5d0b9] max-w-[270px] leading-relaxed">
                Enable deep neural-wave studio sound tajweed voice recitations for every verse in your heart.
              </p>
              
              <button 
                onClick={handleToggleAi}
                className={`px-5 py-2.5 rounded-full font-sans text-xs font-bold transition-all flex items-center gap-2 active:scale-95 cursor-pointer ${aiStreaming ? "bg-gold-accent text-primary-base" : "bg-primary-base hover:bg-primary-light text-white"}`}
              >
                {aiStreaming ? (
                  <>
                    <Volume2 className="w-4 h-4 animate-bounce" />
                    <span>AI RECITING... 🔊</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>ACTIVATE AI Recitation</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Tabs Navigation selectors */}
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-outline-variant/30 pb-2">
            {[
              { id: 'surah', label: 'SURAH LIST' },
              { id: 'juz', label: "JUZ'" },
              { id: 'bookmarks', label: 'BOOKMARKS' },
              { id: 'reciters', label: 'RECITERS' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative font-sans text-[11px] font-bold uppercase tracking-wider whitespace-nowrap pb-1 transition-colors ${activeTab === tab.id ? "text-primary-base" : "text-on-surface-variant/60"}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-accent rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Surah List rendering dynamically */}
          {activeTab === 'surah' ? (
            <div className="space-y-3">
              {/* Surah search input */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search Surah by name or number (e.g. Fatihah, 36)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 text-xs font-medium font-sans border border-outline-variant/30 rounded-2xl bg-white text-primary-base focus:outline-none focus:border-gold-accent/50 shadow-sm"
                />
                <BookOpen className="w-4 h-4 text-primary-base/45 absolute left-3.5 top-3.5" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="absolute right-3 top-2.5 text-[10px] font-bold text-on-surface-variant hover:text-primary-base bg-primary-base/5 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </div>

              {loadingSurahs && surahList.length <= 5 && (
                <div className="flex items-center justify-center gap-2 py-3 bg-white/50 rounded-xl border border-outline-variant/20">
                  <div className="w-4 h-4 border-2 border-gold-accent border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-sans font-bold text-primary-base animate-pulse">Retrieving 114 Surahs dynamically...</span>
                </div>
              )}

              {filteredSurahs.length === 0 ? (
                <div className="text-center py-10 bg-white border border-outline-variant/30 rounded-2xl p-6 text-on-surface-variant text-xs font-semibold">
                  No Surah found matching "{searchQuery}"
                </div>
              ) : (
                filteredSurahs.map((surah) => (
                  <div 
                    key={surah.number}
                    onClick={() => {
                      setSelectedSurah(surah);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${surah.readingNow ? "bg-[#012d1d] text-white border-gold-accent/40 shadow-sm" : "bg-white border-outline-variant/30 hover:border-gold-accent/25"}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Unique layout indicator pentagon index */}
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className={`absolute inset-0 transform rotate-45 rounded ${surah.readingNow ? "bg-gold-accent/20 border border-gold-accent" : "bg-primary-base/5 border border-primary-base/10"}`}></div>
                        <span className={`relative text-xs font-bold font-serif ${surah.readingNow ? "text-[#fed65b]" : "text-primary-base"}`}>
                          {surah.number}
                        </span>
                      </div>

                      <div>
                        <h3 className={`font-serif text-sm font-bold ${surah.readingNow ? "text-white" : "text-primary-base"}`}>
                          {surah.name}
                        </h3>
                        <p className={`text-[10px] font-medium ${surah.readingNow ? "text-white/60" : "text-on-surface-variant"}`}>
                          {surah.englishNameTranslation} • {surah.numberOfAyahs} Verses
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className={`font-arabic text-lg font-bold block leading-none ${surah.readingNow ? "text-gold-accent" : "text-primary-base"}`}>
                          {surah.arabicName}
                        </span>
                        {surah.readingNow && (
                          <span className="text-[7.5px] uppercase font-bold tracking-widest text-gold-accent mt-1 block">
                            Reading Now
                          </span>
                        )}
                      </div>
                      <ArrowRight className={`w-4 h-4 text-gold-accent opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-white border border-outline-variant/30 rounded-2xl p-6 text-on-surface-variant text-xs font-semibold">
              <BookOpen className="w-8 h-8 text-gold-accent mx-auto mb-2" />
              This spiritual directory will sync with global compilers shortly.
            </div>
          )}

          {/* Featured Ayah / Verse of the day matching screen details */}
          <section className="bg-gold-accent/5 rounded-[28px] p-6 border border-gold-accent/20 relative overflow-hidden mt-6">
            <div className="relative z-10 space-y-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#735c00]">Featured Quranic Verse</span>
              <p className="font-arabic text-2xl text-right text-primary-base font-bold leading-relaxed">
                فَإِنَّ مَعَ الْعُسْرِ يُسْرًا
              </p>
              <div className="space-y-1">
                <p className="font-serif text-[15px] font-bold text-primary-base leading-snug">
                  "For indeed, with hardship [will be] ease."
                </p>
                <p className="text-[10px] text-on-surface-variant font-semibold">
                  Surah Ash-Sharh 94:5
                </p>
              </div>

              <div className="h-[1px] bg-gold-accent/15 w-full"></div>

              {/* Recitation play bar in container */}
              <div className="flex items-center justify-between gap-3">
                <button 
                  onClick={() => handlePlayVerse(999)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#012d1d] hover:bg-primary-light text-white text-xs font-bold rounded-full transition-transform active:scale-95"
                >
                  {playVerseIndex === 999 ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-gold-accent fill-gold-accent" />
                      <span>Pausing Recitation</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-gold-accent fill-gold-accent" />
                      <span>Play Recitation</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      showToast("Verse quote copied to clipboard! 📋");
                    }}
                    className="w-8 h-8 rounded-full bg-white border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary-base shadow-sm hover:scale-105 transition-transform"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      setAyahBookmarked(!ayahBookmarked);
                      showToast(ayahBookmarked ? "Verse removed from bookmarked list" : "Verse bookmarked in your heart! 🔖");
                    }}
                    className="w-8 h-8 rounded-full bg-primary-base flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${ayahBookmarked ? "text-gold-accent fill-gold-accent" : "text-white"}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Detailed Surah Reading Flow: Al-Fatihah, Al-Kahf etc */
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Back Trigger */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                setSelectedSurah(null);
                setPlayVerseIndex(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-base hover:text-primary-light"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Quran list</span>
            </button>
            <span className="text-xs font-serif font-bold text-gold-accent bg-primary-base px-3 py-1 rounded-full">
              {selectedSurah.arabicName}
            </span>
          </div>

          <div className="text-center py-4 bg-primary-base/5 border border-primary-base/10 rounded-2xl relative space-y-2">
            <h2 className="font-serif text-xl font-bold text-primary-base">{selectedSurah.name}</h2>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-2">
              {selectedSurah.englishNameTranslation} • {selectedSurah.numberOfAyahs} Verses
            </p>

            {/* Translation Language Selection Tabs */}
            <div className="flex justify-center items-center gap-1 bg-white/90 backdrop-blur rounded-full p-1 border border-gold-accent/20 max-w-[250px] mx-auto text-[9px] font-bold font-sans">
              <button 
                onClick={() => setSelectedLanguage('english')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${selectedLanguage === 'english' ? "bg-[#012d1d] text-white" : "text-primary-base hover:bg-gold-accent/10"}`}
              >
                ENGLISH
              </button>
              <button 
                onClick={() => setSelectedLanguage('urdu')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${selectedLanguage === 'urdu' ? "bg-[#012d1d] text-white" : "text-primary-base hover:bg-gold-accent/10"}`}
              >
                اردو (URDU)
              </button>
              <button 
                onClick={() => setSelectedLanguage('both')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${selectedLanguage === 'both' ? "bg-[#012d1d] text-white" : "text-primary-base hover:bg-gold-accent/10"}`}
              >
                BILINGUAL
              </button>
            </div>

            {/* Playback Voice Auto-Play Selection */}
            <div className="pt-2.5 space-y-1">
              <span className="text-[8.5px] font-sans font-extrabold uppercase tracking-widest text-[#012d1d] block">Preferred Audio Playback (प्ले गर्दा कुन भाषा बजाउने?)</span>
              <div className="flex justify-center items-center gap-1 bg-white/90 backdrop-blur rounded-full p-1 border border-gold-accent/20 max-w-[275px] mx-auto text-[9px] font-bold font-sans">
                <button 
                  type="button"
                  onClick={() => {
                    setPlayLanguageMode('arabic');
                    showToast("Playback: Original Arabic (Sheikh Alafasy)");
                  }}
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${playLanguageMode === 'arabic' ? "bg-gold-accent text-[#012d1d] font-extrabold shadow-sm" : "text-[#012d1d]/80 hover:bg-gold-accent/10"}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 block"></span>
                  Arabic Play ({selectedLanguage === 'english' ? "Original" : "अरबी"})
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setPlayLanguageMode('urdu');
                    showToast("Playback: Urdu spoken (Shamshad Ali Khan)");
                  }}
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${playLanguageMode === 'urdu' ? "bg-[#fed65b] text-[#012d1d] font-extrabold shadow-sm" : "text-[#012d1d]/80 hover:bg-gold-accent/10"}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block animate-pulse"></span>
                  Urdu Translation Play (उर्दू)
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loadingVerses && (
            <div className="text-center py-12 bg-white/50 border border-outline-variant/30 rounded-[24px] p-6 text-on-surface-variant flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-gold-accent border-t-transparent animate-spin"></div>
              <p className="text-xs font-sans font-bold text-primary-base">Retrieving translations from Quranic API...</p>
            </div>
          )}

          {/* Verses Checklist */}
          {!loadingVerses && (
            <div className="space-y-4">
              {verses.map((verse, index) => (
                <div 
                  key={verse.num}
                  className={`p-5 rounded-2xl bg-white border border-outline-variant/30 space-y-3.5 transition-colors ${playVerseIndex === index ? "border-gold-accent/40 bg-gold-accent/5" : ""}`}
                >
                  <div className="flex justify-between items-center text-xs font-sans font-bold text-on-surface-variant select-none">
                    <span className="w-6 h-6 rounded-full bg-primary-base/5 text-primary-base flex items-center justify-center font-serif text-[10px]">
                      {verse.num}
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePlayVerse(index)}
                        className="w-7 h-7 rounded-full bg-gold-accent/15 text-primary-base flex items-center justify-center hover:bg-gold-accent/25"
                        title="Listen Voice options"
                      >
                        {playVerseIndex === index ? (
                          <Pause className="w-3.5 h-3.5 text-primary-base fill-primary-base animate-pulse" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-primary-base fill-primary-base" />
                        )}
                      </button>
                      <button 
                        onClick={() => showToast(`Verse ${verse.num} highlighted successfully`)}
                        className="w-7 h-7 rounded-full bg-primary-base/5 text-primary-base flex items-center justify-center hover:bg-primary-base/10"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Arabic Original Text */}
                  <p className="font-arabic text-2xl text-right text-primary-base font-semibold leading-loose">
                    {verse.arabic}
                  </p>

                  <div className="space-y-2.5">
                    {/* English translation layout */}
                    {(selectedLanguage === 'english' || selectedLanguage === 'both') && (
                      <div className="bg-primary-base/[0.01] p-1 rounded">
                        <span className="text-[8px] font-sans font-extrabold uppercase tracking-widest text-[#a5d0b9] block mb-0.5">English Sahih</span>
                        <p className="text-[12.5px] text-primary-base font-medium leading-relaxed">
                          {verse.english}
                        </p>
                      </div>
                    )}

                    {/* Urdu translation layout */}
                    {(selectedLanguage === 'urdu' || selectedLanguage === 'both') && (
                      <div className="bg-gold-accent/[0.04] p-2.5 rounded-xl border border-gold-accent/10">
                        <span className="text-[8px] font-sans font-extrabold uppercase tracking-widest text-[#735c00] block mb-1">اردو ترجمہ</span>
                        <p className="text-right text-[14.5px] text-[#735c00] font-sans font-semibold leading-loose tracking-wide" dir="rtl">
                          {verse.urdu}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Beautiful Multi-Language Audio and Voice Broadcaster Control Panel */}
                  <AnimatePresence>
                    {playVerseIndex === index && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 p-4 text-white space-y-4 rounded-2xl border border-gold-accent/35 bg-[#011d13]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Alafasy or Shamshad Professional Streams */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-sans font-extrabold uppercase tracking-widest text-[#fed65b] block">Voice Recitations (Urdu & Arabic)</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Alafasy Reciter */}
                                <button
                                  type="button"
                                  onClick={() => toggleRecitationAudio(verse, index, 'arabic')}
                                  className={`px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-sm ${
                                    isRecitingPlaying && currentRecitingIndex === index && currentRecitingMode === 'arabic'
                                      ? "bg-gold-accent text-primary-base font-extrabold"
                                      : "bg-white/10 hover:bg-white/15 text-white"
                                  }`}
                                  title="Original Arabic recitation by Alafasy"
                                >
                                  {recitingLoading && currentRecitingIndex === index && currentRecitingMode === 'arabic' ? (
                                    <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"></span>
                                  ) : isRecitingPlaying && currentRecitingIndex === index && currentRecitingMode === 'arabic' ? (
                                    <Pause className="w-3 h-3 text-primary-base fill-primary-base" />
                                  ) : (
                                    <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                  )}
                                  <span>Arabic Recite</span>
                                </button>

                                {/* Shamshad Ali Khan Urdu translation reciter */}
                                <button
                                  type="button"
                                  onClick={() => toggleRecitationAudio(verse, index, 'urdu')}
                                  className={`px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-sm ${
                                    isRecitingPlaying && currentRecitingIndex === index && currentRecitingMode === 'urdu'
                                      ? "bg-[#fed65b] text-primary-base font-extrabold"
                                      : "bg-white/10 hover:bg-white/15 text-white"
                                  }`}
                                  title="Urdu spoken translation from Shamshad Ali Khan"
                                >
                                  {recitingLoading && currentRecitingIndex === index && currentRecitingMode === 'urdu' ? (
                                    <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"></span>
                                  ) : isRecitingPlaying && currentRecitingIndex === index && currentRecitingMode === 'urdu' ? (
                                    <Pause className="w-3 h-3 text-primary-base fill-primary-base animate-pulse" />
                                  ) : (
                                    <Volume2 className="w-3 h-3 text-white" />
                                  )}
                                  <span>Urdu Recite</span>
                                </button>
                              </div>
                            </div>

                            {/* Speech Synthesis Translation */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-sans font-extrabold uppercase tracking-widest text-[#a5d0b9] block font-mono">Dynamic voice narration</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Voice selection */}
                                <select
                                  value={selectedVoiceName}
                                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                                  className="text-[9px] font-bold tracking-wider bg-white/10 hover:bg-white/15 border border-[#a5d0b9]/30 rounded px-2 py-1 text-[#a5d0b9] focus:outline-none focus:ring-1 focus:ring-gold-accent cursor-pointer max-w-[124px] transition-all"
                                >
                                  <option value="" disabled className="text-primary-base font-sans">Choose System Voice</option>
                                  {voices.length === 0 ? (
                                    <option value="" className="text-primary-base font-sans">Loading voices...</option>
                                  ) : (
                                    voices.map((v) => (
                                      <option key={v.name} value={v.name} className="text-primary-base font-sans text-[9px]">
                                        {v.lang.toUpperCase()} - {v.name.slice(0, 15)}
                                      </option>
                                    ))
                                  )}
                                </select>

                                {/* English Audio */}
                                <button
                                  type="button"
                                  onClick={() => toggleTranslationSpeech(verse, index, 'english')}
                                  className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1 hover:scale-105 active:scale-95 transition-all text-white bg-emerald-800 hover:bg-emerald-700 border-none cursor-pointer"
                                  title="Reads out the English translation"
                                >
                                  {isSpeechSpeaking && currentSpeechIndex === index ? (
                                    <>
                                      <Pause className="w-3 h-3 text-white fill-white" />
                                      <span>Stop Audio</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3 text-white" />
                                      <span>Speak English</span>
                                    </>
                                  )}
                                </button>

                                {/* Urdu Audio */}
                                <button
                                  type="button"
                                  onClick={() => toggleRecitationAudio(verse, index, 'urdu')}
                                  className={`px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1 hover:scale-105 active:scale-95 transition-all text-white border-none cursor-pointer ${
                                    isRecitingPlaying && currentRecitingIndex === index && currentRecitingMode === 'urdu'
                                      ? "bg-[#fed65b] text-primary-base font-extrabold"
                                      : "bg-amber-600 hover:bg-amber-500"
                                  }`}
                                  title="Play Urdu translation spoken audio"
                                >
                                  {isRecitingPlaying && currentRecitingIndex === index && currentRecitingMode === 'urdu' ? (
                                    <>
                                      <Pause className="w-3 h-3 text-primary-base fill-primary-base animate-pulse" />
                                      <span>Stop Urdu</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3 text-white" />
                                      <span>Speak Urdu</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
